# ShellForge

ShellForge is an interactive shell project developed for Operating Systems / Systems Programming practical sessions.

## Week 2 – The C Toolchain and Memory Model

### Features

- Dynamic command input
- Memory allocation using `malloc()`
- Automatic buffer expansion using `realloc()`
- Proper memory cleanup using `free()`
- Modular code using header and source files
- Support for commands longer than a fixed-size input buffer

## Project Structure

```text
ShellForge/
├── Makefile
├── README.md
├── .gitignore
├── include/
│   ├── shell.h
│   └── input.h
├── src/
│   ├── main.c
│   └── input.c
├── docs/
├── tests/
├── screenshots/
└── bin/
```

## Build

```bash
make clean
make
```

## Run

```bash
make run
```

## Example

```text
=================================
ShellForge Version 2.0
=================================
myshell> hello
You entered : hello
myshell> This is a very very very long command without any fixed limit
You entered : This is a very very very long command without any fixed limit
myshell> exit
Goodbye!
```

## Memory Management

The input buffer starts with 64 bytes. When the buffer becomes full, its size is doubled using `realloc()`. Every dynamically allocated input line is released with `free()` after use.

## Week 2 Git Commit

Suggested commit message:

```text
Week 2: Added dynamic input buffer using malloc and realloc
```
