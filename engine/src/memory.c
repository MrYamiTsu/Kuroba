#include <stdlib.h>
#include <stdio.h>
#include "../include/memory.h"

void* krb_reallocate(void* pointer, size_t oldSize, size_t newSize) {
    (void)oldSize; // Utile plus tard pour le profilage et le Garbage Collector

    // Si la nouvelle taille demandée est 0, on libère le bloc
    if (newSize == 0) {
        free(pointer);
        return NULL;
    }

    // Sinon, on redimensionne (ou alloue si pointer == NULL)
    void* result = realloc(pointer, newSize);

    // Si le système d'exploitation n'a plus de RAM disponible
    if (result == NULL) {
        fprintf(stderr, "[Fatal Error] Out of memory: unable to allocate %zu bytes.\n", newSize);
        exit(1);
    }

    return result;
}
