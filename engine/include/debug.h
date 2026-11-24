#ifndef KUROBA_DEBUG_H
#define KUROBA_DEBUG_H

#include "chunk.h"

/**
 * Disassembles an entire chunk and outputs a human-readable bytecode dump.
 */
void krb_disassemble_chunk(Chunk* chunk, const char* name);

/**
 * Disassembles a single instruction at the specified offset and returns the next offset.
 */
int krb_disassemble_instruction(Chunk* chunk, int offset);

#endif // KUROBA_DEBUG_H
