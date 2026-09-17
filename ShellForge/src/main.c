#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/shell.h"
#include "../include/input.h"
#include "../include/parser.h"
#include "../include/process.h"
#include "../include/builtin.h"
#include "../include/signals.h"

int main(void)
{
    char *line;
    char **tokens;

    initialize_signals();

    printf("=====================================\n");
    printf("%s Version %s\n", SHELL_NAME, VERSION);
    printf("=====================================\n");

    while (1)
    {
        printf("myshell> ");
        fflush(stdout);

        line = read_line();

        if (line == NULL)
            break;

        if (strlen(line) == 0)
        {
            free(line);
            continue;
        }

        tokens = parse_line(line);

        if (tokens[0] != NULL)
        {
            if (execute_builtin(tokens) == 0)
                execute(tokens);
        }

        free_tokens(tokens);
        free(line);
    }

    return 0;
}
