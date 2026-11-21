#ifndef KUROBA_TABLE_H
#define KUROBA_TABLE_H

#include <stdbool.h>
#include <stdint.h>
#include "value.h"

/**
 * Entrée d'une table de hachage :
 * Clé (nom de la variable), son hash précalculé, et la valeur associée.
 */
typedef struct {
    const char* key;
    int length;
    uint32_t hash;
    KrbValue value;
    bool isConst;
    bool isOccupied;
} Entry;

/**
 * Table de hachage haute performance (Open Addressing & Linear Probing).
 * C'est le dictionnaire O(1) qui stocke les variables globales de Kuroba.
 */
typedef struct {
    int count;
    int capacity;
    Entry* entries;
} Table;

// Fonctions de la Table de Hachage
void krb_init_table(Table* table);
void krb_free_table(Table* table);
bool krb_table_set(Table* table, const char* key, int length, KrbValue value, bool isConst);
bool krb_table_get(Table* table, const char* key, int length, KrbValue* value);
bool krb_table_assign(Table* table, const char* key, int length, KrbValue value);
bool krb_table_delete(Table* table, const char* key, int length);
uint32_t krb_hash_string(const char* key, int length);

#endif // KUROBA_TABLE_H
