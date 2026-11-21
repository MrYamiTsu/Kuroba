#ifndef KUROBA_DEBUG_H
#define KUROBA_DEBUG_H

#include "chunk.h"

/**
 * Désassemble l'intégralité d'un chunk pour l'afficher de façon lisible.
 */
void krb_disassemble_chunk(Chunk* chunk, const char* name);

/**
 * Désassemble une seule instruction à l'offset donné et renvoie l'offset suivant.
 */
int krb_disassemble_instruction(Chunk* chunk, int offset);

#endif // KUROBA_DEBUG_H
