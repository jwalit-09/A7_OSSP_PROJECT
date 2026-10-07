#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <dirent.h>
#include <sys/stat.h>
#include <fnmatch.h>
#include <errno.h>
#include "search.h"
#include "fileops.h"

/* Recursive directory traversal for find command */
static void find_walk(const char *dir_path, const char *pattern, char type_filter)
{
    DIR *dir = opendir(dir_path);
    if (!dir)
    {
        fprintf(stderr, "find: '%s': %s\n", dir_path, strerror(errno));
        return;
    }

    struct dirent *entry;
    char path[1024];

    while ((entry = readdir(dir)) != NULL)
    {
        if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0)
            continue;

        snprintf(path, sizeof(path), "%s/%s", dir_path, entry->d_name);

        struct stat st;
        if (lstat(path, &st) == -1)
            continue;

        int matches_type = 1;
        if (type_filter == 'f' && !S_ISREG(st.st_mode))
            matches_type = 0;
        if (type_filter == 'd' && !S_ISDIR(st.st_mode))
            matches_type = 0;

        int matches_name = 1;
        if (pattern != NULL && fnmatch(pattern, entry->d_name, 0) != 0)
            matches_name = 0;

        if (matches_type && matches_name)
        {
            printf("%s\n", path);
        }

        if (S_ISDIR(st.st_mode))
        {
            find_walk(path, pattern, type_filter);
        }
    }
    closedir(dir);
}

int builtin_find(char **args)
{
    const char *start_dir = ".";
    const char *pattern = NULL;
    char type_filter = 0;

    int i = 1;
    if (args[1] != NULL && args[1][0] != '-')
    {
        start_dir = args[1];
        i = 2;
    }

    while (args[i] != NULL)
    {
        if (strcmp(args[i], "-name") == 0 && args[i + 1] != NULL)
        {
            pattern = args[i + 1];
            i += 2;
        }
        else if (strcmp(args[i], "-type") == 0 && args[i + 1] != NULL)
        {
            type_filter = args[i + 1][0];
            i += 2;
        }
        else
        {
            i++;
        }
    }

    find_walk(start_dir, pattern, type_filter);
    return 1;
}

/* Recursive deletion for rm -r */
int recursive_rm(const char *path)
{
    struct stat st;
    if (lstat(path, &st) == -1)
    {
        fprintf(stderr, "rm: cannot access '%s': %s\n", path, strerror(errno));
        return -1;
    }

    if (S_ISDIR(st.st_mode))
    {
        DIR *dir = opendir(path);
        if (!dir)
        {
            fprintf(stderr, "rm: cannot open '%s': %s\n", path, strerror(errno));
            return -1;
        }
        struct dirent *entry;
        char subpath[1024];
        while ((entry = readdir(dir)) != NULL)
        {
            if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0)
                continue;
            snprintf(subpath, sizeof(subpath), "%s/%s", path, entry->d_name);
            recursive_rm(subpath);
        }
        closedir(dir);
        if (rmdir(path) != 0)
        {
            fprintf(stderr, "rm: failed to remove directory '%s': %s\n", path, strerror(errno));
            return -1;
        }
    }
    else
    {
        if (unlink(path) != 0)
        {
            fprintf(stderr, "rm: failed to remove '%s': %s\n", path, strerror(errno));
            return -1;
        }
    }
    return 0;
}

/* Recursive copy for cp -r */
int recursive_cp(const char *src, const char *dst)
{
    struct stat st;
    if (lstat(src, &st) == -1)
    {
        fprintf(stderr, "cp: cannot access '%s': %s\n", src, strerror(errno));
        return -1;
    }

    if (S_ISDIR(st.st_mode))
    {
        mkdir(dst, 0755);
        DIR *dir = opendir(src);
        if (!dir) return -1;
        struct dirent *entry;
        char src_sub[1024], dst_sub[1024];
        while ((entry = readdir(dir)) != NULL)
        {
            if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0)
                continue;
            snprintf(src_sub, sizeof(src_sub), "%s/%s", src, entry->d_name);
            snprintf(dst_sub, sizeof(dst_sub), "%s/%s", dst, entry->d_name);
            recursive_cp(src_sub, dst_sub);
        }
        closedir(dir);
    }
    else
    {
        char *cp_args[4] = {"cp", (char *)src, (char *)dst, NULL};
        builtin_cp(cp_args);
    }
    return 0;
}

/* Recursive directory listing for ls -R */
int recursive_ls(const char *path)
{
    DIR *dir = opendir(path);
    if (!dir)
    {
        fprintf(stderr, "ls: cannot open '%s': %s\n", path, strerror(errno));
        return -1;
    }

    printf("\n%s:\n", path);
    struct dirent *entry;
    char subdirs[256][1024];
    int subdir_count = 0;

    while ((entry = readdir(dir)) != NULL)
    {
        if (entry->d_name[0] == '.')
            continue;
        printf("%s  ", entry->d_name);

        char subpath[1024];
        snprintf(subpath, sizeof(subpath), "%s/%s", path, entry->d_name);
        struct stat st;
        if (lstat(subpath, &st) == 0 && S_ISDIR(st.st_mode))
        {
            if (subdir_count < 256)
            {
                strncpy(subdirs[subdir_count++], subpath, sizeof(subdirs[0]));
            }
        }
    }
    printf("\n");
    closedir(dir);

    for (int i = 0; i < subdir_count; i++)
    {
        recursive_ls(subdirs[i]);
    }
    return 0;
}
