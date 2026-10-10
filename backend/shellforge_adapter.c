/*
 * shellforge_adapter.c  –  C adapter that exposes ShellForge filesystem
 * operations as a structured JSON-in / JSON-out CLI tool.
 *
 * The Node.js backend spawns this process with a single JSON line on stdin
 * and reads a single JSON line from stdout.  All sensitive path-traversal
 * validation happens here, inside the C layer, closest to the syscalls.
 *
 * Protocol (newline-delimited JSON):
 *   stdin:  { "op": "<operation>", "args": [...] }
 *   stdout: { "ok": true|false, "data": ..., "error": "..." }
 *
 * Supported operations:
 *   list       args: [path]
 *   stat       args: [path]
 *   read       args: [path]
 *   write      args: [path, content]
 *   mkdir      args: [path]
 *   touch      args: [path]
 *   remove     args: [path]           (file or directory, recursive)
 *   copy       args: [src, dst]
 *   move       args: [src, dst]
 *   chmod      args: [octal_mode, path]
 *   find       args: [root, name_pattern]
 *
 * Security:
 *   WORKSPACE env-var sets the permitted root (default /tmp/shellforge_ws).
 *   Every path is canonicalized with realpath() and checked against root.
 *   Symlinks pointing outside root are rejected.
 *
 * Compile:
 *   gcc -Wall -Wextra -g shellforge_adapter.c -o shellforge_adapter
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <dirent.h>
#include <time.h>
#include <pwd.h>
#include <grp.h>
#include <utime.h>
#include <fnmatch.h>
#include <limits.h>

/* ─── Configuration ─────────────────────────────────────── */

static char WORKSPACE[PATH_MAX];   /* populated from env at startup */

/* ─── Minimal JSON helpers ──────────────────────────────── */
/* We write JSON manually to avoid a third-party dependency. */

/* Escape a string for JSON output. Caller provides buffer. */
static void json_escape(const char *src, char *dst, size_t dstlen)
{
    size_t j = 0;
    for (size_t i = 0; src[i] && j + 6 < dstlen; i++) {
        unsigned char c = (unsigned char)src[i];
        if (c == '"')  { dst[j++] = '\\'; dst[j++] = '"';  }
        else if (c == '\\') { dst[j++] = '\\'; dst[j++] = '\\'; }
        else if (c == '\n') { dst[j++] = '\\'; dst[j++] = 'n';  }
        else if (c == '\r') { dst[j++] = '\\'; dst[j++] = 'r';  }
        else if (c == '\t') { dst[j++] = '\\'; dst[j++] = 't';  }
        else if (c < 0x20)  { j += snprintf(dst+j, dstlen-j, "\\u%04x", c); }
        else dst[j++] = (char)c;
    }
    dst[j] = '\0';
}

static void emit_ok(const char *json_data)
{
    printf("{\"ok\":true,\"data\":%s}\n", json_data);
    fflush(stdout);
}

static void emit_error(const char *msg)
{
    char esc[1024];
    json_escape(msg, esc, sizeof(esc));
    printf("{\"ok\":false,\"error\":\"%s\"}\n", esc);
    fflush(stdout);
}

/* ─── Path safety ───────────────────────────────────────── */

/*
 * Resolve 'user_path' relative to WORKSPACE.
 * Returns 1 and populates 'resolved' on success.
 * Returns 0 and emits an error if the path would escape the workspace.
 *
 * We handle the case where the path does not yet exist by resolving
 * the longest existing prefix and then appending the remainder.
 */
static int safe_resolve(const char *user_path, char *resolved, size_t len)
{
    char candidate[PATH_MAX];

    /* If the user_path is relative treat it as relative to WORKSPACE */
    if (user_path[0] == '/')
        snprintf(candidate, sizeof(candidate), "%s", user_path);
    else
        snprintf(candidate, sizeof(candidate), "%s/%s", WORKSPACE, user_path);

    /* Attempt full realpath resolution */
    if (realpath(candidate, resolved) != NULL) {
        /* Ensure it is inside WORKSPACE */
        size_t wlen = strlen(WORKSPACE);
        if (strncmp(resolved, WORKSPACE, wlen) != 0 ||
            (resolved[wlen] != '\0' && resolved[wlen] != '/')) {
            emit_error("Path traversal denied");
            return 0;
        }
        return 1;
    }

    /* Path doesn't fully exist yet – resolve parent and append basename */
    char tmp[PATH_MAX];
    snprintf(tmp, sizeof(tmp), "%s", candidate);

    /* Strip trailing slash */
    size_t tlen = strlen(tmp);
    while (tlen > 1 && tmp[tlen-1] == '/') tmp[--tlen] = '\0';

    /* Find last slash */
    char *slash = strrchr(tmp, '/');
    if (!slash) { emit_error("Invalid path"); return 0; }

    char base[NAME_MAX+1];
    strncpy(base, slash+1, sizeof(base)-1);
    base[sizeof(base)-1] = '\0';
    *slash = '\0';

    char parent_resolved[PATH_MAX];
    if (realpath(tmp, parent_resolved) == NULL) {
        char errbuf[256];
        snprintf(errbuf, sizeof(errbuf), "Cannot resolve path: %s", strerror(errno));
        emit_error(errbuf);
        return 0;
    }

    /* Check parent is inside workspace */
    size_t wlen = strlen(WORKSPACE);
    if (strncmp(parent_resolved, WORKSPACE, wlen) != 0 ||
        (parent_resolved[wlen] != '\0' && parent_resolved[wlen] != '/')) {
        emit_error("Path traversal denied");
        return 0;
    }

    snprintf(resolved, len, "%s/%s", parent_resolved, base);
    return 1;
}

/* ─── Mode string helper ────────────────────────────────── */

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

/* ─── Stat → JSON helper ────────────────────────────────── */

static void stat_to_json(const char *fullpath, const char *display_name,
                         const struct stat *st, char *out, size_t outlen)
{
    char perms[11];
    mode_to_string(st->st_mode, perms);

    struct passwd *pw = getpwuid(st->st_uid);
    struct group  *gr = getgrgid(st->st_gid);

    char mtime_str[32], atime_str[32];
    struct tm *tm_m = localtime(&st->st_mtime);
    struct tm *tm_a = localtime(&st->st_atime);
    strftime(mtime_str, sizeof(mtime_str), "%Y-%m-%dT%H:%M:%S", tm_m);
    strftime(atime_str, sizeof(atime_str), "%Y-%m-%dT%H:%M:%S", tm_a);

    /* Relative path = strip workspace prefix */
    const char *relpath = fullpath + strlen(WORKSPACE);
    if (*relpath == '/') relpath++;

    char name_esc[512], rel_esc[512], perms_esc[16];
    json_escape(display_name, name_esc, sizeof(name_esc));
    json_escape(relpath[0] ? relpath : display_name, rel_esc, sizeof(rel_esc));
    json_escape(perms, perms_esc, sizeof(perms_esc));

    snprintf(out, outlen,
        "{"
        "\"name\":\"%s\","
        "\"path\":\"%s\","
        "\"type\":\"%s\","
        "\"size\":%ld,"
        "\"permissions\":\"%s\","
        "\"octalMode\":\"%04o\","
        "\"uid\":%d,"
        "\"gid\":%d,"
        "\"owner\":\"%s\","
        "\"group\":\"%s\","
        "\"mtime\":\"%s\","
        "\"atime\":\"%s\","
        "\"inode\":%ld,"
        "\"nlink\":%ld,"
        "\"isDir\":%s,"
        "\"isSymlink\":%s"
        "}",
        name_esc,
        rel_esc,
        S_ISDIR(st->st_mode) ? "directory" : (S_ISLNK(st->st_mode) ? "symlink" : "file"),
        (long)st->st_size,
        perms_esc,
        (unsigned)(st->st_mode & 07777),
        (int)st->st_uid,
        (int)st->st_gid,
        pw ? pw->pw_name : "unknown",
        gr ? gr->gr_name : "unknown",
        mtime_str,
        atime_str,
        (long)st->st_ino,
        (long)st->st_nlink,
        S_ISDIR(st->st_mode) ? "true" : "false",
        S_ISLNK(st->st_mode) ? "true" : "false"
    );
}

/* ─── Operations ────────────────────────────────────────── */

/* op: list */
static void op_list(char **args, int argc)
{
    if (argc < 1) { emit_error("list: path required"); return; }

    char resolved[PATH_MAX];
    if (!safe_resolve(args[0], resolved, sizeof(resolved))) return;

    DIR *dir = opendir(resolved);
    if (!dir) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Cannot open directory: %s", strerror(errno));
        emit_error(msg);
        return;
    }

    /* Build JSON array */
    char buf[1 << 22];   /* 4 MB output buffer */
    size_t pos = 0;
    buf[pos++] = '[';

    struct dirent *ent;
    int first = 1;
    while ((ent = readdir(dir)) != NULL) {
        if (ent->d_name[0] == '.') continue;   /* skip hidden & . .. */

        char fullpath[PATH_MAX];
        snprintf(fullpath, sizeof(fullpath), "%s/%s", resolved, ent->d_name);

        struct stat st;
        if (lstat(fullpath, &st) == -1) continue;

        char entry_json[2048];
        stat_to_json(fullpath, ent->d_name, &st, entry_json, sizeof(entry_json));

        if (!first) buf[pos++] = ',';
        first = 0;
        size_t elen = strlen(entry_json);
        if (pos + elen + 4 >= sizeof(buf)) break;  /* safety: truncate */
        memcpy(buf+pos, entry_json, elen);
        pos += elen;
    }
    buf[pos++] = ']';
    buf[pos]   = '\0';
    closedir(dir);

    emit_ok(buf);
}

/* op: stat */
static void op_stat(char **args, int argc)
{
    if (argc < 1) { emit_error("stat: path required"); return; }

    char resolved[PATH_MAX];
    if (!safe_resolve(args[0], resolved, sizeof(resolved))) return;

    struct stat st;
    if (lstat(resolved, &st) == -1) {
        char msg[256];
        snprintf(msg, sizeof(msg), "stat: %s", strerror(errno));
        emit_error(msg);
        return;
    }

    /* basename */
    char *name = strrchr(resolved, '/');
    name = name ? name+1 : resolved;

    char entry_json[2048];
    stat_to_json(resolved, name, &st, entry_json, sizeof(entry_json));
    emit_ok(entry_json);
}

/* op: read */
static void op_read(char **args, int argc)
{
    if (argc < 1) { emit_error("read: path required"); return; }

    char resolved[PATH_MAX];
    if (!safe_resolve(args[0], resolved, sizeof(resolved))) return;

    struct stat st;
    if (stat(resolved, &st) == -1) {
        char msg[256]; snprintf(msg, sizeof(msg), "read: %s", strerror(errno));
        emit_error(msg); return;
    }
    if (S_ISDIR(st.st_mode)) { emit_error("read: is a directory"); return; }
    if (st.st_size > 512 * 1024) { emit_error("read: file too large (>512 KB)"); return; }

    int fd = open(resolved, O_RDONLY);
    if (fd < 0) {
        char msg[256]; snprintf(msg, sizeof(msg), "read: %s", strerror(errno));
        emit_error(msg); return;
    }

    size_t fsize = (size_t)st.st_size;
    char *raw = malloc(fsize + 1);
    if (!raw) { close(fd); emit_error("read: out of memory"); return; }

    ssize_t got = read(fd, raw, fsize);
    close(fd);
    raw[got < 0 ? 0 : got] = '\0';

    /* JSON-encode content */
    size_t esc_len = (size_t)(got < 0 ? 0 : got) * 6 + 64;
    char *esc = malloc(esc_len);
    if (!esc) { free(raw); emit_error("read: out of memory"); return; }
    json_escape(raw, esc, esc_len);
    free(raw);

    char *out = malloc(esc_len + 64);
    if (!out) { free(esc); emit_error("read: out of memory"); return; }
    sprintf(out, "{\"content\":\"%s\",\"size\":%ld}", esc, (long)(got < 0 ? 0 : got));
    emit_ok(out);
    free(esc);
    free(out);
}

/* op: write */
static void op_write(char **args, int argc)
{
    if (argc < 2) { emit_error("write: path and content required"); return; }

    char resolved[PATH_MAX];
    if (!safe_resolve(args[0], resolved, sizeof(resolved))) return;

    /* Make sure parent directory exists */
    char parent[PATH_MAX];
    snprintf(parent, sizeof(parent), "%s", resolved);
    char *slash = strrchr(parent, '/');
    if (slash) { *slash = '\0'; mkdir(parent, 0755); }

    int fd = open(resolved, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) {
        char msg[256]; snprintf(msg, sizeof(msg), "write: %s", strerror(errno));
        emit_error(msg); return;
    }

    size_t clen = strlen(args[1]);
    ssize_t written = write(fd, args[1], clen);
    close(fd);

    if (written < 0) {
        char msg[256]; snprintf(msg, sizeof(msg), "write: %s", strerror(errno));
        emit_error(msg); return;
    }

    char out[64];
    snprintf(out, sizeof(out), "{\"bytesWritten\":%zd}", written);
    emit_ok(out);
}

/* op: mkdir */
static void op_mkdir(char **args, int argc)
{
    if (argc < 1) { emit_error("mkdir: path required"); return; }

    char resolved[PATH_MAX];
    if (!safe_resolve(args[0], resolved, sizeof(resolved))) return;

    /* Recursive mkdir (like mkdir -p) */
    char tmp[PATH_MAX];
    snprintf(tmp, sizeof(tmp), "%s", resolved);
    for (char *p = tmp + strlen(WORKSPACE) + 1; *p; p++) {
        if (*p == '/') {
            *p = '\0';
            mkdir(tmp, 0755);
            *p = '/';
        }
    }
    if (mkdir(resolved, 0755) != 0 && errno != EEXIST) {
        char msg[256]; snprintf(msg, sizeof(msg), "mkdir: %s", strerror(errno));
        emit_error(msg); return;
    }
    emit_ok("{}");
}

/* op: touch */
static void op_touch(char **args, int argc)
{
    if (argc < 1) { emit_error("touch: path required"); return; }

    char resolved[PATH_MAX];
    if (!safe_resolve(args[0], resolved, sizeof(resolved))) return;

    /* Make sure parent dir exists */
    char parent[PATH_MAX];
    snprintf(parent, sizeof(parent), "%s", resolved);
    char *slash = strrchr(parent, '/');
    if (slash) { *slash = '\0'; mkdir(parent, 0755); }

    int fd = open(resolved, O_WRONLY | O_CREAT, 0644);
    if (fd < 0) {
        char msg[256]; snprintf(msg, sizeof(msg), "touch: %s", strerror(errno));
        emit_error(msg); return;
    }
    close(fd);
    utime(resolved, NULL);
    emit_ok("{}");
}

/* Helper: recursive remove */
static int recursive_rm_safe(const char *path)
{
    struct stat st;
    if (lstat(path, &st) == -1) return -1;

    if (S_ISDIR(st.st_mode)) {
        DIR *dir = opendir(path);
        if (!dir) return -1;
        struct dirent *ent;
        char sub[PATH_MAX];
        while ((ent = readdir(dir)) != NULL) {
            if (!strcmp(ent->d_name, ".") || !strcmp(ent->d_name, "..")) continue;
            snprintf(sub, sizeof(sub), "%s/%s", path, ent->d_name);
            recursive_rm_safe(sub);
        }
        closedir(dir);
        return rmdir(path);
    }
    return unlink(path);
}

/* op: remove */
static void op_remove(char **args, int argc)
{
    if (argc < 1) { emit_error("remove: path required"); return; }

    char resolved[PATH_MAX];
    if (!safe_resolve(args[0], resolved, sizeof(resolved))) return;

    /* Prevent deleting workspace root itself */
    if (strcmp(resolved, WORKSPACE) == 0) {
        emit_error("remove: cannot delete workspace root");
        return;
    }

    if (recursive_rm_safe(resolved) != 0) {
        char msg[256]; snprintf(msg, sizeof(msg), "remove: %s", strerror(errno));
        emit_error(msg); return;
    }
    emit_ok("{}");
}

/* Helper: recursive copy */
static int recursive_cp_safe(const char *src, const char *dst)
{
    struct stat st;
    if (lstat(src, &st) == -1) return -1;

    if (S_ISDIR(st.st_mode)) {
        mkdir(dst, 0755);
        DIR *dir = opendir(src);
        if (!dir) return -1;
        struct dirent *ent;
        char src_sub[PATH_MAX], dst_sub[PATH_MAX];
        while ((ent = readdir(dir)) != NULL) {
            if (!strcmp(ent->d_name, ".") || !strcmp(ent->d_name, "..")) continue;
            snprintf(src_sub, sizeof(src_sub), "%s/%s", src, ent->d_name);
            snprintf(dst_sub, sizeof(dst_sub), "%s/%s", dst, ent->d_name);
            recursive_cp_safe(src_sub, dst_sub);
        }
        closedir(dir);
        return 0;
    }

    /* Regular file copy using read()/write() — from ShellForge fileops.c */
    int sfd = open(src, O_RDONLY);
    if (sfd < 0) return -1;
    int dfd = open(dst, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (dfd < 0) { close(sfd); return -1; }
    char buf[65536];
    ssize_t n;
    while ((n = read(sfd, buf, sizeof(buf))) > 0)
        write(dfd, buf, n);
    close(sfd);
    close(dfd);
    return 0;
}

/* op: copy */
static void op_copy(char **args, int argc)
{
    if (argc < 2) { emit_error("copy: src and dst required"); return; }

    char src[PATH_MAX], dst[PATH_MAX];
    if (!safe_resolve(args[0], src, sizeof(src))) return;
    if (!safe_resolve(args[1], dst, sizeof(dst))) return;

    if (recursive_cp_safe(src, dst) != 0) {
        char msg[256]; snprintf(msg, sizeof(msg), "copy: %s", strerror(errno));
        emit_error(msg); return;
    }
    emit_ok("{}");
}

/* op: move (rename or cross-fs copy+delete) */
static void op_move(char **args, int argc)
{
    if (argc < 2) { emit_error("move: src and dst required"); return; }

    char src[PATH_MAX], dst[PATH_MAX];
    if (!safe_resolve(args[0], src, sizeof(src))) return;
    if (!safe_resolve(args[1], dst, sizeof(dst))) return;

    if (rename(src, dst) != 0) {
        if (errno == EXDEV) {
            /* Cross-filesystem: copy then delete */
            if (recursive_cp_safe(src, dst) == 0)
                recursive_rm_safe(src);
            else {
                char msg[256]; snprintf(msg, sizeof(msg), "move: %s", strerror(errno));
                emit_error(msg); return;
            }
        } else {
            char msg[256]; snprintf(msg, sizeof(msg), "move: %s", strerror(errno));
            emit_error(msg); return;
        }
    }
    emit_ok("{}");
}

/* op: chmod */
static void op_chmod(char **args, int argc)
{
    if (argc < 2) { emit_error("chmod: octal_mode and path required"); return; }

    char resolved[PATH_MAX];
    if (!safe_resolve(args[1], resolved, sizeof(resolved))) return;

    char *end;
    long mode = strtol(args[0], &end, 8);
    if (*end != '\0') { emit_error("chmod: invalid octal mode"); return; }

    if (chmod(resolved, (mode_t)mode) != 0) {
        char msg[256]; snprintf(msg, sizeof(msg), "chmod: %s", strerror(errno));
        emit_error(msg); return;
    }
    emit_ok("{}");
}

/* op: find (recursive, name pattern) */
static int find_recursive(const char *root, const char *base_path,
                          const char *pattern, char *out, size_t *pos, size_t max,
                          int *first)
{
    DIR *dir = opendir(base_path);
    if (!dir) return 0;

    struct dirent *ent;
    while ((ent = readdir(dir)) != NULL) {
        if (!strcmp(ent->d_name, ".") || !strcmp(ent->d_name, "..")) continue;

        char fullpath[PATH_MAX];
        snprintf(fullpath, sizeof(fullpath), "%s/%s", base_path, ent->d_name);

        struct stat st;
        if (lstat(fullpath, &st) == -1) continue;

        if (fnmatch(pattern, ent->d_name, FNM_CASEFOLD) == 0) {
            char entry_json[2048];
            stat_to_json(fullpath, ent->d_name, &st, entry_json, sizeof(entry_json));
            size_t elen = strlen(entry_json);
            if (*pos + elen + 4 < max) {
                if (!(*first)) out[(*pos)++] = ',';
                *first = 0;
                memcpy(out + *pos, entry_json, elen);
                *pos += elen;
            }
        }

        if (S_ISDIR(st.st_mode))
            find_recursive(root, fullpath, pattern, out, pos, max, first);
    }
    closedir(dir);
    return 0;
}

static void op_find(char **args, int argc)
{
    if (argc < 2) { emit_error("find: root and pattern required"); return; }

    char resolved[PATH_MAX];
    if (!safe_resolve(args[0], resolved, sizeof(resolved))) return;

    char *buf = malloc(1 << 22);   /* 4 MB */
    if (!buf) { emit_error("find: out of memory"); return; }

    size_t pos = 0;
    buf[pos++] = '[';
    int first = 1;
    find_recursive(resolved, resolved, args[1], buf, &pos, (1<<22)-4, &first);
    buf[pos++] = ']';
    buf[pos]   = '\0';

    emit_ok(buf);
    free(buf);
}

/* ─── Minimal JSON parse for input ─────────────────────── */
/*
 * We parse only the very simple protocol:
 *   {"op":"<name>","args":["a","b",...]}
 * This avoids a JSON library dependency.
 */

/* Skip whitespace */
static const char *skip_ws(const char *p) {
    while (*p == ' ' || *p == '\t' || *p == '\n' || *p == '\r') p++;
    return p;
}

/* Consume a JSON string into buf[]. Returns pointer past closing quote or NULL. */
static const char *parse_string(const char *p, char *buf, size_t blen)
{
    p = skip_ws(p);
    if (*p != '"') return NULL;
    p++;
    size_t i = 0;
    while (*p && *p != '"') {
        if (*p == '\\') {
            p++;
            if (*p == 'n') buf[i++] = '\n';
            else if (*p == 't') buf[i++] = '\t';
            else if (*p == 'r') buf[i++] = '\r';
            else if (*p == '"') buf[i++] = '"';
            else if (*p == '\\') buf[i++] = '\\';
            else if (*p == '/') buf[i++] = '/';
            else buf[i++] = *p;
        } else {
            if (i + 1 < blen) buf[i++] = *p;
        }
        p++;
    }
    if (*p == '"') p++;
    buf[i] = '\0';
    return p;
}

/* ─── Main ──────────────────────────────────────────────── */

int main(void)
{
    /* Determine workspace */
    const char *ws_env = getenv("SHELLFORGE_WORKSPACE");
    if (ws_env)
        snprintf(WORKSPACE, sizeof(WORKSPACE), "%s", ws_env);
    else
        snprintf(WORKSPACE, sizeof(WORKSPACE), "/tmp/shellforge_ws");

    /* Ensure workspace exists */
    mkdir(WORKSPACE, 0755);

    /* Canonicalize workspace path */
    char resolved_ws[PATH_MAX];
    if (realpath(WORKSPACE, resolved_ws) == NULL) {
        emit_error("Cannot resolve workspace");
        return 1;
    }
    snprintf(WORKSPACE, sizeof(WORKSPACE), "%s", resolved_ws);

    /* Read one line of JSON from stdin */
    static char line[1 << 20];   /* 1 MB input buffer for write content */
    if (!fgets(line, sizeof(line), stdin)) {
        emit_error("No input");
        return 1;
    }

    /* Parse: {"op":"...","args":[...]} */
    const char *p = skip_ws(line);
    if (*p != '{') { emit_error("Invalid JSON input"); return 1; }
    p++;

    char op[64] = "";
    char *args[32];
    static char arg_store[32][512 * 1024];   /* static to avoid stack overflow */
    int arg_count = 0;

    while (*p && *p != '}') {
        p = skip_ws(p);
        char key[64];
        p = parse_string(p, key, sizeof(key));
        if (!p) break;
        p = skip_ws(p);
        if (*p != ':') break;
        p++;
        p = skip_ws(p);

        if (strcmp(key, "op") == 0) {
            p = parse_string(p, op, sizeof(op));
        } else if (strcmp(key, "args") == 0) {
            if (*p != '[') break;
            p++;
            while (*p && *p != ']') {
                p = skip_ws(p);
                if (*p == '"' && arg_count < 32) {
                    p = parse_string(p, arg_store[arg_count], sizeof(arg_store[arg_count]));
                    args[arg_count] = arg_store[arg_count];
                    arg_count++;
                }
                p = skip_ws(p);
                if (*p == ',') p++;
            }
            if (*p == ']') p++;
        } else {
            /* skip unknown value */
            p++;
        }
        p = skip_ws(p);
        if (*p == ',') p++;
    }

    if (op[0] == '\0') { emit_error("Missing 'op' field"); return 1; }

    /* Dispatch */
    if      (strcmp(op, "list")   == 0) op_list  (args, arg_count);
    else if (strcmp(op, "stat")   == 0) op_stat  (args, arg_count);
    else if (strcmp(op, "read")   == 0) op_read  (args, arg_count);
    else if (strcmp(op, "write")  == 0) op_write (args, arg_count);
    else if (strcmp(op, "mkdir")  == 0) op_mkdir (args, arg_count);
    else if (strcmp(op, "touch")  == 0) op_touch (args, arg_count);
    else if (strcmp(op, "remove") == 0) op_remove(args, arg_count);
    else if (strcmp(op, "copy")   == 0) op_copy  (args, arg_count);
    else if (strcmp(op, "move")   == 0) op_move  (args, arg_count);
    else if (strcmp(op, "chmod")  == 0) op_chmod (args, arg_count);
    else if (strcmp(op, "find")   == 0) op_find  (args, arg_count);
    else {
        char msg[128];
        snprintf(msg, sizeof(msg), "Unknown operation: %s", op);
        emit_error(msg);
    }

    return 0;
}
