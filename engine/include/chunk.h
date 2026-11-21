#ifndef KUROBA_CHUNK_H
#define KUROBA_CHUNK_H

#include <stdint.h>
#include "value.h"

/**
 * Les OpCodes (Codes Opération) de la Machine Virtuelle Kuroba.
 * Chaque instruction est encodée sur un seul octet (uint8_t, de 0 à 255).
 */
typedef enum {
    OP_CONSTANT,      // Charge une constante depuis le pool de constantes
    OP_POP,           // Dépile et jette la valeur au sommet
    OP_PASTE,         // Affiche la valeur sans saut de ligne (paste)
    OP_PASTELN,       // Affiche la valeur avec saut de ligne (pasteLn)
    OP_PASTELN_EMPTY, // Affiche un saut de ligne vide (pasteLn())
    OP_DEFINE_GLOBAL, // Définit une variable globale mutable (ivar)
    OP_DEFINE_CONST,  // Définit une constante globale immuable (iconst)
    OP_GET_GLOBAL,    // Lit une variable globale
    OP_SET_GLOBAL,    // Réassigne une variable globale existante
    OP_GET_LOCAL,     // Lit une variable locale depuis la pile (1 opérande : slot)
    OP_SET_LOCAL,     // Modifie une variable locale sur la pile (1 opérande : slot)
    OP_ADD,           // Additionne les deux valeurs au sommet de la pile (+)
    OP_SUBTRACT,      // Soustrait (-)
    OP_MULTIPLY,      // Multiplie (*)
    OP_DIVIDE,        // Divise (/)
    OP_MODULO,        // Modulo (%)
    OP_NEGATE,        // Opposé unaire (-x)
    OP_NOT,           // Négation logique (!x)
    OP_EQUAL,         // Égalité (==)
    OP_GREATER,       // Plus grand que (>)
    OP_LESS,          // Plus petit que (<)
    OP_JUMP,          // Saut inconditionnel en avant (2 octets d'offset)
    OP_JUMP_IF_FALSE, // Saut conditionnel si faux (2 octets d'offset)
    OP_LOOP,          // Saut inconditionnel en arriere pour les boucles (2 octets d'offset)
    OP_CALL,          // Appel de fonction (1 opérande : nombre d'arguments)
    OP_BUILD_LIST,    // Construit une liste (1 opérande : nombre d'éléments)
    OP_BUILD_TABLE,   // Construit une table associative (1 opérande : nombre d'entrées)
    OP_GET_INDEX,     // Accès par index [i] ou clé
    OP_SET_INDEX,     // Assignation par index [i] = val
    OP_CLASS,         // Crée une classe (1 opérande : index constante nom)
    OP_GET_PROPERTY,  // Lit une propriété .champ (1 opérande : index constante nom)
    OP_SET_PROPERTY,  // Assigne une propriété .champ = val (1 opérande : index constante nom)
    OP_METHOD,        // Lie une méthode à une classe (1 opérande : index constante nom)
    OP_INVOKE,        // Appel direct d'une méthode instance.methode(...) (2 opérandes : index constante nom, argCount)
    OP_SWAP,          // Échange atomique de deux valeurs
    OP_DUP,           // Duplique le sommet de la pile
    OP_DUP2,          // Duplique les deux valeurs au sommet de la pile
    OP_TRY,           // Bloc try (catch_offset 2 bytes, finally_offset 2 bytes)
    OP_TRY_END,       // Fin normale d'un bloc try (dépile le gestionnaire)
    OP_THROW,         // Déclenche une exception
    OP_IS,            // Opérateur d'appartenance / type (is)
    OP_KILL,          // Destruction de variable (kill)
    OP_CLOSURE,       // Crée une fermeture (closure)
    OP_GET_UPVALUE,   // Lit une upvalue capturée
    OP_SET_UPVALUE,   // Modifie une upvalue capturée
    OP_CLOSE_UPVALUE, // Ferme une upvalue
    OP_COERCE,        // Transtypage dynamique
    OP_CHECK_NON_NULL,// Vérifie le contrat non-nullable
    OP_DEF_NON_NULL,  // Déclare un contrat non-nullable pour un global
    OP_MARK_QUEUE,    // Marque une liste comme file FIFO
    OP_INHERIT,       // Lie la superclasse
    OP_CLASS_FIELD,   // Enregistre un champ par défaut et sa visibilité
    OP_SUPER_INVOKE,  // Appel méthode de la classe parente
    OP_ITER_KEY,      // Récupère la clé / l'index d'itération
    OP_ITER_VAL,      // Récupère la valeur d'itération
    OP_IMPLEMENT,     // Enregistre l'implémentation d'une interface
    OP_HOOK_SAVE_METHOD, // Sauvegarde la méthode originale avant hook (1 opérande : index constante nom)
    OP_DEFINE_SEALED, // Définit une variable scellée (isealed)
    OP_UNLOCK_VAR,    // Déverrouille une variable scellée (unlock)
    OP_LOCK_VAR,      // Re-verrouille manuellement une variable scellée (lock)
    OP_RETURN,        // Retourne / termine l'exécution
} OpCode;

/**
 * Un Chunk (bloc de bytecode) contient :
 * 1. 'code' : La suite brute des octets d'instructions.
 * 2. 'lines' : Le numéro de ligne source correspondant à chaque instruction (pour le debug).
 * 3. 'constants' : Le pool des constantes (nombres, textes) associées au chunk.
 */
typedef struct {
    int count;
    int capacity;
    uint8_t* code;
    int* lines;
    KrbValueArray constants;
} Chunk;

// Fonctions du Chunk
void krb_init_chunk(Chunk* chunk);
void krb_write_chunk(Chunk* chunk, uint8_t byte, int line);
int krb_add_constant(Chunk* chunk, KrbValue value);
void krb_free_chunk(Chunk* chunk);

#endif // KUROBA_CHUNK_H
