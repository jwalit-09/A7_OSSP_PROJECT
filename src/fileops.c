#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <dirent.h>
#include <errno.h>
#include <utime.h>
#include "fileops.h"

/* touch: creates file with open() O_CREAT or updates access/mod times */
int builtin_touch(char **args)
{
    if (args[1] == NULL)
    {
        fprintf(stderr, "touch: missing file operand\n");
        return 1;
    }
    for (int i = 1; args[i] != NULL; i++)
    {
        int fd = open(args[i], O_WRONLY | O_CREAT, 0644);
        if (fd < 0)
        {
            fprintf(stderr, "touch: cannot touch '%s': %s\n", args[i], strerror(errno));
            continue;
        }
        close(fd);
        /* Update timestamps */
        utime(args[i], NULL);
    }
    return 1;
}

/* mkdir: creates directory with mkdir() system call (0755 permissions) */
int builtin_mkdir(char **args)
{
    if (args[1] == NULL)
    {
        fprintf(stderr, "mkdir: missing operand\n");
        return 1;
    }
    for (int i = 1; args[i] != NULL; i++)
    {
        if (mkdir(args[i], 0755) != 0)
        {
            fprintf(stderr, "mkdir: cannot create directory '%s': %s\n", args[i], strerror(errno));
        }
    }
    return 1;
}

/* rmdir: removes empty directory using rmdir() system call */
int builtin_rmdir(char **args)
{
    if (args[1] == NULL)
    {
        fprintf(stderr, "rmdir: missing operand\n");
        return 1;
    }
    for (int i = 1; args[i] != NULL; i++)
    {
        if (rmdir(args[i]) != 0)
        {
            fprintf(stderr, "rmdir: failed to remove '%s': %s\n", args[i], strerror(errno));
        }
    }
    return 1;
}

/* cat: reads from file descriptor and writes to stdout using read/write */
int builtin_cat(char **args)
{
    if (args[1] == NULL)
    {
        char buffer[4096];
        ssize_t bytes;
        while ((bytes = read(STDIN_FILENO, buffer, sizeof(buffer))) > 0)
        {
            if (write(STDOUT_FILENO, buffer, bytes) < 0)
            {
                perror("cat: write error");
                break;
            }
        }
        return 1;
    }
    for (int i = 1; args[i] != NULL; i++)
    {
        int fd = open(args[i], O_RDONLY);
        if (fd < 0)
        {
            fprintf(stderr, "cat: %s: %s\n", args[i], strerror(errno));
            continue;
        }
        char buffer[4096];
        ssize_t bytes;
        while ((bytes = read(fd, buffer, sizeof(buffer))) > 0)
        {
            if (write(STDOUT_FILENO, buffer, bytes) < 0)
            {
                perror("cat: write error");
                break;
            }
        }
        close(fd);
    }
    return 1;
}

/* cp: copies file using low-level read() and write() loop */
int builtin_cp(char **args)
{
    if (args[1] == NULL || args[2] == NULL)
    {
        fprintf(stderr, "cp: missing file operands (usage: cp <source> <dest>)\n");
        return 1;
    }
    int src_fd = open(args[1], O_RDONLY);
    if (src_fd < 0)
    {
        fprintf(stderr, "cp: cannot open '%s': %s\n", args[1], strerror(errno));
        return 1;
    }
    int dest_fd = open(args[2], O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (dest_fd < 0)
    {
        fprintf(stderr, "cp: cannot create '%s': %s\n", args[2], strerror(errno));
        close(src_fd);
        return 1;
    }
    char buffer[4096];
    ssize_t bytes;
    while ((bytes = read(src_fd, buffer, sizeof(buffer))) > 0)
    {
        if (write(dest_fd, buffer, bytes) != bytes)
        {
            fprintf(stderr, "cp: error writing to '%s': %s\n", args[2], strerror(errno));
            break;
        }
    }
    close(src_fd);
    close(dest_fd);
    return 1;
}

/* mv: renames file using rename() system call */
int builtin_mv(char **args)
{
    if (args[1] == NULL || args[2] == NULL)
    {
        fprintf(stderr, "mv: missing file operands (usage: mv <source> <dest>)\n");
        return 1;
    }
    if (rename(args[1], args[2]) != 0)
    {
        /* If cross-filesystem error, fallback to copy and delete */
        if (errno == EXDEV)
        {
            if (builtin_cp(args) == 1)
            {
                unlink(args[1]);
            }
        }
        else
        {
            fprintf(stderr, "mv: cannot move '%s' to '%s': %s\n", args[1], args[2], strerror(errno));
        }
    }
    return 1;
}

/* rm: unlinks file using unlink() system call */
int builtin_rm(char **args)
{
    if (args[1] == NULL)
    {
        fprintf(stderr, "rm: missing operand\n");
        return 1;
    }
    for (int i = 1; args[i] != NULL; i++)
    {
        if (unlink(args[i]) != 0)
        {
            fprintf(stderr, "rm: cannot remove '%s': %s\n", args[i], strerror(errno));
        }
    }
    return 1;
}

/* ls: directory listing using opendir, readdir, and closedir */
int builtin_ls(char **args)
{
    const char *dir_path = (args[1] == NULL) ? "." : args[1];
    DIR *dir = opendir(dir_path);
    if (dir == NULL)
    {
        fprintf(stderr, "ls: cannot open directory '%s': %s\n", dir_path, strerror(errno));
        return 1;
    }
    struct dirent *entry;
    while ((entry = readdir(dir)) != NULL)
    {
        if (entry->d_name[0] == '.')
            continue;
        printf("%s  ", entry->d_name);
    }
    printf("\n");
    closedir(dir);
    return 1;
}
