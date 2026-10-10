"""
ShellForge Web Backend - Flask REST API
========================================
File System Management Shell - OSSP Project
Provides REST API + WebSocket interface for the web terminal UI.

Run:
    pip install -r requirements.txt
    python app.py

Endpoints:
    POST   /api/execute           - Execute a safe shell command
    GET    /api/files             - List files in workspace directory
    GET    /api/files/tree        - Return directory tree as JSON
    POST   /api/files/create      - Create a new empty file
    POST   /api/files/mkdir       - Create a directory
    DELETE /api/files/delete      - Delete file or directory
    POST   /api/files/upload      - Upload a file
    GET    /api/files/download    - Download a file
    GET    /api/files/read        - Read file content
    POST   /api/files/write       - Write file content
    GET    /api/system/info       - System info (CPU, memory, disk)
    GET    /api/history           - Command history
"""

import os
import re
import shutil
import subprocess
import time
import json
import psutil
import threading
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, send_file, abort
from flask_cors import CORS
from flask_socketio import SocketIO, emit

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
WORKSPACE = os.environ.get("SHELLFORGE_WORKSPACE", "/tmp/shellforge_workspace")
MAX_OUTPUT_SIZE = 50_000   # bytes — truncate large outputs
COMMAND_TIMEOUT = 10       # seconds

# Commands allowed for execution
ALLOWED_COMMANDS = {
    "ls", "cat", "mkdir", "touch", "rm", "cp", "mv", "find", "grep",
    "pwd", "chmod", "stat", "echo", "head", "tail", "wc", "sort",
    "uniq", "cut", "tr", "sed", "awk", "diff", "file", "du", "df",
    "date", "whoami", "hostname", "uname", "env", "printenv", "which",
    "type", "tree", "ln", "readlink", "dirname", "basename",
    "od", "xxd", "strings", "hexdump", "md5sum", "sha256sum",
    "zip", "unzip", "tar", "gzip", "gunzip",
    "ps", "id", "groups",
}

# Patterns that are NEVER allowed (security)
BLOCKED_PATTERNS = [
    r"\bsudo\b", r"\bsu\b", r"\bchown\b", r"\bdd\b",
    r"\bformat\b", r"\bmkfs\b", r"\bfdisk\b", r"\bparted\b",
    r"\brm\s+-rf\s+/", r"\bshutdown\b", r"\breboot\b", r"\bhalt\b",
    r"\bkill\b", r"\bkillall\b", r"\bpkill\b",
    r"\bwget\b", r"\bcurl\b", r"\bscp\b", r"\bssh\b",
    r"\bnc\b", r"\bnetcat\b", r"\biptables\b",
    r"\bchmod\s+777\s+/", r"\beval\b", r"\bexec\b",
    r"\$\(", r"`",  # Command substitution
    r"\.\./\.\./\.\./",  # Path traversal
]

# ─────────────────────────────────────────────
# App & SocketIO setup
# ─────────────────────────────────────────────
app = Flask(__name__)
app.config["SECRET_KEY"] = "shellforge-secret-2024"
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# Ensure workspace exists
os.makedirs(WORKSPACE, exist_ok=True)

# In-memory command history (per session would need sessions)
command_history = []


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def safe_path(rel_path: str) -> Path:
    """Resolve a path relative to WORKSPACE, preventing traversal attacks."""
    base = Path(WORKSPACE).resolve()
    full = (base / rel_path.lstrip("/")).resolve()
    if not str(full).startswith(str(base)):
        raise PermissionError("Path traversal denied")
    return full


def is_command_allowed(cmd: str) -> tuple[bool, str]:
    """Check if a command string is safe to run."""
    stripped = cmd.strip()
    if not stripped:
        return False, "Empty command"

    # Check blocked patterns
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, stripped, re.IGNORECASE):
            return False, f"Blocked pattern detected: {pattern}"

    # Get the base command (first word)
    base_cmd = stripped.split()[0]
    # Strip any path prefix
    base_cmd = os.path.basename(base_cmd)

    if base_cmd not in ALLOWED_COMMANDS:
        return False, f"Command '{base_cmd}' is not in the allowed list"

    return True, ""


def run_command_safe(cmd: str, cwd: str = WORKSPACE) -> dict:
    """Execute a whitelisted shell command and return structured result."""
    allowed, reason = is_command_allowed(cmd)
    if not allowed:
        return {
            "stdout": "",
            "stderr": f"❌ Security: {reason}",
            "exit_code": 126,
            "duration_ms": 0,
            "blocked": True,
        }

    start = time.time()
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT,
            cwd=cwd,
        )
        duration = int((time.time() - start) * 1000)

        stdout = result.stdout
        stderr = result.stderr

        # Truncate very large outputs
        if len(stdout) > MAX_OUTPUT_SIZE:
            stdout = stdout[:MAX_OUTPUT_SIZE] + "\n\n[... output truncated ...]"

        return {
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": result.returncode,
            "duration_ms": duration,
            "blocked": False,
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": f"⏱ Command timed out after {COMMAND_TIMEOUT}s",
            "exit_code": 124,
            "duration_ms": COMMAND_TIMEOUT * 1000,
            "blocked": False,
        }
    except Exception as exc:
        return {
            "stdout": "",
            "stderr": str(exc),
            "exit_code": 1,
            "duration_ms": 0,
            "blocked": False,
        }


def build_tree(path: Path, depth: int = 3) -> dict:
    """Recursively build a JSON file-tree (limited depth)."""
    if depth == 0:
        return {"name": path.name, "type": "dir", "children": [{"name": "...", "type": "ellipsis"}]}

    node = {"name": path.name, "type": "dir" if path.is_dir() else "file", "path": str(path.relative_to(WORKSPACE))}

    if path.is_dir():
        try:
            children = []
            entries = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
            for entry in entries[:100]:  # cap at 100 entries per dir
                children.append(build_tree(entry, depth - 1))
            node["children"] = children
        except PermissionError:
            node["children"] = []
    else:
        try:
            stat = path.stat()
            node["size"] = stat.st_size
            node["modified"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
        except OSError:
            node["size"] = 0

    return node


def get_file_info(path: Path) -> dict:
    """Return metadata dict for a file/directory."""
    try:
        stat = path.stat()
        mode = oct(stat.st_mode)[-3:]
        return {
            "name": path.name,
            "path": str(path.relative_to(WORKSPACE)),
            "type": "directory" if path.is_dir() else "file",
            "size": stat.st_size,
            "permissions": mode,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "is_symlink": path.is_symlink(),
        }
    except OSError as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────

@app.route("/api/health")
def health():
    """Health-check endpoint."""
    return jsonify({"status": "ok", "workspace": WORKSPACE, "version": "1.0.0"})


@app.route("/api/execute", methods=["POST"])
def execute():
    """Execute a whitelisted shell command in the workspace."""
    data = request.get_json()
    if not data or "command" not in data:
        return jsonify({"error": "Missing 'command' field"}), 400

    cmd = data["command"].strip()
    cwd = WORKSPACE  # Always run inside workspace

    # Record in history
    command_history.append({
        "command": cmd,
        "timestamp": datetime.now().isoformat(),
    })
    if len(command_history) > 500:
        command_history.pop(0)

    result = run_command_safe(cmd, cwd)
    result["command"] = cmd

    # Emit via WebSocket for real-time UI updates
    socketio.emit("command_result", result)

    return jsonify(result)


@app.route("/api/files")
def list_files():
    """List files in a workspace subdirectory."""
    rel = request.args.get("path", "")
    try:
        target = safe_path(rel)
    except PermissionError:
        return jsonify({"error": "Path not allowed"}), 403

    if not target.exists():
        return jsonify({"error": "Path not found"}), 404
    if not target.is_dir():
        return jsonify({"error": "Not a directory"}), 400

    entries = []
    try:
        for entry in sorted(target.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
            entries.append(get_file_info(entry))
    except PermissionError:
        return jsonify({"error": "Permission denied"}), 403

    return jsonify({
        "path": rel or "/",
        "entries": entries,
    })


@app.route("/api/files/tree")
def file_tree():
    """Return the workspace directory tree as nested JSON."""
    workspace_path = Path(WORKSPACE)
    tree = build_tree(workspace_path, depth=4)
    tree["name"] = "workspace"
    return jsonify(tree)


@app.route("/api/files/create", methods=["POST"])
def create_file():
    """Create an empty file."""
    data = request.get_json()
    if not data or "path" not in data:
        return jsonify({"error": "Missing 'path'"}), 400
    try:
        target = safe_path(data["path"])
        target.parent.mkdir(parents=True, exist_ok=True)
        target.touch()
        return jsonify({"success": True, "path": str(target.relative_to(WORKSPACE))})
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/mkdir", methods=["POST"])
def make_dir():
    """Create a directory."""
    data = request.get_json()
    if not data or "path" not in data:
        return jsonify({"error": "Missing 'path'"}), 400
    try:
        target = safe_path(data["path"])
        target.mkdir(parents=True, exist_ok=True)
        return jsonify({"success": True, "path": str(target.relative_to(WORKSPACE))})
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/delete", methods=["DELETE"])
def delete_file():
    """Delete a file or directory."""
    data = request.get_json()
    if not data or "path" not in data:
        return jsonify({"error": "Missing 'path'"}), 400
    try:
        target = safe_path(data["path"])
        if not target.exists():
            return jsonify({"error": "Path not found"}), 404
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()
        return jsonify({"success": True})
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/read")
def read_file():
    """Read a file's text content (max 100 KB)."""
    rel = request.args.get("path", "")
    if not rel:
        return jsonify({"error": "Missing 'path'"}), 400
    try:
        target = safe_path(rel)
        if not target.exists():
            return jsonify({"error": "File not found"}), 404
        if not target.is_file():
            return jsonify({"error": "Not a file"}), 400

        size = target.stat().st_size
        if size > 500_000:  # 500 KB cap
            return jsonify({"error": "File too large to display in browser", "size": size}), 413

        try:
            content = target.read_text(encoding="utf-8", errors="replace")
        except Exception:
            content = target.read_bytes().hex()

        return jsonify({
            "path": rel,
            "content": content,
            "size": size,
            "encoding": "utf-8",
        })
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403


@app.route("/api/files/write", methods=["POST"])
def write_file():
    """Write text content to a file."""
    data = request.get_json()
    if not data or "path" not in data or "content" not in data:
        return jsonify({"error": "Missing 'path' or 'content'"}), 400
    try:
        target = safe_path(data["path"])
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(data["content"], encoding="utf-8")
        return jsonify({"success": True, "size": target.stat().st_size})
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/upload", methods=["POST"])
def upload_file():
    """Upload a file into the workspace."""
    if "file" not in request.files:
        return jsonify({"error": "No file in request"}), 400
    f = request.files["file"]
    rel = request.form.get("path", "")
    try:
        target_dir = safe_path(rel)
        target_dir.mkdir(parents=True, exist_ok=True)
        dest = target_dir / f.filename
        f.save(str(dest))
        return jsonify({"success": True, "path": str(dest.relative_to(WORKSPACE)), "size": dest.stat().st_size})
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/files/download")
def download_file():
    """Download a file from the workspace."""
    rel = request.args.get("path", "")
    if not rel:
        abort(400)
    try:
        target = safe_path(rel)
        if not target.is_file():
            abort(404)
        return send_file(str(target), as_attachment=True, download_name=target.name)
    except PermissionError:
        abort(403)


@app.route("/api/system/info")
def system_info():
    """Return current system resource information."""
    try:
        cpu = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage(WORKSPACE)

        # Workspace stats
        ws_path = Path(WORKSPACE)
        file_count = sum(1 for _ in ws_path.rglob("*") if _.is_file())
        dir_count = sum(1 for _ in ws_path.rglob("*") if _.is_dir())

        return jsonify({
            "cpu_percent": cpu,
            "memory": {
                "total": mem.total,
                "used": mem.used,
                "available": mem.available,
                "percent": mem.percent,
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": disk.percent,
            },
            "workspace": {
                "path": WORKSPACE,
                "files": file_count,
                "directories": dir_count,
            },
            "uptime": time.time() - psutil.boot_time(),
            "timestamp": datetime.now().isoformat(),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/history")
def get_history():
    """Return command history."""
    limit = int(request.args.get("limit", 50))
    return jsonify({"history": command_history[-limit:]})


@app.route("/api/history/clear", methods=["DELETE"])
def clear_history():
    """Clear command history."""
    command_history.clear()
    return jsonify({"success": True})


# ─────────────────────────────────────────────
# WebSocket Events
# ─────────────────────────────────────────────

@socketio.on("connect")
def on_connect():
    emit("connected", {
        "message": "Connected to ShellForge backend",
        "workspace": WORKSPACE,
        "version": "1.0.0",
    })


@socketio.on("run_command")
def on_run_command(data):
    """Execute command via WebSocket and stream output back."""
    cmd = data.get("command", "").strip()
    if not cmd:
        emit("command_result", {"stderr": "Empty command", "exit_code": 1})
        return

    # Record history
    command_history.append({"command": cmd, "timestamp": datetime.now().isoformat()})

    result = run_command_safe(cmd)
    result["command"] = cmd
    emit("command_result", result)


@socketio.on("disconnect")
def on_disconnect():
    pass


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print(f"🔧 ShellForge Backend starting...")
    print(f"📁 Workspace: {WORKSPACE}")
    print(f"🌐 URL: http://localhost:5000")
    print(f"✅ Allowed commands: {len(ALLOWED_COMMANDS)}")
    os.makedirs(WORKSPACE, exist_ok=True)
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
