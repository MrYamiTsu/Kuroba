#include <stdio.h>
#include <string.h>
#include "../include/value.h"
#include "../include/memory.h"
#include "../include/object.h"

KrbValue krb_null(void)
{
    KrbValue val;
    val.type = VAL_NULL;
    val.as.integer = 0;
    return val;
}

KrbValue krb_bool(bool value)
{
    KrbValue val;
    val.type = VAL_BOOL;
    val.as.boolean = value;
    return val;
}

KrbValue krb_int(int64_t value)
{
    KrbValue val;
    val.type = VAL_INT;
    val.as.integer = value;
    return val;
}

KrbValue krb_float(double value)
{
    KrbValue val;
    val.type = VAL_FLOAT;
    val.as.number = value;
    return val;
}

KrbValue krb_string(const char *value)
{
    KrbValue val;
    val.type = VAL_STRING;
    val.as.string = value;
    return val;
}

void krb_print_value(KrbValue value)
{
    switch (value.type)
    {
    case VAL_NULL:
        printf("NULL");
        break;
    case VAL_BOOL:
        printf(value.as.boolean ? "TRUE" : "FALSE");
        break;
    case VAL_INT:
        printf("%lld", (long long)value.as.integer);
        break;
    case VAL_FLOAT:
        printf("%g", value.as.number);
        break;
    case VAL_STRING:
        printf("%s", value.as.string);
        break;
    case VAL_OBJ:
        krb_print_object(value);
        break;
    }
}

void krb_println_value(KrbValue value)
{
    krb_print_value(value);
    printf("\n");
}

bool krb_values_equal(KrbValue a, KrbValue b)
{
    if (a.type != b.type)
        return false;
    switch (a.type)
    {
    case VAL_NULL:
        return true;
    case VAL_BOOL:
        return a.as.boolean == b.as.boolean;
    case VAL_INT:
        return a.as.integer == b.as.integer;
    case VAL_FLOAT:
        return a.as.number == b.as.number;
    case VAL_STRING:
        return strcmp(a.as.string, b.as.string) == 0;
    case VAL_OBJ:
        return a.as.obj == b.as.obj;
    }
    return false;
}

void krb_init_value_array(KrbValueArray *array)
{
    array->count = 0;
    array->capacity = 0;
    array->values = NULL;
}

void krb_write_value_array(KrbValueArray *array, KrbValue value)
{
    if (array->capacity < array->count + 1)
    {
        int oldCapacity = array->capacity;
        array->capacity = GROW_CAPACITY(oldCapacity);
        array->values = GROW_ARRAY(KrbValue, array->values, oldCapacity, array->capacity);
    }

    array->values[array->count] = value;
    array->count++;
}

void krb_free_value_array(KrbValueArray *array)
{
    FREE_ARRAY(KrbValue, array->values, array->capacity);
    krb_init_value_array(array);
}
