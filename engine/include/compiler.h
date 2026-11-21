#ifndef KUROBA_COMPILER_H
#define KUROBA_COMPILER_H

#include <stdbool.h>
#include "chunk.h"
#include "object.h"

/**
 * Compile le code source Kuroba et renvoie la fonction de plus haut niveau (script).
 * Utilise la technique du Pratt Parsing pour une compilation Single-Pass (0 AST).
 */
ObjFunction* krb_compile(const char* source);

#endif // KUROBA_COMPILER_H
