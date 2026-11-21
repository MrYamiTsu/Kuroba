#ifndef KUROBA_MEMORY_H
#define KUROBA_MEMORY_H

#include <stddef.h>

/**
 * Calcule la nouvelle capacité d'un tableau dynamique :
 * S'il est vide (< 8), on commence à 8.
 * Sinon, on double la capacité (stratégie géométrique O(1) amorti).
 */
#define GROW_CAPACITY(capacity) \
    ((capacity) < 8 ? 8 : (capacity) * 2)

/**
 * Macro utilitaire pour redimensionner un tableau typé sur la Heap.
 */
#define GROW_ARRAY(type, pointer, oldCount, newCount) \
    (type*)krb_reallocate(pointer, sizeof(type) * (oldCount), \
        sizeof(type) * (newCount))

/**
 * Macro pour libérer la mémoire d'un tableau sur la Heap.
 */
#define FREE_ARRAY(type, pointer, oldCount) \
    krb_reallocate(pointer, sizeof(type) * (oldCount), 0)

/**
 * La fonction centrale de gestion mémoire de Kuroba.
 * Si newSize == 0 : libère la mémoire (free).
 * Si pointer == NULL : alloue une nouvelle zone (malloc).
 * Sinon : agrandit ou rétrécit la zone existante (realloc).
 */
void* krb_reallocate(void* pointer, size_t oldSize, size_t newSize);

#endif // KUROBA_MEMORY_H
