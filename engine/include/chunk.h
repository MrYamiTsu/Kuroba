#ifndef KUROBA_CHUNK_H
#define KUROBA_CHUNK_H

#include <stdint.h>
#include "value.h"

/**
 * Bytecode operation codes (OpCodes) for the Kuroba Virtual Machine.
 * Each instruction is encoded as a single byte (uint8_t, 0-255).
 */
typedef enum {
    OP_CONSTANT,         // Load a constant from the chunk's constant pool
    OP_POP,              // Pop and discard the value at the top of the stack
    OP_PASTE,            // Print the top value without a newline
    OP_PASTELN,          // Print the top value with a newline
    OP_PASTELN_EMPTY,    // Print an empty newline
    OP_DEFINE_GLOBAL,    // Define a mutable global variable (ivar)
    OP_DEFINE_CONST,     // Define an immutable global constant (iconst)
    OP_GET_GLOBAL,       // Read a global variable
    OP_SET_GLOBAL,       // Reassign an existing global variable
    OP_GET_LOCAL,        // Read a local variable from the stack (1 operand: slot)
    OP_SET_LOCAL,        // Write to a local variable on the stack (1 operand: slot)
    OP_ADD,              // Add the two values at top of stack (+)
    OP_SUBTRACT,         // Subtract (-)
    OP_MULTIPLY,         // Multiply (*)
    OP_DIVIDE,           // Divide (/)
    OP_MODULO,           // Modulo (%)
    OP_NEGATE,           // Unary negation (-x)
    OP_NOT,              // Logical negation (!x)
    OP_EQUAL,            // Equality check (==)
    OP_GREATER,          // Greater-than check (>)
    OP_LESS,             // Less-than check (<)
    OP_JUMP,             // Unconditional forward jump (2-byte offset)
    OP_JUMP_IF_FALSE,    // Conditional forward jump if falsey (2-byte offset)
    OP_LOOP,             // Unconditional backward jump for loops (2-byte offset)
    OP_CALL,             // Function invocation (1 operand: argument count)
    OP_BUILD_LIST,       // Construct a list (1 operand: item count)
    OP_BUILD_TABLE,      // Construct a hash table (1 operand: entry count)
    OP_GET_INDEX,        // Index/subscript read access: collection[i]
    OP_SET_INDEX,        // Index/subscript write access: collection[i] = val
    OP_CLASS,            // Create a class (1 operand: name constant index)
    OP_GET_PROPERTY,     // Read an object property: obj.prop (1 operand: name constant index)
    OP_SET_PROPERTY,     // Write an object property: obj.prop = val (1 operand: name constant index)
    OP_METHOD,           // Bind a method to a class (1 operand: name constant index)
    OP_INVOKE,           // Optimized method invocation: instance.method(...) (2 operands: name index, argCount)
    OP_DUP,              // Duplicate the top stack value
    OP_DUP2,             // Duplicate the top two stack values
    OP_TRY,              // Enter try block (catch_offset: 2 bytes, finally_offset: 2 bytes)
    OP_TRY_END,          // Normal exit of a try block (pops try handler)
    OP_THROW,            // Throw a runtime exception
    OP_IS,               // Type check / membership operator (is)
    OP_KILL,             // Explicit variable destruction (kill)
    OP_CLOSURE,          // Instantiate a function closure
    OP_GET_UPVALUE,      // Read a captured upvalue
    OP_SET_UPVALUE,      // Write to a captured upvalue
    OP_CLOSE_UPVALUE,    // Close an upvalue moving from stack to heap
    OP_COERCE,           // Dynamic type coercion
    OP_CHECK_NON_NULL,   // Enforce non-nullable constraint
    OP_DEF_NON_NULL,     // Register a non-nullable contract for a global variable
    OP_MARK_QUEUE,       // Flag a list as a FIFO queue
    OP_INHERIT,          // Link subclass to superclass
    OP_CLASS_FIELD,      // Register a default class field and its visibility
    OP_SUPER_INVOKE,     // Invoke parent class method (base.method)
    OP_ITER_KEY,         // Retrieve loop iteration key/index
    OP_ITER_VAL,         // Retrieve loop iteration value
    OP_IMPLEMENT,        // Register interface implementation
    OP_HOOK_SAVE_METHOD, // Preserve original method prior to hooking (1 operand: name constant index)
    OP_DEFINE_SEALED,    // Define a sealed variable (isealed)
    OP_UNLOCK_VAR,       // Unlock a sealed variable (unlock)
    OP_LOCK_VAR,         // Relock a sealed variable (lock)
    OP_CONSUME_UNLOCK,   // Verify and consume one-shot unlock on local sealed entity
    OP_RETURN,           // Return from function or exit script
} OpCode;

/**
 * A Chunk represents a compiled bytecode block, containing:
 * 1. 'code': Raw stream of instruction bytes.
 * 2. 'lines': Line numbers in source code corresponding to each bytecode offset (for debugging).
 * 3. 'constants': Constant pool (numbers, strings, nested objects) referenced by instructions.
 */
typedef struct {
    int count;
    int capacity;
    uint8_t* code;
    int* lines;
    KrbValueArray constants;
} Chunk;

// Chunk lifecycle and manipulation functions
void krb_init_chunk(Chunk* chunk);
void krb_write_chunk(Chunk* chunk, uint8_t byte, int line);
int krb_add_constant(Chunk* chunk, KrbValue value);
void krb_free_chunk(Chunk* chunk);

#endif // KUROBA_CHUNK_H
