#include <stdio.h>
#include "../include/debug.h"
#include "../include/value.h"

void krb_disassemble_chunk(Chunk* chunk, const char* name) {
    printf("== %s ==\n", name);

    for (int offset = 0; offset < chunk->count;) {
        offset = krb_disassemble_instruction(chunk, offset);
    }
    printf("\n");
}

static int simple_instruction(const char* name, int offset) {
    printf("%s\n", name);
    return offset + 1;
}

static int constant_instruction(const char* name, Chunk* chunk, int offset) {
    uint16_t constantIndex = (uint16_t)((chunk->code[offset + 1] << 8) | chunk->code[offset + 2]);
    printf("%-16s %4d '", name, constantIndex);
    krb_print_value(chunk->constants.values[constantIndex]);
    printf("'\n");
    return offset + 3;
}

static int byte_instruction(const char* name, Chunk* chunk, int offset) {
    uint8_t slot = chunk->code[offset + 1];
    printf("%-16s %4d\n", name, slot);
    return offset + 2;
}

static int jump_instruction(const char* name, int sign, Chunk* chunk, int offset) {
    uint16_t jump = (uint16_t)(chunk->code[offset + 1] << 8);
    jump |= chunk->code[offset + 2];
    printf("%-16s %4d -> %d\n", name, offset, offset + 3 + sign * jump);
    return offset + 3;
}

static int invoke_instruction(const char* name, Chunk* chunk, int offset) {
    uint16_t constantIndex = (uint16_t)((chunk->code[offset + 1] << 8) | chunk->code[offset + 2]);
    uint8_t argCount = chunk->code[offset + 3];
    printf("%-16s (%d args) %4d '", name, argCount, constantIndex);
    krb_print_value(chunk->constants.values[constantIndex]);
    printf("'\n");
    return offset + 4;
}

static int super_invoke_instruction(const char* name, Chunk* chunk, int offset) {
    uint16_t nameIndex = (uint16_t)((chunk->code[offset + 1] << 8) | chunk->code[offset + 2]);
    uint16_t superIndex = (uint16_t)((chunk->code[offset + 3] << 8) | chunk->code[offset + 4]);
    uint8_t argCount = chunk->code[offset + 5];
    printf("%-16s (%d args) method=%d super=%d\n", name, argCount, nameIndex, superIndex);
    return offset + 6;
}

int krb_disassemble_instruction(Chunk* chunk, int offset) {
    printf("%04d ", offset);

    // Affiche le numéro de ligne ou '|' si c'est la même ligne que la précédente
    if (offset > 0 && chunk->lines[offset] == chunk->lines[offset - 1]) {
        printf("   | ");
    } else {
        printf("%4d ", chunk->lines[offset]);
    }

    uint8_t instruction = chunk->code[offset];
    switch (instruction) {
        case OP_CONSTANT:
            return constant_instruction("OP_CONSTANT", chunk, offset);
        case OP_POP:
            return simple_instruction("OP_POP", offset);
        case OP_PASTE:
            return simple_instruction("OP_PASTE", offset);
        case OP_PASTELN:
            return simple_instruction("OP_PASTELN", offset);
        case OP_PASTELN_EMPTY:
            return simple_instruction("OP_PASTELN_EMPTY", offset);
        case OP_DEFINE_GLOBAL:
            return constant_instruction("OP_DEFINE_GLOBAL", chunk, offset);
        case OP_DEFINE_CONST:
            return constant_instruction("OP_DEFINE_CONST", chunk, offset);
        case OP_GET_GLOBAL:
            return constant_instruction("OP_GET_GLOBAL", chunk, offset);
        case OP_SET_GLOBAL:
            return constant_instruction("OP_SET_GLOBAL", chunk, offset);
        case OP_GET_LOCAL:
            return byte_instruction("OP_GET_LOCAL", chunk, offset);
        case OP_SET_LOCAL:
            return byte_instruction("OP_SET_LOCAL", chunk, offset);
        case OP_ADD:
            return simple_instruction("OP_ADD", offset);
        case OP_SUBTRACT:
            return simple_instruction("OP_SUBTRACT", offset);
        case OP_MULTIPLY:
            return simple_instruction("OP_MULTIPLY", offset);
        case OP_DIVIDE:
            return simple_instruction("OP_DIVIDE", offset);
        case OP_MODULO:
            return simple_instruction("OP_MODULO", offset);
        case OP_NEGATE:
            return simple_instruction("OP_NEGATE", offset);
        case OP_NOT:
            return simple_instruction("OP_NOT", offset);
        case OP_EQUAL:
            return simple_instruction("OP_EQUAL", offset);
        case OP_GREATER:
            return simple_instruction("OP_GREATER", offset);
        case OP_LESS:
            return simple_instruction("OP_LESS", offset);
        case OP_JUMP:
            return jump_instruction("OP_JUMP", 1, chunk, offset);
        case OP_JUMP_IF_FALSE:
            return jump_instruction("OP_JUMP_IF_FALSE", 1, chunk, offset);
        case OP_LOOP:
            return jump_instruction("OP_LOOP", -1, chunk, offset);
        case OP_CALL:
            return byte_instruction("OP_CALL", chunk, offset);
        case OP_BUILD_LIST:
            return byte_instruction("OP_BUILD_LIST", chunk, offset);
        case OP_BUILD_TABLE:
            return byte_instruction("OP_BUILD_TABLE", chunk, offset);
        case OP_GET_INDEX:
            return simple_instruction("OP_GET_INDEX", offset);
        case OP_SET_INDEX:
            return simple_instruction("OP_SET_INDEX", offset);
        case OP_CLASS:
            return constant_instruction("OP_CLASS", chunk, offset);
        case OP_GET_PROPERTY:
            return constant_instruction("OP_GET_PROPERTY", chunk, offset);
        case OP_SET_PROPERTY:
            return constant_instruction("OP_SET_PROPERTY", chunk, offset);
        case OP_METHOD:
            return constant_instruction("OP_METHOD", chunk, offset);
        case OP_INVOKE:
            return invoke_instruction("OP_INVOKE", chunk, offset);
        case OP_SWAP:
            return simple_instruction("OP_SWAP", offset);
        case OP_DUP:
            return simple_instruction("OP_DUP", offset);
        case OP_DUP2:
            return simple_instruction("OP_DUP2", offset);
        case OP_TRY:
            return byte_instruction("OP_TRY", chunk, offset);
        case OP_TRY_END:
            return simple_instruction("OP_TRY_END", offset);
        case OP_THROW:
            return simple_instruction("OP_THROW", offset);
        case OP_IS:
            return simple_instruction("OP_IS", offset);
        case OP_KILL:
            return constant_instruction("OP_KILL", chunk, offset);
        case OP_CLOSURE:
            return constant_instruction("OP_CLOSURE", chunk, offset);
        case OP_GET_UPVALUE:
            return constant_instruction("OP_GET_UPVALUE", chunk, offset);
        case OP_SET_UPVALUE:
            return constant_instruction("OP_SET_UPVALUE", chunk, offset);
        case OP_CLOSE_UPVALUE:
            return simple_instruction("OP_CLOSE_UPVALUE", offset);
        case OP_COERCE:
            return constant_instruction("OP_COERCE", chunk, offset);
        case OP_CHECK_NON_NULL:
            return simple_instruction("OP_CHECK_NON_NULL", offset);
        case OP_DEF_NON_NULL:
            return constant_instruction("OP_DEF_NON_NULL", chunk, offset);
        case OP_MARK_QUEUE:
            return simple_instruction("OP_MARK_QUEUE", offset);
        case OP_INHERIT:
            return simple_instruction("OP_INHERIT", offset);
        case OP_CLASS_FIELD:
            return constant_instruction("OP_CLASS_FIELD", chunk, offset);
        case OP_SUPER_INVOKE:
            return super_invoke_instruction("OP_SUPER_INVOKE", chunk, offset);
        case OP_ITER_KEY:
            return simple_instruction("OP_ITER_KEY", offset);
        case OP_ITER_VAL:
            return simple_instruction("OP_ITER_VAL", offset);
        case OP_IMPLEMENT:
            return constant_instruction("OP_IMPLEMENT", chunk, offset);
        case OP_HOOK_SAVE_METHOD:
            return constant_instruction("OP_HOOK_SAVE_METHOD", chunk, offset);
        case OP_DEFINE_SEALED:
            return constant_instruction("OP_DEFINE_SEALED", chunk, offset);
        case OP_UNLOCK_VAR:
            return constant_instruction("OP_UNLOCK_VAR", chunk, offset);
        case OP_LOCK_VAR:
            return constant_instruction("OP_LOCK_VAR", chunk, offset);
        case OP_RETURN:
            return simple_instruction("OP_RETURN", offset);
        default:
            printf("Unknown opcode %d\n", instruction);
            return offset + 1;
    }
}
