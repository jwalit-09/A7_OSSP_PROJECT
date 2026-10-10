#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ShellForge File Manager — One-shot startup script
# Usage:  bash start.sh
# ═══════════════════════════════════════════════════════════════
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="${SHELLFORGE_WORKSPACE:-/tmp/shellforge_ws}"

echo ""
echo "  ███████╗██╗  ██╗███████╗██╗     ██╗      ███████╗ ██████╗ ██████╗  ██████╗ ███████╗"
echo "  ██╔════╝██║  ██║██╔════╝██║     ██║      ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝"
echo "  ███████╗███████║█████╗  ██║     ██║      █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  "
echo "  ╚════██║██╔══██║██╔══╝  ██║     ██║      ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  "
echo "  ███████║██║  ██║███████╗███████╗███████╗ ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗"
echo "  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝"
echo ""
echo "  File Manager — OSSP Project A7"
echo ""

# ── 1. Load nvm if present ──────────────────────────────────
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# ── 2. Verify node / npm ────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Run:"
  echo "   curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
  echo "   source ~/.bashrc && nvm install 20"
  exit 1
fi
echo "✓ Node.js $(node --version) / npm $(npm --version)"

# ── 3. Compile ShellForge (original project) ────────────────
echo ""
echo "Building ShellForge shell..."
cd "$ROOT"
make -s 2>&1 && echo "✓ ShellForge compiled → bin/shellforge" || echo "⚠  ShellForge build failed (web app still works)"

# ── 4. Compile C adapter ────────────────────────────────────
echo ""
echo "Compiling C adapter..."
gcc -Wall -Wextra -O2 "$ROOT/backend/shellforge_adapter.c" \
    -o "$ROOT/backend/shellforge_adapter" 2>&1 \
  && echo "✓ C adapter compiled → backend/shellforge_adapter" \
  || { echo "❌ C adapter compilation failed"; exit 1; }

# ── 5. Install npm dependencies ─────────────────────────────
echo ""
echo "Installing backend dependencies..."
cd "$ROOT/backend"
npm install --silent && echo "✓ Backend deps installed"

echo ""
echo "Installing frontend dependencies..."
cd "$ROOT/frontend"
npm install --silent && echo "✓ Frontend deps installed"

# ── 6. Create workspace ──────────────────────────────────────
mkdir -p "$WORKSPACE"
echo ""
echo "✓ Workspace: $WORKSPACE"
echo ""

# ── 7. Start backend ────────────────────────────────────────
cd "$ROOT/backend"
export SHELLFORGE_WORKSPACE="$WORKSPACE"
echo "Starting backend on http://127.0.0.1:3001 ..."
node src/server.js &
BACKEND_PID=$!

# Wait for backend to be ready
for i in $(seq 1 15); do
  sleep 0.5
  if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo "✓ Backend ready"
    break
  fi
done

# ── 8. Start frontend dev server ─────────────────────────────
cd "$ROOT/frontend"
echo "Starting frontend on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!

sleep 2
echo ""
echo "═══════════════════════════════════════════"
echo "  🚀 ShellForge File Manager is running!"
echo ""
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://127.0.0.1:3001"
echo "  Workspace: $WORKSPACE"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "═══════════════════════════════════════════"
echo ""

# Cleanup on exit
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
