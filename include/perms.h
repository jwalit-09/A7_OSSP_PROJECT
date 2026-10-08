#ifndef PERMS_H
#define PERMS_H

int builtin_ls_l(const char *dir_path);
int builtin_stat(char **args);
int builtin_chmod(char **args);
int builtin_chown(char **args);

#endif
