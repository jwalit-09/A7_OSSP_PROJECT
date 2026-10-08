#ifndef FILEOPS_H
#define FILEOPS_H

int builtin_touch(char **args);
int builtin_mkdir(char **args);
int builtin_rmdir(char **args);
int builtin_cat(char **args);
int builtin_cp(char **args);
int builtin_mv(char **args);
int builtin_rm(char **args);
int builtin_ls(char **args);

#endif
