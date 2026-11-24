#ifndef KUROBA_VM_H
#define KUROBA_VM_H

#include "chunk.h"
#include "value.h"
#include "table.h"
#include "object.h"

#define FRAMES_MAX 1024
#define STACK_MAX (FRAMES_MAX * 256)

/**
 * Call frame tracking execution of a function or closure.
 */
typedef struct {
    ObjClosure* closure;
    uint8_t* ip;
    KrbValue* slots;
} CallFrame;

/**
 * Exception handler entry for try/catch/finally blocks.
 */
typedef struct {
    uint8_t* catch_ip;
    uint8_t* finally_ip;
    int frame_index;
    int stack_count;
} KrbTryHandler;

/**
 * The Kuroba Virtual Machine (VM) maintaining execution state, stack, and globals.
 */
typedef struct {
    CallFrame frames[FRAMES_MAX];
    int frameCount;

    KrbValue stack[STACK_MAX];
    KrbValue* stackTop;

    Table globals;
    Table constGlobals;       // Immutable global constants (iconst)
    Table sealedGlobals;      // Sealed global variables (isealed)
    Table unlockedGlobals;    // Variables temporarily unlocked via unlock
    Table nonNullGlobals;     // Variables subject to non-null contract
    ObjUpvalue* openUpvalues; // Intrusive linked list of open upvalues on the stack
    Obj* objects;             // Intrusive linked list of all heap-allocated objects for GC

    KrbTryHandler try_stack[256];
    int try_count;
} VM;

extern VM vm;

/**
 * Interpretation execution status results.
 */
typedef enum {
    INTERPRET_OK,
    INTERPRET_COMPILE_ERROR,
    INTERPRET_RUNTIME_ERROR
} InterpretResult;

// VM lifecycle functions
void krb_init_vm(void);
void krb_free_vm(void);
void krb_set_trace_execution(bool enable);

// Evaluation stack management
void krb_push(KrbValue value);
KrbValue krb_pop(void);
KrbValue krb_peek(int distance);

// Native function registration
void krb_define_native(const char* name, NativeFn function);

// Bytecode execution
InterpretResult krb_interpret(Chunk* chunk);
InterpretResult krb_interpret_source(const char* source);

#endif // KUROBA_VM_H
