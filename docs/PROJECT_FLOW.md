# ShellForge Project Flow

## Week 1
REPL → read command → repeat

## Week 2
REPL → dynamic input → malloc/realloc/free

## Week 3
Input → tokenizer → argv[]

## Week 4
argv[] → fork() → execvp() → waitpid()

## Week 5
argv[] → built-in check

Built-in → parent shell process

External → fork → execvp → waitpid

## Week 6
Signal handlers:
- SIGINT
- SIGTSTP
- SIGCHLD

SIGCHLD → waitpid(WNOHANG) → zombie cleanup

Foreground execution blocks SIGCHLD temporarily so the parent waitpid() and SIGCHLD cleanup do not race.
