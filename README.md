# ShellForge — Unix Shell & File System Management
### Operating Systems and Systems Programming (OSSP) — Complete Project (Weeks 1 to 10 in One Nutshell)

ShellForge is a complete Unix-like command-line shell developed in C for Linux/Ubuntu. It integrates all 10 weekly milestones of Operating Systems & Systems Programming along with full POSIX File System Management into a single, cohesive, modular codebase.

---

## 🏛️ System Architecture

```text
                                User Input
                                     │
                                     ▼
                            +-----------------+
                            |    Tokenizer    | (strtok / dynamic argv[])
                            +-----------------+
                                     │
                 +-------------------+-------------------+
                 │                                       │
                 ▼                                       ▼
        [Pipeline Stage '|']                    [Redirection '>', '>>', '<', '2>']
        (pipe() + dup2())                       (open() + dup2())
                 │                                       │
                 +-------------------+-------------------+
                                     │
                 +-------------------+-------------------+
                 │                                       │
                 ▼                                       ▼
        [Built-in Commands]                     [External Programs]
        (Executed in Parent Shell)              (fork() + execvp() + waitpid())
        • cd, pwd, env, help, exit              • /bin/ls, grep, wc, sleep, etc.
        • touch, mkdir, rmdir, cat
        • cp (-r), mv, rm (-r), ls (-l, -R)
        • find, stat, chmod, chown
                 │                                       │
                 +-------------------+-------------------+
                                     │
                                     ▼
                             Linux POSIX Kernel
                                     │
                                     ▼
                      CPU • Memory • File System • IPC
```

---

## 📚 All Weeks in One Nutshell (Curriculum Overview)

All 10 modules are fully integrated into the codebase:

| Milestone | Topic | Core System Calls & Functions | Where in Code |
|---|---|---|---|
| **Week 1** | **Interactive REPL Loop** | `fgets()`, `printf()`, `strcmp()` | `src/main.c` |
| **Week 2** | **Dynamic Memory Model** | `malloc()`, `realloc()`, `free()` | `src/input.c`, `include/input.h` |
| **Week 3** | **Command Parsing & Lexical Analysis** | `strtok()`, dynamic `argv[]` vector | `src/parser.c`, `include/parser.h` |
| **Week 4** | **Process Lifecycle & Execution** | `fork()`, `execvp()`, `waitpid()` | `src/process.c`, `include/process.h` |
| **Week 5** | **Built-in Commands & Environment** | `chdir()`, `getcwd()`, `getenv()` | `src/builtin.c`, `include/builtin.h` |
| **Week 6** | **Signals & Process Control** | `signal()`, `SIGINT`, `SIGCHLD`, `WNOHANG` | `src/signals.c`, `include/signals.h` |
| **Week 7** | **Pipes & Inter-Process Communication** | `pipe()`, `dup2()`, `close()` | `src/pipes.c`, `include/pipes.h` |
| **Week 8** | **Memory Safety & Debugging** | Valgrind, GDB, AddressSanitizer (`-fsanitize=address`) | `Makefile` (`make asan`) |
| **Week 9** | **File Descriptors & Redirection** | `open()` (`O_CREAT`, `O_TRUNC`, `O_APPEND`), `dup2()` | `src/redirect.c`, `include/redirect.h` |
| **Week 10** | **POSIX Threads & Concurrency** | `pthread_create()`, `pthread_detach()` | `src/thread.c`, `include/thread.h` |
| **File System** | **File Operations, Search, Permissions** | `stat()`, `chmod()`, `chown()`, `opendir()`, `readdir()`, `unlink()`, `rename()` | `src/fileops.c`, `src/search.c`, `src/perms.c` |

---

## 📁 Repository Structure

```text
.
├── Makefile                # Unified build system with -pthread and -fsanitize=address
├── README.md               # Complete project documentation
├── .gitignore              # Ignores build artifacts and binaries
│
├── include/                # Header definitions
│   ├── shell.h             # Core constants and version
│   ├── input.h             # Dynamic line reading
│   ├── parser.h            # Tokenization declarations
│   ├── process.h           # fork / execvp / waitpid definitions
│   ├── builtin.h           # Built-in command dispatcher
│   ├── signals.h           # SIGINT & SIGCHLD signal handlers
│   ├── pipes.h             # Anonymous pipe IPC declarations
│   ├── redirect.h          # I/O redirection declarations
│   ├── thread.h            # POSIX background monitor thread
│   ├── fileops.h           # File operations (touch, mkdir, rmdir, cat, cp, mv, rm, ls)
│   ├── search.h            # Recursive walker & find tool
│   └── perms.h             # Permissions (ls -l, stat, chmod, chown)
│
├── src/                    # Source implementations
│   ├── main.c              # REPL loop, prompt, and master execution dispatcher
│   ├── input.c             # Dynamic buffer input management
│   ├── parser.c            # Tokenizer and argv[] builder
│   ├── process.c           # Child process execution
│   ├── builtin.c           # Shell built-in command handlers
│   ├── signals.c           # Signal handlers (Ctrl+C and zombie reaping)
│   ├── pipes.c             # Two-stage pipeline execution
│   ├── redirect.c          # >, >>, <, 2> stream redirection
│   ├── thread.c            # POSIX thread background worker
│   ├── fileops.c           # Low-level file system operations via system calls
│   ├── search.c            # Directory recursion, find, and tree walking
│   └── perms.c             # Inode permissions and metadata formatting
│
├── tests/
│   └── run_tests.sh        # Automated end-to-end test suite
└── bin/                    # Output directory for compiled binaries
```

---

## ⚡ Build and Run Instructions

### 1. Compile the Shell
```bash
make clean
make
```

### 2. Run ShellForge
```bash
make run
```
*or directly:*
```bash
./bin/shellforge
```

### 3. Run with AddressSanitizer (Memory Debugging)
```bash
make asan
./bin/shellforge
```

### 4. Run the Automated Test Suite
```bash
./tests/run_tests.sh
```

---

## 🧪 Demonstration & Test Commands

Inside the `myshell>` prompt, you can run all commands across all weeks:

```text
# 1. Built-in & Environment Commands (Week 5)
pwd
cd ..
pwd
env
help

# 2. Dynamic Input & External Programs (Weeks 2, 4)
ls
date
whoami

# 3. File Operations (System Calls)
mkdir demo
touch demo/sample.txt
cat demo/sample.txt

# 4. Stream Redirection (Week 9)
echo "Operating Systems PBL" > demo/sample.txt
cat < demo/sample.txt
echo "Second Line" >> demo/sample.txt
cat demo/sample.txt

# 5. Anonymous Pipelines (Week 7)
ls | wc
cat demo/sample.txt | grep Operating

# 6. Permissions & Metadata
ls -l demo
stat demo/sample.txt
chmod 644 demo/sample.txt

# 7. Recursive Operations & Search
cp -r demo demo_backup
find demo -name "*.txt"
ls -R demo
rm -r demo demo_backup

# 8. Signals (Week 6)
sleep 20          # Press Ctrl+C — the shell stays active!

# 9. Concurrency & Monitoring (Week 10)
# Notice [Monitor] ShellForge Running... prints every 10 seconds in the background!

# 10. Exit (Week 1)
exit
```

---

## 🛡️ Key System Calls Reference

| System Call | Purpose in ShellForge |
|---|---|
| `fork()` | Creates child process for external commands and pipeline stages |
| `execvp()` | Replaces child process image with the target executable |
| `waitpid()` | Synchronizes parent shell and reaps background zombies non-blockingly |
| `pipe()` | Creates kernel IPC buffer for process-to-process streaming |
| `dup2()` | Duplicates file descriptors to redirect stdin, stdout, and stderr |
| `open()` | Opens and creates files with `O_CREAT`, `O_TRUNC`, `O_APPEND` |
| `read()` / `write()` | Low-level file descriptor I/O used in `cat` and `cp` |
| `stat()` / `lstat()` | Inode metadata extraction for permissions, size, and timestamps |
| `opendir()` / `readdir()` | Directory stream reading and recursive tree traversal |
| `chmod()` / `chown()` | Modifies file permission bits and ownership |
| `unlink()` / `rmdir()` | Deletes files and directories |
| `signal()` | Traps `SIGINT` (<kbd>Ctrl</kbd>+<kbd>C</kbd>) and `SIGCHLD` |
| `pthread_create()` | Spawns asynchronous background monitoring thread |
