#ifndef SEARCH_H
#define SEARCH_H

int builtin_find(char **args);
int recursive_rm(const char *path);
int recursive_cp(const char *src, const char *dst);
int recursive_ls(const char *path);

#endif
