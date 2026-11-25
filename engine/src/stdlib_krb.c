#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <ctype.h>

#ifdef _WIN32
#include <windows.h>
#include <direct.h>
#include <process.h>
#include <conio.h>
#define getcwd _getcwd
#define getpid _getpid
#else
#include <unistd.h>
#include <sys/stat.h>
#include <sys/time.h>
#endif

#include "../include/stdlib_krb.h"
#include "../include/object.h"

#define krb_obj(o) krb_obj_val((Obj *)(o))
#define krb_new_table() krb_new_obj_table()

static int64_t start_time_ms = 0;

static int64_t get_time_ms(void)
{
#ifdef _WIN32
    FILETIME ft;
    GetSystemTimeAsFileTime(&ft);
    ULARGE_INTEGER uli;
    uli.LowPart = ft.dwLowDateTime;
    uli.HighPart = ft.dwHighDateTime;
    return (int64_t)((uli.QuadPart - 116444736000000000ULL) / 10000);
#else
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (int64_t)tv.tv_sec * 1000 + (tv.tv_usec / 1000);
#endif
}

static uint32_t prng_state = 12345;

static double next_random(void)
{
    prng_state += 0x6D2B79F5;
    uint64_t t = prng_state;
    t = (t ^ (t >> 15)) * (t | 1);
    t ^= t + (t ^ (t >> 7)) * (t | 61);
    return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0;
}

static void table_set_fn(ObjTable *table, const char *name, NativeFn fn)
{
    ObjNative *native = krb_new_native(fn, name);
    krb_table_set(&table->fields, name, (int)strlen(name), krb_obj((Obj *)native), false);
}

static void table_set_val(ObjTable *table, const char *name, KrbValue val)
{
    krb_table_set(&table->fields, name, (int)strlen(name), val, false);
}

static inline double as_num(KrbValue v)
{
    return (v.type == VAL_INT) ? (double)v.as.integer : v.as.number;
}

static inline KrbValue num_val(double res)
{
    return (res == (int64_t)res) ? krb_int((int64_t)res) : krb_float(res);
}

static KrbValue math_abs(int argCount, KrbValue *args)
{
    if (argCount < 1)
        return krb_int(0);
    if (args[0].type == VAL_INT)
    {
        int64_t v = args[0].as.integer;
        return krb_int(v < 0 ? -v : v);
    }
    if (args[0].type == VAL_FLOAT)
        return krb_float(fabs(args[0].as.number));
    return krb_int(0);
}

static KrbValue math_min(int argCount, KrbValue *args)
{
    if (argCount < 2)
        return krb_null();
    if (args[0].type == VAL_INT && args[1].type == VAL_INT)
        return krb_int(args[0].as.integer < args[1].as.integer ? args[0].as.integer : args[1].as.integer);
    double a = as_num(args[0]), b = as_num(args[1]);
    return krb_float(a < b ? a : b);
}

static KrbValue math_max(int argCount, KrbValue *args)
{
    if (argCount < 2)
        return krb_null();
    if (args[0].type == VAL_INT && args[1].type == VAL_INT)
        return krb_int(args[0].as.integer > args[1].as.integer ? args[0].as.integer : args[1].as.integer);
    double a = as_num(args[0]), b = as_num(args[1]);
    return krb_float(a > b ? a : b);
}

static KrbValue math_clamp(int argCount, KrbValue *args)
{
    if (argCount < 3)
        return krb_null();
    if (args[0].type == VAL_INT && args[1].type == VAL_INT && args[2].type == VAL_INT)
    {
        int64_t v = args[0].as.integer, mn = args[1].as.integer, mx = args[2].as.integer;
        return krb_int(v < mn ? mn : (v > mx ? mx : v));
    }
    double v = as_num(args[0]), mn = as_num(args[1]), mx = as_num(args[2]);
    return krb_float(v < mn ? mn : (v > mx ? mx : v));
}

static KrbValue math_floor(int argCount, KrbValue *args)
{
    return (argCount < 1) ? krb_int(0) : krb_int((int64_t)floor(as_num(args[0])));
}

static KrbValue math_ceil(int argCount, KrbValue *args)
{
    return (argCount < 1) ? krb_int(0) : krb_int((int64_t)ceil(as_num(args[0])));
}

static KrbValue math_round(int argCount, KrbValue *args)
{
    return (argCount < 1) ? krb_int(0) : krb_int((int64_t)round(as_num(args[0])));
}

static KrbValue math_sqrt(int argCount, KrbValue *args)
{
    return (argCount < 1) ? krb_float(0.0) : num_val(sqrt(as_num(args[0])));
}

static KrbValue math_pow(int argCount, KrbValue *args)
{
    return (argCount < 2) ? krb_null() : num_val(pow(as_num(args[0]), as_num(args[1])));
}

static KrbValue math_sign(int argCount, KrbValue *args)
{
    if (argCount < 1)
        return krb_int(0);
    double v = as_num(args[0]);
    return krb_int(v > 0 ? 1 : (v < 0 ? -1 : 0));
}

static KrbValue math_lerp(int argCount, KrbValue *args)
{
    if (argCount < 3)
        return krb_null();
    double a = as_num(args[0]), b = as_num(args[1]), t = as_num(args[2]);
    return num_val(a + (b - a) * t);
}

static KrbValue math_dist(int argCount, KrbValue *args)
{
    if (argCount < 4)
        return krb_float(0.0);
    double dx = as_num(args[2]) - as_num(args[0]);
    double dy = as_num(args[3]) - as_num(args[1]);
    return num_val(sqrt(dx * dx + dy * dy));
}

static KrbValue math_sin(int argCount, KrbValue *args)
{
    if (argCount < 1)
        return krb_float(0.0);
    double res = sin(as_num(args[0]));
    return (fabs(res) < 1e-12) ? krb_int(0) : krb_float(res);
}

static KrbValue math_cos(int argCount, KrbValue *args)
{
    if (argCount < 1)
        return krb_float(1.0);
    double res = cos(as_num(args[0]));
    return (fabs(res - 1.0) < 1e-12) ? krb_int(1) : ((fabs(res) < 1e-12) ? krb_int(0) : krb_float(res));
}

static KrbValue str_upper(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    const char *s = args[0].as.string;
    size_t len = strlen(s);
    char *copy = (char *)malloc(len + 1);
    for (size_t i = 0; i < len; i++)
        copy[i] = (char)toupper((unsigned char)s[i]);
    copy[len] = '\0';
    return krb_string(copy);
}

static KrbValue str_lower(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    const char *s = args[0].as.string;
    size_t len = strlen(s);
    char *copy = (char *)malloc(len + 1);
    for (size_t i = 0; i < len; i++)
        copy[i] = (char)tolower((unsigned char)s[i]);
    copy[len] = '\0';
    return krb_string(copy);
}

static KrbValue str_trim(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    const char *s = args[0].as.string;
    while (*s && isspace((unsigned char)*s))
        s++;
    size_t len = strlen(s);
    while (len > 0 && isspace((unsigned char)s[len - 1]))
        len--;
    char *copy = (char *)malloc(len + 1);
    memcpy(copy, s, len);
    copy[len] = '\0';
    return krb_string(copy);
}

static KrbValue str_contains(int argCount, KrbValue *args)
{
    if (argCount < 2)
        return krb_bool(false);
    if (args[0].type != VAL_STRING || args[1].type != VAL_STRING)
        return krb_bool(false);
    if (strlen(args[1].as.string) == 0)
        return krb_bool(true);
    return krb_bool(strstr(args[0].as.string, args[1].as.string) != NULL);
}

static KrbValue str_starts_with(int argCount, KrbValue *args)
{
    if (argCount < 2 || args[0].type != VAL_STRING || args[1].type != VAL_STRING)
        return krb_bool(false);
    size_t l1 = strlen(args[0].as.string);
    size_t l2 = strlen(args[1].as.string);
    if (l2 > l1)
        return krb_bool(false);
    return krb_bool(memcmp(args[0].as.string, args[1].as.string, l2) == 0);
}

static KrbValue str_ends_with(int argCount, KrbValue *args)
{
    if (argCount < 2 || args[0].type != VAL_STRING || args[1].type != VAL_STRING)
        return krb_bool(false);
    size_t l1 = strlen(args[0].as.string);
    size_t l2 = strlen(args[1].as.string);
    if (l2 > l1)
        return krb_bool(false);
    return krb_bool(memcmp(args[0].as.string + l1 - l2, args[1].as.string, l2) == 0);
}

static KrbValue str_index_of(int argCount, KrbValue *args)
{
    if (argCount < 2 || args[0].type != VAL_STRING || args[1].type != VAL_STRING)
        return krb_int(-1);
    char *found = strstr(args[0].as.string, args[1].as.string);
    if (!found)
        return krb_int(-1);
    return krb_int(found - args[0].as.string);
}

static KrbValue str_replace(int argCount, KrbValue *args)
{
    if (argCount < 3 || args[0].type != VAL_STRING || args[1].type != VAL_STRING || args[2].type != VAL_STRING)
        return args[0];
    const char *orig = args[0].as.string;
    const char *target = args[1].as.string;
    const char *repl = args[2].as.string;
    size_t tLen = strlen(target);
    if (tLen == 0)
        return krb_string(orig);

    char buffer[4096];
    buffer[0] = '\0';
    const char *p = orig;
    const char *match;
    while ((match = strstr(p, target)) != NULL)
    {
        strncat(buffer, p, match - p);
        strcat(buffer, repl);
        p = match + tLen;
    }
    strcat(buffer, p);
    return krb_string(_strdup(buffer));
}

static KrbValue str_repeat(int argCount, KrbValue *args)
{
    if (argCount < 2 || args[0].type != VAL_STRING)
        return krb_string("");
    int count = (int)((args[1].type == VAL_INT) ? args[1].as.integer : 0);
    if (count <= 0)
        return krb_string("");
    size_t len = strlen(args[0].as.string);
    char *res = (char *)malloc(len * count + 1);
    res[0] = '\0';
    for (int i = 0; i < count; i++)
        strcat(res, args[0].as.string);
    return krb_string(res);
}

static KrbValue str_reverse(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    size_t len = strlen(args[0].as.string);
    char *res = (char *)malloc(len + 1);
    for (size_t i = 0; i < len; i++)
        res[i] = args[0].as.string[len - 1 - i];
    res[len] = '\0';
    return krb_string(res);
}

static KrbValue str_slice(int argCount, KrbValue *args)
{
    if (argCount < 2 || args[0].type != VAL_STRING)
        return krb_string("");
    const char *s = args[0].as.string;
    int len = (int)strlen(s);
    int start = (int)((args[1].type == VAL_INT) ? args[1].as.integer : 0);
    int end = len;
    if (argCount >= 3 && args[2].type == VAL_INT)
        end = (int)args[2].as.integer;
    if (start < 0)
        start = 0;
    if (end > len)
        end = len;
    if (start >= end)
        return krb_string("");
    int subLen = end - start;
    char *res = (char *)malloc(subLen + 1);
    memcpy(res, s + start, subLen);
    res[subLen] = '\0';
    return krb_string(res);
}

static KrbValue str_count(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_int(0);
    return krb_int((int64_t)strlen(args[0].as.string));
}

static KrbValue str_split(int argCount, KrbValue *args)
{
    ObjList *list = krb_new_list();
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_obj((Obj *)list);
    const char *s = args[0].as.string;
    const char *sep = (argCount >= 2 && args[1].type == VAL_STRING) ? args[1].as.string : " ";
    size_t sepLen = strlen(sep);

    if (sepLen == 0)
    {
        for (size_t i = 0; i < strlen(s); i++)
        {
            char ch[2] = {s[i], '\0'};
            krb_write_value_array(&list->elements, krb_string(_strdup(ch)));
        }
        return krb_obj((Obj *)list);
    }

    const char *p = s;
    const char *match;
    while ((match = strstr(p, sep)) != NULL)
    {
        size_t partLen = match - p;
        char *part = (char *)malloc(partLen + 1);
        memcpy(part, p, partLen);
        part[partLen] = '\0';
        krb_write_value_array(&list->elements, krb_string(part));
        p = match + sepLen;
    }
    krb_write_value_array(&list->elements, krb_string(_strdup(p)));
    return krb_obj((Obj *)list);
}

static KrbValue str_join(int argCount, KrbValue *args)
{
    if (argCount < 1 || !IS_LIST(args[0]))
        return krb_string("");
    ObjList *list = AS_LIST(args[0]);
    const char *sep = (argCount >= 2 && args[1].type == VAL_STRING) ? args[1].as.string : "";
    if (list->elements.count == 0)
        return krb_string("");

    char buffer[8192];
    buffer[0] = '\0';
    for (int i = 0; i < list->elements.count; i++)
    {
        if (i > 0)
            strcat(buffer, sep);
        KrbValue v = list->elements.values[i];
        if (v.type == VAL_STRING)
            strcat(buffer, v.as.string);
        else if (v.type == VAL_INT)
        {
            char num[32];
            snprintf(num, sizeof(num), "%lld", (long long)v.as.integer);
            strcat(buffer, num);
        }
    }
    return krb_string(_strdup(buffer));
}

static KrbValue time_now(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    return krb_int(get_time_ms());
}

static KrbValue time_since(int argCount, KrbValue *args)
{
    if (argCount < 1)
        return krb_int(0);
    int64_t t0 = (args[0].type == VAL_INT) ? args[0].as.integer : (int64_t)args[0].as.number;
    return krb_int(get_time_ms() - t0);
}

static KrbValue time_unix(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    return krb_int(get_time_ms() / 1000);
}

static KrbValue time_perf(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    return krb_float((double)(get_time_ms() - start_time_ms));
}

static KrbValue time_iso(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    time_t raw = time(NULL);
    struct tm *t = localtime(&raw);
    char buf[32];
    snprintf(buf, sizeof(buf), "%04d-%02d-%02dT%02d:%02d:%02d",
             t->tm_year + 1900, t->tm_mon + 1, t->tm_mday,
             t->tm_hour, t->tm_min, t->tm_sec);
    return krb_string(_strdup(buf));
}

static KrbValue time_clock(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    time_t raw = time(NULL);
    struct tm *t = localtime(&raw);
    ObjTable *tbl = krb_new_table();
    table_set_val(tbl, "year", krb_int(t->tm_year + 1900));
    table_set_val(tbl, "month", krb_int(t->tm_mon + 1));
    table_set_val(tbl, "day", krb_int(t->tm_mday));
    table_set_val(tbl, "hours", krb_int(t->tm_hour));
    table_set_val(tbl, "minutes", krb_int(t->tm_min));
    table_set_val(tbl, "seconds", krb_int(t->tm_sec));
    table_set_val(tbl, "ms", krb_int(get_time_ms() % 1000));
    return krb_obj((Obj *)tbl);
}

static KrbValue time_format(int argCount, KrbValue *args)
{
    if (argCount < 1)
        return krb_string("00:00");
    int64_t ms = (args[0].type == VAL_INT) ? args[0].as.integer : (int64_t)args[0].as.number;
    int64_t totalSec = ms / 1000;
    int64_t mins = (totalSec % 3600) / 60;
    int64_t secs = totalSec % 60;
    char buf[16];
    snprintf(buf, sizeof(buf), "%02lld:%02lld", (long long)mins, (long long)secs);
    return krb_string(_strdup(buf));
}

static int64_t stopwatch_start = 0;
static KrbValue sw_elapsed(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    return krb_int(get_time_ms() - stopwatch_start);
}
static KrbValue sw_reset(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    stopwatch_start = get_time_ms();
    return krb_int(stopwatch_start);
}

static KrbValue time_stopwatch(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    stopwatch_start = get_time_ms();
    ObjTable *tbl = krb_new_table();
    table_set_fn(tbl, "elapsed", sw_elapsed);
    table_set_fn(tbl, "reset", sw_reset);
    return krb_obj((Obj *)tbl);
}

static KrbValue io_file_paste(int argCount, KrbValue *args)
{
    if (argCount < 2 || args[0].type != VAL_STRING)
        return krb_bool(false);
    FILE *f = fopen(args[0].as.string, "w");
    if (!f)
        return krb_bool(false);
    if (args[1].type == VAL_STRING)
        fputs(args[1].as.string, f);
    fclose(f);
    return krb_bool(true);
}

static KrbValue io_file_paste_ln(int argCount, KrbValue *args)
{
    if (argCount < 2 || args[0].type != VAL_STRING)
        return krb_bool(false);
    FILE *f = fopen(args[0].as.string, "a");
    if (!f)
        return krb_bool(false);
    if (args[1].type == VAL_STRING)
    {
        fputs(args[1].as.string, f);
        fputs("\n", f);
    }
    fclose(f);
    return krb_bool(true);
}

static KrbValue io_file_exists(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_bool(false);
    FILE *f = fopen(args[0].as.string, "r");
    if (!f)
        return krb_bool(false);
    fclose(f);
    return krb_bool(true);
}

static KrbValue io_file_copy(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    FILE *f = fopen(args[0].as.string, "rb");
    if (!f)
        return krb_string("");
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);
    char *buf = (char *)malloc(size + 1);
    fread(buf, 1, size, f);
    buf[size] = '\0';
    fclose(f);
    return krb_string(buf);
}

static KrbValue io_file_append(int argCount, KrbValue *args)
{
    if (argCount < 2 || args[0].type != VAL_STRING)
        return krb_bool(false);
    FILE *f = fopen(args[0].as.string, "a");
    if (!f)
        return krb_bool(false);
    if (args[1].type == VAL_STRING)
        fputs(args[1].as.string, f);
    fclose(f);
    return krb_bool(true);
}

static KrbValue io_file_kill(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_bool(false);
    return krb_bool(remove(args[0].as.string) == 0);
}

static void serialize_json(KrbValue v, char *buf, size_t cap, int indent, int currentIndent)
{
    char tmp[256];
    if (v.type == VAL_NULL)
    {
        strcat(buf, "null");
    }
    else if (v.type == VAL_BOOL)
    {
        strcat(buf, v.as.boolean ? "true" : "false");
    }
    else if (v.type == VAL_INT)
    {
        snprintf(tmp, sizeof(tmp), "%lld", (long long)v.as.integer);
        strcat(buf, tmp);
    }
    else if (v.type == VAL_FLOAT)
    {
        snprintf(tmp, sizeof(tmp), "%g", v.as.number);
        strcat(buf, tmp);
    }
    else if (v.type == VAL_STRING)
    {
        strcat(buf, "\"");
        strcat(buf, v.as.string);
        strcat(buf, "\"");
    }
    else if (IS_LIST(v))
    {
        ObjList *l = AS_LIST(v);
        strcat(buf, "[");
        for (int i = 0; i < l->elements.count; i++)
        {
            if (i > 0)
                strcat(buf, ", ");
            serialize_json(l->elements.values[i], buf, cap, indent, currentIndent + indent);
        }
        strcat(buf, "]");
    }
    else if (IS_TABLE(v))
    {
        ObjTable *t = AS_TABLE(v);
        strcat(buf, "{");
        bool first = true;
        for (int i = 0; i < t->fields.capacity; i++)
        {
            Entry *e = &t->fields.entries[i];
            if (e->key != NULL)
            {
                if (!first)
                    strcat(buf, ", ");
                first = false;
                if (indent > 0)
                {
                    strcat(buf, "\n");
                    for (int s = 0; s < currentIndent + indent; s++)
                        strcat(buf, " ");
                }
                strcat(buf, "\"");
                strcat(buf, e->key);
                strcat(buf, "\": ");
                serialize_json(e->value, buf, cap, indent, currentIndent + indent);
            }
        }
        if (indent > 0 && !first)
        {
            strcat(buf, "\n");
            for (int s = 0; s < currentIndent; s++)
                strcat(buf, " ");
        }
        strcat(buf, "}");
    }
    else
    {
        strcat(buf, "null");
    }
}

static const char *json_ptr = NULL;
static void skip_json_ws(void)
{
    while (*json_ptr && isspace((unsigned char)*json_ptr))
        json_ptr++;
}

static KrbValue parse_json_value(void);

static KrbValue parse_json_value(void)
{
    skip_json_ws();
    if (*json_ptr == '\0')
        return krb_null();

    if (*json_ptr == 'n' && strncmp(json_ptr, "null", 4) == 0)
    {
        json_ptr += 4;
        return krb_null();
    }
    if (*json_ptr == 't' && strncmp(json_ptr, "true", 4) == 0)
    {
        json_ptr += 4;
        return krb_bool(true);
    }
    if (*json_ptr == 'f' && strncmp(json_ptr, "false", 5) == 0)
    {
        json_ptr += 5;
        return krb_bool(false);
    }
    if (*json_ptr == '"')
    {
        json_ptr++;
        const char *start = json_ptr;
        while (*json_ptr && *json_ptr != '"')
        {
            if (*json_ptr == '\\' && json_ptr[1])
                json_ptr++;
            json_ptr++;
        }
        size_t len = json_ptr - start;
        char *str = (char *)malloc(len + 1);
        memcpy(str, start, len);
        str[len] = '\0';
        if (*json_ptr == '"')
            json_ptr++;
        return krb_string(str);
    }
    if (isdigit((unsigned char)*json_ptr) || *json_ptr == '-')
    {
        char *end;
        double d = strtod(json_ptr, &end);
        json_ptr = end;
        if (d == (int64_t)d)
            return krb_int((int64_t)d);
        return krb_float(d);
    }
    if (*json_ptr == '[')
    {
        json_ptr++;
        ObjList *l = krb_new_list();
        skip_json_ws();
        if (*json_ptr == ']')
        {
            json_ptr++;
            return krb_obj((Obj *)l);
        }
        while (*json_ptr)
        {
            KrbValue el = parse_json_value();
            krb_write_value_array(&l->elements, el);
            skip_json_ws();
            if (*json_ptr == ',')
            {
                json_ptr++;
                skip_json_ws();
            }
            else if (*json_ptr == ']')
            {
                json_ptr++;
                break;
            }
            else
                break;
        }
        return krb_obj((Obj *)l);
    }
    if (*json_ptr == '{')
    {
        json_ptr++;
        ObjTable *t = krb_new_table();
        skip_json_ws();
        if (*json_ptr == '}')
        {
            json_ptr++;
            return krb_obj((Obj *)t);
        }
        while (*json_ptr)
        {
            skip_json_ws();
            if (*json_ptr != '"')
                break;
            json_ptr++;
            const char *kStart = json_ptr;
            while (*json_ptr && *json_ptr != '"')
                json_ptr++;
            size_t kLen = json_ptr - kStart;
            char *key = (char *)malloc(kLen + 1);
            memcpy(key, kStart, kLen);
            key[kLen] = '\0';
            if (*json_ptr == '"')
                json_ptr++;
            skip_json_ws();
            if (*json_ptr == ':')
                json_ptr++;
            KrbValue val = parse_json_value();
            krb_table_set(&t->fields, key, (int)kLen, val, false);
            skip_json_ws();
            if (*json_ptr == ',')
            {
                json_ptr++;
                skip_json_ws();
            }
            else if (*json_ptr == '}')
            {
                json_ptr++;
                break;
            }
            else
                break;
        }
        return krb_obj((Obj *)t);
    }
    return krb_null();
}

static KrbValue json_stringify(int argCount, KrbValue *args)
{
    if (argCount < 1)
        return krb_string("");
    int indent = (argCount >= 2 && args[1].type == VAL_INT) ? (int)args[1].as.integer : 0;
    char buffer[16384];
    buffer[0] = '\0';
    serialize_json(args[0], buffer, sizeof(buffer), indent, 0);
    return krb_string(_strdup(buffer));
}

static KrbValue json_parse(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_null();
    json_ptr = args[0].as.string;
    return parse_json_value();
}

static KrbValue json_is_valid(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_bool(false);
    const char *s = args[0].as.string;
    while (*s && isspace((unsigned char)*s))
        s++;
    if (*s != '[' && *s != '{')
        return krb_bool(false);
    size_t len = strlen(s);
    while (len > 0 && isspace((unsigned char)s[len - 1]))
        len--;
    if (*s == '[' && s[len - 1] != ']')
        return krb_bool(false);
    if (*s == '{' && s[len - 1] != '}')
        return krb_bool(false);
    return krb_bool(true);
}

static KrbValue json_minify(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    KrbValue parsed = json_parse(argCount, args);
    KrbValue a[2] = {parsed, krb_int(0)};
    return json_stringify(2, a);
}

static KrbValue json_format(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    int indent = (argCount >= 2 && args[1].type == VAL_INT) ? (int)args[1].as.integer : 2;
    KrbValue parsed = json_parse(argCount, args);
    KrbValue a[2] = {parsed, krb_int(indent)};
    return json_stringify(2, a);
}

static KrbValue json_write(int argCount, KrbValue *args)
{
    if (argCount < 2 || args[0].type != VAL_STRING)
        return krb_bool(false);
    int indent = (argCount >= 3 && args[2].type == VAL_INT) ? (int)args[2].as.integer : 4;
    KrbValue a[2] = {args[1], krb_int(indent)};
    KrbValue str = json_stringify(2, a);
    KrbValue ioArgs[2] = {args[0], str};
    return io_file_paste(2, ioArgs);
}

static KrbValue json_read(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_null();
    KrbValue content = io_file_copy(1, args);
    if (content.type != VAL_STRING)
        return krb_null();
    KrbValue parseArgs[1] = {content};
    return json_parse(1, parseArgs);
}

static KrbValue random_seed(int argCount, KrbValue *args)
{
    if (argCount >= 1 && args[0].type == VAL_INT)
    {
        prng_state = (uint32_t)args[0].as.integer;
    }
    return krb_null();
}

static KrbValue random_int(int argCount, KrbValue *args)
{
    int64_t min = 1, max = 100;
    if (argCount >= 2)
    {
        min = (args[0].type == VAL_INT) ? args[0].as.integer : (int64_t)args[0].as.number;
        max = (args[1].type == VAL_INT) ? args[1].as.integer : (int64_t)args[1].as.number;
    }
    else if (argCount == 1)
    {
        max = (args[0].type == VAL_INT) ? args[0].as.integer : (int64_t)args[0].as.number;
    }
    if (max < min)
    {
        int64_t tmp = min;
        min = max;
        max = tmp;
    }
    int64_t res = min + (int64_t)(next_random() * (max - min + 1));
    return krb_int(res);
}

static KrbValue random_float(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    return krb_float(next_random());
}

static KrbValue random_item(int argCount, KrbValue *args)
{
    if (argCount < 1 || !IS_LIST(args[0]))
        return krb_null();
    ObjList *l = AS_LIST(args[0]);
    if (l->elements.count == 0)
        return krb_null();
    int idx = (int)(next_random() * l->elements.count);
    return l->elements.values[idx];
}

static KrbValue random_shuffle(int argCount, KrbValue *args)
{
    if (argCount < 1 || !IS_LIST(args[0]))
        return krb_null();
    ObjList *l = AS_LIST(args[0]);
    int n = l->elements.count;
    for (int i = n - 1; i > 0; i--)
    {
        int j = (int)(next_random() * (i + 1));
        KrbValue tmp = l->elements.values[i];
        l->elements.values[i] = l->elements.values[j];
        l->elements.values[j] = tmp;
    }
    return args[0];
}

static KrbValue random_uuid(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    char buf[37];
    const char *chars = "0123456789abcdef";
    for (int i = 0; i < 36; i++)
    {
        if (i == 8 || i == 13 || i == 18 || i == 23)
        {
            buf[i] = '-';
        }
        else if (i == 14)
        {
            buf[i] = '4';
        }
        else if (i == 19)
        {
            buf[i] = chars[(int)(next_random() * 4) + 8];
        }
        else
        {
            buf[i] = chars[(int)(next_random() * 16)];
        }
    }
    buf[36] = '\0';
    return krb_string(_strdup(buf));
}

static KrbValue random_token(int argCount, KrbValue *args)
{
    int len = (argCount >= 1 && args[0].type == VAL_INT) ? (int)args[0].as.integer : 16;
    const char *chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    char *buf = (char *)malloc(len + 1);
    for (int i = 0; i < len; i++)
    {
        buf[i] = chars[(int)(next_random() * 62)];
    }
    buf[len] = '\0';
    return krb_string(buf);
}

static KrbValue path_join(int argCount, KrbValue *args)
{
    char buf[1024];
    buf[0] = '\0';
    for (int i = 0; i < argCount; i++)
    {
        if (args[i].type == VAL_STRING)
        {
            if (i > 0 && buf[strlen(buf) - 1] != '/' && buf[strlen(buf) - 1] != '\\')
            {
                strcat(buf, "/");
            }
            strcat(buf, args[i].as.string);
        }
    }
    return krb_string(_strdup(buf));
}

static KrbValue path_extname(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    const char *dot = strrchr(args[0].as.string, '.');
    if (!dot)
        return krb_string("");
    return krb_string(_strdup(dot));
}

static KrbValue path_basename(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    const char *s = args[0].as.string;
    const char *slash = strrchr(s, '/');
    const char *bslash = strrchr(s, '\\');
    const char *start = slash > bslash ? slash : bslash;
    if (start)
        return krb_string(_strdup(start + 1));
    return krb_string(_strdup(s));
}

static KrbValue path_dirname(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    const char *s = args[0].as.string;
    const char *slash = strrchr(s, '/');
    const char *bslash = strrchr(s, '\\');
    const char *last = slash > bslash ? slash : bslash;
    if (!last)
        return krb_string(".");
    size_t len = last - s;
    char *buf = (char *)malloc(len + 1);
    memcpy(buf, s, len);
    buf[len] = '\0';
    return krb_string(buf);
}

static KrbValue path_is_absolute(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_bool(false);
    const char *s = args[0].as.string;
    if (s[0] == '/' || s[0] == '\\')
        return krb_bool(true);
    if (strlen(s) > 2 && isalpha((unsigned char)s[0]) && s[1] == ':')
        return krb_bool(true);
    return krb_bool(false);
}

static KrbValue path_resolve(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    char full[MAX_PATH];
#ifdef _WIN32
    if (_fullpath(full, args[0].as.string, MAX_PATH) != NULL)
    {
        return krb_string(_strdup(full));
    }
#endif
    return args[0];
}

static KrbValue path_normalize(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    return args[0];
}

static KrbValue path_parse(int argCount, KrbValue *args)
{
    ObjTable *tbl = krb_new_table();
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_obj((Obj *)tbl);
    KrbValue base = path_basename(1, args);
    KrbValue ext = path_extname(1, args);
    KrbValue dir = path_dirname(1, args);

    const char *b = base.as.string;
    const char *e = ext.as.string;
    size_t nLen = strlen(b) - strlen(e);
    char *name = (char *)malloc(nLen + 1);
    memcpy(name, b, nLen);
    name[nLen] = '\0';

    table_set_val(tbl, "base", base);
    table_set_val(tbl, "ext", ext);
    table_set_val(tbl, "dir", dir);
    table_set_val(tbl, "name", krb_string(name));
    table_set_val(tbl, "root", krb_string(""));
    return krb_obj((Obj *)tbl);
}

static KrbValue proc_cwd(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    char buf[1024];
    if (getcwd(buf, sizeof(buf)) != NULL)
    {
        return krb_string(_strdup(buf));
    }
    return krb_string(".");
}

static KrbValue proc_uptime(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    return krb_float((double)(get_time_ms() - start_time_ms) / 1000.0);
}

static KrbValue proc_pid(int argCount, KrbValue *args)
{
    (void)argCount;
    (void)args;
    return krb_int(getpid());
}

static KrbValue proc_set_env(int argCount, KrbValue *args)
{
    if (argCount < 2 || args[0].type != VAL_STRING || args[1].type != VAL_STRING)
        return krb_bool(false);
#ifdef _WIN32
    _putenv_s(args[0].as.string, args[1].as.string);
#else
    setenv(args[0].as.string, args[1].as.string, 1);
#endif
    return krb_bool(true);
}

static KrbValue proc_get_env(int argCount, KrbValue *args)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_null();
    const char *val = getenv(args[0].as.string);
    if (!val)
    {
        return (argCount >= 2) ? args[1] : krb_null();
    }
    return krb_string(_strdup(val));
}

static KrbValue term_wrap(int argCount, KrbValue *args, const char *prefix, const char *suffix)
{
    if (argCount < 1 || args[0].type != VAL_STRING)
        return krb_string("");
    char buf[1024];
    snprintf(buf, sizeof(buf), "%s%s%s", prefix, args[0].as.string, suffix);
    return krb_string(_strdup(buf));
}

static KrbValue term_green(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[32m", "\x1b[39m"); }
static KrbValue term_bold(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[1m", "\x1b[22m"); }
static KrbValue term_red(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[31m", "\x1b[39m"); }
static KrbValue term_blue(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[34m", "\x1b[39m"); }
static KrbValue term_yellow(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[33m", "\x1b[39m"); }
static KrbValue term_magenta(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[35m", "\x1b[39m"); }
static KrbValue term_cyan(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[36m", "\x1b[39m"); }
static KrbValue term_bg_red(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[41m", "\x1b[49m"); }
static KrbValue term_bg_green(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[42m", "\x1b[49m"); }
static KrbValue term_italic(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[3m", "\x1b[23m"); }
static KrbValue term_underline(int argCount, KrbValue *args) { return term_wrap(argCount, args, "\x1b[4m", "\x1b[24m"); }

static KrbValue native_clear(int argCount, KrbValue *args)
{
    if (argCount >= 1 && (args[0].type == VAL_BOOL && !args[0].as.boolean))
    {
        return krb_null();
    }
    printf("\x1b[2J\x1b[0;0H");
    return krb_null();
}

static KrbValue native_exit(int argCount, KrbValue *args)
{
    if (argCount >= 1 && (args[0].type == VAL_BOOL && !args[0].as.boolean))
    {
        return krb_null();
    }
    int code = 0;
    if (argCount >= 1 && args[0].type == VAL_INT)
        code = (int)args[0].as.integer;
    exit(code);
    return krb_null();
}

static KrbValue native_copy(int argCount, KrbValue *args)
{
    if (argCount >= 1)
    {
        krb_print_value(args[0]);
        fflush(stdout);
    }
    char line[1024];
    if (fgets(line, sizeof(line), stdin) == NULL)
        return krb_string(_strdup(""));
    size_t len = strlen(line);
    while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r'))
        line[--len] = '\0';
    return krb_string(_strdup(line));
}

static KrbValue native_copy_key(int argCount, KrbValue *args)
{
    if (argCount >= 1)
    {
        krb_print_value(args[0]);
        fflush(stdout);
    }
#ifdef _WIN32
    char str[2] = {(char)_getch(), '\0'};
#else
    char str[2] = {(char)getchar(), '\0'};
#endif
    return krb_string(_strdup(str));
}

void krb_init_stdlib(void)
{
    start_time_ms = get_time_ms();

    ObjTable *mathTbl = krb_new_table();
    table_set_val(mathTbl, "PI", krb_float(3.141592653589793));
    table_set_val(mathTbl, "TAU", krb_float(6.283185307179586));
    table_set_val(mathTbl, "E", krb_float(2.718281828459045));
    table_set_fn(mathTbl, "abs", math_abs);
    table_set_fn(mathTbl, "min", math_min);
    table_set_fn(mathTbl, "max", math_max);
    table_set_fn(mathTbl, "clamp", math_clamp);
    table_set_fn(mathTbl, "floor", math_floor);
    table_set_fn(mathTbl, "ceil", math_ceil);
    table_set_fn(mathTbl, "round", math_round);
    table_set_fn(mathTbl, "sqrt", math_sqrt);
    table_set_fn(mathTbl, "pow", math_pow);
    table_set_fn(mathTbl, "sign", math_sign);
    table_set_fn(mathTbl, "lerp", math_lerp);
    table_set_fn(mathTbl, "dist", math_dist);
    table_set_fn(mathTbl, "sin", math_sin);
    table_set_fn(mathTbl, "cos", math_cos);

    ObjTable *strTbl = krb_new_table();
    table_set_fn(strTbl, "upper", str_upper);
    table_set_fn(strTbl, "lower", str_lower);
    table_set_fn(strTbl, "trim", str_trim);
    table_set_fn(strTbl, "contains", str_contains);
    table_set_fn(strTbl, "startsWith", str_starts_with);
    table_set_fn(strTbl, "endsWith", str_ends_with);
    table_set_fn(strTbl, "indexOf", str_index_of);
    table_set_fn(strTbl, "replace", str_replace);
    table_set_fn(strTbl, "repeat", str_repeat);
    table_set_fn(strTbl, "reverse", str_reverse);
    table_set_fn(strTbl, "slice", str_slice);
    table_set_fn(strTbl, "count", str_count);
    table_set_fn(strTbl, "split", str_split);
    table_set_fn(strTbl, "join", str_join);

    ObjTable *timeTbl = krb_new_table();
    table_set_fn(timeTbl, "now", time_now);
    table_set_fn(timeTbl, "since", time_since);
    table_set_fn(timeTbl, "unix", time_unix);
    table_set_fn(timeTbl, "perf", time_perf);
    table_set_fn(timeTbl, "iso", time_iso);
    table_set_fn(timeTbl, "clock", time_clock);
    table_set_fn(timeTbl, "format", time_format);
    table_set_fn(timeTbl, "stopwatch", time_stopwatch);

    ObjTable *ioTbl = krb_new_table();
    table_set_fn(ioTbl, "filePaste", io_file_paste);
    table_set_fn(ioTbl, "filePasteLn", io_file_paste_ln);
    table_set_fn(ioTbl, "fileExists", io_file_exists);
    table_set_fn(ioTbl, "fileCopy", io_file_copy);
    table_set_fn(ioTbl, "fileAppend", io_file_append);
    table_set_fn(ioTbl, "fileAppendLn", io_file_paste_ln);
    table_set_fn(ioTbl, "fileKill", io_file_kill);

    ObjTable *jsonTbl = krb_new_table();
    table_set_fn(jsonTbl, "stringify", json_stringify);
    table_set_fn(jsonTbl, "parse", json_parse);
    table_set_fn(jsonTbl, "isValid", json_is_valid);
    table_set_fn(jsonTbl, "minify", json_minify);
    table_set_fn(jsonTbl, "format", json_format);
    table_set_fn(jsonTbl, "write", json_write);
    table_set_fn(jsonTbl, "read", json_read);

    ObjTable *randTbl = krb_new_table();
    table_set_fn(randTbl, "seed", random_seed);
    table_set_fn(randTbl, "int", random_int);
    table_set_fn(randTbl, "float", random_float);
    table_set_fn(randTbl, "item", random_item);
    table_set_fn(randTbl, "shuffle", random_shuffle);
    table_set_fn(randTbl, "uuid", random_uuid);
    table_set_fn(randTbl, "token", random_token);

    ObjTable *pathTbl = krb_new_table();
    table_set_val(pathTbl, "sep", krb_string("\\"));
    table_set_val(pathTbl, "delimiter", krb_string(";"));
    table_set_fn(pathTbl, "join", path_join);
    table_set_fn(pathTbl, "extname", path_extname);
    table_set_fn(pathTbl, "basename", path_basename);
    table_set_fn(pathTbl, "dirname", path_dirname);
    table_set_fn(pathTbl, "isAbsolute", path_is_absolute);
    table_set_fn(pathTbl, "resolve", path_resolve);
    table_set_fn(pathTbl, "normalize", path_normalize);
    table_set_fn(pathTbl, "parse", path_parse);

    ObjTable *procTbl = krb_new_table();
    table_set_val(procTbl, "platform", krb_string("win32"));
    table_set_val(procTbl, "arch", krb_string("x64"));
    table_set_fn(procTbl, "cwd", proc_cwd);
    table_set_fn(procTbl, "uptime", proc_uptime);
    table_set_fn(procTbl, "pid", proc_pid);
    table_set_fn(procTbl, "setEnv", proc_set_env);
    table_set_fn(procTbl, "getEnv", proc_get_env);

    ObjTable *termTbl = krb_new_table();
    table_set_fn(termTbl, "green", term_green);
    table_set_fn(termTbl, "bold", term_bold);
    table_set_fn(termTbl, "red", term_red);
    table_set_fn(termTbl, "blue", term_blue);
    table_set_fn(termTbl, "yellow", term_yellow);
    table_set_fn(termTbl, "magenta", term_magenta);
    table_set_fn(termTbl, "cyan", term_cyan);
    table_set_fn(termTbl, "bgRed", term_bg_red);
    table_set_fn(termTbl, "bgGreen", term_bg_green);
    table_set_fn(termTbl, "italic", term_italic);
    table_set_fn(termTbl, "underline", term_underline);

    krb_table_set(&vm.globals, "Math", 4, krb_obj((Obj *)mathTbl), false);
    krb_table_set(&vm.globals, "String", 6, krb_obj((Obj *)strTbl), false);
    krb_table_set(&vm.globals, "Time", 4, krb_obj((Obj *)timeTbl), false);
    krb_table_set(&vm.globals, "IO", 2, krb_obj((Obj *)ioTbl), false);

    krb_table_set(&vm.globals, "Json", 4, krb_obj((Obj *)jsonTbl), false);
    krb_table_set(&vm.globals, "Random", 6, krb_obj((Obj *)randTbl), false);
    krb_table_set(&vm.globals, "Path", 4, krb_obj((Obj *)pathTbl), false);
    krb_table_set(&vm.globals, "Process", 7, krb_obj((Obj *)procTbl), false);
    krb_table_set(&vm.globals, "Term", 4, krb_obj((Obj *)termTbl), false);

    ObjList *argsList = krb_new_list();
    krb_table_set(&vm.globals, "args", 4, krb_obj((Obj *)argsList), false);
    krb_table_set(&vm.globals, "clear", 5, krb_obj((Obj *)krb_new_native(native_clear, "clear")), false);
    krb_table_set(&vm.globals, "exit", 4, krb_obj((Obj *)krb_new_native(native_exit, "exit")), false);
    krb_table_set(&vm.globals, "copy", 4, krb_obj((Obj *)krb_new_native(native_copy, "copy")), false);
    krb_table_set(&vm.globals, "copyKey", 7, krb_obj((Obj *)krb_new_native(native_copy_key, "copyKey")), false);

    ObjTable *stdTbl = krb_new_table();
    table_set_val(stdTbl, "Math", krb_obj((Obj *)mathTbl));
    table_set_val(stdTbl, "String", krb_obj((Obj *)strTbl));
    table_set_val(stdTbl, "Time", krb_obj((Obj *)timeTbl));
    table_set_val(stdTbl, "IO", krb_obj((Obj *)ioTbl));
    krb_table_set(&vm.globals, "Std", 3, krb_obj((Obj *)stdTbl), false);

    ObjTable *stdeTbl = krb_new_table();
    table_set_val(stdeTbl, "Json", krb_obj((Obj *)jsonTbl));
    table_set_val(stdeTbl, "Random", krb_obj((Obj *)randTbl));
    table_set_val(stdeTbl, "Path", krb_obj((Obj *)pathTbl));
    table_set_val(stdeTbl, "Process", krb_obj((Obj *)procTbl));
    table_set_val(stdeTbl, "Term", krb_obj((Obj *)termTbl));
    krb_table_set(&vm.globals, "StdE", 4, krb_obj((Obj *)stdeTbl), false);
}
