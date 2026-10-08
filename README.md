# ShellForge — File System Management Shell & Weekly Milestones

ShellForge is a Unix-like interactive command-line shell developed in C for the **Operating Systems and Systems Programming (OSSP)** Project-Based Learning curriculum.

This repository contains both:
1. **The Complete Unified Shell** in `ShellForge/` (Weeks 1 through 10 + File System Management Shell).
2. **Weekly Milestone Implementations** in `milestones/` (Isolated, independently compilable folders for Week 1 through Week 6).

---

## 📂 Repository Structure

```text
A7_OSSP_PROJECT/
├── README.md               # Main project documentation
│
├── milestones/             # Independent weekly lab submissions (Weeks 1 to 6)
│   ├── week1_repl/         # Week 1: Basic REPL Loop & Makefile
│   ├── week2_memory/       # Week 2: Dynamic Memory (malloc, realloc, free)
│   ├── week3_parser/       # Week 3: Tokenizer & argv[] Construction
│   ├── week4_processes/    # Week 4: Process Execution (fork, execvp, waitpid)
│   ├── week5_builtins/     # Week 5: Built-in Commands (cd, pwd, env, etc.)
│   └── week6_signals/      # Week 6: Signal Handling (SIGINT, SIGCHLD)
│
└── ShellForge/             # Full Final Project (Weeks 1 to 10 + File System Management)
    ├── Makefile            # Build system with -pthread and -fsanitize=address
    ├── include/            # All header files
    ├── src/                # All C implementation modules
    ├── tests/              # Automated end-to-end test suite
    └── README.md           # ShellForge specific documentation
```

---

## 🏃 How to Run Each Weekly Milestone (Week 1 to Week 6)

Each milestone folder is completely standalone with its own Makefile and source code:

### Week 1: Basic REPL Loop
```bash
cd milestones/week1_repl
make clean && make
make run
```

### Week 2: Dynamic Memory Management
```bash
cd milestones/week2_memory
make clean && make
make run
```

### Week 3: Command Parser
```bash
cd milestones/week3_parser
make clean && make
make run
```

### Week 4: Process Execution
```bash
cd milestones/week4_processes
make clean && make
make run
```

### Week 5: Built-in Commands & Environment Variables
```bash
cd milestones/week5_builtins
make clean && make
make run
```

### Week 6: Signals & Process Control
```bash
cd milestones/week6_signals
make clean && make
make run
```

---

## 🚀 How to Run the Complete Final Shell (Weeks 1 to 10 + File System Shell)

The full shell incorporates:
- **Week 7**: Anonymous Pipes (`cmd1 | cmd2`) via `pipe()` and `dup2()`
- **Week 8**: Memory Debugging & Valgrind verification
- **Week 9**: Stream Redirection (`>`, `>>`, `<`, `2>`)
- **Week 10**: POSIX Background Thread Monitoring (`pthread_create`)
- **File System Shell**: `touch`, `mkdir`, `rmdir`, `cat`, `cp -r`, `mv`, `rm -r`, `find`, `ls -l`, `stat`, `chmod`, `chown`

```bash
cd ShellForge
make clean && make
make run
```

### Run Automated Test Suite
```bash
cd ShellForge
./tests/run_tests.sh
```

---

## 📊 System Calls & Concepts Covered

| Week / Phase | Concepts Demonstrated | System Calls / APIs |
|---|---|---|
| **Week 1** | REPL Loop, Make build automation, Git workflow | `fgets()`, `strcmp()` |
| **Week 2** | Dynamic memory heap management | `malloc()`, `realloc()`, `free()` |
| **Week 3** | Lexical analysis, command line arguments | `strtok()`, `argv[]` array |
| **Week 4** | Process creation and lifecycle | `fork()`, `execvp()`, `waitpid()` |
| **Week 5** | Shell built-ins, working directory, environment | `chdir()`, `getcwd()`, `getenv()` |
| **Week 6** | Asynchronous signals, zombie reaping | `signal()`, `SIGINT`, `SIGCHLD`, `WNOHANG` |
| **Week 7** | Inter-Process Communication (IPC), Pipelines | `pipe()`, `dup2()`, `close()` |
| **Week 8** | Memory safety, leak detection, defensive coding | `valgrind`, `gdb`, AddressSanitizer |
| **Week 9** | File descriptors, stream redirection | `open()`, `O_CREAT`, `O_TRUNC`, `O_APPEND` |
| **Week 10** | Multithreading, background concurrency | `pthread_create()`, `pthread_detach()` |
| **File System Shell** | Inode inspection, permissions, recursive ops | `stat()`, `chmod()`, `opendir()`, `readdir()`, `unlink()` |
