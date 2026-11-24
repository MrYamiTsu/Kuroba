#include <stdlib.h>
#include <stdio.h>
#include "../include/memory.h"

void *krb_reallocate(void *pointer, size_t oldSize, size_t newSize)
{
    (void)oldSize;

    if (newSize == 0)
    {
        free(pointer);
        return NULL;
    }

    void *result = realloc(pointer, newSize);

    if (result == NULL)
    {
        fprintf(stderr, "[Fatal Error] Out of memory: unable to allocate %zu bytes.\n", newSize);
        exit(1);
    }

    return result;
}
