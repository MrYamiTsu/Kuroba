#ifndef KUROBA_VM_H
#define KUROBA_VM_H

#include "chunk.h"
#include "value.h"
#include "table.h"
#include "object.h"

#define FRAMES_MAX 1024
#define STACK_MAX (FRAMES_MAX * 256)

typedef struct {
    ObjClosure* closure;
    uint8_t* ip;
    KrbValue* slots;
} CallFrame;

typedef struct {
    uint8_t* catch_ip;
    uint8_t* finally_ip;
    int frame_index;
    int stack_count;
} KrbTryHandler;

/**
 * La Machine Virtuelle (VM) de Kuroba avec CallFrames & GC.
 */
typedef struct {
    CallFrame frames[FRAMES_MAX];
    int frameCount;

    KrbValue stack[STACK_MAX];
    KrbValue* stackTop;

    Table globals;
    Table constGlobals; // Ensemble des variables immuables iconst
    Table sealedGlobals; // Ensemble des variables scellees isealed
    Table unlockedGlobals; // Variables temporairement de-verrouillees via unlock
    Table nonNullGlobals; // Variables soumises au contrat non-nullable
    ObjUpvalue* openUpvalues; // Liste chaînée des upvalues ouvertes sur la pile
    Obj* objects; // Liste chaînée de tous les objets pour le Garbage Collector

    KrbTryHandler try_stack[256];
    int try_count;
} VM;

extern VM vm;

typedef enum {
    INTERPRET_OK,
    INTERPRET_COMPILE_ERROR,
    INTERPRET_RUNTIME_ERROR
} InterpretResult;

// Fonctions du cycle de vie de la VM
void krb_init_vm(void);
void krb_free_vm(void);
void krb_set_trace_execution(bool enable);

// Gestion de la pile d'évaluation
void krb_push(KrbValue value);
KrbValue krb_pop(void);
KrbValue krb_peek(int distance);

// Fonctions natives
void krb_define_native(const char* name, NativeFn function);

// Exécution
InterpretResult krb_interpret(Chunk* chunk);
InterpretResult krb_interpret_source(const char* source);

#endif // KUROBA_VM_H
