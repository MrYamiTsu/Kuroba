#ifndef KUROBA_OBJECT_H
#define KUROBA_OBJECT_H

#include "value.h"
#include "chunk.h"
#include "table.h"

typedef enum {
    OBJ_FUNCTION,
    OBJ_CLOSURE,
    OBJ_UPVALUE,
    OBJ_NATIVE,
    OBJ_LIST,
    OBJ_TABLE,
    OBJ_CLASS,
    OBJ_INSTANCE,
} ObjType;

typedef struct Obj Obj;

struct Obj {
    ObjType type;
    bool isMarked;
    struct Obj* next;
};

// 1. Fonctions de premier ordre
typedef struct {
    Obj obj;
    int arity;
    int minArity;
    int upvalueCount;
    KrbValue defaultValues[16];
    Chunk chunk;
    char* name;
} ObjFunction;

// 1b. Upvalues et Fermetures (Closures)
typedef struct ObjUpvalue {
    Obj obj;
    KrbValue* location;
    KrbValue closed;
    struct ObjUpvalue* next;
} ObjUpvalue;

typedef struct {
    Obj obj;
    ObjFunction* function;
    ObjUpvalue** upvalues;
    int upvalueCount;
} ObjClosure;

// 2. Fonctions Natives C
typedef KrbValue (*NativeFn)(int argCount, KrbValue* args);

typedef struct {
    Obj obj;
    NativeFn function;
    char* name;
} ObjNative;

// 3. Collections (Listes & Tables associatives)
typedef struct {
    Obj obj;
    KrbValueArray elements;
    bool isQueue;
} ObjList;

typedef struct {
    Obj obj;
    Table fields;
} ObjTable;

// 4. Modèle Objet (Classes & Instances)
typedef struct ObjClass {
    Obj obj;
    char* name;
    struct ObjClass* superClass;
    Table methods;
    Table defaultFields;
    Table visibilities;
    Table interfaces;
} ObjClass;

typedef struct {
    Obj obj;
    ObjClass* klass;
    Table fields;
} ObjInstance;

// Macros de diagnostic et de transtypage
static inline bool is_obj_type(KrbValue value, ObjType type) {
    return value.type == VAL_OBJ && value.as.obj->type == type;
}

#define IS_FUNCTION(v) is_obj_type(v, OBJ_FUNCTION)
#define IS_CLOSURE(v)  is_obj_type(v, OBJ_CLOSURE)
#define IS_UPVALUE(v)  is_obj_type(v, OBJ_UPVALUE)
#define IS_NATIVE(v)   is_obj_type(v, OBJ_NATIVE)
#define IS_LIST(v)     is_obj_type(v, OBJ_LIST)
#define IS_TABLE(v)    is_obj_type(v, OBJ_TABLE)
#define IS_CLASS(v)    is_obj_type(v, OBJ_CLASS)
#define IS_INSTANCE(v) is_obj_type(v, OBJ_INSTANCE)

#define AS_FUNCTION(v) ((ObjFunction*)((v).as.obj))
#define AS_CLOSURE(v)  ((ObjClosure*)((v).as.obj))
#define AS_UPVALUE(v)  ((ObjUpvalue*)((v).as.obj))
#define AS_NATIVE(v)   ((ObjNative*)((v).as.obj))
#define AS_LIST(v)     ((ObjList*)((v).as.obj))
#define AS_TABLE(v)    ((ObjTable*)((v).as.obj))
#define AS_CLASS(v)    ((ObjClass*)((v).as.obj))
#define AS_INSTANCE(v) ((ObjInstance*)((v).as.obj))

// Constructeurs d'objets
ObjFunction* krb_new_function(void);
ObjClosure* krb_new_closure(ObjFunction* function);
ObjUpvalue* krb_new_upvalue(KrbValue* slot);
ObjNative* krb_new_native(NativeFn function, const char* name);
ObjList* krb_new_list(void);
ObjTable* krb_new_obj_table(void);
ObjClass* krb_new_class(const char* name);
ObjInstance* krb_new_instance(ObjClass* klass);

KrbValue krb_obj_val(Obj* obj);
void krb_print_object(KrbValue value);
void krb_free_object(Obj* object);

#endif // KUROBA_OBJECT_H
