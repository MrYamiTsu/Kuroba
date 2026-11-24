#ifndef KUROBA_MEMORY_H
#define KUROBA_MEMORY_H

#include <stddef.h>

/**
 * Computes growth capacity for dynamic arrays:
 * Initial capacity is 8 when empty, then doubles (geometric resizing, amortized O(1)).
 */
#define GROW_CAPACITY(capacity) \
    ((capacity) < 8 ? 8 : (capacity) * 2)

/**
 * Helper macro to resize a typed heap-allocated array.
 */
#define GROW_ARRAY(type, pointer, oldCount, newCount) \
    (type*)krb_reallocate(pointer, sizeof(type) * (oldCount), \
        sizeof(type) * (newCount))

/**
 * Helper macro to free a typed heap-allocated array.
 */
#define FREE_ARRAY(type, pointer, oldCount) \
    krb_reallocate(pointer, sizeof(type) * (oldCount), 0)

/**
 * Central memory manager for the Kuroba runtime.
 * - newSize == 0: frees memory (free)
 * - pointer == NULL: allocates memory (malloc)
 * - otherwise: reallocates existing block (realloc)
 */
void* krb_reallocate(void* pointer, size_t oldSize, size_t newSize);

#endif // KUROBA_MEMORY_H
