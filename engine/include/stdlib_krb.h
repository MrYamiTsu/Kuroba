#ifndef KUROBA_STDLIB_H
#define KUROBA_STDLIB_H

#include "vm.h"

/**
 * Initializes and registers the Kuroba standard library (Std, Math, File, OS, etc.)
 * into the VM's global scope.
 */
void krb_init_stdlib(void);

#endif // KUROBA_STDLIB_H
