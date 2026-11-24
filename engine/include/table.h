#ifndef KUROBA_TABLE_H
#define KUROBA_TABLE_H

#include <stdbool.h>
#include <stdint.h>
#include "value.h"

/**
 * Hash table entry:
 * Holds string key pointer, length, cached hash, associated value, and state flags.
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
 * High-performance hash table using Open Addressing and Linear Probing.
 * Serves as the primary O(1) dictionary for globals, fields, and method tables.
 */
typedef struct {
    int count;
    int capacity;
    Entry* entries;
} Table;

// Hash table manipulation functions
void krb_init_table(Table* table);
void krb_free_table(Table* table);
bool krb_table_set(Table* table, const char* key, int length, KrbValue value, bool isConst);
bool krb_table_get(Table* table, const char* key, int length, KrbValue* value);
bool krb_table_assign(Table* table, const char* key, int length, KrbValue value);
bool krb_table_delete(Table* table, const char* key, int length);
uint32_t krb_hash_string(const char* key, int length);

#endif // KUROBA_TABLE_H
