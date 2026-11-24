#include <stdlib.h>
#include "../include/chunk.h"
#include "../include/memory.h"

void krb_init_chunk(Chunk *chunk)
{
    chunk->count = 0;
    chunk->capacity = 0;
    chunk->code = NULL;
    chunk->lines = NULL;
    krb_init_value_array(&chunk->constants);
}

void krb_write_chunk(Chunk *chunk, uint8_t byte, int line)
{
    if (chunk->capacity < chunk->count + 1)
    {
        int oldCapacity = chunk->capacity;
        chunk->capacity = GROW_CAPACITY(oldCapacity);
        chunk->code = GROW_ARRAY(uint8_t, chunk->code, oldCapacity, chunk->capacity);
        chunk->lines = GROW_ARRAY(int, chunk->lines, oldCapacity, chunk->capacity);
    }

    chunk->code[chunk->count] = byte;
    chunk->lines[chunk->count] = line;
    chunk->count++;
}

int krb_add_constant(Chunk *chunk, KrbValue value)
{
    for (int i = 0; i < chunk->constants.count; i++)
    {
        if (krb_values_equal(chunk->constants.values[i], value))
        {
            return i;
        }
    }
    krb_write_value_array(&chunk->constants, value);
    return chunk->constants.count - 1;
}

void krb_free_chunk(Chunk *chunk)
{
    FREE_ARRAY(uint8_t, chunk->code, chunk->capacity);
    FREE_ARRAY(int, chunk->lines, chunk->capacity);
    krb_free_value_array(&chunk->constants);
    krb_init_chunk(chunk);
}
