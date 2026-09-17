#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include "../include/builtin.h"

int execute_builtin(char **args)
{
    char cwd[1024];

    if (args == NULL || args[0] == NULL)
        return 1;

    if (strcmp(args[0], "exit") == 0)
    {
        exit(EXIT_SUCCESS);
    }

    if (strcmp(args[0], "pwd") == 0)
    {
        if (getcwd(cwd, sizeof(cwd)) != NULL)
            printf("%s\n", cwd);
        else
            perror("pwd");

        return 1;
    }

    if (strcmp(args[0], "cd") == 0)
    {
        if (args[1] == NULL)
        {
            printf("Usage : cd directory\n");
        }
        else if (chdir(args[1]) != 0)
        {
            perror("cd");
        }

        return 1;
    }

    if (strcmp(args[0], "clear") == 0)
    {
        /*
         * The practical specifies clear as a built-in.
         * system("clear") invokes the platform's clear utility.
         */
        if (system("clear") == -1)
            perror("clear");

        return 1;
    }

    if (strcmp(args[0], "help") == 0)
    {
        printf("\nBuilt-in Commands\n");
        printf("---------------------------\n");
        printf("cd\n");
        printf("pwd\n");
        printf("clear\n");
        printf("exit\n");
        printf("help\n");
        printf("env\n");

        return 1;
    }

    if (strcmp(args[0], "env") == 0)
    {
        const char *home = getenv("HOME");
        const char *user = getenv("USER");
        const char *path = getenv("PATH");

        printf("HOME = %s\n", home ? home : "");
        printf("USER = %s\n", user ? user : "");
        printf("PATH = %s\n", path ? path : "");

        return 1;
    }

    return 0;
}
