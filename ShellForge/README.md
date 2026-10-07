# ShellForge — File System Management Shell

ShellForge is a Unix-like interactive command-line shell developed in C for the **Operating Systems and Systems Programming (OSSP)** Project-Based Learning curriculum.

It serves as a comprehensive system software demonstrating process management, POSIX system calls, Inter-Process Communication (IPC), file descriptors, I/O redirection, dynamic memory allocation, and concurrency.

---

## 🏛️ System Architecture

```text
                User Command
                     │
                     ▼
             +---------------+
             |   Tokenizer   |  (strtok / dynamic argv[])
             +---------------+
                     │
          +----------+----------+
          │                     │
          ▼                     ▼
   [Pipeline '|']        [Redirection '>', '>>', '<', '2>']
   (pipe & dup2)         (open & dup2)
          │                     │
          +----------+----------+
                     │
          +----------+----------+
          │                     │
          ▼                     ▼
  [Built-in Commands]   [External Programs]
  (Executed in Shell)   (fork + execvp + waitpid)
          │                     │
          +----------+----------+
                     │
                     ▼
           Linux Kernel (POSIX APIs)
```

---

## 🌟 Implemented Features

### 1. Core REPL & Process Management (Weeks 1–5)
- **Interactive REPL Loop**: Displays active working prompt, reads arbitrary line lengths with dynamic memory (`malloc`/`realloc`/`free`).
- **Command Parsing**: Tokenizes input strings into NULL-terminated `argv[]` vectors.
- **Process Spawning**: Child execution using `fork()`, program image replacement with `execvp()`, parent synchronization with `waitpid()`.

### 2. Built-in Commands & Environment Variables (Week 5 & File Operations)
- `cd <dir>`: Directory navigation via `chdir()`.
- `pwd`: Current directory lookup via `getcwd()`.
- `env`: Displays environment variables via `getenv()`.
- `clear`, `exit`, `help`.

### 3. Signals & Process Control (Week 6)
- **SIGINT Handler**: Catches <kbd>Ctrl</kbd> + <kbd>C</kbd> cleanly so the shell survives without terminating.
- **SIGCHLD Handler**: Automatic background zombie process harvesting using `waitpid(-1, NULL, WNOHANG)`.

### 4. Anonymous Pipes & IPC (Week 7)
- Unidirectional process-to-process pipelines (`cmd1 | cmd2`).
- Kernel pipe allocation via `pipe(pipefd)`.
- Stream duplication using `dup2()`.

### 5. Memory Safety & Debugging (Week 8)
- Memory leak analysis with **Valgrind** (`--leak-check=full`).
- Interactive debugging support with **GDB** (`-g` symbols).
- Memory corruption & buffer overflow checks with **AddressSanitizer (ASan)** (`make asan`).

### 6. File Descriptors & I/O Redirection (Week 9)
- Standard Output Overwrite (`>`) via `O_WRONLY | O_CREAT | O_TRUNC`.
- Standard Output Append (`>>`) via `O_WRONLY | O_CREAT | O_APPEND`.
- Standard Input Redirection (`<`) via `O_RDONLY`.
- Standard Error Redirection (`2>`) via `dup2(fd, STDERR_FILENO)`.

### 7. POSIX Threads & Concurrency (Week 10)
- Background monitor thread created using `pthread_create()`.
- Detached thread execution with `pthread_detach()`.
- Heartbeat status logging without interrupting the foreground REPL prompt.

### 8. File System Management (Implementation Plan Phases 2, 5 & 6)
- **File Management**: `touch` (`O_CREAT` + `utime`), `mkdir` (`mkdir`), `rmdir` (`rmdir`), `cat` (`read`/`write`), `cp` (buffered read/write), `mv` (`rename`), `rm` (`unlink`), `ls` (`opendir`/`readdir`).
- **Search & Recursion**: `find` (with `-name` and `-type` filtering via `fnmatch`), `ls -R`, `cp -r`, `rm -r`.
- **Permissions**: `ls -l` (detailed metadata with permissions, owner, group, size, time), `stat`, `chmod` (octal modes), `chown`.

---

## 🛠️ Project Structure

```text
ShellForge/
├── Makefile                # Build automation configuration
├── README.md               # Project documentation and specifications
│
├── include/                # Header files (.h)
│   ├── shell.h             # Core constants and version
│   ├── input.h             # Dynamic line reading prototypes
│   ├── parser.h            # Tokenization declarations
│   ├── process.h           # fork/exec/wait prototypes
│   ├── builtin.h           # Shell built-ins dispatcher
│   ├── fileops.h           # POSIX file system operations
│   ├── search.h            # Recursive directory walker & find
│   ├── perms.h             # Permissions and file metadata
│   ├── signals.h           # Signal handling declarations
│   ├── pipes.h             # Pipe execution declarations
│   ├── redirect.h          # Redirection handling declarations
│   └── thread.h            # POSIX background thread monitor
│
├── src/                    # Source files (.c)
│   ├── main.c              # REPL loop and dispatcher
│   ├── input.c             # Dynamic buffer input management
│   ├── parser.c            # Tokenizer
│   ├── process.c           # Process creation and execution
│   ├── builtin.c           # Built-in command implementations
│   ├── fileops.c           # touch, mkdir, rmdir, cat, cp, mv, rm, ls
│   ├── search.c            # find, recursive copy/remove/listing
│   ├── perms.c             # ls -l, stat, chmod, chown
│   ├── signals.c           # SIGINT & SIGCHLD handlers
│   ├── pipes.c             # Two-stage pipeline execution
│   ├── redirect.c          # >, >>, <, 2> redirection
│   └── thread.c            # Pthread background worker
│
├── tests/
│   └── run_tests.sh        # Automated verification script
└── bin/                    # Compiled binaries
```

---

## 🚀 Build and Run

### 1. Compile the Shell
```bash
make clean
make
```

### 2. Run ShellForge
```bash
make run
```
or directly:
```bash
./bin/shellforge
```

### 3. Build with AddressSanitizer (Memory Debugging)
```bash
make asan
./bin/shellforge
```

### 4. Execute Automated Test Suite
```bash
./tests/run_tests.sh
```

---

## 📊 System Calls Reference

| System Call | Purpose in ShellForge |
|---|---|
| `fork()` | Clones shell process to execute commands |
| `execvp()` | Replaces child image with binary in `$PATH` |
| `waitpid()` | Reaps children and synchronizes foreground execution |
| `pipe()` | Creates kernel buffer for Inter-Process Communication |
| `dup2()` | Clones file descriptors for redirection & pipelines |
| `open()` | Opens files with `O_CREAT`, `O_TRUNC`, `O_APPEND` |
| `read()` / `write()` | Low-level file I/O for `cat` and `cp` |
| `stat()` / `lstat()` | Inode metadata extraction for `ls -l` and `stat` |
| `opendir()` / `readdir()` | Directory stream traversal |
| `chmod()` | Updates permission bits |
| `rename()` | Atomic file moving |
| `unlink()` / `rmdir()` | File and directory removal |
| `signal()` | Installs `SIGINT` and `SIGCHLD` handlers |
| `pthread_create()` | Launches asynchronous background monitoring thread |
