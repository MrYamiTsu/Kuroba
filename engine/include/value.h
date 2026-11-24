#ifndef KUROBA_VALUE_H
#define KUROBA_VALUE_H

#include <stdbool.h>
#include <stdint.h>

/**
 * Tagged union representing runtime value types in Kuroba.
 */
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

/**
 * Union payload storing primitive types or heap object pointer.
 */
typedef union {
    bool boolean;
    int64_t integer;
    double number;
    const char* string;
    Obj* obj;
} ValueAs;

/**
 * Tagged Kuroba value structure.
 */
typedef struct {
    ValueType type;
    ValueAs as;
} KrbValue;

// Constructors for primitive values
KrbValue krb_null(void);
KrbValue krb_bool(bool value);
KrbValue krb_int(int64_t value);
KrbValue krb_float(double value);
KrbValue krb_string(const char* value);

// Value operations & display
void krb_print_value(KrbValue value);
void krb_println_value(KrbValue value);
bool krb_values_equal(KrbValue a, KrbValue b);

/**
 * Dynamic value array (KrbValueArray) used for stacks and constant pools:
 * - count: Current number of elements stored.
 * - capacity: Total allocated capacity on the heap.
 * - values: Pointer to the first element in contiguous memory.
 */
typedef struct {
    int count;
    int capacity;
    KrbValue* values;
} KrbValueArray;

// Dynamic array operations
void krb_init_value_array(KrbValueArray* array);
void krb_write_value_array(KrbValueArray* array, KrbValue value);
void krb_free_value_array(KrbValueArray* array);

#endif // KUROBA_VALUE_H
