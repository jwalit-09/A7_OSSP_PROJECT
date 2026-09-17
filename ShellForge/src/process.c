#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>
#include "../include/process.h"

int execute(char **tokens)
{
    pid_t pid;
    int status = 0;
    sigset_t block_chld;
    sigset_t old_mask;

    if (tokens == NULL || tokens[0] == NULL)
        return 0;

    /*
     * Protect the foreground child from the SIGCHLD handler.
     * Otherwise the handler could reap the child before waitpid()
     * in the parent, causing a race.
     */
    sigemptyset(&block_chld);
    sigaddset(&block_chld, SIGCHLD);

    if (sigprocmask(SIG_BLOCK, &block_chld, &old_mask) == -1)
    {
        perror("sigprocmask");
        return -1;
    }

    pid = fork();

    if (pid == -1)
    {
        perror("fork");
        sigprocmask(SIG_SETMASK, &old_mask, NULL);
        return -1;
    }

    if (pid == 0)
    {
        /*
         * Child should have normal terminal signal behaviour.
         */
        struct sigaction default_action;

        default_action.sa_handler = SIG_DFL;
        sigemptyset(&default_action.sa_mask);
        default_action.sa_flags = 0;

        sigaction(SIGINT, &default_action, NULL);
        sigaction(SIGTSTP, &default_action, NULL);

        /*
         * SIGCHLD is not needed by the child.
         */
        sigprocmask(SIG_SETMASK, &old_mask, NULL);

        execvp(tokens[0], tokens);

        perror("ShellForge");
        _exit(EXIT_FAILURE);
    }

    /*
     * Parent waits for the foreground child while SIGCHLD is blocked.
     * This removes the race with sigchld_handler().
     */
    do
    {
        if (waitpid(pid, &status, WUNTRACED) == -1)
        {
            if (errno == EINTR)
                continue;

            perror("waitpid");
            sigprocmask(SIG_SETMASK, &old_mask, NULL);
            return -1;
        }

        break;
    }
    while (1);

    if (sigprocmask(SIG_SETMASK, &old_mask, NULL) == -1)
    {
        perror("sigprocmask");
        return -1;
    }

    return 1;
}
