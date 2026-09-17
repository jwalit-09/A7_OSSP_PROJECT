# ShellForge

ShellForge is a C-based command-line shell developed for the Operating Systems and Systems Programming (OSSP) project.

The project is developed incrementally from a basic REPL to dynamic memory management, command parsing, process execution, built-in commands, environment variables, and signal/process control.

## Final Version

**ShellForge 6.0 – Weeks 1 to 6**

---

## Week 1 – REPL

- Interactive shell prompt
- Read commands from the user
- Continue accepting commands until `exit`

## Week 2 – Dynamic Memory

- Dynamic command input
- `malloc()`
- `realloc()`
- `free()`
- Input buffer expands automatically

The initial input buffer is 64 bytes and doubles when required.

## Week 3 – Command Parsing

- Tokenization using `strtok()`
- Dynamic token array
- NULL-terminated `argv[]`
- Parser separated into its own module

Example:

```text
ls -l /home
```

becomes:

```text
argv[0] = "ls"
argv[1] = "-l"
argv[2] = "/home"
argv[3] = NULL
```

## Week 4 – Process Execution

External commands are executed using:

```text
fork()
   |
   +---- Child ----> execvp()
   |
   +---- Parent ---> waitpid()
```

The parent waits for the foreground child to finish.

Invalid commands are reported using `perror()`.

## Week 5 – Built-in Commands and Environment Variables

Built-in commands:

```text
cd
pwd
clear
help
exit
env
```

`cd` executes in the shell process using `chdir()` so that the shell's current directory actually changes.

Environment variables are read using `getenv()`.

## Week 6 – Signals and Process Control

ShellForge handles:

- `SIGINT` – Ctrl+C
- `SIGTSTP` – Ctrl+Z
- `SIGCHLD` – child process termination

The shell remains active after Ctrl+C/Ctrl+Z.

The SIGCHLD handler cleans up terminated children using:

```c
waitpid(-1, NULL, WNOHANG);
```

The foreground child is protected from a SIGCHLD/waitpid race by temporarily blocking SIGCHLD while the parent performs its synchronous `waitpid()`.

---

## Final Repository Structure

```text
ShellForge/
├── Makefile
├── README.md
├── .gitignore
│
├── include/
│   ├── shell.h
│   ├── input.h
│   ├── parser.h
│   ├── process.h
│   ├── builtin.h
│   └── signals.h
│
├── src/
│   ├── main.c
│   ├── input.c
│   ├── parser.c
│   ├── process.c
│   ├── builtin.c
│   └── signals.c
│
├── docs/
│   ├── PROJECT_FLOW.md
│   └── WEEK_SUMMARY.md
│
├── tests/
│   └── test_commands.txt
│
├── screenshots/
└── bin/
```

---

## Build

From the ShellForge directory:

```bash
make clean
make
```

## Run

```bash
make run
```

or:

```bash
./bin/shellforge
```

---

## Test Cases

### Basic REPL

```text
myshell> hello
ShellForge: No such file or directory
myshell> exit
```

### Built-in commands

```text
myshell> pwd
myshell> cd ..
myshell> pwd
myshell> help
myshell> env
```

### External commands

```text
myshell> ls
myshell> ls -l
myshell> date
myshell> whoami
```

### Invalid command

```text
myshell> abcxyz
ShellForge: No such file or directory
```

### Dynamic input

Enter a command/input line longer than 64 characters. The input buffer automatically expands using `realloc()`.

### Ctrl+C

```text
myshell> sleep 20
```

Press `Ctrl+C`.

ShellForge should remain available.

### Ctrl+Z

Run:

```text
myshell> sleep 20
```

Press `Ctrl+Z`.

The child can be stopped while the shell itself remains active.

### Exit

```text
myshell> exit
```

---

## Internal Flow

```text
User
 |
 v
REPL
 |
 v
read_line()
 |
 v
parse_line()
 |
 v
argv[]
 |
 +----------------------+
 |                      |
 v                      v
Built-in?            External
 |                      |
Yes                     No
 |                      |
 v                      v
Shell process          fork()
                         |
                  +------+------+
                  |             |
                Parent        Child
                  |             |
               waitpid()     execvp()
                  |             |
                  +------+------+
                         |
                         v
                       Output
```

## Signal Flow

```text
Ctrl+C
   |
   v
SIGINT
   |
   v
Shell signal handler
   |
   v
Shell continues
```

```text
Ctrl+Z
   |
   v
SIGTSTP
   |
   v
Shell signal handler
   |
   v
Shell continues
```

```text
Child exits
    |
    v
SIGCHLD
    |
    v
SIGCHLD handler
    |
    v
waitpid(-1, NULL, WNOHANG)
    |
    v
Zombie cleanup
```

---

## Technologies

- C
- Linux / Ubuntu
- GCC
- Make
- POSIX APIs
- Git / GitHub
- Dynamic memory
- Process management
- Unix signals

Important functions used:

```text
malloc()
realloc()
free()

strtok()

fork()
execvp()
waitpid()

chdir()
getcwd()
getenv()

sigaction()
sigprocmask()
```

---

## Suggested Final Commit

```bash
git status
git add .
git commit -m "ShellForge: Completed Weeks 1-6 implementation"
git push origin main
```
