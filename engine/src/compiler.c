#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/compiler.h"
#include "../include/scanner.h"

typedef struct
{
    Token current;
    Token previous;
    bool hadError;
    bool panicMode;
} Parser;

typedef enum
{
    PREC_NONE,
    PREC_ASSIGNMENT,
    PREC_OR,
    PREC_AND,
    PREC_EQUALITY,
    PREC_COMPARISON,
    PREC_TERM,
    PREC_FACTOR,
    PREC_UNARY,
    PREC_CALL,
    PREC_PRIMARY
} Precedence;

typedef void (*ParseFn)(bool canAssign);

typedef struct
{
    ParseFn prefix;
    ParseFn infix;
    Precedence precedence;
} ParseRule;

static Parser parser;

typedef enum
{
    TYPE_FUNCTION,
    TYPE_METHOD,
    TYPE_INITIALIZER,
    TYPE_SCRIPT,
} FunctionType;

typedef struct
{
    Token name;
    int depth;
    bool isConst;
    bool isNonNull;
    bool isCaptured;
    bool isSealed;
    bool isUnlocked;
    char typeName[32];
} Local;

static struct
{
    char name[64];
    char typeName[32];
} globalVarTypes[256];
static int globalVarTypeCount = 0;

static void set_global_var_type(Token *tok, const char *tName)
{
    int len = tok->length < 63 ? tok->length : 63;
    for (int i = 0; i < globalVarTypeCount; i++)
    {
        if ((int)strlen(globalVarTypes[i].name) == len && memcmp(globalVarTypes[i].name, tok->start, len) == 0)
        {
            snprintf(globalVarTypes[i].typeName, sizeof(globalVarTypes[i].typeName), "%s", tName);
            return;
        }
    }
    if (globalVarTypeCount < 256)
    {
        memcpy(globalVarTypes[globalVarTypeCount].name, tok->start, len);
        globalVarTypes[globalVarTypeCount].name[len] = '\0';
        snprintf(globalVarTypes[globalVarTypeCount].typeName, sizeof(globalVarTypes[0].typeName), "%s", tName);
        globalVarTypeCount++;
    }
}

static const char *get_global_var_type(Token *tok)
{
    int len = tok->length < 63 ? tok->length : 63;
    for (int i = 0; i < globalVarTypeCount; i++)
    {
        if ((int)strlen(globalVarTypes[i].name) == len && memcmp(globalVarTypes[i].name, tok->start, len) == 0)
            return globalVarTypes[i].typeName[0] != '\0' ? globalVarTypes[i].typeName : NULL;
    }
    return NULL;
}

typedef enum
{
    VAR_MUTABLE = 0,
    VAR_CONST = 1,
    VAR_SEALED = 2
} VarKind;

typedef struct
{
    uint16_t index;
    bool isLocal;
} CompilerUpvalue;

typedef struct Compiler
{
    struct Compiler *enclosing;
    ObjFunction *function;
    FunctionType type;

    Local locals[256];
    int localCount;
    int scopeDepth;

    CompilerUpvalue upvalues[256];
    char hookMethodName[64];
} Compiler;

static Compiler *current = NULL;
static char pending_hook_method[64] = {0};

typedef struct ClassCompiler
{
    struct ClassCompiler *enclosing;
    Token name;
    bool hasSuperclass;
    Token superclass;
} ClassCompiler;

static ClassCompiler *currentClass = NULL;

typedef struct Loop
{
    int start;
    int scopeDepth;
    int breakJumps[64];
    int breakJumpCount;
    int skipJumps[64];
    int skipJumpCount;
    struct Loop *enclosing;
} Loop;

static Loop *currentLoop = NULL;

static void declaration(void);
static void statement(void);
static void expression(void);
static void parse_precedence(Precedence precedence);
static uint16_t identifier_constant(Token *name);
static void named_variable(Token name, bool canAssign);
static void function_body(FunctionType type);
static void block(void);
static void begin_scope(void);
static void end_scope(void);
static int resolve_local(Compiler *compiler, Token *name);

static Chunk *current_chunk(void)
{
    return &current->function->chunk;
}

static void error_at(Token *token, const char *message)
{
    if (parser.panicMode)
        return;
    parser.panicMode = true;

    fprintf(stderr, "[SyntaxError: Line %d, Col %d] ", token->line, token->col);

    if (token->type == TOKEN_EOF)
    {
        fprintf(stderr, "at end of file");
    }
    else if (token->type == TOKEN_ERROR)
    {
    }
    else
    {
        fprintf(stderr, "at '%.*s'", token->length, token->start);
    }

    fprintf(stderr, " : %s\n", message);
    parser.hadError = true;
}

static void error_at_current(const char *message)
{
    error_at(&parser.current, message);
}

static void error(const char *message)
{
    error_at(&parser.previous, message);
}

static void advance(void)
{
    parser.previous = parser.current;

    for (;;)
    {
        parser.current = krb_scan_token();
        if (parser.current.type != TOKEN_ERROR)
            break;

        error_at_current(parser.current.start);
    }
}

static void consume(TokenType type, const char *message)
{
    if (parser.current.type == type)
    {
        advance();
        return;
    }

    error_at_current(message);
}

static bool check(TokenType type)
{
    return parser.current.type == type;
}

static bool match(TokenType type)
{
    if (!check(type))
        return false;
    advance();
    return true;
}

static void emit_byte(uint8_t byte)
{
    krb_write_chunk(current_chunk(), byte, parser.previous.line);
}

static void emit_bytes(uint8_t byte1, uint8_t byte2)
{
    emit_byte(byte1);
    emit_byte(byte2);
}

static void emit_short(uint16_t value)
{
    emit_byte((uint8_t)((value >> 8) & 0xff));
    emit_byte((uint8_t)(value & 0xff));
}

static void emit_op_16(uint8_t op, uint16_t arg)
{
    emit_byte(op);
    emit_short(arg);
}

static int emit_jump(uint8_t instruction)
{
    emit_byte(instruction);
    emit_byte(0xff);
    emit_byte(0xff);
    return current_chunk()->count - 2;
}

static void patch_jump(int offset)
{
    int jump = current_chunk()->count - offset - 2;

    if (jump > UINT16_MAX)
    {
        error("Too much code to jump over.");
    }

    current_chunk()->code[offset] = (uint8_t)((jump >> 8) & 0xff);
    current_chunk()->code[offset + 1] = (uint8_t)(jump & 0xff);
}

static void emit_loop(int loopStart)
{
    emit_byte(OP_LOOP);

    int offset = current_chunk()->count - loopStart + 2;
    if (offset > UINT16_MAX)
        error("Loop body too large.");

    emit_byte((offset >> 8) & 0xff);
    emit_byte(offset & 0xff);
}

static void emit_constant(KrbValue value)
{
    int constant = krb_add_constant(current_chunk(), value);
    if (constant > 65535)
    {
        error("Too many constants in one bytecode chunk.");
        return;
    }
    emit_op_16(OP_CONSTANT, (uint16_t)constant);
}

static uint16_t identifier_constant(Token *name)
{
    char *chars = (char *)malloc(name->length + 1);
    memcpy(chars, name->start, name->length);
    chars[name->length] = '\0';
    return (uint16_t)krb_add_constant(current_chunk(), krb_string(chars));
}

static void emit_runtime_type_error(const char *msg)
{
    ObjTable *err = krb_new_obj_table();
    krb_table_set(&err->fields, "eName", 5, krb_string(_strdup("TypeError")), false);
    krb_table_set(&err->fields, "eContext", 8, krb_string(_strdup(msg)), false);
    krb_table_set(&err->fields, "eTime", 5, krb_bool(false), false);
    krb_table_set(&err->fields, "eLine", 5, krb_int(parser.previous.line), false);
    krb_table_set(&err->fields, "eCol", 4, krb_int(parser.previous.col), false);
    emit_constant(krb_obj_val((Obj *)err));
    emit_byte(OP_THROW);
}

static void init_compiler(Compiler *compiler, FunctionType type)
{
    compiler->enclosing = current;
    compiler->function = NULL;
    compiler->type = type;
    compiler->localCount = 0;
    compiler->scopeDepth = 0;
    compiler->hookMethodName[0] = '\0';
    if (pending_hook_method[0] != '\0')
    {
        strncpy(compiler->hookMethodName, pending_hook_method, sizeof(compiler->hookMethodName) - 1);
        compiler->hookMethodName[sizeof(compiler->hookMethodName) - 1] = '\0';
    }
    compiler->function = krb_new_function();
    current = compiler;

    if (type != TYPE_SCRIPT)
    {
        current->function->name = (char *)malloc(parser.previous.length + 1);
        memcpy(current->function->name, parser.previous.start, parser.previous.length);
        current->function->name[parser.previous.length] = '\0';
    }

    Local *local = &current->locals[current->localCount++];
    local->depth = 0;
    local->isConst = false;
    local->isNonNull = false;
    local->isCaptured = false;
    local->isSealed = false;
    local->isUnlocked = false;
    local->typeName[0] = '\0';
    if (type == TYPE_INITIALIZER)
        current->function->hasValueReturn = true;
    if (type == TYPE_METHOD || type == TYPE_INITIALIZER)
    {
        local->name.start = "this";
        local->name.length = 4;
    }
    else
    {
        local->name.start = "";
        local->name.length = 0;
    }
}

static ObjFunction *end_compiler(void)
{
    if (current->type == TYPE_INITIALIZER)
    {
        emit_bytes(OP_GET_LOCAL, 0);
    }
    else
    {
        emit_constant(krb_null());
    }
    emit_byte(OP_RETURN);

    ObjFunction *function = current->function;
    current = current->enclosing;
    return function;
}

static void expression(void);
static void statement(void);
static void declaration(void);
static ParseRule *get_rule(TokenType type);
static void parse_precedence(Precedence precedence);

static void number(bool canAssign)
{
    (void)canAssign;
    bool isFloat = false;
    for (int i = 0; i < parser.previous.length; i++)
    {
        if (parser.previous.start[i] == '.')
        {
            isFloat = true;
            break;
        }
    }

    if (isFloat)
    {
        double value = strtod(parser.previous.start, NULL);
        emit_constant(krb_float(value));
    }
    else
    {
        int64_t value = _strtoi64(parser.previous.start, NULL, 10);
        emit_constant(krb_int(value));
    }
}

static void string(bool canAssign)
{
    (void)canAssign;
    int len = parser.previous.length - 2;
    char *chars = (char *)malloc(len + 1);
    memcpy(chars, parser.previous.start + 1, len);
    chars[len] = '\0';
    emit_constant(krb_string(chars));
}

static bool identifiers_equal(Token *a, Token *b)
{
    if (a->length != b->length)
        return false;
    return memcmp(a->start, b->start, a->length) == 0;
}

static int resolve_local(Compiler *compiler, Token *name)
{
    for (int i = compiler->localCount - 1; i >= 0; i--)
    {
        Local *local = &compiler->locals[i];
        if (identifiers_equal(name, &local->name))
        {
            if (local->depth == -1)
            {
                error("Cannot read local variable in its own initializer.");
            }
            return i;
        }
    }
    return -1;
}

static int add_upvalue(Compiler *compiler, uint16_t index, bool isLocal)
{
    int upvalueCount = compiler->function->upvalueCount;
    for (int i = 0; i < upvalueCount; i++)
    {
        CompilerUpvalue *upval = &compiler->upvalues[i];
        if (upval->index == index && upval->isLocal == isLocal)
        {
            return i;
        }
    }
    if (upvalueCount == 256)
    {
        error("Too many closure variables in function.");
        return 0;
    }
    compiler->upvalues[upvalueCount].isLocal = isLocal;
    compiler->upvalues[upvalueCount].index = index;
    return compiler->function->upvalueCount++;
}

static int resolve_upvalue(Compiler *compiler, Token *name)
{
    if (compiler->enclosing == NULL)
        return -1;

    int local = resolve_local(compiler->enclosing, name);
    if (local != -1)
    {
        compiler->enclosing->locals[local].isCaptured = true;
        return add_upvalue(compiler, (uint16_t)local, true);
    }

    int upvalue = resolve_upvalue(compiler->enclosing, name);
    if (upvalue != -1)
    {
        return add_upvalue(compiler, (uint16_t)upvalue, false);
    }

    return -1;
}

static void emit_var_op(uint8_t op, int arg)
{
    if (op == OP_GET_LOCAL || op == OP_SET_LOCAL)
    {
        emit_bytes(op, (uint8_t)arg);
    }
    else
    {
        emit_op_16(op, (uint16_t)arg);
    }
}

static void emit_compound_op(TokenType assignType)
{
    switch (assignType)
    {
    case TOKEN_PLUS_EQUAL:
        emit_byte(OP_ADD);
        break;
    case TOKEN_MINUS_EQUAL:
        emit_byte(OP_SUBTRACT);
        break;
    case TOKEN_STAR_EQUAL:
        emit_byte(OP_MULTIPLY);
        break;
    case TOKEN_SLASH_EQUAL:
        emit_byte(OP_DIVIDE);
        break;
    case TOKEN_PERCENT_EQUAL:
        emit_byte(OP_MODULO);
        break;
    default:
        break;
    }
}

static void named_variable(Token name, bool canAssign)
{
    uint8_t getOp, setOp;
    int arg = resolve_local(current, &name);

    if (arg != -1)
    {
        getOp = OP_GET_LOCAL;
        setOp = OP_SET_LOCAL;
    }
    else if ((arg = resolve_upvalue(current, &name)) != -1)
    {
        getOp = OP_GET_UPVALUE;
        setOp = OP_SET_UPVALUE;
    }
    else
    {
        arg = identifier_constant(&name);
        getOp = OP_GET_GLOBAL;
        setOp = OP_SET_GLOBAL;
    }

    if (canAssign && (match(TOKEN_EQUAL) || match(TOKEN_PLUS_EQUAL) || match(TOKEN_MINUS_EQUAL) ||
                      match(TOKEN_STAR_EQUAL) || match(TOKEN_SLASH_EQUAL) || match(TOKEN_PERCENT_EQUAL) ||
                      match(TOKEN_PLUS_PLUS) || match(TOKEN_MINUS_MINUS)))
    {
        TokenType assignType = parser.previous.type;
        bool blockedConst = (getOp == OP_GET_LOCAL && current->locals[arg].isConst);
        if (getOp == OP_GET_LOCAL && current->locals[arg].isSealed)
        {
            current->locals[arg].isUnlocked = false;
            emit_op_16(OP_CONSUME_UNLOCK, identifier_constant(&name));
        }

        if (assignType == TOKEN_PLUS_PLUS || assignType == TOKEN_MINUS_MINUS)
        {
            emit_var_op(getOp, arg);
            emit_constant(krb_int(1));
            emit_byte(assignType == TOKEN_PLUS_PLUS ? OP_ADD : OP_SUBTRACT);
        }
        else if (assignType == TOKEN_EQUAL)
        {
            expression();
        }
        else
        {
            emit_var_op(getOp, arg);
            expression();
            emit_compound_op(assignType);
        }
        if (blockedConst)
        {
            emit_runtime_type_error("Cannot reassign local constant.");
            return;
        }
        if (getOp == OP_GET_LOCAL && current->locals[arg].isNonNull)
        {
            emit_byte(OP_CHECK_NON_NULL);
        }
        if (getOp == OP_GET_LOCAL && current->locals[arg].typeName[0] != '\0')
        {
            uint16_t tc = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(current->locals[arg].typeName)));
            emit_op_16(OP_COERCE, tc);
        }
        else if (getOp == OP_SET_GLOBAL || setOp == OP_SET_GLOBAL)
        {
            const char *gt = get_global_var_type(&name);
            if (gt != NULL)
            {
                uint16_t tc = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(gt)));
                emit_op_16(OP_COERCE, tc);
            }
        }
        emit_var_op(setOp, arg);
    }
    else
    {
        emit_var_op(getOp, arg);
    }
}

static void variable(bool canAssign)
{
    if (check(TOKEN_DOT))
    {
        void *st = krb_save_scanner_state();
        Parser saved = parser;
        Token rootTok = parser.previous;
        advance();
        if (match(TOKEN_IDENTIFIER) && check(TOKEN_IS))
        {
            Token memberTok = parser.previous;
            TokenType afterIs = krb_peek_token().type;
            if (afterIs == TOKEN_LOCK || afterIs == TOKEN_UNLOCK)
            {
                char buf[128];
                snprintf(buf, sizeof(buf), "$global:%.*s.%.*s", rootTok.length, rootTok.start, memberTok.length, memberTok.start);
                emit_constant(krb_string(_strdup(buf)));
                krb_free_scanner_state(st);
                return;
            }
        }
        krb_restore_scanner_state(st);
        krb_free_scanner_state(st);
        parser = saved;
    }
    if (check(TOKEN_IS))
    {
        TokenType afterIs = krb_peek_token().type;
        if (afterIs == TOKEN_LOCK || afterIs == TOKEN_UNLOCK)
        {
            Token varTok = parser.previous;
            Local *loc = NULL;
            for (Compiler *c = current; c != NULL; c = c->enclosing)
            {
                int idx = resolve_local(c, &varTok);
                if (idx != -1)
                {
                    loc = &c->locals[idx];
                    break;
                }
            }
            char buf[96];
            if (loc != NULL)
            {
                if (loc->isConst)
                    strcpy(buf, "$const");
                else if (!loc->isSealed)
                    strcpy(buf, "$mutable");
                else
                    snprintf(buf, sizeof(buf), "$sealed:%.*s", varTok.length, varTok.start);
            }
            else
            {
                snprintf(buf, sizeof(buf), "$global:%.*s", varTok.length, varTok.start);
            }
            emit_constant(krb_string(_strdup(buf)));
            return;
        }
    }
    named_variable(parser.previous, canAssign);
}

static void this_(bool canAssign)
{
    (void)canAssign;
    Token thisToken;
    thisToken.start = "this";
    thisToken.length = 4;
    thisToken.line = parser.previous.line;
    thisToken.col = parser.previous.col;
    variable(false);
}

static void base_call(bool canAssign)
{
    (void)canAssign;
    consume(TOKEN_LEFT_PAREN, "Expected '(' after 'base'.");
    emit_bytes(OP_GET_LOCAL, 0);
    uint8_t argCount = 0;
    if (!check(TOKEN_RIGHT_PAREN))
    {
        do
        {
            expression();
            argCount++;
        } while (match(TOKEN_COMMA));
    }
    consume(TOKEN_RIGHT_PAREN, "Expected ')' after 'base' arguments.");
    uint16_t initConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup("init")));
    uint16_t superConst = 0;
    if (currentClass != NULL && currentClass->hasSuperclass)
    {
        superConst = identifier_constant(&currentClass->superclass);
    }
    emit_op_16(OP_SUPER_INVOKE, initConst);
    emit_short(superConst);
    emit_byte(argCount);
}

static void orig_call(bool canAssign)
{
    (void)canAssign;
    if (current != NULL && current->type == TYPE_METHOD && current->hookMethodName[0] != '\0')
    {
        consume(TOKEN_LEFT_PAREN, "Expected '(' after 'orig'.");
        emit_bytes(OP_GET_LOCAL, 0);
        uint8_t argCount = 0;
        if (!check(TOKEN_RIGHT_PAREN))
        {
            do
            {
                expression();
                argCount++;
            } while (match(TOKEN_COMMA));
        }
        consume(TOKEN_RIGHT_PAREN, "Expected ')' after 'orig' arguments.");
        char origName[128];
        snprintf(origName, sizeof(origName), "__orig_%s", current->hookMethodName);
        uint16_t origConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(origName)));
        emit_op_16(OP_INVOKE, origConst);
        emit_byte(argCount);
        return;
    }

    Token origToken;
    origToken.start = "orig";
    origToken.length = 4;
    origToken.line = parser.previous.line;
    origToken.col = parser.previous.col;
    named_variable(origToken, false);
}

static void grouping(bool canAssign)
{
    (void)canAssign;
    expression();
    consume(TOKEN_RIGHT_PAREN, "Expected ')' after expression.");
}

static void unary(bool canAssign)
{
    (void)canAssign;
    TokenType operatorType = parser.previous.type;

    parse_precedence(PREC_UNARY);

    switch (operatorType)
    {
    case TOKEN_BANG:
        emit_byte(OP_NOT);
        break;
    case TOKEN_MINUS:
        emit_byte(OP_NEGATE);
        break;
    default:
        return;
    }
}

static void binary(bool canAssign)
{
    (void)canAssign;
    TokenType operatorType = parser.previous.type;
    ParseRule *rule = get_rule(operatorType);
    parse_precedence((Precedence)(rule->precedence + 1));

    switch (operatorType)
    {
    case TOKEN_BANG_EQUAL:
        emit_bytes(OP_EQUAL, OP_NOT);
        break;
    case TOKEN_EQUAL_EQUAL:
        emit_byte(OP_EQUAL);
        break;
    case TOKEN_GREATER:
        emit_byte(OP_GREATER);
        break;
    case TOKEN_GREATER_EQUAL:
        emit_bytes(OP_LESS, OP_NOT);
        break;
    case TOKEN_LESS:
        emit_byte(OP_LESS);
        break;
    case TOKEN_LESS_EQUAL:
        emit_bytes(OP_GREATER, OP_NOT);
        break;
    case TOKEN_PLUS:
        emit_byte(OP_ADD);
        break;
    case TOKEN_MINUS:
        emit_byte(OP_SUBTRACT);
        break;
    case TOKEN_STAR:
        emit_byte(OP_MULTIPLY);
        break;
    case TOKEN_SLASH:
        emit_byte(OP_DIVIDE);
        break;
    case TOKEN_PERCENT:
        emit_byte(OP_MODULO);
        break;
    default:
        return;
    }
}

static uint8_t argument_list(void)
{
    uint8_t argCount = 0;
    if (!check(TOKEN_RIGHT_PAREN))
    {
        do
        {
            expression();
            if (argCount == 255)
            {
                error("Cannot have more than 255 arguments.");
            }
            argCount++;
        } while (match(TOKEN_COMMA));
    }
    consume(TOKEN_RIGHT_PAREN, "Expected ')' after arguments.");
    return argCount;
}

static void call(bool canAssign)
{
    (void)canAssign;
    uint8_t argCount = argument_list();
    emit_bytes(OP_CALL, argCount);
}

static void dot(bool canAssign)
{
    consume(TOKEN_IDENTIFIER, "Expected property name after '.'.");
    uint16_t name = identifier_constant(&parser.previous);

    if (canAssign && (match(TOKEN_EQUAL) || match(TOKEN_PLUS_EQUAL) || match(TOKEN_MINUS_EQUAL) ||
                      match(TOKEN_STAR_EQUAL) || match(TOKEN_SLASH_EQUAL) || match(TOKEN_PERCENT_EQUAL) ||
                      match(TOKEN_PLUS_PLUS) || match(TOKEN_MINUS_MINUS)))
    {
        TokenType assignType = parser.previous.type;
        if (assignType == TOKEN_EQUAL)
        {
            expression();
            emit_op_16(OP_SET_PROPERTY, name);
        }
        else if (assignType == TOKEN_PLUS_PLUS || assignType == TOKEN_MINUS_MINUS)
        {
            emit_byte(OP_DUP);
            emit_op_16(OP_GET_PROPERTY, name);
            emit_constant(krb_int(1));
            emit_byte(assignType == TOKEN_PLUS_PLUS ? OP_ADD : OP_SUBTRACT);
            emit_op_16(OP_SET_PROPERTY, name);
        }
        else
        {
            emit_byte(OP_DUP);
            emit_op_16(OP_GET_PROPERTY, name);
            expression();
            emit_compound_op(assignType);
            emit_op_16(OP_SET_PROPERTY, name);
        }
    }
    else if (match(TOKEN_LEFT_PAREN))
    {
        uint8_t argCount = argument_list();
        emit_op_16(OP_INVOKE, name);
        emit_byte(argCount);
    }
    else
    {
        emit_op_16(OP_GET_PROPERTY, name);
    }
}

static void subscript(bool canAssign)
{
    expression();
    consume(TOKEN_RIGHT_BRACKET, "Expected ']' after index.");

    if (canAssign && (match(TOKEN_EQUAL) || match(TOKEN_PLUS_EQUAL) || match(TOKEN_MINUS_EQUAL) ||
                      match(TOKEN_STAR_EQUAL) || match(TOKEN_SLASH_EQUAL) || match(TOKEN_PERCENT_EQUAL) ||
                      match(TOKEN_PLUS_PLUS) || match(TOKEN_MINUS_MINUS)))
    {
        TokenType assignType = parser.previous.type;
        if (assignType == TOKEN_EQUAL)
        {
            expression();
            emit_byte(OP_SET_INDEX);
        }
        else if (assignType == TOKEN_PLUS_PLUS || assignType == TOKEN_MINUS_MINUS)
        {
            emit_byte(OP_DUP2);
            emit_byte(OP_GET_INDEX);
            emit_constant(krb_int(1));
            emit_byte(assignType == TOKEN_PLUS_PLUS ? OP_ADD : OP_SUBTRACT);
            emit_byte(OP_SET_INDEX);
        }
        else
        {
            emit_byte(OP_DUP2);
            emit_byte(OP_GET_INDEX);
            expression();
            emit_compound_op(assignType);
            emit_byte(OP_SET_INDEX);
        }
    }
    else
    {
        emit_byte(OP_GET_INDEX);
    }
}

static bool is_type_name_str(const char *name, int len)
{
    if (len == 3 && strncmp(name, "Int", 3) == 0)
        return true;
    if (len == 5 && strncmp(name, "Float", 5) == 0)
        return true;
    if (len == 6 && strncmp(name, "String", 6) == 0)
        return true;
    if (len == 4 && strncmp(name, "Bool", 4) == 0)
        return true;
    if (len == 4 && strncmp(name, "List", 4) == 0)
        return true;
    if (len == 5 && strncmp(name, "Stack", 5) == 0)
        return true;
    if (len == 5 && strncmp(name, "Queue", 5) == 0)
        return true;
    if (len == 5 && strncmp(name, "Table", 5) == 0)
        return true;
    if (len == 8 && strncmp(name, "Function", 8) == 0)
        return true;
    return false;
}

static void list_literal(bool canAssign)
{
    (void)canAssign;

    bool isCast = false;
    bool isNonNull = false;
    char typeName[32] = "";

    if (check(TOKEN_LEFT_PAREN))
    {
        void *state = krb_save_scanner_state();
        Parser saved = parser;
        advance();
        if (check(TOKEN_IDENTIFIER) && is_type_name_str(parser.current.start, parser.current.length))
        {
            snprintf(typeName, sizeof(typeName), "%.*s", parser.current.length, parser.current.start);
            advance();
            if (check(TOKEN_RIGHT_PAREN))
            {
                advance();
                if (check(TOKEN_RIGHT_BRACKET))
                {
                    advance();
                    isCast = true;
                    isNonNull = true;
                }
            }
        }
        if (!isCast)
        {
            krb_restore_scanner_state(state);
            parser = saved;
        }
        krb_free_scanner_state(state);
    }
    else if (check(TOKEN_IDENTIFIER) && is_type_name_str(parser.current.start, parser.current.length))
    {
        if (krb_peek_token().type == TOKEN_RIGHT_BRACKET)
        {
            snprintf(typeName, sizeof(typeName), "%.*s", parser.current.length, parser.current.start);
            advance();
            consume(TOKEN_RIGHT_BRACKET, "Expected ']'.");
            isCast = true;
        }
    }

    if (isCast)
    {
        parse_precedence(PREC_CALL);

        uint16_t typeConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(typeName)));
        emit_op_16(OP_COERCE, typeConst);

        if (isNonNull)
        {
            emit_byte(OP_CHECK_NON_NULL);
        }
        return;
    }

    uint8_t itemCount = 0;
    if (!check(TOKEN_RIGHT_BRACKET))
    {
        do
        {
            expression();
            if (itemCount == 255)
            {
                error("Too many elements in list.");
            }
            itemCount++;
        } while (match(TOKEN_COMMA));
    }
    consume(TOKEN_RIGHT_BRACKET, "Expected ']' to close list.");
    emit_bytes(OP_BUILD_LIST, itemCount);
}

static void table_literal(bool canAssign)
{
    (void)canAssign;
    uint8_t entryCount = 0;
    if (!check(TOKEN_RIGHT_BRACE))
    {
        do
        {
            if (match(TOKEN_STRING))
            {
                int len = parser.previous.length - 2;
                char *chars = (char *)malloc(len + 1);
                memcpy(chars, parser.previous.start + 1, len);
                chars[len] = '\0';
                emit_constant(krb_string(chars));
            }
            else if (match(TOKEN_IDENTIFIER))
            {
                char *chars = (char *)malloc(parser.previous.length + 1);
                memcpy(chars, parser.previous.start, parser.previous.length);
                chars[parser.previous.length] = '\0';
                emit_constant(krb_string(chars));
            }
            else
            {
                error("Expected key in table literal.");
            }

            consume(TOKEN_COLON, "Expected ':' after key.");
            expression();
            entryCount++;
        } while (match(TOKEN_COMMA));
    }
    consume(TOKEN_RIGHT_BRACE, "Expected '}' to close table.");
    emit_bytes(OP_BUILD_TABLE, entryCount);
}

static void and_(bool canAssign)
{
    (void)canAssign;
    int falseJump = emit_jump(OP_JUMP_IF_FALSE);
    parse_precedence(PREC_AND);
    int endJump = emit_jump(OP_JUMP);

    patch_jump(falseJump);
    emit_constant(krb_bool(false));
    patch_jump(endJump);
}

static void or_(bool canAssign)
{
    (void)canAssign;
    int falseJump = emit_jump(OP_JUMP_IF_FALSE);
    emit_constant(krb_bool(true));
    int endJump = emit_jump(OP_JUMP);

    patch_jump(falseJump);
    parse_precedence(PREC_OR);
    patch_jump(endJump);
}

static void literal(bool canAssign)
{
    (void)canAssign;
    switch (parser.previous.type)
    {
    case TOKEN_FALSE:
        emit_constant(krb_bool(false));
        break;
    case TOKEN_TRUE:
        emit_constant(krb_bool(true));
        break;
    case TOKEN_NULL:
        emit_constant(krb_null());
        break;
    default:
        return;
    }
}

static void is_expression(bool canAssign)
{
    (void)canAssign;
    char typeBuf[128] = {0};
    if (match(TOKEN_NULL))
    {
        strcpy(typeBuf, "NULL");
    }
    else if (match(TOKEN_LOCK))
    {
        strcpy(typeBuf, ":lock");
    }
    else if (match(TOKEN_UNLOCK))
    {
        strcpy(typeBuf, ":unlock");
    }
    else
    {
        consume(TOKEN_IDENTIFIER, "Expected type after 'is'.");
        Token typeTok = parser.previous;
        int tLen = typeTok.length < 120 ? typeTok.length : 120;
        memcpy(typeBuf, typeTok.start, tLen);
        typeBuf[tLen] = '\0';

        if (match(TOKEN_LESS))
        {
            strcat(typeBuf, "<");
            if (match(TOKEN_IDENTIFIER))
            {
                strncat(typeBuf, parser.previous.start, parser.previous.length);
            }
            consume(TOKEN_GREATER, "Expected '>' to close generic type.");
            strcat(typeBuf, ">");
        }
    }
    emit_constant(krb_string(_strdup(typeBuf)));
    emit_byte(OP_IS);
}

static void lambda_expression(bool canAssign)
{
    (void)canAssign;
    consume(TOKEN_TILDE, "Expected '~' for lambda function.");
    function_body(TYPE_FUNCTION);
}

static void interpolated_string_expr(bool canAssign)
{
    (void)canAssign;
    Token token = parser.previous;
    const char *p = token.start + 2;
    const char *end = token.start + token.length - 1;

    emit_constant(krb_string(_strdup("")));

    while (p < end)
    {
        if (*p == '\\' && (p + 1 < end) && (p[1] == '{' || p[1] == '}' || p[1] == '"'))
        {
            char ch[2] = {p[1], '\0'};
            emit_constant(krb_string(_strdup(ch)));
            emit_byte(OP_ADD);
            p += 2;
            continue;
        }

        if (*p == '{')
        {
            p++;
            const char *exprStart = p;
            int braces = 1;
            while (p < end && braces > 0)
            {
                if (*p == '{')
                    braces++;
                else if (*p == '}')
                    braces--;
                p++;
            }
            int exprLen = (int)(p - exprStart - 1);
            if (exprLen > 0)
            {
                char *exprStr = (char *)malloc(exprLen + 1);
                memcpy(exprStr, exprStart, exprLen);
                exprStr[exprLen] = '\0';

                void *savedScanner = krb_save_scanner_state();
                Parser savedParser = parser;

                krb_init_scanner(exprStr);
                advance();
                expression();

                krb_restore_scanner_state(savedScanner);
                krb_free_scanner_state(savedScanner);
                parser = savedParser;
                free(exprStr);

                emit_byte(OP_ADD);
            }
            continue;
        }

        const char *litStart = p;
        while (p < end && *p != '{')
        {
            if (*p == '\\' && (p + 1 < end))
                p += 2;
            else
                p++;
        }
        int litLen = (int)(p - litStart);
        if (litLen > 0)
        {
            char *litStr = (char *)malloc(litLen + 1);
            memcpy(litStr, litStart, litLen);
            litStr[litLen] = '\0';
            emit_constant(krb_string(litStr));
            emit_byte(OP_ADD);
        }
    }
}

ParseRule rules[] = {
    [TOKEN_LEFT_PAREN] = {grouping, call, PREC_CALL},
    [TOKEN_RIGHT_PAREN] = {NULL, NULL, PREC_NONE},
    [TOKEN_LEFT_BRACE] = {table_literal, NULL, PREC_NONE},
    [TOKEN_RIGHT_BRACE] = {NULL, NULL, PREC_NONE},
    [TOKEN_LEFT_BRACKET] = {list_literal, subscript, PREC_CALL},
    [TOKEN_RIGHT_BRACKET] = {NULL, NULL, PREC_NONE},
    [TOKEN_COMMA] = {NULL, NULL, PREC_NONE},
    [TOKEN_DOT] = {NULL, dot, PREC_CALL},
    [TOKEN_SEMICOLON] = {NULL, NULL, PREC_NONE},
    [TOKEN_COLON] = {NULL, NULL, PREC_NONE},
    [TOKEN_TILDE] = {NULL, NULL, PREC_NONE},
    [TOKEN_MINUS] = {unary, binary, PREC_TERM},
    [TOKEN_PLUS] = {NULL, binary, PREC_TERM},
    [TOKEN_STAR] = {NULL, binary, PREC_FACTOR},
    [TOKEN_SLASH] = {NULL, binary, PREC_FACTOR},
    [TOKEN_PERCENT] = {NULL, binary, PREC_FACTOR},
    [TOKEN_PLUS_PLUS] = {NULL, NULL, PREC_NONE},
    [TOKEN_MINUS_MINUS] = {NULL, NULL, PREC_NONE},
    [TOKEN_PLUS_EQUAL] = {NULL, NULL, PREC_NONE},
    [TOKEN_MINUS_EQUAL] = {NULL, NULL, PREC_NONE},
    [TOKEN_STAR_EQUAL] = {NULL, NULL, PREC_NONE},
    [TOKEN_SLASH_EQUAL] = {NULL, NULL, PREC_NONE},
    [TOKEN_PERCENT_EQUAL] = {NULL, NULL, PREC_NONE},
    [TOKEN_AND_AND] = {NULL, and_, PREC_AND},
    [TOKEN_OR_OR] = {NULL, or_, PREC_OR},
    [TOKEN_BANG] = {unary, NULL, PREC_NONE},
    [TOKEN_BANG_EQUAL] = {NULL, binary, PREC_EQUALITY},
    [TOKEN_EQUAL] = {NULL, NULL, PREC_NONE},
    [TOKEN_EQUAL_EQUAL] = {NULL, binary, PREC_EQUALITY},
    [TOKEN_GREATER] = {NULL, binary, PREC_COMPARISON},
    [TOKEN_GREATER_EQUAL] = {NULL, binary, PREC_COMPARISON},
    [TOKEN_LESS] = {NULL, binary, PREC_COMPARISON},
    [TOKEN_LESS_EQUAL] = {NULL, binary, PREC_COMPARISON},
    [TOKEN_SWAP] = {NULL, NULL, PREC_NONE},
    [TOKEN_IDENTIFIER] = {variable, NULL, PREC_NONE},
    [TOKEN_STRING] = {string, NULL, PREC_NONE},
    [TOKEN_NUMBER] = {number, NULL, PREC_NONE},
    [TOKEN_IVAR] = {NULL, NULL, PREC_NONE},
    [TOKEN_ICONST] = {NULL, NULL, PREC_NONE},
    [TOKEN_ISEALED] = {NULL, NULL, PREC_NONE},
    [TOKEN_IF] = {NULL, NULL, PREC_NONE},
    [TOKEN_ELIF] = {NULL, NULL, PREC_NONE},
    [TOKEN_ELSE] = {NULL, NULL, PREC_NONE},
    [TOKEN_THEN] = {NULL, NULL, PREC_NONE},
    [TOKEN_END] = {NULL, NULL, PREC_NONE},
    [TOKEN_GIVEN] = {NULL, NULL, PREC_NONE},
    [TOKEN_CASE] = {NULL, NULL, PREC_NONE},
    [TOKEN_FOR] = {NULL, NULL, PREC_NONE},
    [TOKEN_IN] = {NULL, NULL, PREC_NONE},
    [TOKEN_WHILE] = {NULL, NULL, PREC_NONE},
    [TOKEN_DO] = {NULL, NULL, PREC_NONE},
    [TOKEN_BREAK] = {NULL, NULL, PREC_NONE},
    [TOKEN_SKIP] = {NULL, NULL, PREC_NONE},
    [TOKEN_FUNCTION] = {lambda_expression, NULL, PREC_NONE},
    [TOKEN_RETURN] = {NULL, NULL, PREC_NONE},
    [TOKEN_HOOK] = {NULL, NULL, PREC_NONE},
    [TOKEN_OPERATOR] = {NULL, NULL, PREC_NONE},
    [TOKEN_CLASS] = {NULL, NULL, PREC_NONE},
    [TOKEN_INTERFACE] = {NULL, NULL, PREC_NONE},
    [TOKEN_AS] = {NULL, NULL, PREC_NONE},
    [TOKEN_FROM] = {NULL, NULL, PREC_NONE},
    [TOKEN_PUBLIC] = {NULL, NULL, PREC_NONE},
    [TOKEN_PROTECTED] = {NULL, NULL, PREC_NONE},
    [TOKEN_PRIVATE] = {NULL, NULL, PREC_NONE},
    [TOKEN_ISOLATED] = {NULL, NULL, PREC_NONE},
    [TOKEN_EXCLUSIVE] = {NULL, NULL, PREC_NONE},
    [TOKEN_GET] = {NULL, NULL, PREC_NONE},
    [TOKEN_SET] = {NULL, NULL, PREC_NONE},
    [TOKEN_SHARED] = {NULL, NULL, PREC_NONE},
    [TOKEN_ENUM] = {NULL, NULL, PREC_NONE},
    [TOKEN_NAMESPACE] = {NULL, NULL, PREC_NONE},
    [TOKEN_IMPORT] = {NULL, NULL, PREC_NONE},
    [TOKEN_ALIAS] = {NULL, NULL, PREC_NONE},
    [TOKEN_PASTE] = {NULL, NULL, PREC_NONE},
    [TOKEN_PASTELN] = {NULL, NULL, PREC_NONE},
    [TOKEN_THIS] = {this_, NULL, PREC_NONE},
    [TOKEN_ORIG] = {orig_call, NULL, PREC_NONE},
    [TOKEN_BASE] = {base_call, NULL, PREC_NONE},
    [TOKEN_IS] = {NULL, is_expression, PREC_COMPARISON},
    [TOKEN_TRUE] = {literal, NULL, PREC_NONE},
    [TOKEN_FALSE] = {literal, NULL, PREC_NONE},
    [TOKEN_NULL] = {literal, NULL, PREC_NONE},
    [TOKEN_TRY] = {NULL, NULL, PREC_NONE},
    [TOKEN_CATCH] = {NULL, NULL, PREC_NONE},
    [TOKEN_FINALLY] = {NULL, NULL, PREC_NONE},
    [TOKEN_THROW] = {NULL, NULL, PREC_NONE},
    [TOKEN_KILL] = {NULL, NULL, PREC_NONE},
    [TOKEN_UNLOCK] = {NULL, NULL, PREC_NONE},
    [TOKEN_LOCK] = {NULL, NULL, PREC_NONE},
    [TOKEN_INTERPOLATION] = {interpolated_string_expr, NULL, PREC_NONE},
    [TOKEN_ERROR] = {NULL, NULL, PREC_NONE},
    [TOKEN_EOF] = {NULL, NULL, PREC_NONE},
};

static ParseRule *get_rule(TokenType type)
{
    return &rules[type];
}

static void parse_precedence(Precedence precedence)
{
    advance();
    ParseFn prefixRule = get_rule(parser.previous.type)->prefix;
    if (prefixRule == NULL)
    {
        error("Expected expression.");
        return;
    }

    bool canAssign = precedence <= PREC_ASSIGNMENT;
    prefixRule(canAssign);

    while (precedence <= get_rule(parser.current.type)->precedence)
    {
        advance();
        ParseFn infixRule = get_rule(parser.previous.type)->infix;
        infixRule(canAssign);
    }

    if (canAssign && match(TOKEN_EQUAL))
    {
        error("Invalid assignment target.");
    }
}

static void expression(void)
{
    parse_precedence(PREC_ASSIGNMENT);
}

static void paste_statement(bool isLn)
{
    consume(TOKEN_LEFT_PAREN, "Expected '(' after 'paste' / 'pasteLn'.");
    if (isLn && match(TOKEN_RIGHT_PAREN))
    {
        consume(TOKEN_SEMICOLON, "Expected ';' at end of statement.");
        emit_byte(OP_PASTELN_EMPTY);
        return;
    }
    expression();
    consume(TOKEN_RIGHT_PAREN, "Expected ')' after expression.");
    consume(TOKEN_SEMICOLON, "Expected ';' at end of statement.");
    emit_byte(isLn ? OP_PASTELN : OP_PASTE);
}

static void expression_statement(void)
{
    expression();
    consume(TOKEN_SEMICOLON, "Expected ';' after expression.");
    emit_byte(OP_POP);
}

static void add_local(Token name, int kind)
{
    if (current->localCount == 256)
    {
        error("Too many local variables in scope.");
        return;
    }

    Local *local = &current->locals[current->localCount++];
    local->name = name;
    local->depth = -1;
    local->isConst = (kind == VAR_CONST);
    local->isSealed = (kind == VAR_SEALED);
    local->isUnlocked = false;
    local->isNonNull = false;
    local->isCaptured = false;
    local->typeName[0] = '\0';
}

static void declare_variable_named(Token *name, int kind)
{
    if (current->scopeDepth == 0)
        return;
    for (int i = current->localCount - 1; i >= 0; i--)
    {
        Local *local = &current->locals[i];
        if (local->depth != -1 && local->depth < current->scopeDepth)
            break;
        if (identifiers_equal(name, &local->name))
            error("A variable with this name already exists in this scope.");
    }
    add_local(*name, kind);
}

static void declare_variable(int kind)
{
    declare_variable_named(&parser.previous, kind);
}

static void define_variable(uint16_t global, int kind)
{
    if (current->scopeDepth > 0)
    {
        current->locals[current->localCount - 1].depth = current->scopeDepth;
        return;
    }

    if (kind == VAR_CONST)
    {
        emit_op_16(OP_DEFINE_CONST, global);
    }
    else if (kind == VAR_SEALED)
    {
        emit_op_16(OP_DEFINE_SEALED, global);
    }
    else
    {
        emit_op_16(OP_DEFINE_GLOBAL, global);
    }
}

static void begin_scope(void)
{
    current->scopeDepth++;
}

static void end_scope(void)
{
    current->scopeDepth--;

    while (current->localCount > 0 &&
           current->locals[current->localCount - 1].depth > current->scopeDepth)
    {
        if (current->locals[current->localCount - 1].isCaptured)
        {
            emit_byte(OP_CLOSE_UPVALUE);
        }
        else
        {
            emit_byte(OP_POP);
        }
        current->localCount--;
    }
}

static void block(void)
{
    while (!check(TOKEN_END) && !check(TOKEN_EOF))
    {
        declaration();
    }
    consume(TOKEN_END, "Expected 'end' after block.");
}

static bool parse_type_annotation(bool *outNonNull, char *typeBuf, size_t bufSize)
{
    if (outNonNull)
        *outNonNull = false;
    if (typeBuf && bufSize > 0)
        typeBuf[0] = '\0';
    if (!match(TOKEN_TILDE))
        return false;

    bool nonNull = match(TOKEN_LEFT_PAREN);
    if (outNonNull)
        *outNonNull = nonNull;

    consume(TOKEN_IDENTIFIER, "Expected type name.");
    if (typeBuf && bufSize > 0)
        snprintf(typeBuf, bufSize, "%.*s", parser.previous.length, parser.previous.start);

    if (match(TOKEN_LESS))
    {
        while (!check(TOKEN_GREATER) && !check(TOKEN_EOF))
            advance();
        consume(TOKEN_GREATER, "Expected '>'.");
    }
    if (nonNull)
        consume(TOKEN_RIGHT_PAREN, "Expected ')' after type.");
    return true;
}

static void emit_type_check_and_coerce(bool isQueueType, const char *typeName, bool isNonNull)
{
    if (isQueueType)
        emit_byte(OP_MARK_QUEUE);
    if (isNonNull)
        emit_byte(OP_CHECK_NON_NULL);
    if (typeName[0] != '\0')
    {
        uint16_t typeConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(typeName)));
        emit_op_16(OP_COERCE, typeConst);
    }
}

static void var_declaration(int kind)
{
    bool isNonNull = false;
    char typeName[32] = "";
    bool hasType = parse_type_annotation(&isNonNull, typeName, sizeof(typeName));
    bool isQueueType = (hasType && !isNonNull && strcmp(typeName, "Queue") == 0);

    Token names[32];
    int nameCount = 0;
    do
    {
        consume(TOKEN_IDENTIFIER, "Expected variable name after 'ivar', 'iconst', or 'isealed'.");
        names[nameCount++] = parser.previous;
        declare_variable_named(&names[nameCount - 1], kind);
        if (current->scopeDepth > 0)
        {
            if (isNonNull)
                current->locals[current->localCount - 1].isNonNull = true;
            if (typeName[0] != '\0')
                snprintf(current->locals[current->localCount - 1].typeName, 32, "%s", typeName);
        }
        else
        {
            set_global_var_type(&names[nameCount - 1], typeName);
        }
    } while (match(TOKEN_COMMA) && nameCount < 32);

    consume(TOKEN_EQUAL, "Expected '=' after variable identifier(s).");
    expression();
    emit_type_check_and_coerce(isQueueType, typeName, isNonNull);

    int valCount = 1;
    while (match(TOKEN_COMMA))
    {
        expression();
        emit_type_check_and_coerce(isQueueType, typeName, isNonNull);
        valCount++;
    }

    consume(TOKEN_SEMICOLON, "Expected ';' after variable declaration.");

    bool duplicate = (valCount == 1 && nameCount > 1);
    for (int i = nameCount - 1; i >= 0; i--)
    {
        if (duplicate && i > 0)
            emit_byte(OP_DUP);
        uint16_t global = 0;
        if (current->scopeDepth == 0)
        {
            global = identifier_constant(&names[i]);
            if (isNonNull)
                emit_op_16(OP_DEF_NON_NULL, global);
        }
        else if (kind == VAR_SEALED)
        {
            emit_op_16(OP_LOCK_VAR, identifier_constant(&names[i]));
        }
        define_variable(global, kind);
    }
}

static void if_statement(void)
{
    expression();
    consume(TOKEN_THEN, "Expected 'then' after 'if' condition.");

    int thenJump = emit_jump(OP_JUMP_IF_FALSE);

    begin_scope();
    while (!check(TOKEN_ELIF) && !check(TOKEN_ELSE) && !check(TOKEN_END) && !check(TOKEN_EOF))
    {
        declaration();
    }
    end_scope();

    int exitJumps[64];
    int exitJumpCount = 0;

    if (check(TOKEN_ELIF) || check(TOKEN_ELSE))
    {
        exitJumps[exitJumpCount++] = emit_jump(OP_JUMP);
    }

    patch_jump(thenJump);

    while (match(TOKEN_ELIF))
    {
        expression();
        consume(TOKEN_THEN, "Expected 'then' after 'elif' condition.");

        int elifJump = emit_jump(OP_JUMP_IF_FALSE);

        begin_scope();
        while (!check(TOKEN_ELIF) && !check(TOKEN_ELSE) && !check(TOKEN_END) && !check(TOKEN_EOF))
        {
            declaration();
        }
        end_scope();

        if (check(TOKEN_ELIF) || check(TOKEN_ELSE))
        {
            exitJumps[exitJumpCount++] = emit_jump(OP_JUMP);
        }

        patch_jump(elifJump);
    }

    if (match(TOKEN_ELSE))
    {
        begin_scope();
        while (!check(TOKEN_END) && !check(TOKEN_EOF))
        {
            declaration();
        }
        end_scope();
    }

    consume(TOKEN_END, "Expected 'end' to close 'if' block.");

    for (int i = 0; i < exitJumpCount; i++)
    {
        patch_jump(exitJumps[i]);
    }
}

static void while_statement(void)
{
    Loop loop;
    loop.start = current_chunk()->count;
    loop.scopeDepth = current->scopeDepth;
    loop.breakJumpCount = 0;
    loop.skipJumpCount = 0;
    loop.enclosing = currentLoop;
    currentLoop = &loop;

    expression();
    consume(TOKEN_THEN, "Expected 'then' after 'while' condition.");

    int exitJump = emit_jump(OP_JUMP_IF_FALSE);

    begin_scope();
    while (!check(TOKEN_END) && !check(TOKEN_EOF))
    {
        declaration();
    }
    end_scope();

    for (int i = 0; i < loop.skipJumpCount; i++)
    {
        patch_jump(loop.skipJumps[i]);
    }

    emit_loop(loop.start);
    patch_jump(exitJump);

    for (int i = 0; i < loop.breakJumpCount; i++)
    {
        patch_jump(loop.breakJumps[i]);
    }

    consume(TOKEN_END, "Expected 'end' to close 'while' block.");
    currentLoop = loop.enclosing;
}

static void for_statement(void)
{
    begin_scope();
    consume(TOKEN_LEFT_PAREN, "Expected '(' before 'for' loop header.");

    bool isForIn = false;
    Token var1;
    Token var2;
    bool hasVar2 = false;

    if (match(TOKEN_IVAR))
    {
        consume(TOKEN_IDENTIFIER, "Expected variable name.");
        var1 = parser.previous;

        if (match(TOKEN_COMMA))
        {
            consume(TOKEN_IDENTIFIER, "Expected variable name.");
            var2 = parser.previous;
            hasVar2 = true;
            consume(TOKEN_IN, "Expected 'in' in 'for' loop.");
            isForIn = true;
        }
        else if (match(TOKEN_IN))
        {
            isForIn = true;
        }
        else
        {
            declare_variable_named(&var1, false);
            if (match(TOKEN_EQUAL))
            {
                expression();
            }
            else
            {
                emit_constant(krb_null());
            }
            define_variable(0, false);
            consume(TOKEN_SEMICOLON, "Expected ';' after 'for' initializer.");
        }
    }
    else if (match(TOKEN_SEMICOLON))
    {
    }
    else
    {
        expression_statement();
    }

    if (isForIn)
    {
        expression();
        consume(TOKEN_RIGHT_PAREN, "Expected ')' after collection.");
        consume(TOKEN_THEN, "Expected 'then' after 'for' header.");

        Token collTok;
        collTok.start = "$coll";
        collTok.length = 5;
        add_local(collTok, false);
        current->locals[current->localCount - 1].depth = current->scopeDepth;
        int collSlot = current->localCount - 1;

        emit_constant(krb_int(0));
        Token iTok;
        iTok.start = "$idx";
        iTok.length = 4;
        add_local(iTok, false);
        current->locals[current->localCount - 1].depth = current->scopeDepth;
        int iSlot = current->localCount - 1;

        emit_constant(krb_null());
        add_local(var1, false);
        current->locals[current->localCount - 1].depth = current->scopeDepth;
        int v1Slot = current->localCount - 1;

        int v2Slot = -1;
        if (hasVar2)
        {
            emit_constant(krb_null());
            add_local(var2, false);
            current->locals[current->localCount - 1].depth = current->scopeDepth;
            v2Slot = current->localCount - 1;
        }

        Loop loop;
        loop.start = current_chunk()->count;
        loop.scopeDepth = current->scopeDepth;
        loop.breakJumpCount = 0;
        loop.skipJumpCount = 0;
        loop.enclosing = currentLoop;
        currentLoop = &loop;

        emit_bytes(OP_GET_LOCAL, (uint8_t)iSlot);
        emit_bytes(OP_GET_LOCAL, (uint8_t)collSlot);
        uint16_t countConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup("count")));
        emit_op_16(OP_INVOKE, countConst);
        emit_byte(0);
        emit_byte(OP_LESS);
        int exitJump = emit_jump(OP_JUMP_IF_FALSE);

        if (!hasVar2)
        {
            emit_bytes(OP_GET_LOCAL, (uint8_t)collSlot);
            emit_bytes(OP_GET_LOCAL, (uint8_t)iSlot);
            emit_byte(OP_ITER_VAL);
            emit_bytes(OP_SET_LOCAL, (uint8_t)v1Slot);
            emit_byte(OP_POP);
        }
        else
        {
            emit_bytes(OP_GET_LOCAL, (uint8_t)collSlot);
            emit_bytes(OP_GET_LOCAL, (uint8_t)iSlot);
            emit_byte(OP_ITER_KEY);
            emit_bytes(OP_SET_LOCAL, (uint8_t)v1Slot);
            emit_byte(OP_POP);

            emit_bytes(OP_GET_LOCAL, (uint8_t)collSlot);
            emit_bytes(OP_GET_LOCAL, (uint8_t)iSlot);
            emit_byte(OP_ITER_VAL);
            emit_bytes(OP_SET_LOCAL, (uint8_t)v2Slot);
            emit_byte(OP_POP);
        }

        begin_scope();
        while (!check(TOKEN_END) && !check(TOKEN_EOF))
        {
            declaration();
        }
        end_scope();

        for (int i = 0; i < loop.skipJumpCount; i++)
        {
            patch_jump(loop.skipJumps[i]);
        }

        emit_bytes(OP_GET_LOCAL, (uint8_t)iSlot);
        emit_constant(krb_int(1));
        emit_byte(OP_ADD);
        emit_bytes(OP_SET_LOCAL, (uint8_t)iSlot);
        emit_byte(OP_POP);

        emit_loop(loop.start);
        patch_jump(exitJump);

        for (int i = 0; i < loop.breakJumpCount; i++)
        {
            patch_jump(loop.breakJumps[i]);
        }

        consume(TOKEN_END, "Expected 'end' to close 'for' block.");
        end_scope();
        currentLoop = loop.enclosing;
        return;
    }

    Loop loop;
    loop.start = current_chunk()->count;
    loop.scopeDepth = current->scopeDepth;
    loop.breakJumpCount = 0;
    loop.skipJumpCount = 0;
    loop.enclosing = currentLoop;
    currentLoop = &loop;

    int exitJump = -1;
    if (!match(TOKEN_SEMICOLON))
    {
        expression();
        consume(TOKEN_SEMICOLON, "Expected ';' after 'for' condition.");
        exitJump = emit_jump(OP_JUMP_IF_FALSE);
    }

    if (!match(TOKEN_RIGHT_PAREN))
    {
        int bodyJump = emit_jump(OP_JUMP);
        int incrementStart = current_chunk()->count;

        expression();
        emit_byte(OP_POP);
        consume(TOKEN_RIGHT_PAREN, "Expected ')' after 'for' increment clause.");

        emit_loop(loop.start);
        loop.start = incrementStart;
        patch_jump(bodyJump);
    }

    consume(TOKEN_THEN, "Expected 'then' after 'for' header.");

    begin_scope();
    while (!check(TOKEN_END) && !check(TOKEN_EOF))
    {
        declaration();
    }
    end_scope();

    for (int i = 0; i < loop.skipJumpCount; i++)
    {
        patch_jump(loop.skipJumps[i]);
    }

    emit_loop(loop.start);

    if (exitJump != -1)
    {
        patch_jump(exitJump);
    }

    for (int i = 0; i < loop.breakJumpCount; i++)
    {
        patch_jump(loop.breakJumps[i]);
    }

    consume(TOKEN_END, "Expected 'end' to close 'for' block.");
    end_scope();
    currentLoop = loop.enclosing;
}

static void break_statement(void)
{
    if (currentLoop == NULL)
    {
        error("Cannot use 'break' outside of a loop.");
        return;
    }
    consume(TOKEN_SEMICOLON, "Expected ';' after 'break'.");

    for (int i = current->localCount - 1; i >= 0; i--)
    {
        if (current->locals[i].depth > currentLoop->scopeDepth)
        {
            emit_byte(OP_POP);
        }
    }

    currentLoop->breakJumps[currentLoop->breakJumpCount++] = emit_jump(OP_JUMP);
}

static void skip_statement(void)
{
    if (currentLoop == NULL)
    {
        error("Cannot use 'skip' outside of a loop.");
        return;
    }
    consume(TOKEN_SEMICOLON, "Expected ';' after 'skip'.");

    for (int i = current->localCount - 1; i >= 0; i--)
    {
        if (current->locals[i].depth > currentLoop->scopeDepth)
        {
            emit_byte(OP_POP);
        }
    }

    currentLoop->skipJumps[currentLoop->skipJumpCount++] = emit_jump(OP_JUMP);
}

static void emit_closure(Compiler *compiler)
{
    ObjFunction *func = end_compiler();
    uint16_t fnConst = (uint16_t)krb_add_constant(current_chunk(), krb_obj_val((Obj *)func));
    emit_op_16(OP_CLOSURE, fnConst);
    for (int i = 0; i < func->upvalueCount; i++)
    {
        emit_byte(compiler->upvalues[i].isLocal ? 1 : 0);
        emit_short(compiler->upvalues[i].index);
    }
}

static void function_body(FunctionType type)
{
    Compiler compiler;
    init_compiler(&compiler, type);
    begin_scope();

    consume(TOKEN_LEFT_PAREN, "Expected '(' after function name.");
    struct
    {
        bool isNonNull;
        char typeName[32];
        int slot;
    } paramTypes[32];
    int paramTypeCount = 0;

    if (!check(TOKEN_RIGHT_PAREN))
    {
        do
        {
            match(TOKEN_IVAR);
            bool isNonNull = false;
            char typeName[32] = "";
            parse_type_annotation(&isNonNull, typeName, sizeof(typeName));

            consume(TOKEN_IDENTIFIER, "Expected parameter name.");
            Token paramTok = parser.previous;
            int paramIndex = current->function->arity;
            current->function->arity++;
            if (current->function->arity > 255)
            {
                error_at_current("Cannot have more than 255 parameters.");
            }

            if (match(TOKEN_EQUAL))
            {
                if (match(TOKEN_NUMBER))
                {
                    char buf[32] = {0};
                    int l = parser.previous.length < 31 ? parser.previous.length : 31;
                    memcpy(buf, parser.previous.start, l);
                    current->function->defaultValues[paramIndex] = krb_int(_strtoi64(buf, NULL, 10));
                }
                else if (match(TOKEN_STRING))
                {
                    int len = parser.previous.length - 2;
                    char *chars = (char *)malloc(len + 1);
                    memcpy(chars, parser.previous.start + 1, len);
                    chars[len] = '\0';
                    current->function->defaultValues[paramIndex] = krb_string(chars);
                }
                else if (match(TOKEN_TRUE))
                {
                    current->function->defaultValues[paramIndex] = krb_bool(true);
                }
                else if (match(TOKEN_FALSE))
                {
                    current->function->defaultValues[paramIndex] = krb_bool(false);
                }
                else if (match(TOKEN_NULL))
                {
                    current->function->defaultValues[paramIndex] = krb_null();
                }
            }
            else
            {
                current->function->minArity = current->function->arity;
            }

            declare_variable_named(&paramTok, false);
            define_variable(0, false);
            int slot = current->localCount - 1;
            if (paramTypeCount < 32 && (isNonNull || typeName[0] != '\0'))
            {
                paramTypes[paramTypeCount].isNonNull = isNonNull;
                snprintf(paramTypes[paramTypeCount].typeName, sizeof(paramTypes[paramTypeCount].typeName), "%s", typeName);
                paramTypes[paramTypeCount].slot = slot;
                paramTypeCount++;
            }
        } while (match(TOKEN_COMMA));
    }
    consume(TOKEN_RIGHT_PAREN, "Expected ')' after parameters.");
    consume(TOKEN_THEN, "Expected 'then' after function header.");

    for (int i = 0; i < paramTypeCount; i++)
    {
        emit_bytes(OP_GET_LOCAL, (uint8_t)paramTypes[i].slot);
        if (paramTypes[i].isNonNull)
        {
            emit_byte(OP_CHECK_NON_NULL);
        }
        if (paramTypes[i].typeName[0] != '\0')
        {
            uint16_t typeConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(paramTypes[i].typeName)));
            emit_op_16(OP_COERCE, typeConst);
        }
        emit_bytes(OP_SET_LOCAL, (uint8_t)paramTypes[i].slot);
        emit_byte(OP_POP);
    }

    while (!check(TOKEN_END) && !check(TOKEN_EOF))
    {
        declaration();
    }
    consume(TOKEN_END, "Expected 'end' to close function.");
    emit_closure(&compiler);
}

static void function_declaration(void)
{
    consume(TOKEN_IDENTIFIER, "Expected function name after 'function'.");
    Token nameToken = parser.previous;
    if (current->scopeDepth == 0)
    {
        uint16_t global = identifier_constant(&nameToken);
        set_global_var_type(&nameToken, "Function");
        function_body(TYPE_FUNCTION);
        define_variable(global, VAR_MUTABLE);
        return;
    }

    int existing = -1;
    for (int i = current->localCount - 1; i >= 0; i--)
    {
        if (current->locals[i].depth != -1 && current->locals[i].depth < current->scopeDepth)
            break;
        if (identifiers_equal(&nameToken, &current->locals[i].name))
        {
            existing = i;
            break;
        }
    }

    if (existing != -1)
    {
        function_body(TYPE_FUNCTION);
        if (current->locals[existing].isConst)
        {
            emit_byte(OP_POP);
            emit_runtime_type_error("Cannot overwrite a constant variable.");
            return;
        }
        if (current->locals[existing].isSealed)
        {
            current->locals[existing].isUnlocked = false;
            emit_op_16(OP_CONSUME_UNLOCK, identifier_constant(&nameToken));
        }
        emit_bytes(OP_SET_LOCAL, (uint8_t)existing);
        emit_byte(OP_POP);
        return;
    }

    declare_variable(VAR_MUTABLE);
    snprintf(current->locals[current->localCount - 1].typeName, 32, "Function");
    function_body(TYPE_FUNCTION);
    define_variable(0, VAR_MUTABLE);
}

static void return_statement(void)
{
    if (current->type == TYPE_SCRIPT)
    {
        error("Cannot use 'return' at top-level script scope.");
    }

    if (match(TOKEN_SEMICOLON))
    {
        if (current->type == TYPE_INITIALIZER)
            emit_bytes(OP_GET_LOCAL, 0);
        else
            emit_constant(krb_null());
        emit_byte(OP_RETURN);
    }
    else
    {
        if (current->type == TYPE_INITIALIZER)
        {
            error("Cannot return a custom value from an 'init' constructor.");
        }
        if (check(TOKEN_NULL) && krb_peek_token().type == TOKEN_SEMICOLON)
        {
            advance();
            consume(TOKEN_SEMICOLON, "Expected ';' after return value.");
            emit_constant(krb_null());
            emit_byte(OP_RETURN);
        }
        else
        {
            current->function->hasValueReturn = true;
            expression();
            consume(TOKEN_SEMICOLON, "Expected ';' after return value.");
            emit_byte(OP_RETURN);
        }
    }
}

static void class_declaration(void)
{
    consume(TOKEN_IDENTIFIER, "Expected class name after 'class'.");
    Token className = parser.previous;
    uint16_t nameConstant = identifier_constant(&className);
    declare_variable(false);

    emit_op_16(OP_CLASS, nameConstant);
    define_variable(nameConstant, false);

    ClassCompiler classCompiler;
    classCompiler.enclosing = currentClass;
    classCompiler.name = className;
    classCompiler.hasSuperclass = false;
    currentClass = &classCompiler;

    if (match(TOKEN_FROM))
    {
        consume(TOKEN_IDENTIFIER, "Expected superclass name after 'from'.");
        classCompiler.hasSuperclass = true;
        classCompiler.superclass = parser.previous;
        named_variable(className, false);
        variable(false);
        emit_byte(OP_INHERIT);
    }

    Token ifaceTokens[32];
    int ifaceCount = 0;
    if (match(TOKEN_AS))
    {
        do
        {
            consume(TOKEN_IDENTIFIER, "Expected interface name after 'as'.");
            if (ifaceCount < 32)
            {
                ifaceTokens[ifaceCount++] = parser.previous;
            }
        } while (match(TOKEN_COMMA));
    }

    consume(TOKEN_THEN, "Expected 'then' after class header.");

    named_variable(className, false);

    for (int i = 0; i < ifaceCount; i++)
    {
        uint16_t ifaceConst = identifier_constant(&ifaceTokens[i]);
        emit_op_16(OP_IMPLEMENT, ifaceConst);
    }

    while (!check(TOKEN_END) && !check(TOKEN_EOF))
    {
        bool isShared = false;
        int visibility = 0;
        while (match(TOKEN_PUBLIC) || match(TOKEN_PROTECTED) || match(TOKEN_PRIVATE) ||
               match(TOKEN_ISOLATED) || match(TOKEN_EXCLUSIVE) || match(TOKEN_SHARED))
        {
            if (parser.previous.type == TOKEN_SHARED)
                isShared = true;
            else if (parser.previous.type == TOKEN_PROTECTED)
                visibility = 1;
            else if (parser.previous.type == TOKEN_PRIVATE)
                visibility = 2;
            else if (parser.previous.type == TOKEN_ISOLATED)
                visibility = 3;
            else if (parser.previous.type == TOKEN_EXCLUSIVE)
                visibility = 4;
        }

        int memberKind = -1;
        if (match(TOKEN_IVAR))
            memberKind = VAR_MUTABLE;
        else if (match(TOKEN_ICONST))
            memberKind = VAR_CONST;
        else if (match(TOKEN_ISEALED))
            memberKind = VAR_SEALED;

        if (memberKind != -1)
        {
            bool isNonNull = false;
            char typeName[32] = "";
            bool hasType = parse_type_annotation(&isNonNull, typeName, sizeof(typeName));
            bool isQueueType = (hasType && !isNonNull && strcmp(typeName, "Queue") == 0);

            consume(TOKEN_IDENTIFIER, "Expected field name.");
            Token fieldName = parser.previous;
            uint16_t fieldConst = identifier_constant(&fieldName);

            if (match(TOKEN_EQUAL))
                expression();
            else
                emit_constant(krb_null());
            emit_type_check_and_coerce(isQueueType, typeName, isNonNull);
            consume(TOKEN_SEMICOLON, "Expected ';' after field declaration.");

            if (isShared)
            {
                emit_op_16(OP_SET_PROPERTY, fieldConst);
                emit_byte(OP_POP);
                if (memberKind == VAR_CONST || memberKind == VAR_SEALED)
                {
                    char qual[128];
                    snprintf(qual, sizeof(qual), "%.*s.%.*s", className.length, className.start, fieldName.length, fieldName.start);
                    uint16_t qualConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(qual)));
                    emit_constant(krb_null());
                    emit_op_16(memberKind == VAR_CONST ? OP_DEFINE_CONST : OP_DEFINE_SEALED, qualConst);
                }
                named_variable(className, false);
            }
            else
            {
                emit_op_16(OP_CLASS_FIELD, fieldConst);
                emit_byte((uint8_t)visibility);
            }
        }
        else if (match(TOKEN_FUNCTION))
        {
            consume(TOKEN_IDENTIFIER, "Expected method name.");
            Token methTok = parser.previous;
            uint16_t constant = identifier_constant(&methTok);
            FunctionType type = TYPE_METHOD;
            if ((methTok.length == 4 && memcmp(methTok.start, "init", 4) == 0) ||
                identifiers_equal(&methTok, &className))
            {
                type = TYPE_INITIALIZER;
                Token initTok;
                initTok.start = "init";
                initTok.length = 4;
                constant = identifier_constant(&initTok);
            }
            function_body(type);
            emit_op_16(OP_METHOD, constant);
        }
        else if (match(TOKEN_OPERATOR))
        {
            const char *opMethodName = NULL;
            int expectedArity = 1;
            if (match(TOKEN_PLUS))
                opMethodName = "__op_add";
            else if (match(TOKEN_MINUS))
            {
                if (check(TOKEN_LEFT_PAREN) && krb_peek_token().type == TOKEN_RIGHT_PAREN)
                {
                    opMethodName = "__op_neg";
                    expectedArity = 0;
                }
                else
                {
                    opMethodName = "__op_sub";
                }
            }
            else if (match(TOKEN_STAR))
                opMethodName = "__op_mul";
            else if (match(TOKEN_SLASH))
                opMethodName = "__op_div";
            else if (match(TOKEN_PERCENT))
                opMethodName = "__op_mod";
            else if (match(TOKEN_EQUAL_EQUAL))
                opMethodName = "__op_eq";
            else if (match(TOKEN_LESS))
                opMethodName = "__op_lt";
            else if (match(TOKEN_GREATER))
                opMethodName = "__op_gt";
            else
                error_at_current("Overloadable operator expected (+, -, *, /, %, ==, <, >).");

            if (opMethodName != NULL)
            {
                uint16_t opConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(opMethodName)));
                function_body(TYPE_METHOD);
                Chunk *ch = current_chunk();
                for (int ci = ch->constants.count - 1; ci >= 0; ci--)
                {
                    if (IS_FUNCTION(ch->constants.values[ci]))
                    {
                        if (AS_FUNCTION(ch->constants.values[ci])->arity != expectedArity)
                        {
                            error(expectedArity == 0
                                      ? "Unary operator '-' takes 0 parameters."
                                      : "Binary operator must take exactly 1 parameter.");
                        }
                        break;
                    }
                }
                emit_op_16(OP_METHOD, opConst);
            }
        }
        else if (match(TOKEN_GET))
        {
            consume(TOKEN_IDENTIFIER, "Expected property name after 'get'.");
            Token propTok = parser.previous;
            char getBuf[64];
            snprintf(getBuf, sizeof(getBuf), "get_%.*s", propTok.length, propTok.start);
            uint16_t getConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(getBuf)));

            Compiler compiler;
            init_compiler(&compiler, TYPE_METHOD);
            begin_scope();
            consume(TOKEN_THEN, "Expected 'then' after 'get' header.");
            while (!check(TOKEN_END) && !check(TOKEN_EOF))
            {
                declaration();
            }
            consume(TOKEN_END, "Expected 'end' to close getter.");
            emit_closure(&compiler);
            emit_op_16(OP_METHOD, getConst);
        }
        else if (match(TOKEN_SET))
        {
            consume(TOKEN_IDENTIFIER, "Expected property name after 'set'.");
            Token propTok = parser.previous;
            char setBuf[64];
            snprintf(setBuf, sizeof(setBuf), "set_%.*s", propTok.length, propTok.start);
            uint16_t setConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(setBuf)));

            Compiler compiler;
            init_compiler(&compiler, TYPE_METHOD);
            begin_scope();
            consume(TOKEN_LEFT_PAREN, "Expected '(' after 'set' name.");
            current->function->arity = 1;
            match(TOKEN_IVAR);
            parse_type_annotation(NULL, NULL, 0);
            consume(TOKEN_IDENTIFIER, "Expected parameter name.");
            declare_variable(false);
            define_variable(0, false);
            consume(TOKEN_RIGHT_PAREN, "Expected ')' after parameter.");
            consume(TOKEN_THEN, "Expected 'then' after 'set' header.");
            while (!check(TOKEN_END) && !check(TOKEN_EOF))
            {
                declaration();
            }
            consume(TOKEN_END, "Expected 'end' to close setter.");
            emit_closure(&compiler);
            emit_op_16(OP_METHOD, setConst);
        }
        else
        {
            declaration();
        }
    }
    consume(TOKEN_END, "Expected 'end' to close class.");
    emit_byte(OP_POP);
    currentClass = classCompiler.enclosing;
}

typedef enum
{
    SWAP_KIND_VAR,
    SWAP_KIND_PROP,
    SWAP_KIND_INDEX1,
    SWAP_KIND_INDEX2
} SwapKind;

typedef struct
{
    SwapKind kind;
    Token root;
    Token prop;
    Token idx1;
    Token idx2;
} SwapTarget;

static SwapTarget parse_swap_target(void)
{
    SwapTarget t;
    memset(&t, 0, sizeof(t));
    consume(TOKEN_IDENTIFIER, "Expected identifier in atomic swap.");
    t.root = parser.previous;

    if (match(TOKEN_DOT))
    {
        t.kind = SWAP_KIND_PROP;
        consume(TOKEN_IDENTIFIER, "Expected property name after '.'.");
        t.prop = parser.previous;
    }
    else if (match(TOKEN_LEFT_BRACKET))
    {
        t.idx1 = parser.current;
        advance();
        consume(TOKEN_RIGHT_BRACKET, "Expected ']' after index.");
        if (match(TOKEN_LEFT_BRACKET))
        {
            t.kind = SWAP_KIND_INDEX2;
            t.idx2 = parser.current;
            advance();
            consume(TOKEN_RIGHT_BRACKET, "Expected ']' after index.");
        }
        else
        {
            t.kind = SWAP_KIND_INDEX1;
        }
    }
    else
    {
        t.kind = SWAP_KIND_VAR;
    }
    return t;
}

static void emit_swap_token_val(Token tok)
{
    if (tok.type == TOKEN_NUMBER)
    {
        char buf[32] = {0};
        int l = tok.length < 31 ? tok.length : 31;
        memcpy(buf, tok.start, l);
        buf[l] = '\0';
        emit_constant(krb_int(_strtoi64(buf, NULL, 10)));
    }
    else if (tok.type == TOKEN_STRING)
    {
        int len = tok.length - 2;
        char *chars = (char *)malloc(len + 1);
        memcpy(chars, tok.start + 1, len);
        chars[len] = '\0';
        emit_constant(krb_string(chars));
    }
    else if (tok.type == TOKEN_IDENTIFIER)
    {
        named_variable(tok, false);
    }
}

static void emit_swap_load(SwapTarget t)
{
    named_variable(t.root, false);
    if (t.kind == SWAP_KIND_PROP)
    {
        emit_op_16(OP_GET_PROPERTY, identifier_constant(&t.prop));
    }
    else if (t.kind == SWAP_KIND_INDEX1)
    {
        emit_swap_token_val(t.idx1);
        emit_byte(OP_GET_INDEX);
    }
    else if (t.kind == SWAP_KIND_INDEX2)
    {
        emit_swap_token_val(t.idx1);
        emit_byte(OP_GET_INDEX);
        emit_swap_token_val(t.idx2);
        emit_byte(OP_GET_INDEX);
    }
}

static void emit_swap_store_from_temp(SwapTarget t, int tempLocal)
{
    if (t.kind == SWAP_KIND_VAR)
    {
        emit_bytes(OP_GET_LOCAL, (uint8_t)tempLocal);
        int local = resolve_local(current, &t.root);
        if (local != -1)
        {
            emit_bytes(OP_SET_LOCAL, (uint8_t)local);
        }
        else
        {
            emit_op_16(OP_SET_GLOBAL, identifier_constant(&t.root));
        }
        emit_byte(OP_POP);
    }
    else if (t.kind == SWAP_KIND_PROP)
    {
        named_variable(t.root, false);
        emit_bytes(OP_GET_LOCAL, (uint8_t)tempLocal);
        emit_op_16(OP_SET_PROPERTY, identifier_constant(&t.prop));
        emit_byte(OP_POP);
    }
    else if (t.kind == SWAP_KIND_INDEX1)
    {
        named_variable(t.root, false);
        emit_swap_token_val(t.idx1);
        emit_bytes(OP_GET_LOCAL, (uint8_t)tempLocal);
        emit_byte(OP_SET_INDEX);
        emit_byte(OP_POP);
    }
    else if (t.kind == SWAP_KIND_INDEX2)
    {
        named_variable(t.root, false);
        emit_swap_token_val(t.idx1);
        emit_byte(OP_GET_INDEX);
        emit_swap_token_val(t.idx2);
        emit_bytes(OP_GET_LOCAL, (uint8_t)tempLocal);
        emit_byte(OP_SET_INDEX);
        emit_byte(OP_POP);
    }
}

static void swap_statement(void)
{
    SwapTarget left = parse_swap_target();
    consume(TOKEN_SWAP, "Expected '<->'.");
    SwapTarget right = parse_swap_target();
    consume(TOKEN_SEMICOLON, "Expected ';' after swap.");

    begin_scope();

    emit_swap_load(left);
    Token tempATok;
    tempATok.start = "$tempA";
    tempATok.length = 6;
    add_local(tempATok, false);
    current->locals[current->localCount - 1].depth = current->scopeDepth;
    int tempA = current->localCount - 1;

    emit_swap_load(right);
    Token tempBTok;
    tempBTok.start = "$tempB";
    tempBTok.length = 6;
    add_local(tempBTok, false);
    current->locals[current->localCount - 1].depth = current->scopeDepth;
    int tempB = current->localCount - 1;

    emit_swap_store_from_temp(left, tempB);
    emit_swap_store_from_temp(right, tempA);

    end_scope();
}

static void do_statement(void)
{
    if (match(TOKEN_THEN))
    {
        Loop loop;
        loop.start = current_chunk()->count;
        loop.scopeDepth = current->scopeDepth;
        loop.breakJumpCount = 0;
        loop.skipJumpCount = 0;
        loop.enclosing = currentLoop;
        currentLoop = &loop;

        begin_scope();
        while (!check(TOKEN_WHILE) && !check(TOKEN_EOF))
        {
            declaration();
        }
        end_scope();

        consume(TOKEN_WHILE, "Expected 'while' after 'do' body.");
        consume(TOKEN_LEFT_PAREN, "Expected '(' before 'while' condition.");

        for (int i = 0; i < loop.skipJumpCount; i++)
        {
            patch_jump(loop.skipJumps[i]);
        }

        expression();
        consume(TOKEN_RIGHT_PAREN, "Expected ')' after 'while' condition.");
        consume(TOKEN_SEMICOLON, "Expected ';' after 'while (...)'.");

        int exitJump = emit_jump(OP_JUMP_IF_FALSE);
        emit_loop(loop.start);
        patch_jump(exitJump);

        for (int i = 0; i < loop.breakJumpCount; i++)
        {
            patch_jump(loop.breakJumps[i]);
        }
        currentLoop = loop.enclosing;
    }
    else
    {
        begin_scope();
        block();
        end_scope();
    }
}

static void given_statement(void)
{
    expression();
    consume(TOKEN_THEN, "Expected 'then' after 'given' expression.");

    begin_scope();
    Token targetTok;
    targetTok.start = "$givenVal";
    targetTok.length = 9;
    add_local(targetTok, false);
    current->locals[current->localCount - 1].depth = current->scopeDepth;
    int targetLocal = current->localCount - 1;

    int exitJumps[64];
    int exitJumpCount = 0;
    int nextCaseJump = -1;

    while (match(TOKEN_CASE))
    {
        if (nextCaseJump != -1)
        {
            patch_jump(nextCaseJump);
            nextCaseJump = -1;
        }

        if (match(TOKEN_TILDE))
        {
            consume(TOKEN_THEN, "Expected 'then' after 'case ~'.");
            while (!check(TOKEN_END) && !check(TOKEN_EOF))
            {
                if (match(TOKEN_BREAK))
                {
                    consume(TOKEN_SEMICOLON, "Expected ';' after 'break'.");
                    exitJumps[exitJumpCount++] = emit_jump(OP_JUMP);
                }
                else
                {
                    declaration();
                }
            }
            consume(TOKEN_END, "Expected 'end' to close 'case ~'.");
        }
        else
        {
            emit_bytes(OP_GET_LOCAL, (uint8_t)targetLocal);
            expression();
            emit_byte(OP_EQUAL);
            nextCaseJump = emit_jump(OP_JUMP_IF_FALSE);

            consume(TOKEN_THEN, "Expected 'then' after 'case' condition.");
            while (!check(TOKEN_END) && !check(TOKEN_EOF))
            {
                if (match(TOKEN_BREAK))
                {
                    consume(TOKEN_SEMICOLON, "Expected ';' after 'break'.");
                    exitJumps[exitJumpCount++] = emit_jump(OP_JUMP);
                }
                else
                {
                    declaration();
                }
            }
            consume(TOKEN_END, "Expected 'end' to close 'case'.");
        }
    }

    if (nextCaseJump != -1)
    {
        patch_jump(nextCaseJump);
    }

    consume(TOKEN_END, "Expected 'end' to close 'given'.");

    for (int i = 0; i < exitJumpCount; i++)
    {
        patch_jump(exitJumps[i]);
    }

    end_scope();
}

static void throw_statement(void)
{
    expression();
    consume(TOKEN_SEMICOLON, "Expected ';' after 'throw'.");
    emit_byte(OP_THROW);
}

static void try_statement(void)
{
    match(TOKEN_THEN);

    emit_byte(OP_TRY);
    int tryJump = current_chunk()->count;
    emit_byte(0xff);
    emit_byte(0xff);
    emit_byte(0xff);
    emit_byte(0xff);

    begin_scope();
    while (!check(TOKEN_CATCH) && !check(TOKEN_FINALLY) && !check(TOKEN_END) && !check(TOKEN_EOF))
    {
        declaration();
    }
    end_scope();

    emit_byte(OP_TRY_END);
    int exitJump = emit_jump(OP_JUMP);

    int catchOffset = -1;
    if (match(TOKEN_CATCH))
    {
        catchOffset = current_chunk()->count;
        consume(TOKEN_LEFT_PAREN, "Expected '(' after 'catch'.");
        consume(TOKEN_IVAR, "Expected 'ivar' for 'catch' error parameter.");
        consume(TOKEN_IDENTIFIER, "Expected error variable name.");
        Token errToken = parser.previous;
        consume(TOKEN_RIGHT_PAREN, "Expected ')' after 'catch' parameter.");
        match(TOKEN_THEN);

        begin_scope();
        add_local(errToken, false);
        current->locals[current->localCount - 1].depth = current->scopeDepth;

        while (!check(TOKEN_FINALLY) && !check(TOKEN_END) && !check(TOKEN_EOF))
        {
            declaration();
        }
        end_scope();
    }

    int finallyOffset = -1;
    if (match(TOKEN_FINALLY))
    {
        finallyOffset = current_chunk()->count;
        patch_jump(exitJump);
        exitJump = -1;
        match(TOKEN_THEN);

        begin_scope();
        while (!check(TOKEN_END) && !check(TOKEN_EOF))
        {
            declaration();
        }
        end_scope();
    }

    consume(TOKEN_END, "Expected 'end' to close 'try' block.");
    if (exitJump != -1)
    {
        patch_jump(exitJump);
    }

    if (catchOffset != -1)
    {
        int off = catchOffset - (tryJump + 4);
        current_chunk()->code[tryJump] = (uint8_t)((off >> 8) & 0xff);
        current_chunk()->code[tryJump + 1] = (uint8_t)(off & 0xff);
    }
    if (finallyOffset != -1)
    {
        int off = finallyOffset - (tryJump + 4);
        current_chunk()->code[tryJump + 2] = (uint8_t)((off >> 8) & 0xff);
        current_chunk()->code[tryJump + 3] = (uint8_t)(off & 0xff);
    }
}

static void kill_statement(void)
{
    consume(TOKEN_IDENTIFIER, "Expected variable name after 'kill'.");
    Token name = parser.previous;
    uint16_t nameConst = identifier_constant(&name);
    consume(TOKEN_SEMICOLON, "Expected ';' after 'kill'.");
    emit_op_16(OP_KILL, nameConst);
}

static void lock_or_unlock_statement(bool isUnlock)
{
    consume(TOKEN_IDENTIFIER, "Expected variable name after 'unlock' / 'lock'.");
    Token name = parser.previous;
    char full[128];
    snprintf(full, sizeof(full), "%.*s", name.length, name.start);
    bool isDotted = false;
    if (match(TOKEN_DOT))
    {
        isDotted = true;
        consume(TOKEN_IDENTIFIER, "Expected member name after '.'.");
        snprintf(full + strlen(full), sizeof(full) - strlen(full), ".%.*s", parser.previous.length, parser.previous.start);
    }
    consume(TOKEN_SEMICOLON, "Expected ';' after 'unlock' / 'lock'.");
    if (!isDotted)
    {
        int arg = resolve_local(current, &name);
        if (arg != -1)
            current->locals[arg].isUnlocked = isUnlock;
    }
    uint16_t nameConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(full)));
    emit_op_16(isUnlock ? OP_UNLOCK_VAR : OP_LOCK_VAR, nameConst);
}

static void import_statement(void)
{
    consume(TOKEN_IDENTIFIER, "Expected module name after 'import'.");
    Token pkg = parser.previous;
    uint16_t pkgConst = identifier_constant(&pkg);

    if (match(TOKEN_TILDE))
    {
        consume(TOKEN_LEFT_PAREN, "Expected '(' after '~'.");
        while (!check(TOKEN_RIGHT_PAREN) && !check(TOKEN_EOF))
        {
            consume(TOKEN_IDENTIFIER, "Expected member name.");
            Token mem = parser.previous;
            uint16_t memConst = identifier_constant(&mem);

            emit_op_16(OP_GET_GLOBAL, pkgConst);
            emit_op_16(OP_GET_PROPERTY, memConst);
            emit_op_16(OP_DEFINE_GLOBAL, memConst);

            if (!check(TOKEN_RIGHT_PAREN))
            {
                consume(TOKEN_COMMA, "Expected ',' between members.");
            }
        }
        consume(TOKEN_RIGHT_PAREN, "Expected ')' to close import list.");
    }

    if (match(TOKEN_ALIAS))
    {
        if (match(TOKEN_TILDE))
        {
        }
        else
        {
            consume(TOKEN_IDENTIFIER, "Expected alias name.");
        }
    }
    consume(TOKEN_SEMICOLON, "Expected ';' after 'import'.");
}

static void enum_declaration(void)
{
    consume(TOKEN_IDENTIFIER, "Expected enum name.");
    Token enumTok = parser.previous;
    uint16_t enumConst = identifier_constant(&enumTok);
    declare_variable(true);

    consume(TOKEN_THEN, "Expected 'then' after enum name.");
    emit_constant(krb_obj_val((Obj *)krb_new_obj_table()));

    int idx = 0;
    while (!check(TOKEN_END) && !check(TOKEN_EOF))
    {
        consume(TOKEN_IDENTIFIER, "Expected enum member name.");
        Token mTok = parser.previous;
        uint16_t mConst = identifier_constant(&mTok);

        emit_byte(OP_DUP);
        emit_constant(krb_int(idx++));
        emit_op_16(OP_SET_PROPERTY, mConst);
        emit_byte(OP_POP);

        if (!check(TOKEN_END))
            match(TOKEN_COMMA);
    }
    consume(TOKEN_END, "Expected 'end' to close enum.");
    define_variable(enumConst, true);
}

static void interface_declaration(void)
{
    consume(TOKEN_IDENTIFIER, "Expected interface name.");
    Token ifaceTok = parser.previous;
    uint16_t ifaceConst = identifier_constant(&ifaceTok);
    declare_variable(true);

    consume(TOKEN_THEN, "Expected 'then' after interface name.");
    while (!check(TOKEN_END) && !check(TOKEN_EOF))
    {
        advance();
    }
    consume(TOKEN_END, "Expected 'end' to close interface.");

    char *str = (char *)malloc(ifaceTok.length + 1);
    memcpy(str, ifaceTok.start, ifaceTok.length);
    str[ifaceTok.length] = '\0';
    emit_constant(krb_string(str));
    define_variable(ifaceConst, true);
}

static void hook_declaration(void)
{
    consume(TOKEN_IDENTIFIER, "Expected target name after 'hook'.");
    Token target1 = parser.previous;

    if (match(TOKEN_DOT))
    {
        consume(TOKEN_IDENTIFIER, "Expected method name after '.'.");
        Token methodTok = parser.previous;
        uint16_t methodConst = identifier_constant(&methodTok);

        named_variable(target1, false);
        emit_op_16(OP_HOOK_SAVE_METHOD, methodConst);

        int len = methodTok.length < 63 ? methodTok.length : 63;
        memcpy(pending_hook_method, methodTok.start, len);
        pending_hook_method[len] = '\0';

        function_body(TYPE_METHOD);
        pending_hook_method[0] = '\0';

        emit_op_16(OP_METHOD, methodConst);
        emit_byte(OP_POP);
    }
    else
    {
        Token origTok;
        origTok.start = "orig";
        origTok.length = 4;
        uint16_t origConst = identifier_constant(&origTok);
        int localArg = resolve_local(current, &target1);
        if (localArg != -1)
        {
            if (current->locals[localArg].isConst)
            {
                function_body(TYPE_FUNCTION);
                emit_byte(OP_POP);
                emit_runtime_type_error("Cannot hook a constant function.");
                return;
            }
            if (current->locals[localArg].isSealed)
            {
                current->locals[localArg].isUnlocked = false;
                emit_op_16(OP_CONSUME_UNLOCK, identifier_constant(&target1));
            }
            emit_bytes(OP_GET_LOCAL, (uint8_t)localArg);
            emit_op_16(OP_DEFINE_GLOBAL, origConst);
            function_body(TYPE_FUNCTION);
            emit_bytes(OP_SET_LOCAL, (uint8_t)localArg);
            emit_byte(OP_POP);
        }
        else
        {
            uint16_t funcConst = identifier_constant(&target1);
            emit_op_16(OP_GET_GLOBAL, funcConst);
            emit_op_16(OP_DEFINE_GLOBAL, origConst);

            function_body(TYPE_FUNCTION);
            emit_op_16(OP_SET_GLOBAL, funcConst);
            emit_byte(OP_POP);
        }
    }
}

static void cast_assignment_statement(void)
{
    consume(TOKEN_LEFT_BRACKET, "Expected '['.");
    bool isNonNull = false;
    char typeName[32] = "";

    if (match(TOKEN_LEFT_PAREN))
    {
        isNonNull = true;
        consume(TOKEN_IDENTIFIER, "Expected type name.");
        snprintf(typeName, sizeof(typeName), "%.*s", parser.previous.length, parser.previous.start);
        consume(TOKEN_RIGHT_PAREN, "Expected ')' after type.");
    }
    else
    {
        consume(TOKEN_IDENTIFIER, "Expected type name.");
        snprintf(typeName, sizeof(typeName), "%.*s", parser.previous.length, parser.previous.start);
    }
    consume(TOKEN_RIGHT_BRACKET, "Expected ']' to close cast.");

    consume(TOKEN_IDENTIFIER, "Expected variable name after cast.");
    Token varName = parser.previous;

    int arg = resolve_local(current, &varName);
    uint8_t setOp;
    bool blockedConst = false;
    if (arg != -1)
    {
        setOp = OP_SET_LOCAL;
        snprintf(current->locals[arg].typeName, 32, "%s", typeName);
        if (current->locals[arg].isConst)
            blockedConst = true;
        if (current->locals[arg].isSealed)
        {
            current->locals[arg].isUnlocked = false;
            emit_op_16(OP_CONSUME_UNLOCK, identifier_constant(&varName));
        }
    }
    else
    {
        arg = identifier_constant(&varName);
        setOp = OP_SET_GLOBAL;
        set_global_var_type(&varName, typeName);
    }

    consume(TOKEN_EQUAL, "Expected '=' for cast assignment.");
    expression();
    if (blockedConst)
    {
        emit_byte(OP_POP);
        emit_runtime_type_error("Cannot reassign local constant.");
        consume(TOKEN_SEMICOLON, "Expected ';' after cast assignment.");
        return;
    }

    uint16_t typeConst = (uint16_t)krb_add_constant(current_chunk(), krb_string(_strdup(typeName)));
    emit_op_16(OP_COERCE, typeConst);

    if (isNonNull || (arg != -1 && current->locals[arg].isNonNull))
    {
        emit_byte(OP_CHECK_NON_NULL);
    }

    emit_var_op(setOp, arg);
    emit_byte(OP_POP);
    consume(TOKEN_SEMICOLON, "Expected ';' after cast assignment.");
}

static bool is_cast_assignment_ahead(void)
{
    if (!check(TOKEN_LEFT_BRACKET))
        return false;
    void *state = krb_save_scanner_state();
    Parser saved = parser;
    bool isMatch = false;
    advance();
    if (match(TOKEN_LEFT_PAREN))
    {
        if (check(TOKEN_IDENTIFIER) && is_type_name_str(parser.current.start, parser.current.length))
        {
            advance();
            if (match(TOKEN_RIGHT_PAREN) && match(TOKEN_RIGHT_BRACKET) && check(TOKEN_IDENTIFIER))
            {
                advance();
                if (check(TOKEN_EQUAL))
                    isMatch = true;
            }
        }
    }
    else if (check(TOKEN_IDENTIFIER) && is_type_name_str(parser.current.start, parser.current.length))
    {
        advance();
        if (match(TOKEN_RIGHT_BRACKET) && check(TOKEN_IDENTIFIER))
        {
            advance();
            if (check(TOKEN_EQUAL))
                isMatch = true;
        }
    }
    krb_restore_scanner_state(state);
    parser = saved;
    return isMatch;
}

static void statement(void)
{
    if (match(TOKEN_PASTE))
    {
        paste_statement(false);
    }
    else if (match(TOKEN_PASTELN))
    {
        paste_statement(true);
    }
    else if (match(TOKEN_DO))
    {
        do_statement();
    }
    else if (match(TOKEN_IF))
    {
        if_statement();
    }
    else if (match(TOKEN_WHILE))
    {
        while_statement();
    }
    else if (match(TOKEN_FOR))
    {
        for_statement();
    }
    else if (match(TOKEN_GIVEN))
    {
        given_statement();
    }
    else if (match(TOKEN_TRY))
    {
        try_statement();
    }
    else if (match(TOKEN_THROW))
    {
        throw_statement();
    }
    else if (match(TOKEN_KILL))
    {
        kill_statement();
    }
    else if (match(TOKEN_UNLOCK))
    {
        lock_or_unlock_statement(true);
    }
    else if (match(TOKEN_LOCK))
    {
        lock_or_unlock_statement(false);
    }
    else if (match(TOKEN_IMPORT))
    {
        import_statement();
    }
    else if (match(TOKEN_BREAK))
    {
        break_statement();
    }
    else if (match(TOKEN_SKIP))
    {
        skip_statement();
    }
    else if (match(TOKEN_RETURN))
    {
        return_statement();
    }
    else
    {
        if (check(TOKEN_IDENTIFIER) && krb_is_swap_ahead())
        {
            swap_statement();
        }
        else if (is_cast_assignment_ahead())
        {
            cast_assignment_statement();
        }
        else
        {
            expression_statement();
        }
    }
}

static void declaration(void)
{
    if (match(TOKEN_IVAR))
    {
        var_declaration(VAR_MUTABLE);
    }
    else if (match(TOKEN_ICONST))
    {
        var_declaration(VAR_CONST);
    }
    else if (match(TOKEN_ISEALED))
    {
        var_declaration(VAR_SEALED);
    }
    else if (match(TOKEN_FUNCTION))
    {
        function_declaration();
    }
    else if (match(TOKEN_CLASS))
    {
        class_declaration();
    }
    else if (match(TOKEN_ENUM))
    {
        enum_declaration();
    }
    else if (match(TOKEN_INTERFACE))
    {
        interface_declaration();
    }
    else if (match(TOKEN_HOOK))
    {
        hook_declaration();
    }
    else if (match(TOKEN_IMPORT))
    {
        import_statement();
    }
    else
    {
        statement();
    }
}

ObjFunction *krb_compile(const char *source)
{
    krb_init_scanner(source);
    Compiler compiler;
    init_compiler(&compiler, TYPE_SCRIPT);

    parser.hadError = false;
    parser.panicMode = false;

    advance();
    while (!match(TOKEN_EOF))
    {
        declaration();
    }

    ObjFunction *function = end_compiler();
    return parser.hadError ? NULL : function;
}
