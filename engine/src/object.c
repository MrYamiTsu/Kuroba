#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/object.h"
#include "../include/memory.h"
#include "../include/vm.h"

static Obj* allocate_object(size_t size, ObjType type) {
    Obj* object = (Obj*)malloc(size);
    object->type = type;
    object->isMarked = false;

    // Chaînage dans la liste globale des objets de la VM pour le Garbage Collector
    object->next = vm.objects;
    vm.objects = object;

    return object;
}

#define ALLOCATE_OBJ(type, objectType) \
    (type*)allocate_object(sizeof(type), objectType)

KrbValue krb_obj_val(Obj* obj) {
    KrbValue val;
    val.type = VAL_OBJ;
    val.as.obj = obj;
    return val;
}

ObjFunction* krb_new_function(void) {
    ObjFunction* function = ALLOCATE_OBJ(ObjFunction, OBJ_FUNCTION);
    function->arity = 0;
    function->minArity = 0;
    function->upvalueCount = 0;
    for (int i = 0; i < 16; i++) function->defaultValues[i] = krb_null();
    function->name = NULL;
    krb_init_chunk(&function->chunk);
    return function;
}

ObjClosure* krb_new_closure(ObjFunction* function) {
    ObjClosure* closure = ALLOCATE_OBJ(ObjClosure, OBJ_CLOSURE);
    closure->function = function;
    closure->upvalueCount = function ? function->upvalueCount : 0;
    if (closure->upvalueCount > 0) {
        closure->upvalues = (ObjUpvalue**)malloc(sizeof(ObjUpvalue*) * closure->upvalueCount);
        for (int i = 0; i < closure->upvalueCount; i++) {
            closure->upvalues[i] = NULL;
        }
    } else {
        closure->upvalues = NULL;
    }
    return closure;
}

ObjUpvalue* krb_new_upvalue(KrbValue* slot) {
    ObjUpvalue* upvalue = ALLOCATE_OBJ(ObjUpvalue, OBJ_UPVALUE);
    upvalue->location = slot;
    upvalue->closed = krb_null();
    upvalue->next = NULL;
    return upvalue;
}

ObjNative* krb_new_native(NativeFn function, const char* name) {
    ObjNative* native = ALLOCATE_OBJ(ObjNative, OBJ_NATIVE);
    native->function = function;
    native->name = name ? _strdup(name) : NULL;
    return native;
}

ObjList* krb_new_list(void) {
    ObjList* list = ALLOCATE_OBJ(ObjList, OBJ_LIST);
    krb_init_value_array(&list->elements);
    list->isQueue = false;
    return list;
}

ObjTable* krb_new_obj_table(void) {
    ObjTable* table = ALLOCATE_OBJ(ObjTable, OBJ_TABLE);
    krb_init_table(&table->fields);
    return table;
}

ObjClass* krb_new_class(const char* name) {
    ObjClass* klass = ALLOCATE_OBJ(ObjClass, OBJ_CLASS);
    klass->name = name ? _strdup(name) : NULL;
    klass->superClass = NULL;
    krb_init_table(&klass->methods);
    krb_init_table(&klass->defaultFields);
    krb_init_table(&klass->visibilities);
    krb_init_table(&klass->interfaces);
    return klass;
}

static void copy_instance_defaults(ObjInstance* instance, ObjClass* klass, bool isSelf) {
    if (klass->superClass != NULL) {
        copy_instance_defaults(instance, klass->superClass, false);
    }
    for (int i = 0; i < klass->defaultFields.capacity; i++) {
        Entry* entry = &klass->defaultFields.entries[i];
        if (entry->key != NULL) {
            if (!isSelf) {
                KrbValue visVal;
                if (krb_table_get(&klass->visibilities, entry->key, entry->length, &visVal)) {
                    // 3: ISOLATED, 4: EXCLUSIVE ne sont pas hérités
                    if (visVal.type == VAL_INT && (visVal.as.integer == 3 || visVal.as.integer == 4)) {
                        continue;
                    }
                }
            }
            krb_table_set(&instance->fields, entry->key, entry->length, entry->value, false);
        }
    }
}

ObjInstance* krb_new_instance(ObjClass* klass) {
    ObjInstance* instance = ALLOCATE_OBJ(ObjInstance, OBJ_INSTANCE);
    instance->klass = klass;
    krb_init_table(&instance->fields);
    copy_instance_defaults(instance, klass, true);
    return instance;
}

void krb_print_object(KrbValue value) {
    switch (value.as.obj->type) {
        case OBJ_FUNCTION: {
            ObjFunction* fn = AS_FUNCTION(value);
            if (fn->name == NULL) {
                printf("<script>");
            } else {
                printf("<fn %s>", fn->name);
            }
            break;
        }
        case OBJ_CLOSURE: {
            ObjClosure* closure = AS_CLOSURE(value);
            if (closure->function == NULL || closure->function->name == NULL) {
                printf("<script>");
            } else {
                printf("<fn %s>", closure->function->name);
            }
            break;
        }
        case OBJ_UPVALUE: {
            printf("<upvalue>");
            break;
        }
        case OBJ_NATIVE: {
            ObjNative* native = AS_NATIVE(value);
            printf("<native fn %s>", native->name ? native->name : "");
            break;
        }
        case OBJ_LIST: {
            ObjList* list = AS_LIST(value);
            printf("[");
            for (int i = 0; i < list->elements.count; i++) {
                krb_print_value(list->elements.values[i]);
                if (i < list->elements.count - 1) printf(", ");
            }
            printf("]");
            break;
        }
        case OBJ_TABLE: {
            ObjTable* table = AS_TABLE(value);
            printf("{ ");
            bool first = true;
            for (int i = 0; i < table->fields.capacity; i++) {
                Entry* entry = &table->fields.entries[i];
                if (entry->key != NULL) {
                    if (!first) printf(", ");
                    printf("%s: ", entry->key);
                    krb_print_value(entry->value);
                    first = false;
                }
            }
            printf(" }");
            break;
        }
        case OBJ_CLASS: {
            ObjClass* klass = AS_CLASS(value);
            printf("<class %s>", klass->name ? klass->name : "Anonymous");
            break;
        }
        case OBJ_INSTANCE: {
            ObjInstance* instance = AS_INSTANCE(value);
            printf("<instance of %s>", instance->klass->name ? instance->klass->name : "Object");
            break;
        }
    }
}

void krb_free_object(Obj* object) {
    switch (object->type) {
        case OBJ_FUNCTION: {
            ObjFunction* fn = (ObjFunction*)object;
            krb_free_chunk(&fn->chunk);
            if (fn->name) free(fn->name);
            free(fn);
            break;
        }
        case OBJ_CLOSURE: {
            ObjClosure* closure = (ObjClosure*)object;
            if (closure->upvalues) free(closure->upvalues);
            free(closure);
            break;
        }
        case OBJ_UPVALUE: {
            free(object);
            break;
        }
        case OBJ_NATIVE: {
            ObjNative* native = (ObjNative*)object;
            if (native->name) free(native->name);
            free(native);
            break;
        }
        case OBJ_LIST: {
            ObjList* list = (ObjList*)object;
            krb_free_value_array(&list->elements);
            free(list);
            break;
        }
        case OBJ_TABLE: {
            ObjTable* table = (ObjTable*)object;
            krb_free_table(&table->fields);
            free(table);
            break;
        }
        case OBJ_CLASS: {
            ObjClass* klass = (ObjClass*)object;
            if (klass->name) free(klass->name);
            krb_free_table(&klass->methods);
            krb_free_table(&klass->defaultFields);
            krb_free_table(&klass->visibilities);
            krb_free_table(&klass->interfaces);
            free(klass);
            break;
        }
        case OBJ_INSTANCE: {
            ObjInstance* instance = (ObjInstance*)object;
            krb_free_table(&instance->fields);
            free(instance);
            break;
        }
    }
}
