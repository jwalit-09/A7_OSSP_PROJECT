#include <stdio.h>
#include <stdlib.h>
#include "../include/input.h"

#define INITIAL_SIZE 64

char *read_line(void)
{
    int size = INITIAL_SIZE;
    int position = 0;
    char *buffer = malloc((size_t)size);

    if (buffer == NULL)
    {
        fprintf(stderr, "Memory Allocation Failed\n");
        exit(EXIT_FAILURE);
    }

    while (1)
    {
        int ch = getchar();

        if (ch == EOF || ch == '\n')
        {
            buffer[position] = '\0';
            return buffer;
        }

        buffer[position++] = (char)ch;

        if (position >= size)
        {
            size *= 2;

            char *new_buffer = realloc(buffer, (size_t)size);
            if (new_buffer == NULL)
            {
                free(buffer);
                fprintf(stderr, "Memory Allocation Failed\n");
                exit(EXIT_FAILURE);
            }

            buffer = new_buffer;
        }
    }
}
