#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <sys/wait.h>
#include "redirect.h"

int execute_redirection(char **args)
{
    int i;
    for (i = 0; args[i] != NULL; i++)
    {
        /* Output redirection: > */
        if (strcmp(args[i], ">") == 0)
        {
            char *outfile = args[i + 1];
            if (outfile == NULL)
            {
                fprintf(stderr, "ShellForge: syntax error near unexpected token 'newline'\n");
                return 1;
            }
            args[i] = NULL;
            int fd = open(outfile, O_WRONLY | O_CREAT | O_TRUNC, 0644);
            if (fd < 0)
            {
                perror("open");
                return 1;
            }
            pid_t pid = fork();
            if (pid < 0)
            {
                perror("fork");
                close(fd);
                return 1;
            }
            if (pid == 0)
            {
                dup2(fd, STDOUT_FILENO);
                close(fd);
                execvp(args[0], args);
                perror("execvp");
                exit(EXIT_FAILURE);
            }
            close(fd);
            waitpid(pid, NULL, 0);
            return 1;
        }

        /* Append redirection: >> */
        if (strcmp(args[i], ">>") == 0)
        {
            char *outfile = args[i + 1];
            if (outfile == NULL)
            {
                fprintf(stderr, "ShellForge: syntax error near unexpected token 'newline'\n");
                return 1;
            }
            args[i] = NULL;
            int fd = open(outfile, O_WRONLY | O_CREAT | O_APPEND, 0644);
            if (fd < 0)
            {
                perror("open");
                return 1;
            }
            pid_t pid = fork();
            if (pid < 0)
            {
                perror("fork");
                close(fd);
                return 1;
            }
            if (pid == 0)
            {
                dup2(fd, STDOUT_FILENO);
                close(fd);
                execvp(args[0], args);
                perror("execvp");
                exit(EXIT_FAILURE);
            }
            close(fd);
            waitpid(pid, NULL, 0);
            return 1;
        }

        /* Input redirection: < */
        if (strcmp(args[i], "<") == 0)
        {
            char *infile = args[i + 1];
            if (infile == NULL)
            {
                fprintf(stderr, "ShellForge: syntax error near unexpected token 'newline'\n");
                return 1;
            }
            args[i] = NULL;
            int fd = open(infile, O_RDONLY);
            if (fd < 0)
            {
                perror("open");
                return 1;
            }
            pid_t pid = fork();
            if (pid < 0)
            {
                perror("fork");
                close(fd);
                return 1;
            }
            if (pid == 0)
            {
                dup2(fd, STDIN_FILENO);
                close(fd);
                execvp(args[0], args);
                perror("execvp");
                exit(EXIT_FAILURE);
            }
            close(fd);
            waitpid(pid, NULL, 0);
            return 1;
        }

        /* Error redirection: 2> */
        if (strcmp(args[i], "2>") == 0)
        {
            char *errfile = args[i + 1];
            if (errfile == NULL)
            {
                fprintf(stderr, "ShellForge: syntax error near unexpected token 'newline'\n");
                return 1;
            }
            args[i] = NULL;
            int fd = open(errfile, O_WRONLY | O_CREAT | O_TRUNC, 0644);
            if (fd < 0)
            {
                perror("open");
                return 1;
            }
            pid_t pid = fork();
            if (pid < 0)
            {
                perror("fork");
                close(fd);
                return 1;
            }
            if (pid == 0)
            {
                dup2(fd, STDERR_FILENO);
                close(fd);
                execvp(args[0], args);
                perror("execvp");
                exit(EXIT_FAILURE);
            }
            close(fd);
            waitpid(pid, NULL, 0);
            return 1;
        }
    }
    return 0;
}
