#include <stdlib.h>
#include <string.h>
#include "../include/table.h"
#include "../include/memory.h"

#define TABLE_MAX_LOAD 0.75

uint32_t krb_hash_string(const char *key, int length)
{
    uint32_t hash = 2166136261u;
    for (int i = 0; i < length; i++)
    {
        hash ^= (uint8_t)key[i];
        hash *= 16777619;
    }
    return hash;
}

void krb_init_table(Table *table)
{
    table->count = 0;
    table->capacity = 0;
    table->entries = NULL;
}

void krb_free_table(Table *table)
{
    FREE_ARRAY(Entry, table->entries, table->capacity);
    krb_init_table(table);
}

static Entry *find_entry(Entry *entries, int capacity, const char *key, int length, uint32_t hash)
{
    uint32_t index = hash % capacity;

    for (;;)
    {
        Entry *entry = &entries[index];
        if (!entry->isOccupied)
        {
            return entry;
        }

        if (entry->length == length && entry->hash == hash &&
            memcmp(entry->key, key, length) == 0)
        {
            return entry;
        }

        index = (index + 1) % capacity;
    }
}

static void adjust_capacity(Table *table, int capacity)
{
    Entry *entries = GROW_ARRAY(Entry, NULL, 0, capacity);
    for (int i = 0; i < capacity; i++)
    {
        entries[i].key = NULL;
        entries[i].length = 0;
        entries[i].hash = 0;
        entries[i].isOccupied = false;
        entries[i].isConst = false;
    }

    table->count = 0;
    for (int i = 0; i < table->capacity; i++)
    {
        Entry *entry = &table->entries[i];
        if (!entry->isOccupied)
            continue;

        Entry *dest = find_entry(entries, capacity, entry->key, entry->length, entry->hash);
        dest->key = entry->key;
        dest->length = entry->length;
        dest->hash = entry->hash;
        dest->value = entry->value;
        dest->isConst = entry->isConst;
        dest->isOccupied = true;
        table->count++;
    }

    FREE_ARRAY(Entry, table->entries, table->capacity);
    table->entries = entries;
    table->capacity = capacity;
}

bool krb_table_set(Table *table, const char *key, int length, KrbValue value, bool isConst)
{
    if (table->count + 1 > table->capacity * TABLE_MAX_LOAD)
    {
        int capacity = GROW_CAPACITY(table->capacity);
        adjust_capacity(table, capacity);
    }

    uint32_t hash = krb_hash_string(key, length);
    Entry *entry = find_entry(table->entries, table->capacity, key, length, hash);
    bool isNewKey = !entry->isOccupied;

    if (isNewKey)
        table->count++;

    entry->key = key;
    entry->length = length;
    entry->hash = hash;
    entry->value = value;
    entry->isConst = isConst;
    entry->isOccupied = true;

    return isNewKey;
}

bool krb_table_get(Table *table, const char *key, int length, KrbValue *value)
{
    if (table->count == 0)
        return false;

    uint32_t hash = krb_hash_string(key, length);
    Entry *entry = find_entry(table->entries, table->capacity, key, length, hash);
    if (!entry->isOccupied)
        return false;

    *value = entry->value;
    return true;
}

bool krb_table_assign(Table *table, const char *key, int length, KrbValue value)
{
    if (table->count == 0)
        return false;

    uint32_t hash = krb_hash_string(key, length);
    Entry *entry = find_entry(table->entries, table->capacity, key, length, hash);
    if (!entry->isOccupied)
        return false;

    if (entry->isConst)
    {
        return false;
    }

    entry->value = value;
    return true;
}

bool krb_table_delete(Table *table, const char *key, int length)
{
    if (table->count == 0)
        return false;
    uint32_t hash = krb_hash_string(key, length);
    Entry *entry = find_entry(table->entries, table->capacity, key, length, hash);
    if (!entry->isOccupied)
        return false;

    entry->isOccupied = false;
    entry->key = NULL;
    table->count--;

    uint32_t idx = (uint32_t)(entry - table->entries);
    uint32_t next = (idx + 1) % table->capacity;
    while (table->entries[next].isOccupied)
    {
        Entry reinsert = table->entries[next];
        table->entries[next].isOccupied = false;
        table->entries[next].key = NULL;
        table->count--;

        Entry *dest = find_entry(table->entries, table->capacity, reinsert.key, reinsert.length, reinsert.hash);
        *dest = reinsert;
        table->count++;
        next = (next + 1) % table->capacity;
    }
    return true;
}
