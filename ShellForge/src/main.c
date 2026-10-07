#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/shell.h"
#include "../include/input.h"
#include "../include/parser.h"
#include "../include/process.h"
#include "../include/builtin.h"
#include "../include/signals.h"
#include "../include/pipes.h"
#include "../include/redirect.h"
#include "../include/thread.h"

static void tokenize(char *str, char **argv)
{
    int i = 0;
    char *token = strtok(str, " \t\n");
    while (token != NULL)
    {
        argv[i++] = token;
        token = strtok(NULL, " \t\n");
    }
    argv[i] = NULL;
}

int main(void)
{
    char *line;
    char **tokens;

    initialize_signals();
    start_monitor_thread();

    printf("=====================================\n");
    printf(" Welcome to %s Version %s\n", SHELL_NAME, VERSION);
    printf("=====================================\n");

    while (1)
    {
        printf("myshell> ");
        fflush(stdout);

        line = read_line();
        if (line == NULL)
        {
            printf("\nExiting ShellForge...\n");
            break;
        }

        if (strlen(line) == 0)
        {
            free(line);
            continue;
        }

        /* Check for pipe: | */
        if (strchr(line, '|') != NULL)
        {
            char *argv1[64];
            char *argv2[64];
            char *left = strtok(line, "|");
            char *right = strtok(NULL, "|");

            if (left == NULL || right == NULL)
            {
                printf("Invalid pipe command\n");
            }
            else
            {
                tokenize(left, argv1);
                tokenize(right, argv2);
                if (argv1[0] != NULL && argv2[0] != NULL)
                {
                    execute_pipe(argv1, argv2);
                }
                else
                {
                    printf("Invalid pipe command\n");
                }
            }
            free(line);
            continue;
        }

        /* Normal command (check exit, builtin, redirect, external) */
        tokens = parse_line(line);
        if (tokens[0] != NULL)
        {
            if (strcmp(tokens[0], "exit") == 0)
            {
                free_tokens(tokens);
                free(line);
                printf("Exiting ShellForge...\n");
                break;
            }

            if (execute_builtin(tokens) == 0)
            {
                if (execute_redirection(tokens) == 0)
                {
                    execute(tokens);
                }
            }
        }

        free_tokens(tokens);
        free(line);
    }

    return 0;
}
