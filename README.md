# ShellForge — File System Management Shell

> **OSSP Project A7** — A Unix shell and browser-based file manager demonstrating POSIX system calls, process management, file permissions, and secure inter-process communication.

---

## Architecture

```
React Frontend (Vite + Tailwind)
          │
          │  HTTP REST  (Vite proxy)
          ▼
Express REST API  (Node.js)
          │
          │  JSON stdin/stdout  (execve, no shell)
          ▼
C Adapter  (shellforge_adapter.c)
          │
          │  POSIX syscalls: open, read, write, stat,
          │  mkdir, unlink, rename, opendir, readdir,
          │  chmod, lstat, realpath
          ▼
Ubuntu / Linux File System
```

The C adapter reuses the same POSIX system calls as the ShellForge shell (`src/fileops.c`, `src/perms.c`, `src/search.c`). The Node.js layer only validates HTTP shapes and spawns the adapter — it never touches the filesystem directly. The React frontend calls the REST API and never executes shell commands.

---

## OSSP Learning Objectives

| Concept | Demonstrated In |
|---|---|
| POSIX file I/O (`open`, `read`, `write`) | `src/fileops.c`, `backend/shellforge_adapter.c` |
| Directory traversal (`opendir`, `readdir`) | `src/fileops.c`, `src/search.c` |
| File metadata (`stat`, `lstat`) | `src/perms.c`, `backend/shellforge_adapter.c` |
| Permissions (`chmod`, mode bits) | `src/perms.c`, Permissions modal |
| Process creation (`fork`, `exec`) | `src/process.c`, `src/pipes.c` |
| Signal handling | `src/signals.c` |
| Pipes / IPC | `src/pipes.c` — JSON protocol between Node.js & C adapter |
| I/O redirection | `src/redirect.c` |
| Thread monitoring | `src/thread.c` |
| Memory safety | `src/input.c` — dynamic buffer growth |
| Path security | `safe_resolve()` in `shellforge_adapter.c` |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Shell Core | C / POSIX (gcc, pthreads) |
| C–Node Bridge | `shellforge_adapter.c` — JSON stdin/stdout |
| Backend API | Node.js 20 + Express 4 |
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |

---

## Project Structure

```
A7_OSSP_PROJECT/
├── src/                    ← ShellForge C source (unchanged)
│   ├── main.c              ← REPL loop
│   ├── fileops.c           ← touch, mkdir, cp, mv, rm, ls
│   ├── perms.c             ← stat, chmod, chown, ls -l
│   ├── search.c            ← find, recursive_rm, recursive_cp
│   ├── pipes.c             ← pipe() + dup2()
│   ├── redirect.c          ← >, >>, <, 2>
│   ├── process.c           ← fork, execvp, waitpid
│   ├── signals.c           ← SIGINT, SIGCHLD
│   ├── thread.c            ← pthread monitor
│   ├── input.c             ← dynamic line input
│   ├── parser.c            ← tokenizer
│   └── builtin.c           ← cd, pwd, env, help, exit
├── include/                ← Header files
├── backend/
│   ├── shellforge_adapter.c ← C adapter (JSON bridge)
│   ├── shellforge_adapter   ← compiled binary (after build)
│   ├── src/
│   │   ├── server.js        ← Express REST API
│   │   └── shellforge.js    ← Node→C adapter wrapper
│   ├── tests/
│   │   └── api.test.js      ← 17-case integration test
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← Root component + file ops
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx
│   │   │   ├── FileBrowser.jsx   ← Grid + list view
│   │   │   ├── FilePreview.jsx   ← Text editor/viewer
│   │   │   ├── ContextMenu.jsx
│   │   │   ├── SearchPanel.jsx
│   │   │   ├── Modals.jsx        ← Create/Rename/Delete/Perms/Props
│   │   │   └── Notifications.jsx
│   │   ├── context/AppContext.jsx
│   │   ├── services/api.js
│   │   └── utils/fileUtils.js
│   └── package.json
├── Makefile
├── start.sh                ← One-command startup
└── README.md
```

---

## Setup & Running

### Prerequisites

- Ubuntu / WSL2
- gcc (already available)
- Node.js 20+ (install via nvm if missing)

```bash
# Install Node.js if needed
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
```

### One-command start

```bash
# In WSL Ubuntu:
cd ~/A7_OSSP_PROJECT
bash start.sh
```

This will:
1. Compile ShellForge (`bin/shellforge`)
2. Compile C adapter (`backend/shellforge_adapter`)
3. Install npm deps for backend and frontend
4. Start backend on `http://127.0.0.1:3001`
5. Start frontend on `http://localhost:5173`

Then open **http://localhost:5173** in your browser.

### Manual steps (if start.sh fails)

```bash
# 1. Build ShellForge
cd ~/A7_OSSP_PROJECT && make

# 2. Compile C adapter
cd backend
gcc -Wall -Wextra -O2 shellforge_adapter.c -o shellforge_adapter

# 3. Install and start backend
npm install
SHELLFORGE_WORKSPACE=/tmp/shellforge_ws node src/server.js &

# 4. Install and start frontend
cd ../frontend
npm install
npm run dev
```

### Run original ShellForge shell

```bash
cd ~/A7_OSSP_PROJECT
./bin/shellforge
```

### Run integration tests

```bash
# Backend must be running first
cd ~/A7_OSSP_PROJECT/backend
node tests/api.test.js
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Backend + adapter status |
| GET | `/api/files?path=` | List directory contents |
| GET | `/api/files/metadata?path=` | File/dir metadata + stat info |
| GET | `/api/files/content?path=` | Read file text (≤512 KB) |
| POST | `/api/files` | Create file or directory |
| PUT | `/api/files/content` | Write/update file content |
| POST | `/api/files/copy` | Copy file or directory |
| POST | `/api/files/move` | Move file or directory |
| POST | `/api/files/rename` | Rename file or directory |
| DELETE | `/api/files` | Delete file or directory |
| GET | `/api/search?q=&path=` | Recursive name search |
| GET | `/api/files/permissions?path=` | Get permissions + ownership |
| PATCH | `/api/files/permissions` | Change permissions (chmod) |

---

## Security Model

- **Workspace root** — all operations confined to `SHELLFORGE_WORKSPACE` (default `/tmp/shellforge_ws`)
- **Path canonicalization** — `realpath()` resolves symlinks; prefix checked against workspace root
- **No shell interpolation** — Node.js passes JSON to adapter via stdin; C adapter uses `exec()` not `system()`
- **No arbitrary exec** — only specific C functions are callable via the `op` field whitelist
- **Input validation** — filenames validated (no `/`, no `..`); octal mode regex-checked
- **Payload limits** — Express JSON body limit 10 MB; file read capped at 512 KB
- **CORS restricted** — only `localhost:5173` and `localhost:3000` accepted

---

## Features Implemented

| Feature | Status | Notes |
|---|---|---|
| Browse directories | ✅ | Grid + list view |
| Create files/folders | ✅ | With name validation |
| Read/edit text files | ✅ | Inline editor, save with warning |
| Copy files/dirs | ✅ | Recursive via C adapter |
| Move files/dirs | ✅ | Cross-fs fallback |
| Rename | ✅ | |
| Delete | ✅ | Confirm dialog, recursive |
| Search | ✅ | Debounced, uses ShellForge find() |
| Permissions view | ✅ | Unix rwxrwxrwx display |
| chmod | ✅ | Visual matrix + octal input |
| File metadata | ✅ | stat, inode, mtime, owner |
| Upload file | ✅ | Text files |
| Dark / light theme | ✅ | Persisted to localStorage |
| Keyboard shortcuts | ✅ | Ctrl+K search, F2 rename, Del delete |
| Multi-select | ✅ | Ctrl+click |
| Context menu | ✅ | Right-click on files/dirs |
| Sort (name/size/date/type) | ✅ | |
| Path traversal prevention | ✅ | realpath + prefix check in C |
| Backend health indicator | ✅ | Live status in sidebar |

---

## Known Limitations

- Image preview not rendered (browser context restriction; metadata shown instead)
- File download via browser not implemented (backend download route exists)
- Trash/recycle bin not implemented — deletions are permanent
- Ownership changes (chown) not exposed — requires root
- No authentication — bind to localhost only, single-user

---

## Screenshots

> Run the app and take screenshots to add here.

---

## GitHub

- **Source**: https://github.com/jwalit-09/A7_OSSP_PROJECT
- **Team**: A7
