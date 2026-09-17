#include <signal.h>
#include <sys/wait.h>
#include <unistd.h>
#include "../include/signals.h"

static void sigint_handler(int sig)
{
    (void)sig;

    const char message[] =
        "\nShellForge: Press 'exit' to quit.\nmyshell> ";

    write(STDOUT_FILENO, message, sizeof(message) - 1);
}

static void sigtstp_handler(int sig)
{
    (void)sig;

    const char message[] =
        "\nShellForge: Press 'exit' to quit.\nmyshell> ";

    write(STDOUT_FILENO, message, sizeof(message) - 1);
}

static void sigchld_handler(int sig)
{
    (void)sig;

    /*
     * Reap children that are not being waited for synchronously.
     * The foreground child is protected by blocking SIGCHLD in
     * process.c until its waitpid() has completed.
     */
    while (waitpid(-1, NULL, WNOHANG) > 0)
    {
        /* Reap all available terminated children. */
    }
}

static void install_handler(int signo, void (*handler)(int))
{
    struct sigaction action;

    action.sa_handler = handler;
    sigemptyset(&action.sa_mask);
    action.sa_flags = SA_RESTART;

    if (sigaction(signo, &action, NULL) == -1)
    {
        const char message[] = "ShellForge: sigaction failed\n";
        write(STDERR_FILENO, message, sizeof(message) - 1);
        _exit(1);
    }
}

void initialize_signals(void)
{
    install_handler(SIGINT, sigint_handler);
    install_handler(SIGTSTP, sigtstp_handler);
    install_handler(SIGCHLD, sigchld_handler);
}
