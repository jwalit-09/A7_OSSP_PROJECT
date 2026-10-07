#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include "builtin.h"
#include "fileops.h"
#include "search.h"
#include "perms.h"

int execute_builtin(char **args)
{
    char cwd[1024];
    if (args[0] == NULL)
        return 1;

    /* exit */
    if (strcmp(args[0], "exit") == 0)
    {
        exit(EXIT_SUCCESS);
    }

    /* pwd */
    if (strcmp(args[0], "pwd") == 0)
    {
        if (getcwd(cwd, sizeof(cwd)) != NULL)
            printf("%s\n", cwd);
        else
            perror("pwd");
        return 1;
    }

    /* cd */
    if (strcmp(args[0], "cd") == 0)
    {
        if (args[1] == NULL)
        {
            char *home = getenv("HOME");
            if (home)
                chdir(home);
            else
                printf("Usage : cd directory\n");
        }
        else
        {
            if (chdir(args[1]) != 0)
                perror("cd");
        }
        return 1;
    }

    /* clear */
    if (strcmp(args[0], "clear") == 0)
    {
        system("clear");
        return 1;
    }

    /* help */
    if (strcmp(args[0], "help") == 0)
    {
        printf("\nFile System Management Shell Built-in Commands\n");
        printf("==============================================\n");
        printf("Directory & System : cd, pwd, clear, exit, env, help\n");
        printf("Basic File Ops     : touch, mkdir, rmdir, cat, cp, mv, rm, ls\n");
        printf("Recursive & Search : find, ls -R, cp -r, rm -r\n");
        printf("Permissions & Info : ls -l, stat, chmod, chown\n");
        printf("Pipes & Redirection: cmd1 | cmd2, >, >>, <, 2>\n");
        return 1;
    }

    /* env */
    if (strcmp(args[0], "env") == 0)
    {
        printf("HOME = %s\n", getenv("HOME"));
        printf("USER = %s\n", getenv("USER"));
        printf("PATH = %s\n", getenv("PATH"));
        return 1;
    }

    /* touch */
    if (strcmp(args[0], "touch") == 0)
        return builtin_touch(args);

    /* mkdir */
    if (strcmp(args[0], "mkdir") == 0)
        return builtin_mkdir(args);

    /* rmdir */
    if (strcmp(args[0], "rmdir") == 0)
        return builtin_rmdir(args);

    /* cat */
    if (strcmp(args[0], "cat") == 0)
        return builtin_cat(args);

    /* cp (handles -r / -R) */
    if (strcmp(args[0], "cp") == 0)
    {
        if (args[1] != NULL && (strcmp(args[1], "-r") == 0 || strcmp(args[1], "-R") == 0))
        {
            if (args[2] == NULL || args[3] == NULL)
            {
                fprintf(stderr, "cp: missing destination operand\n");
                return 1;
            }
            return recursive_cp(args[2], args[3]) == 0 ? 1 : 1;
        }
        return builtin_cp(args);
    }

    /* mv */
    if (strcmp(args[0], "mv") == 0)
        return builtin_mv(args);

    /* rm (handles -r / -R) */
    if (strcmp(args[0], "rm") == 0)
    {
        if (args[1] != NULL && (strcmp(args[1], "-r") == 0 || strcmp(args[1], "-R") == 0 || strcmp(args[1], "-rf") == 0))
        {
            for (int i = 2; args[i] != NULL; i++)
            {
                if (strcmp(args[i], "/") == 0 || strcmp(args[i], ".") == 0 || strcmp(args[i], "..") == 0)
                {
                    fprintf(stderr, "rm: refusing to recursively remove '%s'\n", args[i]);
                    continue;
                }
                recursive_rm(args[i]);
            }
            return 1;
        }
        return builtin_rm(args);
    }

    /* ls (handles -l and -R) */
    if (strcmp(args[0], "ls") == 0)
    {
        if (args[1] != NULL && strcmp(args[1], "-l") == 0)
        {
            const char *target = args[2] ? args[2] : ".";
            return builtin_ls_l(target);
        }
        if (args[1] != NULL && strcmp(args[1], "-R") == 0)
        {
            const char *target = args[2] ? args[2] : ".";
            return recursive_ls(target) == 0 ? 1 : 1;
        }
        return builtin_ls(args);
    }

    /* find */
    if (strcmp(args[0], "find") == 0)
        return builtin_find(args);

    /* stat */
    if (strcmp(args[0], "stat") == 0)
        return builtin_stat(args);

    /* chmod */
    if (strcmp(args[0], "chmod") == 0)
        return builtin_chmod(args);

    /* chown */
    if (strcmp(args[0], "chown") == 0)
        return builtin_chown(args);

    return 0;
}
