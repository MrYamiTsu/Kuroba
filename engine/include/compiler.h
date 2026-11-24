#ifndef KUROBA_COMPILER_H
#define KUROBA_COMPILER_H

#include <stdbool.h>
#include "chunk.h"
#include "object.h"

/**
 * Compiles Kuroba source code and returns the top-level script function.
 * Uses single-pass Pratt Parsing directly generating bytecode without an AST.
 */
ObjFunction* krb_compile(const char* source);

#endif // KUROBA_COMPILER_H
