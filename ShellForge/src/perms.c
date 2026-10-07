#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <pwd.h>
#include <grp.h>
#include <time.h>
#include <dirent.h>
#include <errno.h>
#include "perms.h"

/* Helper to convert st_mode bits to standard drwxr-xr-x string */
static void mode_to_string(mode_t mode, char *str)
{
    str[0] = S_ISDIR(mode) ? 'd' : (S_ISLNK(mode) ? 'l' : '-');
    str[1] = (mode & S_IRUSR) ? 'r' : '-';
    str[2] = (mode & S_IWUSR) ? 'w' : '-';
    str[3] = (mode & S_IXUSR) ? 'x' : '-';
    str[4] = (mode & S_IRGRP) ? 'r' : '-';
    str[5] = (mode & S_IWGRP) ? 'w' : '-';
    str[6] = (mode & S_IXGRP) ? 'x' : '-';
    str[7] = (mode & S_IROTH) ? 'r' : '-';
    str[8] = (mode & S_IWOTH) ? 'w' : '-';
    str[9] = (mode & S_IXOTH) ? 'x' : '-';
    str[10] = '\0';
}

/* ls -l implementation using stat(), getpwuid(), getgrgid(), strftime() */
int builtin_ls_l(const char *dir_path)
{
    DIR *dir = opendir(dir_path);
    if (!dir)
    {
        /* Check if it is a single file */
        struct stat st;
        if (lstat(dir_path, &st) == 0)
        {
            char perms[11];
            mode_to_string(st.st_mode, perms);
            struct passwd *pw = getpwuid(st.st_uid);
            struct group *gr = getgrgid(st.st_gid);
            char time_buf[64];
            struct tm *tm_info = localtime(&st.st_mtime);
            strftime(time_buf, sizeof(time_buf), "%b %d %H:%M", tm_info);

            printf("%s %2ld %-8s %-8s %8ld %s %s\n",
                   perms, (long)st.st_nlink,
                   pw ? pw->pw_name : "unknown",
                   gr ? gr->gr_name : "unknown",
                   (long)st.st_size, time_buf, dir_path);
            return 1;
        }
        fprintf(stderr, "ls: cannot access '%s': %s\n", dir_path, strerror(errno));
        return 1;
    }

    struct dirent *entry;
    char path[1024];
    while ((entry = readdir(dir)) != NULL)
    {
        if (entry->d_name[0] == '.')
            continue;

        snprintf(path, sizeof(path), "%s/%s", dir_path, entry->d_name);
        struct stat st;
        if (lstat(path, &st) == -1)
            continue;

        char perms[11];
        mode_to_string(st.st_mode, perms);
        struct passwd *pw = getpwuid(st.st_uid);
        struct group *gr = getgrgid(st.st_gid);
        char time_buf[64];
        struct tm *tm_info = localtime(&st.st_mtime);
        strftime(time_buf, sizeof(time_buf), "%b %d %H:%M", tm_info);

        printf("%s %2ld %-8s %-8s %8ld %s %s\n",
               perms, (long)st.st_nlink,
               pw ? pw->pw_name : "unknown",
               gr ? gr->gr_name : "unknown",
               (long)st.st_size, time_buf, entry->d_name);
    }
    closedir(dir);
    return 1;
}

/* stat command: prints detailed metadata */
int builtin_stat(char **args)
{
    if (args[1] == NULL)
    {
        fprintf(stderr, "stat: missing operand\n");
        return 1;
    }

    for (int i = 1; args[i] != NULL; i++)
    {
        struct stat st;
        if (stat(args[i], &st) == -1)
        {
            fprintf(stderr, "stat: cannot stat '%s': %s\n", args[i], strerror(errno));
            continue;
        }

        char perms[11];
        mode_to_string(st.st_mode, perms);
        struct passwd *pw = getpwuid(st.st_uid);
        struct group *gr = getgrgid(st.st_gid);

        printf("  File: %s\n", args[i]);
        printf("  Size: %-15ld Blocks: %-10ld IO Block: %-6ld %s\n",
               (long)st.st_size, (long)st.st_blocks, (long)st.st_blksize,
               S_ISDIR(st.st_mode) ? "directory" : "regular file");
        printf("Device: %-15ld Inode: %-11ld Links: %ld\n",
               (long)st.st_dev, (long)st.st_ino, (long)st.st_nlink);
        printf("Access: (%04o/%s)  Uid: (%5d/%8s)   Gid: (%5d/%8s)\n",
               st.st_mode & 07777, perms,
               st.st_uid, pw ? pw->pw_name : "unknown",
               st.st_gid, gr ? gr->gr_name : "unknown");

        char atime[64], mtime[64], ctime_str[64];
        strftime(atime, sizeof(atime), "%Y-%m-%d %H:%M:%S", localtime(&st.st_atime));
        strftime(mtime, sizeof(mtime), "%Y-%m-%d %H:%M:%S", localtime(&st.st_mtime));
        strftime(ctime_str, sizeof(ctime_str), "%Y-%m-%d %H:%M:%S", localtime(&st.st_ctime));

        printf("Access: %s\n", atime);
        printf("Modify: %s\n", mtime);
        printf("Change: %s\n", ctime_str);
    }
    return 1;
}

/* chmod: changes file mode bits using chmod() system call */
int builtin_chmod(char **args)
{
    if (args[1] == NULL || args[2] == NULL)
    {
        fprintf(stderr, "chmod: missing operand (usage: chmod <octal_mode> <file>)\n");
        return 1;
    }

    char *endptr;
    long mode = strtol(args[1], &endptr, 8);
    if (*endptr != '\0')
    {
        fprintf(stderr, "chmod: invalid mode '%s'\n", args[1]);
        return 1;
    }

    for (int i = 2; args[i] != NULL; i++)
    {
        if (chmod(args[i], (mode_t)mode) != 0)
        {
            fprintf(stderr, "chmod: changing permissions of '%s': %s\n", args[i], strerror(errno));
        }
    }
    return 1;
}

/* chown: changes owner and group */
int builtin_chown(char **args)
{
    if (args[1] == NULL || args[2] == NULL)
    {
        fprintf(stderr, "chown: missing operand (usage: chown <user> <file>)\n");
        return 1;
    }

    struct passwd *pw = getpwnam(args[1]);
    if (!pw)
    {
        fprintf(stderr, "chown: invalid user: '%s'\n", args[1]);
        return 1;
    }

    for (int i = 2; args[i] != NULL; i++)
    {
        if (chown(args[i], pw->pw_uid, (gid_t)-1) != 0)
        {
            fprintf(stderr, "chown: changing ownership of '%s': %s\n", args[i], strerror(errno));
        }
    }
    return 1;
}
