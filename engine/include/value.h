#ifndef KUROBA_VALUE_H
#define KUROBA_VALUE_H

#include <stdbool.h>
#include <stdint.h>

typedef enum {
    VAL_NULL,
    VAL_BOOL,
    VAL_INT,
    VAL_FLOAT,
    VAL_STRING,
    VAL_OBJ,
} ValueType;

struct Obj;
typedef struct Obj Obj;

typedef union {
    bool boolean;
    int64_t integer;
    double number;
    const char* string;
    Obj* obj;
} ValueAs;

typedef struct {
    ValueType type;
    ValueAs as;
} KrbValue;

// Constructeurs pour créer des valeurs primitives
KrbValue krb_null(void);
KrbValue krb_bool(bool value);
KrbValue krb_int(int64_t value);
KrbValue krb_float(double value);
KrbValue krb_string(const char* value);

// Affichage
void krb_print_value(KrbValue value);
void krb_println_value(KrbValue value);
bool krb_values_equal(KrbValue a, KrbValue b);

/**
 * ============================================================================
 * Tableau Dynamique de Valeurs (KrbValueArray)
 * ============================================================================
 * C'est le conteneur dynamique universel :
 * - count : Nombre réel d'éléments actuellement présents
 * - capacity : Nombre total d'emplacements alloués en RAM sur la Heap
 * - values : Pointeur vers le premier élément en mémoire
 */
typedef struct {
    int count;
    int capacity;
    KrbValue* values;
} KrbValueArray;

// Fonctions du tableau dynamique
void krb_init_value_array(KrbValueArray* array);
void krb_write_value_array(KrbValueArray* array, KrbValue value);
void krb_free_value_array(KrbValueArray* array);

#endif // KUROBA_VALUE_H
