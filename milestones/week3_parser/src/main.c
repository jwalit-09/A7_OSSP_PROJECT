#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "shell.h"
#include "input.h"
#include "parser.h"

int main(void)
{
    char *line;
    char **tokens;
    int i;
    printf("=====================================\n");
    printf("%s Version %s\n", SHELL_NAME, VERSION);
    printf("=====================================\n");
    while (1)
    {
        printf("myshell> ");
        line = read_line();
        if (strcmp(line, "exit") == 0)
        {
            free(line);
            break;
        }
        tokens = parse_line(line);
        printf("\nParsed Tokens\n");
        for (i = 0; tokens[i] != NULL; i++)
        {
            printf("argv[%d] = %s\n", i, tokens[i]);
        }
        free_tokens(tokens);
        free(line);
    }
    printf("Goodbye!\n");
    return 0;
}
