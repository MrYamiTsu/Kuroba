#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define WASM_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define WASM_EXPORT
#endif

#include "../engine/include/vm.h"
#include "../engine/include/stdlib_krb.h"

static bool wasm_vm_initialized = false;

WASM_EXPORT
int krb_wasm_init(void)
{
    if (!wasm_vm_initialized)
    {
        krb_init_vm();
        krb_init_stdlib();
        wasm_vm_initialized = true;
    }
    return 0;
}

WASM_EXPORT
int krb_wasm_run(const char *source)
{
    if (!wasm_vm_initialized)
    {
        krb_wasm_init();
    }
    InterpretResult result = krb_interpret_source(source);
    fflush(stdout);
    fflush(stderr);
    return (int)result;
}

WASM_EXPORT
void krb_wasm_reset(void)
{
    if (wasm_vm_initialized)
    {
        krb_free_vm();
        wasm_vm_initialized = false;
    }
    krb_wasm_init();
}
