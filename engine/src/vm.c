#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>
#include "../include/vm.h"
#include "../include/debug.h"
#include "../include/compiler.h"
#include "../include/stdlib_krb.h"

VM vm;
static bool trace_execution = false;

void krb_set_trace_execution(bool enable)
{
    trace_execution = enable;
}

static void reset_stack(void)
{
    vm.stackTop = vm.stack;
    vm.frameCount = 0;
}

static int current_line(void)
{
    if (vm.frameCount <= 0)
        return 1;
    CallFrame *f = &vm.frames[vm.frameCount - 1];
    return f->closure->function->chunk.lines[f->ip - f->closure->function->chunk.code - 1];
}

static KrbValue make_error_table(const char *errorName, const char *message, int line)
{
    ObjTable *errTable = krb_new_obj_table();
    krb_table_set(&errTable->fields, "eName", 5, krb_string(_strdup(errorName)), false);
    krb_table_set(&errTable->fields, "eContext", 8, krb_string(_strdup(message)), false);
    krb_table_set(&errTable->fields, "eTime", 5, krb_bool(false), false);
    krb_table_set(&errTable->fields, "eLine", 5, krb_int(line), false);
    krb_table_set(&errTable->fields, "eCol", 4, krb_int(1), false);
    return krb_obj_val((Obj *)errTable);
}

static bool unwind_try_handler(KrbValue errVal)
{
    if (vm.try_count <= 0)
        return false;
    KrbTryHandler h = vm.try_stack[--vm.try_count];
    while (vm.frameCount - 1 > h.frame_index)
        vm.frameCount--;
    vm.stackTop = vm.stack + h.stack_count;
    CallFrame *frame = &vm.frames[vm.frameCount - 1];
    if (h.catch_ip != NULL)
    {
        krb_push(errVal);
        frame->ip = h.catch_ip;
        return true;
    }
    if (h.finally_ip != NULL)
    {
        frame->ip = h.finally_ip;
        return true;
    }
    return false;
}

static bool trigger_runtime_error(const char *errorName, const char *format, ...)
{
    char message[1024];
    va_list args;
    va_start(args, format);
    vsnprintf(message, sizeof(message), format, args);
    va_end(args);

    int line = current_line();
    if (unwind_try_handler(make_error_table(errorName, message, line)))
        return true;

    fprintf(stderr, "\x1b[31m[%s: Line %d, Col 1] %s\x1b[0m\n", errorName, line, message);
    reset_stack();
    return false;
}

#define runtime_error(...) trigger_runtime_error("RuntimeError", __VA_ARGS__)

void krb_push(KrbValue value)
{
    *vm.stackTop = value;
    vm.stackTop++;
}

KrbValue krb_pop(void)
{
    vm.stackTop--;
    return *vm.stackTop;
}

KrbValue krb_peek(int distance)
{
    return *(vm.stackTop - 1 - distance);
}

void krb_define_native(const char *name, NativeFn function)
{
    krb_push(krb_string(name));
    krb_push(krb_obj_val((Obj *)krb_new_native(function, name)));
    krb_table_set(&vm.globals, name, (int)strlen(name), vm.stack[1], false);
    krb_pop();
    krb_pop();
}

static KrbValue native_len(int argCount, KrbValue *args)
{
    if (argCount != 1)
        return krb_int(0);
    KrbValue val = args[0];
    if (val.type == VAL_STRING)
    {
        return krb_int((int64_t)strlen(val.as.string));
    }
    if (IS_LIST(val))
    {
        return krb_int((int64_t)AS_LIST(val)->elements.count);
    }
    if (IS_TABLE(val))
    {
        return krb_int((int64_t)AS_TABLE(val)->fields.count);
    }
    return krb_int(0);
}

static KrbValue native_type(int argCount, KrbValue *args)
{
    if (argCount != 1)
        return krb_string("Unknown");
    KrbValue val = args[0];
    switch (val.type)
    {
    case VAL_NULL:
        return krb_string("Null");
    case VAL_BOOL:
        return krb_string("Bool");
    case VAL_INT:
        return krb_string("Int");
    case VAL_FLOAT:
        return krb_string("Float");
    case VAL_STRING:
        return krb_string("String");
    case VAL_OBJ:
    {
        switch (val.as.obj->type)
        {
        case OBJ_FUNCTION:
            return krb_string("Function");
        case OBJ_CLOSURE:
            return krb_string("Function");
        case OBJ_UPVALUE:
            return krb_string("Upvalue");
        case OBJ_NATIVE:
            return krb_string("NativeFunction");
        case OBJ_LIST:
            return krb_string("List");
        case OBJ_TABLE:
            return krb_string("Table");
        case OBJ_CLASS:
            return krb_string("Class");
        case OBJ_INSTANCE:
            return krb_string("Instance");
        }
    }
    }
    return krb_string("Unknown");
}

static KrbValue native_push(int argCount, KrbValue *args)
{
    if (argCount == 2 && IS_LIST(args[0]))
    {
        ObjList *list = AS_LIST(args[0]);
        krb_write_value_array(&list->elements, args[1]);
        return krb_int((int64_t)list->elements.count);
    }
    return krb_null();
}

static KrbValue native_pop(int argCount, KrbValue *args)
{
    if (argCount == 1 && IS_LIST(args[0]))
    {
        ObjList *list = AS_LIST(args[0]);
        if (list->elements.count > 0)
        {
            list->elements.count--;
            return list->elements.values[list->elements.count];
        }
    }
    return krb_null();
}

void krb_init_vm(void)
{
    reset_stack();
    vm.objects = NULL;
    vm.openUpvalues = NULL;
    vm.try_count = 0;
    krb_init_table(&vm.globals);
    krb_init_table(&vm.constGlobals);
    krb_init_table(&vm.sealedGlobals);
    krb_init_table(&vm.unlockedGlobals);
    krb_init_table(&vm.nonNullGlobals);

    krb_define_native("len", native_len);
    krb_define_native("type", native_type);
    krb_define_native("push", native_push);
    krb_define_native("pop", native_pop);

    krb_init_stdlib();
}

void krb_free_vm(void)
{
    krb_free_table(&vm.globals);
    krb_free_table(&vm.constGlobals);
    krb_free_table(&vm.sealedGlobals);
    krb_free_table(&vm.unlockedGlobals);
    krb_free_table(&vm.nonNullGlobals);

    Obj *object = vm.objects;
    while (object != NULL)
    {
        Obj *next = object->next;
        krb_free_object(object);
        object = next;
    }
    vm.objects = NULL;
}

static ObjUpvalue *capture_upvalue(KrbValue *local)
{
    ObjUpvalue *prevUpvalue = NULL;
    ObjUpvalue *upvalue = vm.openUpvalues;
    while (upvalue != NULL && upvalue->location > local)
    {
        prevUpvalue = upvalue;
        upvalue = upvalue->next;
    }
    if (upvalue != NULL && upvalue->location == local)
    {
        return upvalue;
    }
    ObjUpvalue *createdUpvalue = krb_new_upvalue(local);
    createdUpvalue->next = upvalue;
    if (prevUpvalue == NULL)
    {
        vm.openUpvalues = createdUpvalue;
    }
    else
    {
        prevUpvalue->next = createdUpvalue;
    }
    return createdUpvalue;
}

static void close_upvalues(KrbValue *last)
{
    while (vm.openUpvalues != NULL && vm.openUpvalues->location >= last)
    {
        ObjUpvalue *upvalue = vm.openUpvalues;
        upvalue->closed = *upvalue->location;
        upvalue->location = &upvalue->closed;
        vm.openUpvalues = upvalue->next;
    }
}

static bool is_falsey(KrbValue value)
{
    if (value.type == VAL_NULL)
        return true;
    if (value.type == VAL_BOOL)
        return !value.as.boolean;
    if (value.type == VAL_INT)
        return value.as.integer == 0;
    return false;
}

static bool is_null_function(KrbValue v)
{
    ObjFunction *fn = IS_CLOSURE(v) ? AS_CLOSURE(v)->function : (IS_FUNCTION(v) ? AS_FUNCTION(v) : NULL);
    return fn != NULL && fn->arity == 0 && !fn->hasValueReturn;
}

static KrbValue wrap_value_as_function(KrbValue val)
{
    ObjFunction *fn = krb_new_function();
    fn->hasValueReturn = (val.type != VAL_NULL);
    if (val.type == VAL_STRING && val.as.string != NULL)
        val = krb_string(_strdup(val.as.string));
    int idx = krb_add_constant(&fn->chunk, val);
    krb_write_chunk(&fn->chunk, OP_CONSTANT, 0);
    krb_write_chunk(&fn->chunk, (uint8_t)((idx >> 8) & 0xff), 0);
    krb_write_chunk(&fn->chunk, (uint8_t)(idx & 0xff), 0);
    krb_write_chunk(&fn->chunk, OP_RETURN, 0);
    return krb_obj_val((Obj *)krb_new_closure(fn));
}

static bool values_equal(KrbValue a, KrbValue b)
{
    if ((a.type == VAL_NULL && is_null_function(b)) || (b.type == VAL_NULL && is_null_function(a)))
        return true;
    if (a.type == b.type)
        return krb_values_equal(a, b);
    if (a.type == VAL_INT && b.type == VAL_BOOL)
        return (a.as.integer == 1 && b.as.boolean) || (a.as.integer == 0 && !b.as.boolean);
    if (a.type == VAL_BOOL && b.type == VAL_INT)
        return (b.as.integer == 1 && a.as.boolean) || (b.as.integer == 0 && !a.as.boolean);
    if (a.type == VAL_INT && b.type == VAL_FLOAT)
        return (double)a.as.integer == b.as.number;
    if (a.type == VAL_FLOAT && b.type == VAL_INT)
        return a.as.number == (double)b.as.integer;
    return false;
}

static bool eval_is_check(KrbValue val, const char *spec)
{
    const char *lockSpec = (spec[0] == ':') ? (spec + 1) : spec;
    if (strcmp(lockSpec, "lock") == 0 || strcmp(lockSpec, "unlock") == 0)
    {
        bool wantLock = (strcmp(lockSpec, "lock") == 0);
        if (val.type != VAL_STRING)
            return false;
        const char *s = val.as.string;
        if (strcmp(s, "$const") == 0)
            return wantLock;
        if (strcmp(s, "$mutable") == 0)
            return !wantLock;
        KrbValue dummy;
        if (strncmp(s, "$sealed:", 8) == 0)
        {
            const char *vname = s + 8;
            bool isUnl = krb_table_get(&vm.unlockedGlobals, vname, (int)strlen(vname), &dummy);
            return wantLock ? !isUnl : isUnl;
        }
        if (strncmp(s, "$global:", 8) == 0)
        {
            const char *vname = s + 8;
            int vlen = (int)strlen(vname);
            if (krb_table_get(&vm.constGlobals, vname, vlen, &dummy))
                return wantLock;
            if (krb_table_get(&vm.sealedGlobals, vname, vlen, &dummy))
            {
                bool isUnl = krb_table_get(&vm.unlockedGlobals, vname, vlen, &dummy);
                return wantLock ? !isUnl : isUnl;
            }
            if (krb_table_get(&vm.globals, vname, vlen, &dummy))
                return !wantLock;
        }
        return false;
    }

    if (strcmp(spec, "NULL") == 0)
        return val.type == VAL_NULL || is_null_function(val);
    if (strcmp(spec, "Int") == 0)
        return val.type == VAL_INT;
    if (strcmp(spec, "Float") == 0)
        return val.type == VAL_FLOAT;
    if (strcmp(spec, "String") == 0)
        return val.type == VAL_STRING;
    if (strcmp(spec, "Bool") == 0)
        return val.type == VAL_BOOL;
    if (strcmp(spec, "List") == 0 || strncmp(spec, "List<", 5) == 0)
        return IS_LIST(val);
    if (strcmp(spec, "Stack") == 0 || strncmp(spec, "Stack<", 6) == 0)
        return IS_LIST(val);
    if (strcmp(spec, "Queue") == 0 || strncmp(spec, "Queue<", 6) == 0)
        return IS_LIST(val);
    if (strcmp(spec, "Table") == 0)
        return IS_TABLE(val) || IS_INSTANCE(val);
    if (strcmp(spec, "Function") == 0)
        return IS_CLOSURE(val) || IS_FUNCTION(val) || IS_NATIVE(val);

    if (IS_INSTANCE(val))
    {
        ObjClass *curr = AS_INSTANCE(val)->klass;
        while (curr != NULL)
        {
            KrbValue dummy;
            if (krb_table_get(&curr->interfaces, spec, (int)strlen(spec), &dummy))
                return true;
            curr = curr->superClass;
        }
    }

    KrbValue target;
    if (krb_table_get(&vm.globals, spec, (int)strlen(spec), &target))
    {
        if (IS_CLASS(target))
        {
            if (!IS_INSTANCE(val))
                return false;
            ObjClass *targetClass = AS_CLASS(target);
            ObjClass *curr = AS_INSTANCE(val)->klass;
            while (curr != NULL)
            {
                if (curr == targetClass || strcmp(curr->name, targetClass->name) == 0)
                    return true;
                curr = curr->superClass;
            }
            return false;
        }
        if (IS_TABLE(target))
        {
            ObjTable *tbl = AS_TABLE(target);
            for (int i = 0; i < tbl->fields.capacity; i++)
            {
                if (tbl->fields.entries[i].key != NULL)
                {
                    if (values_equal(val, tbl->fields.entries[i].value))
                        return true;
                }
            }
            if (IS_INSTANCE(val))
                return true;
            return false;
        }
    }
    return false;
}

static InterpretResult run(int minFrameCount);
static bool call(ObjClosure *closure, int argCount);

static bool find_class_method(ObjClass *klass, const char *name, KrbValue *outMethod)
{
    int len = (int)strlen(name);
    for (ObjClass *curr = klass; curr != NULL; curr = curr->superClass)
    {
        if (krb_table_get(&curr->methods, name, len, outMethod))
            return true;
    }
    return false;
}

static bool call_fn_val(KrbValue fnVal, int argCount)
{
    if (IS_CLOSURE(fnVal))
        return call(AS_CLOSURE(fnVal), argCount);
    if (IS_FUNCTION(fnVal))
        return call(krb_new_closure(AS_FUNCTION(fnVal)), argCount);
    return false;
}

static int invoke_class_method(ObjClass *klass, const char *name, int argCount, CallFrame **frameOut)
{
    KrbValue methodVal;
    if (!find_class_method(klass, name, &methodVal))
        return 0;
    if (!call_fn_val(methodVal, argCount))
        return -1;
    *frameOut = &vm.frames[vm.frameCount - 1];
    return 1;
}

static int invoke_instance_method(ObjInstance *instance, const char *name, int argCount, CallFrame **frameOut)
{
    return invoke_class_method(instance->klass, name, argCount, frameOut);
}

static int eval_instance_to_string(ObjInstance *inst, KrbValue *outVal)
{
    KrbValue methodVal;
    if (!find_class_method(inst->klass, "toString", &methodVal))
        return 0;

    int baseFrames = vm.frameCount;
    uint8_t *savedIp = (baseFrames > 0) ? vm.frames[baseFrames - 1].ip : NULL;
    int savedTryCount = vm.try_count;

    krb_push(krb_obj_val((Obj *)inst));
    if (!call_fn_val(methodVal, 0))
        return -1;
    if (vm.frameCount <= baseFrames)
        return 2;

    if (run(baseFrames) != INTERPRET_OK)
        return -1;
    if (baseFrames > 0 && (vm.try_count < savedTryCount || vm.frames[baseFrames - 1].ip != savedIp))
        return 2;

    *outVal = krb_pop();
    return 1;
}

static const char *format_concat_side(KrbValue v, char *buf, size_t bufSize)
{
    if (v.type == VAL_STRING)
        return v.as.string;
    if (v.type == VAL_INT)
    {
        snprintf(buf, bufSize, "%lld", (long long)v.as.integer);
        return buf;
    }
    if (v.type == VAL_FLOAT)
    {
        snprintf(buf, bufSize, "%g", v.as.number);
        return buf;
    }
    if (v.type == VAL_BOOL)
        return v.as.boolean ? "TRUE" : "FALSE";
    if (v.type == VAL_NULL)
        return "NULL";
    if (IS_LIST(v))
    {
        buf[0] = '\0';
        strcat(buf, "[");
        ObjList *l = AS_LIST(v);
        for (int i = 0; i < l->elements.count && i < 8; i++)
        {
            if (i > 0)
                strcat(buf, ", ");
            char tmp[32];
            if (l->elements.values[i].type == VAL_INT)
                snprintf(tmp, sizeof(tmp), "%lld", (long long)l->elements.values[i].as.integer);
            else if (l->elements.values[i].type == VAL_STRING)
                snprintf(tmp, sizeof(tmp), "%s", l->elements.values[i].as.string);
            else
                snprintf(tmp, sizeof(tmp), "...");
            strcat(buf, tmp);
        }
        strcat(buf, "]");
        return buf;
    }
    if (IS_INSTANCE(v))
    {
        snprintf(buf, bufSize, "<instance of %s>",
                 AS_INSTANCE(v)->klass->name ? AS_INSTANCE(v)->klass->name : "Object");
        return buf;
    }
    return "<object>";
}

static bool binary_op(char op, CallFrame **frameOut)
{
    if (op == '+' && (krb_peek(1).type == VAL_STRING || krb_peek(0).type == VAL_STRING))
    {
        KrbValue b = krb_pop();
        KrbValue a = krb_pop();

        if (IS_INSTANCE(a))
        {
            KrbValue sVal;
            int st = eval_instance_to_string(AS_INSTANCE(a), &sVal);
            if (st < 0)
                return false;
            if (st == 2)
            {
                *frameOut = &vm.frames[vm.frameCount - 1];
                return true;
            }
            if (st == 1)
                a = sVal;
        }
        if (IS_INSTANCE(b))
        {
            KrbValue sVal;
            int st = eval_instance_to_string(AS_INSTANCE(b), &sVal);
            if (st < 0)
                return false;
            if (st == 2)
            {
                *frameOut = &vm.frames[vm.frameCount - 1];
                return true;
            }
            if (st == 1)
                b = sVal;
        }

        char bufA[128];
        char bufB[128];
        const char *strA = format_concat_side(a, bufA, sizeof(bufA));
        const char *strB = format_concat_side(b, bufB, sizeof(bufB));
        size_t lenA = strlen(strA);
        size_t lenB = strlen(strB);
        char *combined = (char *)malloc(lenA + lenB + 1);
        memcpy(combined, strA, lenA);
        memcpy(combined + lenA, strB, lenB);
        combined[lenA + lenB] = '\0';
        krb_push(krb_string(combined));
        return true;
    }

    if (IS_INSTANCE(krb_peek(1)))
    {
        const char *opMethod = NULL;
        switch (op)
        {
        case '+':
            opMethod = "__op_add";
            break;
        case '-':
            opMethod = "__op_sub";
            break;
        case '*':
            opMethod = "__op_mul";
            break;
        case '/':
            opMethod = "__op_div";
            break;
        case '%':
            opMethod = "__op_mod";
            break;
        }
        if (opMethod != NULL)
        {
            int inv = invoke_instance_method(AS_INSTANCE(krb_peek(1)), opMethod, 1, frameOut);
            if (inv < 0)
                return false;
            if (inv > 0)
                return true;
        }
    }

    KrbValue b = krb_pop();
    KrbValue a = krb_pop();

    if (a.type == VAL_INT && b.type == VAL_INT)
    {
        int64_t x = a.as.integer;
        int64_t y = b.as.integer;
        switch (op)
        {
        case '+':
            krb_push(krb_int(x + y));
            break;
        case '-':
            krb_push(krb_int(x - y));
            break;
        case '*':
            krb_push(krb_int(x * y));
            break;
        case '/':
            if (y == 0)
            {
                if (!trigger_runtime_error("MathError", "Division by zero is undefined."))
                    return false;
                return true;
            }
            krb_push(krb_int(x / y));
            break;
        case '%':
            if (y == 0)
            {
                if (!trigger_runtime_error("MathError", "Division or modulo by zero is undefined."))
                    return false;
                return true;
            }
            krb_push(krb_int(x % y));
            break;
        }
        return true;
    }

    if ((a.type == VAL_INT || a.type == VAL_FLOAT) &&
        (b.type == VAL_INT || b.type == VAL_FLOAT))
    {
        double x = (a.type == VAL_INT) ? (double)a.as.integer : a.as.number;
        double y = (b.type == VAL_INT) ? (double)b.as.integer : b.as.number;
        switch (op)
        {
        case '+':
            krb_push(krb_float(x + y));
            break;
        case '-':
            krb_push(krb_float(x - y));
            break;
        case '*':
            krb_push(krb_float(x * y));
            break;
        case '/':
            if (y == 0.0)
            {
                if (!trigger_runtime_error("MathError", "Division by zero is undefined."))
                    return false;
                return true;
            }
            krb_push(krb_float(x / y));
            break;
        }
        return true;
    }

    if (!trigger_runtime_error("TypeError", "Operands must be numbers (Int or Float)."))
        return false;
    *frameOut = &vm.frames[vm.frameCount - 1];
    return true;
}

static bool call(ObjClosure *closure, int argCount)
{
    ObjFunction *function = closure->function;
    if (argCount < function->minArity || argCount > function->arity)
    {
        if (!runtime_error("Expected between %d and %d arguments but got %d.", function->minArity, function->arity, argCount))
            return false;
        return true;
    }

    while (argCount < function->arity)
    {
        krb_push(function->defaultValues[argCount]);
        argCount++;
    }

    if (vm.frameCount == FRAMES_MAX)
    {
        if (!runtime_error("Call stack overflow."))
            return false;
        return true;
    }

    CallFrame *frame = &vm.frames[vm.frameCount++];
    frame->closure = closure;
    frame->ip = function->chunk.code;
    frame->slots = vm.stackTop - argCount - 1;
    return true;
}

static bool call_value(KrbValue callee, int argCount)
{
    if (callee.type == VAL_OBJ)
    {
        switch (callee.as.obj->type)
        {
        case OBJ_CLOSURE:
            return call(AS_CLOSURE(callee), argCount);
        case OBJ_FUNCTION:
        {
            ObjClosure *cl = krb_new_closure(AS_FUNCTION(callee));
            return call(cl, argCount);
        }
        case OBJ_NATIVE:
        {
            NativeFn native = AS_NATIVE(callee)->function;
            KrbValue result = native(argCount, vm.stackTop - argCount);
            vm.stackTop -= argCount + 1;
            krb_push(result);
            return true;
        }
        case OBJ_CLASS:
        {
            ObjClass *klass = AS_CLASS(callee);
            ObjInstance *instance = krb_new_instance(klass);
            vm.stackTop[-argCount - 1] = krb_obj_val((Obj *)instance);

            KrbValue initializer;
            if (krb_table_get(&klass->methods, "init", 4, &initializer))
            {
                return call_fn_val(initializer, argCount);
            }
            else if (argCount != 0)
            {
                if (!runtime_error("Expected 0 arguments but got %d.", argCount))
                    return false;
                return true;
            }
            return true;
        }
        default:
            break;
        }
    }
    if (!runtime_error("Only functions and classes can be called."))
        return false;
    return true;
}

static int check_field_visibility(ObjInstance *instance, const char *propName, CallFrame **frameOut)
{
    if (vm.frameCount > 0)
    {
        CallFrame *currF = &vm.frames[vm.frameCount - 1];
        if (currF->slots && IS_INSTANCE(currF->slots[0]))
        {
            ObjInstance *thisInst = AS_INSTANCE(currF->slots[0]);
            if (thisInst == instance)
                return 1;
            for (ObjClass *c = thisInst->klass; c != NULL; c = c->superClass)
            {
                if (c == instance->klass)
                    return 1;
            }
        }
    }

    for (ObjClass *c = instance->klass; c != NULL; c = c->superClass)
    {
        KrbValue visVal;
        if (krb_table_get(&c->visibilities, propName, (int)strlen(propName), &visVal))
        {
            if (visVal.type == VAL_INT && (visVal.as.integer == 1 || visVal.as.integer == 2))
            {
                const char *kind = (visVal.as.integer == 2) ? "private" : "protected";
                if (!trigger_runtime_error("TypeError", "External access to %s field '%s' rejected.", kind, propName))
                    return -1;
                *frameOut = &vm.frames[vm.frameCount - 1];
                return 0;
            }
        }
    }
    return 1;
}

/* Verifies that 'key' is not locked by iconst or isealed (auto-reseals if unlocked).
 * Returns 1 if allowed, 0 if caught runtime error, -1 if uncaught runtime error. */
static int check_lock_guard(const char *key, CallFrame **frameOut)
{
    int len = (int)strlen(key);
    KrbValue dummy;
    if (krb_table_get(&vm.constGlobals, key, len, &dummy))
    {
        if (!trigger_runtime_error("TypeError", "Cannot modify or hook constant '%s'.", key))
            return -1;
        *frameOut = &vm.frames[vm.frameCount - 1];
        return 0;
    }
    if (krb_table_get(&vm.sealedGlobals, key, len, &dummy))
    {
        if (!krb_table_get(&vm.unlockedGlobals, key, len, &dummy))
        {
            if (!trigger_runtime_error("TypeError", "Cannot modify or hook sealed target '%s'. Use unlock first.", key))
                return -1;
            *frameOut = &vm.frames[vm.frameCount - 1];
            return 0;
        }
        krb_table_delete(&vm.unlockedGlobals, key, len);
    }
    return 1;
}

static InterpretResult run(int minFrameCount)
{
    CallFrame *frame = &vm.frames[vm.frameCount - 1];

    for (;;)
    {
        if (minFrameCount > 0 && vm.frameCount <= minFrameCount)
            return INTERPRET_OK;

        if (trace_execution)
        {
            printf("          ");
            for (KrbValue *slot = vm.stack; slot < vm.stackTop; slot++)
            {
                printf("[ ");
                krb_print_value(*slot);
                printf(" ]");
            }
            printf("\n");
            krb_disassemble_instruction(&frame->closure->function->chunk, (int)(frame->ip - frame->closure->function->chunk.code));
        }

#define READ_SHORT() (frame->ip += 2, (uint16_t)((frame->ip[-2] << 8) | frame->ip[-1]))
#define CURRENT_CHUNK (frame->closure->function->chunk)

        uint8_t instruction;
        switch (instruction = *frame->ip++)
        {
        case OP_CONSTANT:
        {
            uint16_t constantIndex = READ_SHORT();
            KrbValue constant = CURRENT_CHUNK.constants.values[constantIndex];
            krb_push(constant);
            break;
        }
        case OP_POP:
        {
            krb_pop();
            break;
        }
        case OP_PASTE:
        case OP_PASTELN:
        {
            KrbValue val = krb_pop();
            if (IS_INSTANCE(val))
            {
                KrbValue strVal;
                int st = eval_instance_to_string(AS_INSTANCE(val), &strVal);
                if (st < 0)
                    return INTERPRET_RUNTIME_ERROR;
                if (st == 2)
                {
                    frame = &vm.frames[vm.frameCount - 1];
                    break;
                }
                if (st == 1)
                    val = strVal;
            }
            if (instruction == OP_PASTELN)
                krb_println_value(val);
            else
                krb_print_value(val);
            break;
        }
        case OP_PASTELN_EMPTY:
        {
            printf("\n");
            break;
        }
        case OP_DEFINE_GLOBAL:
        case OP_DEFINE_CONST:
        case OP_DEFINE_SEALED:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue nameVal = CURRENT_CHUNK.constants.values[constIdx];
            KrbValue val = krb_pop();
            const char *key = nameVal.as.string;
            int keyLen = (int)strlen(key);
            if (strchr(key, '.') != NULL)
            {
                if (instruction == OP_DEFINE_CONST)
                    krb_table_set(&vm.constGlobals, key, keyLen, krb_bool(true), false);
                else if (instruction == OP_DEFINE_SEALED)
                    krb_table_set(&vm.sealedGlobals, key, keyLen, krb_bool(true), false);
                break;
            }
            int guard = check_lock_guard(key, &frame);
            if (guard < 0)
                return INTERPRET_RUNTIME_ERROR;
            if (guard == 0)
                break;
            bool isConst = (instruction == OP_DEFINE_CONST);
            krb_table_set(&vm.globals, key, keyLen, val, isConst);
            if (isConst)
                krb_table_set(&vm.constGlobals, key, keyLen, krb_bool(true), false);
            else if (instruction == OP_DEFINE_SEALED)
                krb_table_set(&vm.sealedGlobals, key, keyLen, krb_bool(true), false);
            break;
        }
        case OP_GET_GLOBAL:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue nameVal = CURRENT_CHUNK.constants.values[constIdx];
            KrbValue val;
            if (!krb_table_get(&vm.globals, nameVal.as.string, (int)strlen(nameVal.as.string), &val))
            {
                if (!trigger_runtime_error("ReferenceError", "Undefined variable '%s'.", nameVal.as.string))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
                break;
            }
            krb_push(val);
            break;
        }
        case OP_SET_GLOBAL:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue nameVal = CURRENT_CHUNK.constants.values[constIdx];
            KrbValue val = *(vm.stackTop - 1);
            KrbValue dummy;
            if ((val.type == VAL_NULL || is_null_function(val)) && krb_table_get(&vm.nonNullGlobals, nameVal.as.string, (int)strlen(nameVal.as.string), &dummy))
            {
                if (!trigger_runtime_error("TypeError", "Cannot assign NULL to non-nullable variable '%s'.", nameVal.as.string))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
                break;
            }
            int guard = check_lock_guard(nameVal.as.string, &frame);
            if (guard < 0)
                return INTERPRET_RUNTIME_ERROR;
            if (guard == 0)
                break;
            if (!krb_table_assign(&vm.globals, nameVal.as.string, (int)strlen(nameVal.as.string), val))
            {
                if (!trigger_runtime_error("ReferenceError", "Undefined variable '%s'.", nameVal.as.string))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
                break;
            }
            break;
        }
        case OP_GET_LOCAL:
        {
            uint8_t slot = *frame->ip++;
            krb_push(frame->slots[slot]);
            break;
        }
        case OP_SET_LOCAL:
        {
            uint8_t slot = *frame->ip++;
            frame->slots[slot] = *(vm.stackTop - 1);
            break;
        }
        case OP_ADD:
            if (!binary_op('+', &frame))
                return INTERPRET_RUNTIME_ERROR;
            break;
        case OP_SUBTRACT:
            if (!binary_op('-', &frame))
                return INTERPRET_RUNTIME_ERROR;
            break;
        case OP_MULTIPLY:
            if (!binary_op('*', &frame))
                return INTERPRET_RUNTIME_ERROR;
            break;
        case OP_DIVIDE:
            if (!binary_op('/', &frame))
                return INTERPRET_RUNTIME_ERROR;
            break;
        case OP_MODULO:
            if (!binary_op('%', &frame))
                return INTERPRET_RUNTIME_ERROR;
            break;
        case OP_NEGATE:
        {
            if (IS_INSTANCE(krb_peek(0)))
            {
                int inv = invoke_instance_method(AS_INSTANCE(krb_peek(0)), "__op_neg", 0, &frame);
                if (inv < 0)
                    return INTERPRET_RUNTIME_ERROR;
                if (inv > 0)
                    break;
            }
            KrbValue val = krb_pop();
            if (val.type == VAL_INT)
            {
                krb_push(krb_int(-val.as.integer));
            }
            else if (val.type == VAL_FLOAT)
            {
                krb_push(krb_float(-val.as.number));
            }
            else
            {
                if (!trigger_runtime_error("TypeError", "Operand of unary '-' must be a number."))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
            }
            break;
        }
        case OP_NOT:
        {
            krb_push(krb_bool(is_falsey(krb_pop())));
            break;
        }
        case OP_EQUAL:
        {
            if (IS_INSTANCE(krb_peek(1)) && krb_peek(0).type != VAL_NULL)
            {
                int inv = invoke_instance_method(AS_INSTANCE(krb_peek(1)), "__op_eq", 1, &frame);
                if (inv < 0)
                    return INTERPRET_RUNTIME_ERROR;
                if (inv > 0)
                    break;
            }
            KrbValue b = krb_pop();
            KrbValue a = krb_pop();
            krb_push(krb_bool(values_equal(a, b)));
            break;
        }
        case OP_GREATER:
        case OP_LESS:
        {
            bool isGt = (instruction == OP_GREATER);
            if (IS_INSTANCE(krb_peek(1)))
            {
                int inv = invoke_instance_method(AS_INSTANCE(krb_peek(1)), isGt ? "__op_gt" : "__op_lt", 1, &frame);
                if (inv < 0)
                    return INTERPRET_RUNTIME_ERROR;
                if (inv > 0)
                    break;
            }
            KrbValue b = krb_pop();
            KrbValue a = krb_pop();
            if (a.type == VAL_INT && b.type == VAL_INT)
            {
                krb_push(krb_bool(isGt ? (a.as.integer > b.as.integer) : (a.as.integer < b.as.integer)));
            }
            else if ((a.type == VAL_INT || a.type == VAL_FLOAT) &&
                     (b.type == VAL_INT || b.type == VAL_FLOAT))
            {
                double x = (a.type == VAL_INT) ? (double)a.as.integer : a.as.number;
                double y = (b.type == VAL_INT) ? (double)b.as.integer : b.as.number;
                krb_push(krb_bool(isGt ? (x > y) : (x < y)));
            }
            else
            {
                if (!trigger_runtime_error("TypeError", isGt ? "Operands of '>' must be numbers." : "Operands of '<' must be numbers."))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
            }
            break;
        }
        case OP_JUMP:
        {
            uint16_t offset = (uint16_t)(frame->ip[0] << 8 | frame->ip[1]);
            frame->ip += 2;
            frame->ip += offset;
            break;
        }
        case OP_JUMP_IF_FALSE:
        {
            uint16_t offset = (uint16_t)(frame->ip[0] << 8 | frame->ip[1]);
            frame->ip += 2;
            if (is_falsey(krb_pop()))
            {
                frame->ip += offset;
            }
            break;
        }
        case OP_LOOP:
        {
            uint16_t offset = (uint16_t)(frame->ip[0] << 8 | frame->ip[1]);
            frame->ip += 2;
            frame->ip -= offset;
            break;
        }
        case OP_CALL:
        {
            uint8_t argCount = *frame->ip++;
            if (!call_value(krb_peek(argCount), argCount))
            {
                return INTERPRET_RUNTIME_ERROR;
            }
            frame = &vm.frames[vm.frameCount - 1];
            break;
        }
        case OP_BUILD_LIST:
        {
            uint8_t itemCount = *frame->ip++;
            ObjList *list = krb_new_list();
            for (int i = itemCount - 1; i >= 0; i--)
            {
                KrbValue item = krb_peek(i);
                krb_write_value_array(&list->elements, item);
            }
            vm.stackTop -= itemCount;
            krb_push(krb_obj_val((Obj *)list));
            break;
        }
        case OP_BUILD_TABLE:
        {
            uint8_t entryCount = *frame->ip++;
            ObjTable *table = krb_new_obj_table();
            for (int i = (entryCount - 1) * 2; i >= 0; i -= 2)
            {
                KrbValue keyVal = krb_peek(i + 1);
                KrbValue val = krb_peek(i);
                if (keyVal.type == VAL_STRING)
                {
                    krb_table_set(&table->fields, keyVal.as.string, (int)strlen(keyVal.as.string), val, false);
                }
            }
            vm.stackTop -= entryCount * 2;
            krb_push(krb_obj_val((Obj *)table));
            break;
        }
        case OP_GET_INDEX:
        {
            KrbValue index = krb_pop();
            KrbValue target = krb_pop();

            if (IS_LIST(target) && index.type == VAL_INT)
            {
                ObjList *list = AS_LIST(target);
                int64_t idx = index.as.integer;
                if (idx < 0 || idx >= list->elements.count)
                {
                    if (!trigger_runtime_error("IndexError", "List index out of bounds [%lld].", (long long)idx))
                        return INTERPRET_RUNTIME_ERROR;
                    frame = &vm.frames[vm.frameCount - 1];
                    break;
                }
                krb_push(list->elements.values[idx]);
            }
            else if (target.type == VAL_STRING && index.type == VAL_INT)
            {
                int64_t idx = index.as.integer;
                size_t len = strlen(target.as.string);
                if (idx < 0 || (size_t)idx >= len)
                {
                    if (!trigger_runtime_error("IndexError", "String index out of bounds."))
                        return INTERPRET_RUNTIME_ERROR;
                    frame = &vm.frames[vm.frameCount - 1];
                    break;
                }
                char ch[2] = {target.as.string[idx], '\0'};
                krb_push(krb_string(_strdup(ch)));
            }
            else if (IS_TABLE(target) && index.type == VAL_STRING)
            {
                ObjTable *table = AS_TABLE(target);
                KrbValue val;
                if (!krb_table_get(&table->fields, index.as.string, (int)strlen(index.as.string), &val))
                {
                    krb_push(krb_null());
                }
                else
                {
                    krb_push(val);
                }
            }
            else
            {
                if (!trigger_runtime_error("IndexError", "Invalid indexing on this value."))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
                break;
            }
            break;
        }
        case OP_SET_INDEX:
        {
            KrbValue val = krb_pop();
            KrbValue index = krb_pop();
            KrbValue target = krb_pop();

            if (IS_LIST(target) && index.type == VAL_INT)
            {
                ObjList *list = AS_LIST(target);
                int64_t idx = index.as.integer;
                if (idx < 0 || idx >= list->elements.count)
                {
                    if (!trigger_runtime_error("IndexError", "List index out of bounds [%lld].", (long long)idx))
                        return INTERPRET_RUNTIME_ERROR;
                    frame = &vm.frames[vm.frameCount - 1];
                    break;
                }
                list->elements.values[idx] = val;
                krb_push(val);
            }
            else if (IS_TABLE(target) && index.type == VAL_STRING)
            {
                ObjTable *table = AS_TABLE(target);
                krb_table_set(&table->fields, index.as.string, (int)strlen(index.as.string), val, false);
                krb_push(val);
            }
            else
            {
                if (!trigger_runtime_error("IndexError", "Invalid index assignment."))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
                break;
            }
            break;
        }
        case OP_CLASS:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue name = CURRENT_CHUNK.constants.values[constIdx];
            ObjClass *klass = krb_new_class(name.as.string);
            krb_push(krb_obj_val((Obj *)klass));
            break;
        }
        case OP_GET_PROPERTY:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue propName = CURRENT_CHUNK.constants.values[constIdx];
            KrbValue target = krb_pop();

            if (IS_INSTANCE(target))
            {
                ObjInstance *instance = AS_INSTANCE(target);

                int visCheck = check_field_visibility(instance, propName.as.string, &frame);
                if (visCheck < 0)
                    return INTERPRET_RUNTIME_ERROR;
                if (visCheck == 0)
                    break;

                char getterName[128];
                snprintf(getterName, sizeof(getterName), "get_%s", propName.as.string);
                KrbValue getterVal;
                if (find_class_method(instance->klass, getterName, &getterVal))
                {
                    krb_push(target);
                    if (!call_fn_val(getterVal, 0))
                        return INTERPRET_RUNTIME_ERROR;
                    frame = &vm.frames[vm.frameCount - 1];
                    break;
                }

                KrbValue val;
                if (krb_table_get(&instance->fields, propName.as.string, (int)strlen(propName.as.string), &val))
                {
                    krb_push(val);
                    break;
                }
                if (krb_table_get(&instance->klass->methods, propName.as.string, (int)strlen(propName.as.string), &val))
                {
                    krb_push(val);
                    break;
                }
                krb_push(krb_null());
                break;
            }
            if (IS_TABLE(target))
            {
                ObjTable *table = AS_TABLE(target);
                KrbValue val;
                if (!krb_table_get(&table->fields, propName.as.string, (int)strlen(propName.as.string), &val))
                {
                    krb_push(krb_null());
                }
                else
                {
                    krb_push(val);
                }
                break;
            }
            if (target.type == VAL_OBJ && target.as.obj->type == OBJ_CLASS)
            {
                ObjClass *klass = (ObjClass *)target.as.obj;
                KrbValue val;
                if (krb_table_get(&klass->methods, propName.as.string, (int)strlen(propName.as.string), &val))
                {
                    krb_push(val);
                    break;
                }
                krb_push(krb_null());
                break;
            }
            if (!trigger_runtime_error("TypeError", "Only instances and tables have properties."))
                return INTERPRET_RUNTIME_ERROR;
            frame = &vm.frames[vm.frameCount - 1];
            break;
        }
        case OP_SET_PROPERTY:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue propName = CURRENT_CHUNK.constants.values[constIdx];
            KrbValue val = krb_pop();
            KrbValue target = krb_pop();

            if (IS_INSTANCE(target))
            {
                ObjInstance *instance = AS_INSTANCE(target);
                char setterName[128];
                snprintf(setterName, sizeof(setterName), "set_%s", propName.as.string);
                KrbValue setterVal;
                if (find_class_method(instance->klass, setterName, &setterVal))
                {
                    krb_push(target);
                    krb_push(val);
                    if (!call_fn_val(setterVal, 1))
                        return INTERPRET_RUNTIME_ERROR;
                    frame = &vm.frames[vm.frameCount - 1];
                    break;
                }

                krb_table_set(&instance->fields, propName.as.string, (int)strlen(propName.as.string), val, false);
                krb_push(val);
                break;
            }
            if (IS_TABLE(target))
            {
                ObjTable *table = AS_TABLE(target);
                krb_table_set(&table->fields, propName.as.string, (int)strlen(propName.as.string), val, false);
                krb_push(val);
                break;
            }
            if (IS_CLASS(target))
            {
                ObjClass *klass = AS_CLASS(target);
                char qual[128];
                snprintf(qual, sizeof(qual), "%s.%s", klass->name ? klass->name : "", propName.as.string);
                int guard = check_lock_guard(qual, &frame);
                if (guard < 0)
                    return INTERPRET_RUNTIME_ERROR;
                if (guard == 0)
                    break;
                krb_table_set(&klass->methods, propName.as.string, (int)strlen(propName.as.string), val, false);
                krb_push(val);
                break;
            }
            if (!trigger_runtime_error("TypeError", "Only instances and tables have mutable fields."))
                return INTERPRET_RUNTIME_ERROR;
            frame = &vm.frames[vm.frameCount - 1];
            break;
        }
        case OP_METHOD:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue name = CURRENT_CHUNK.constants.values[constIdx];
            KrbValue method = krb_peek(0);
            ObjClass *klass = AS_CLASS(krb_peek(1));
            krb_table_set(&klass->methods, name.as.string, (int)strlen(name.as.string), method, false);
            krb_pop();
            break;
        }
        case OP_INVOKE:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue name = CURRENT_CHUNK.constants.values[constIdx];
            uint8_t argCount = *frame->ip++;

            KrbValue receiver = krb_peek(argCount);

            if (IS_LIST(receiver))
            {
                ObjList *list = AS_LIST(receiver);
                const char *mName = name.as.string;
                if (strcmp(mName, "count") == 0)
                {
                    vm.stackTop -= (argCount + 1);
                    krb_push(krb_int(list->elements.count));
                    break;
                }
                if (strcmp(mName, "push") == 0)
                {
                    KrbValue val = krb_peek(0);
                    krb_write_value_array(&list->elements, val);
                    vm.stackTop -= (argCount + 1);
                    krb_push(val);
                    break;
                }
                if (strcmp(mName, "pop") == 0)
                {
                    if (list->elements.count == 0)
                    {
                        if (!trigger_runtime_error("IndexError", "Cannot pop from an empty collection."))
                            return INTERPRET_RUNTIME_ERROR;
                        frame = &vm.frames[vm.frameCount - 1];
                        break;
                    }
                    if (argCount == 0)
                    {
                        KrbValue popped;
                        if (list->isQueue)
                        {
                            popped = list->elements.values[0];
                            for (int i = 0; i < list->elements.count - 1; i++)
                            {
                                list->elements.values[i] = list->elements.values[i + 1];
                            }
                            list->elements.count--;
                        }
                        else
                        {
                            list->elements.count--;
                            popped = list->elements.values[list->elements.count];
                        }
                        vm.stackTop -= (argCount + 1);
                        krb_push(popped);
                        break;
                    }
                    else
                    {
                        int64_t pos = (krb_peek(0).type == VAL_INT) ? krb_peek(0).as.integer : 0;
                        if (pos < 0 || pos >= list->elements.count)
                        {
                            if (!trigger_runtime_error("IndexError", "Index out of bounds."))
                                return INTERPRET_RUNTIME_ERROR;
                            frame = &vm.frames[vm.frameCount - 1];
                            break;
                        }
                        KrbValue popped = list->elements.values[pos];
                        for (int i = (int)pos; i < list->elements.count - 1; i++)
                        {
                            list->elements.values[i] = list->elements.values[i + 1];
                        }
                        list->elements.count--;
                        vm.stackTop -= (argCount + 1);
                        krb_push(popped);
                        break;
                    }
                }
                if (strcmp(mName, "peek") == 0)
                {
                    if (list->elements.count == 0)
                    {
                        if (!trigger_runtime_error("IndexError", "Cannot peek in an empty collection."))
                            return INTERPRET_RUNTIME_ERROR;
                        frame = &vm.frames[vm.frameCount - 1];
                        break;
                    }
                    int64_t pos = (argCount > 0 && krb_peek(0).type == VAL_INT) ? krb_peek(0).as.integer : (list->isQueue ? 0 : list->elements.count - 1);
                    if (pos < 0 || pos >= list->elements.count)
                    {
                        if (!trigger_runtime_error("IndexError", "Index out of bounds."))
                            return INTERPRET_RUNTIME_ERROR;
                        frame = &vm.frames[vm.frameCount - 1];
                        break;
                    }
                    KrbValue peeked = list->elements.values[pos];
                    vm.stackTop -= (argCount + 1);
                    krb_push(peeked);
                    break;
                }
            }

            if (IS_TABLE(receiver))
            {
                ObjTable *table = AS_TABLE(receiver);
                const char *mName = name.as.string;
                KrbValue methodVal;
                if (krb_table_get(&table->fields, mName, (int)strlen(mName), &methodVal))
                {
                    if (IS_NATIVE(methodVal))
                    {
                        NativeFn native = AS_NATIVE(methodVal)->function;
                        KrbValue res = native(argCount, vm.stackTop - argCount);
                        vm.stackTop -= (argCount + 1);
                        krb_push(res);
                        break;
                    }
                    else if (IS_CLOSURE(methodVal) || IS_FUNCTION(methodVal))
                    {
                        *(vm.stackTop - argCount - 1) = methodVal;
                        if (!call_fn_val(methodVal, argCount))
                            return INTERPRET_RUNTIME_ERROR;
                        frame = &vm.frames[vm.frameCount - 1];
                        break;
                    }
                }
                if (strcmp(mName, "count") == 0)
                {
                    vm.stackTop -= (argCount + 1);
                    krb_push(krb_int(table->fields.count));
                    break;
                }
            }

            if (IS_CLASS(receiver))
            {
                ObjClass *klass = AS_CLASS(receiver);
                KrbValue methodVal;
                if (krb_table_get(&klass->methods, name.as.string, (int)strlen(name.as.string), &methodVal))
                {
                    *(vm.stackTop - argCount - 1) = methodVal;
                    if (!call_fn_val(methodVal, argCount))
                        return INTERPRET_RUNTIME_ERROR;
                    frame = &vm.frames[vm.frameCount - 1];
                    break;
                }
            }

            if (IS_INSTANCE(receiver))
            {
                int inv = invoke_instance_method(AS_INSTANCE(receiver), name.as.string, argCount, &frame);
                if (inv < 0)
                    return INTERPRET_RUNTIME_ERROR;
                if (inv > 0)
                    break;
            }

            if (!trigger_runtime_error("RuntimeError", "Undefined method '%s'.", name.as.string))
                return INTERPRET_RUNTIME_ERROR;
            frame = &vm.frames[vm.frameCount - 1];
            break;
        }
        case OP_DUP:
        {
            krb_push(*(vm.stackTop - 1));
            break;
        }
        case OP_DUP2:
        {
            KrbValue top = *(vm.stackTop - 1);
            KrbValue second = *(vm.stackTop - 2);
            krb_push(second);
            krb_push(top);
            break;
        }
        case OP_TRY:
        {
            uint16_t catchOff = (uint16_t)(frame->ip[0] << 8 | frame->ip[1]);
            uint16_t finallyOff = (uint16_t)(frame->ip[2] << 8 | frame->ip[3]);
            frame->ip += 4;
            KrbTryHandler *h = &vm.try_stack[vm.try_count++];
            h->catch_ip = catchOff ? (frame->ip + catchOff) : NULL;
            h->finally_ip = finallyOff ? (frame->ip + finallyOff) : NULL;
            h->frame_index = vm.frameCount - 1;
            h->stack_count = (int)(vm.stackTop - vm.stack);
            break;
        }
        case OP_TRY_END:
        {
            if (vm.try_count > 0)
                vm.try_count--;
            break;
        }
        case OP_THROW:
        {
            KrbValue val = krb_pop();
            int line = current_line();
            if (!IS_TABLE(val))
            {
                const char *s = (val.type == VAL_STRING) ? val.as.string : "<exception>";
                val = make_error_table("Exception", s, line);
            }
            if (unwind_try_handler(val))
            {
                frame = &vm.frames[vm.frameCount - 1];
                break;
            }
            ObjTable *tbl = AS_TABLE(val);
            KrbValue eCtx;
            const char *s = krb_table_get(&tbl->fields, "eContext", 8, &eCtx) && eCtx.type == VAL_STRING ? eCtx.as.string : "<exception>";
            fprintf(stderr, "\x1b[38;2;255;85;0m[Exception: Line %d, Col 1] %s\x1b[0m\n", line, s);
            return INTERPRET_RUNTIME_ERROR;
        }
        case OP_IS:
        {
            KrbValue spec = krb_pop();
            KrbValue val = krb_pop();
            const char *specStr = (spec.type == VAL_STRING) ? spec.as.string : "";
            krb_push(krb_bool(eval_is_check(val, specStr)));
            break;
        }
        case OP_KILL:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue nameVal = CURRENT_CHUNK.constants.values[constIdx];
            KrbValue dummy;
            if (krb_table_get(&vm.constGlobals, nameVal.as.string, (int)strlen(nameVal.as.string), &dummy))
            {
                if (!trigger_runtime_error("TypeError", "Cannot delete constant '%s'.", nameVal.as.string))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
                break;
            }
            krb_table_delete(&vm.sealedGlobals, nameVal.as.string, (int)strlen(nameVal.as.string));
            krb_table_delete(&vm.unlockedGlobals, nameVal.as.string, (int)strlen(nameVal.as.string));
            krb_table_delete(&vm.globals, nameVal.as.string, (int)strlen(nameVal.as.string));
            break;
        }
        case OP_CLOSURE:
        {
            uint16_t fnConst = READ_SHORT();
            ObjFunction *function = AS_FUNCTION(CURRENT_CHUNK.constants.values[fnConst]);
            ObjClosure *closure = krb_new_closure(function);
            krb_push(krb_obj_val((Obj *)closure));
            for (int i = 0; i < closure->upvalueCount; i++)
            {
                uint8_t isLocal = *frame->ip++;
                uint16_t index = READ_SHORT();
                if (isLocal)
                {
                    closure->upvalues[i] = capture_upvalue(frame->slots + index);
                }
                else
                {
                    closure->upvalues[i] = frame->closure->upvalues[index];
                }
            }
            break;
        }
        case OP_GET_UPVALUE:
        {
            uint16_t slot = READ_SHORT();
            krb_push(*frame->closure->upvalues[slot]->location);
            break;
        }
        case OP_SET_UPVALUE:
        {
            uint16_t slot = READ_SHORT();
            *frame->closure->upvalues[slot]->location = krb_peek(0);
            break;
        }
        case OP_CLOSE_UPVALUE:
        {
            close_upvalues(vm.stackTop - 1);
            krb_pop();
            break;
        }
        case OP_COERCE:
        {
            uint16_t typeConst = READ_SHORT();
            KrbValue typeVal = CURRENT_CHUNK.constants.values[typeConst];
            const char *targetType = typeVal.as.string;
            KrbValue top = krb_peek(0);
            if (strcmp(targetType, "Function") == 0)
            {
                if (!IS_CLOSURE(top) && !IS_FUNCTION(top) && !IS_NATIVE(top))
                    *(vm.stackTop - 1) = wrap_value_as_function(top);
                break;
            }
            if (top.type != VAL_NULL)
            {
                if (strcmp(targetType, "Int") == 0)
                {
                    if (top.type == VAL_STRING)
                    {
                        double d = atof(top.as.string);
                        *(vm.stackTop - 1) = krb_int((int64_t)d);
                    }
                    else if (top.type == VAL_FLOAT)
                    {
                        *(vm.stackTop - 1) = krb_int((int64_t)top.as.number);
                    }
                    else if (top.type == VAL_BOOL)
                    {
                        *(vm.stackTop - 1) = krb_int(top.as.boolean ? 1 : 0);
                    }
                }
                else if (strcmp(targetType, "Float") == 0)
                {
                    if (top.type == VAL_STRING)
                    {
                        *(vm.stackTop - 1) = krb_float(atof(top.as.string));
                    }
                    else if (top.type == VAL_INT)
                    {
                        *(vm.stackTop - 1) = krb_float((double)top.as.integer);
                    }
                    else if (top.type == VAL_BOOL)
                    {
                        *(vm.stackTop - 1) = krb_float(top.as.boolean ? 1.0 : 0.0);
                    }
                }
                else if (strcmp(targetType, "String") == 0)
                {
                    if (IS_INSTANCE(top))
                    {
                        KrbValue instVal = krb_pop();
                        KrbValue strVal;
                        int st = eval_instance_to_string(AS_INSTANCE(instVal), &strVal);
                        if (st < 0)
                            return INTERPRET_RUNTIME_ERROR;
                        if (st == 2)
                        {
                            frame = &vm.frames[vm.frameCount - 1];
                            break;
                        }
                        if (st == 1 && strVal.type == VAL_STRING)
                        {
                            krb_push(strVal);
                            break;
                        }
                        char buf[128];
                        krb_push(krb_string(_strdup(format_concat_side(instVal, buf, sizeof(buf)))));
                    }
                    else if (top.type == VAL_INT || top.type == VAL_FLOAT || top.type == VAL_BOOL)
                    {
                        char buf[128];
                        *(vm.stackTop - 1) = krb_string(_strdup(format_concat_side(top, buf, sizeof(buf))));
                    }
                }
                else if (strcmp(targetType, "Bool") == 0)
                {
                    if (top.type == VAL_INT)
                    {
                        *(vm.stackTop - 1) = krb_bool(top.as.integer != 0);
                    }
                    else if (top.type == VAL_FLOAT)
                    {
                        *(vm.stackTop - 1) = krb_bool(top.as.number != 0.0);
                    }
                    else if (top.type == VAL_STRING)
                    {
                        *(vm.stackTop - 1) = krb_bool(strcmp(top.as.string, "TRUE") == 0 || strcmp(top.as.string, "1") == 0);
                    }
                }
            }
            break;
        }
        case OP_CHECK_NON_NULL:
        {
            KrbValue chk = krb_peek(0);
            if (chk.type == VAL_NULL || is_null_function(chk))
            {
                if (!trigger_runtime_error("TypeError", "Cannot assign NULL to non-nullable variable."))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
            }
            break;
        }
        case OP_DEF_NON_NULL:
        {
            uint16_t nameConst = READ_SHORT();
            KrbValue nameVal = CURRENT_CHUNK.constants.values[nameConst];
            krb_table_set(&vm.nonNullGlobals, nameVal.as.string, (int)strlen(nameVal.as.string), krb_bool(true), false);
            break;
        }
        case OP_MARK_QUEUE:
        {
            KrbValue top = krb_peek(0);
            if (IS_LIST(top))
            {
                AS_LIST(top)->isQueue = true;
            }
            break;
        }
        case OP_INHERIT:
        {
            KrbValue superVal = krb_pop();
            KrbValue subVal = krb_pop();
            if (IS_CLASS(subVal) && IS_CLASS(superVal))
            {
                AS_CLASS(subVal)->superClass = AS_CLASS(superVal);
            }
            break;
        }
        case OP_CLASS_FIELD:
        {
            uint16_t fieldConst = READ_SHORT();
            uint8_t vis = *frame->ip++;
            KrbValue defaultVal = krb_pop();
            KrbValue nameVal = CURRENT_CHUNK.constants.values[fieldConst];
            ObjClass *klass = AS_CLASS(krb_peek(0));
            krb_table_set(&klass->defaultFields, nameVal.as.string, (int)strlen(nameVal.as.string), defaultVal, false);
            krb_table_set(&klass->visibilities, nameVal.as.string, (int)strlen(nameVal.as.string), krb_int(vis), false);
            break;
        }
        case OP_SUPER_INVOKE:
        {
            uint16_t nameConst = READ_SHORT();
            uint16_t superConst = READ_SHORT();
            uint8_t argCount = *frame->ip++;
            KrbValue name = CURRENT_CHUNK.constants.values[nameConst];
            KrbValue receiver = *(vm.stackTop - argCount - 1);
            if (!IS_INSTANCE(receiver))
            {
                if (!trigger_runtime_error("TypeError", "base(...) can only be called on an instance."))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
                break;
            }
            ObjInstance *instance = AS_INSTANCE(receiver);
            ObjClass *curr = NULL;
            if (superConst != 0)
            {
                KrbValue superName = CURRENT_CHUNK.constants.values[superConst];
                KrbValue superVal;
                if (krb_table_get(&vm.globals, superName.as.string, (int)strlen(superName.as.string), &superVal) && IS_CLASS(superVal))
                {
                    curr = AS_CLASS(superVal);
                }
            }
            if (curr == NULL)
                curr = instance->klass->superClass;
            int inv = invoke_class_method(curr, name.as.string, argCount, &frame);
            if (inv < 0)
                return INTERPRET_RUNTIME_ERROR;
            if (inv == 0)
            {
                if (!trigger_runtime_error("RuntimeError", "Undefined superclass method '%s'.", name.as.string))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
            }
            break;
        }
        case OP_ITER_KEY:
        case OP_ITER_VAL:
        {
            bool wantKey = (instruction == OP_ITER_KEY);
            int64_t idx = krb_pop().as.integer;
            KrbValue coll = krb_pop();
            if (IS_LIST(coll))
            {
                ObjList *list = AS_LIST(coll);
                krb_push(wantKey ? krb_int(idx) : ((idx >= 0 && idx < list->elements.count) ? list->elements.values[idx] : krb_null()));
            }
            else if (IS_TABLE(coll))
            {
                ObjTable *table = AS_TABLE(coll);
                int currentIdx = 0;
                KrbValue result = krb_null();
                for (int i = 0; i < table->fields.capacity; i++)
                {
                    if (table->fields.entries[i].key != NULL)
                    {
                        if (currentIdx == idx)
                        {
                            result = wantKey ? krb_string(_strdup(table->fields.entries[i].key)) : table->fields.entries[i].value;
                            break;
                        }
                        currentIdx++;
                    }
                }
                krb_push(result);
            }
            else
            {
                krb_push(krb_null());
            }
            break;
        }
        case OP_IMPLEMENT:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue name = CURRENT_CHUNK.constants.values[constIdx];
            ObjClass *klass = AS_CLASS(krb_peek(0));
            krb_table_set(&klass->interfaces, name.as.string, (int)strlen(name.as.string), krb_bool(true), false);
            break;
        }
        case OP_HOOK_SAVE_METHOD:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue name = CURRENT_CHUNK.constants.values[constIdx];
            KrbValue klassVal = krb_peek(0);
            if (IS_CLASS(klassVal))
            {
                ObjClass *klass = AS_CLASS(klassVal);
                char qual[128];
                snprintf(qual, sizeof(qual), "%s.%s", klass->name ? klass->name : "", name.as.string);
                int guard = check_lock_guard(qual, &frame);
                if (guard < 0)
                    return INTERPRET_RUNTIME_ERROR;
                if (guard == 0)
                    break;
                KrbValue oldMethod;
                if (find_class_method(klass, name.as.string, &oldMethod))
                {
                    char origName[128];
                    snprintf(origName, sizeof(origName), "__orig_%s", name.as.string);
                    krb_table_set(&klass->methods, _strdup(origName), (int)strlen(origName), oldMethod, false);
                }
            }
            break;
        }
        case OP_UNLOCK_VAR:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue name = CURRENT_CHUNK.constants.values[constIdx];
            krb_table_set(&vm.unlockedGlobals, name.as.string, (int)strlen(name.as.string), krb_bool(true), false);
            break;
        }
        case OP_LOCK_VAR:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue name = CURRENT_CHUNK.constants.values[constIdx];
            krb_table_delete(&vm.unlockedGlobals, name.as.string, (int)strlen(name.as.string));
            break;
        }
        case OP_CONSUME_UNLOCK:
        {
            uint16_t constIdx = READ_SHORT();
            KrbValue name = CURRENT_CHUNK.constants.values[constIdx];
            KrbValue dummy;
            if (!krb_table_get(&vm.unlockedGlobals, name.as.string, (int)strlen(name.as.string), &dummy))
            {
                if (!trigger_runtime_error("TypeError", "Cannot modify or hook sealed target '%s'. Use unlock first.", name.as.string))
                    return INTERPRET_RUNTIME_ERROR;
                frame = &vm.frames[vm.frameCount - 1];
                break;
            }
            krb_table_delete(&vm.unlockedGlobals, name.as.string, (int)strlen(name.as.string));
            break;
        }
        case OP_RETURN:
        {
            KrbValue result = krb_pop();
            close_upvalues(frame->slots);
            vm.frameCount--;
            if (vm.frameCount == 0)
            {
                krb_pop();
                return INTERPRET_OK;
            }

            vm.stackTop = frame->slots;
            krb_push(result);
            if (minFrameCount > 0 && vm.frameCount <= minFrameCount)
            {
                return INTERPRET_OK;
            }
            frame = &vm.frames[vm.frameCount - 1];
            break;
        }
        default:
            runtime_error("Unknown opcode.");
            return INTERPRET_RUNTIME_ERROR;
        }
    }
}

InterpretResult krb_interpret_source(const char *source)
{
    ObjFunction *function = krb_compile(source);
    if (function == NULL)
        return INTERPRET_COMPILE_ERROR;

    krb_push(krb_obj_val((Obj *)function));
    ObjClosure *closure = krb_new_closure(function);
    krb_pop();
    krb_push(krb_obj_val((Obj *)closure));
    call(closure, 0);

    InterpretResult result = run(0);
    return result;
}
