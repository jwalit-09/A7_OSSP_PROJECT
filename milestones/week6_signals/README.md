# ShellForge — Week 6: Signals & Process Control

## Features
- Custom `SIGINT` handler (survives Ctrl+C)
- Custom `SIGCHLD` handler to reap background zombie processes
- Signal architecture using `signal()`

## Build & Run
```bash
make clean
make
make run
```
