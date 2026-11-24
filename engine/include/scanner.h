#ifndef KUROBA_SCANNER_H
#define KUROBA_SCANNER_H

#include <stdbool.h>

/**
 * Token types recognized by the Kuroba lexical scanner.
 */
typedef enum {
    // Punctuation & Delimiters
    TOKEN_LEFT_PAREN, TOKEN_RIGHT_PAREN,     // ( )
    TOKEN_LEFT_BRACE, TOKEN_RIGHT_BRACE,     // { }
    TOKEN_LEFT_BRACKET, TOKEN_RIGHT_BRACKET, // [ ]
    TOKEN_COMMA, TOKEN_DOT, TOKEN_SEMICOLON, // , . ;
    TOKEN_COLON,                             // :
    TOKEN_TILDE,                             // ~

    // Operators
    TOKEN_PLUS, TOKEN_MINUS,                 // + -
    TOKEN_STAR, TOKEN_SLASH, TOKEN_PERCENT,  // * / %
    TOKEN_PLUS_PLUS, TOKEN_MINUS_MINUS,      // ++ --
    TOKEN_PLUS_EQUAL, TOKEN_MINUS_EQUAL,     // += -=
    TOKEN_STAR_EQUAL, TOKEN_SLASH_EQUAL,     // *= /=
    TOKEN_PERCENT_EQUAL,                     // %=
    TOKEN_AND_AND, TOKEN_OR_OR,              // && ||
    TOKEN_BANG, TOKEN_BANG_EQUAL,            // ! !=
    TOKEN_EQUAL, TOKEN_EQUAL_EQUAL,          // = ==
    TOKEN_GREATER, TOKEN_GREATER_EQUAL,      // > >=
    TOKEN_LESS, TOKEN_LESS_EQUAL,            // < <=
    TOKEN_SWAP,                              // <-> (Atomic Swap)

    // Literals
    TOKEN_IDENTIFIER,
    TOKEN_STRING,
    TOKEN_NUMBER,

    // Keywords
    TOKEN_IVAR, TOKEN_ICONST, TOKEN_ISEALED,
    TOKEN_IF, TOKEN_ELIF, TOKEN_ELSE,
    TOKEN_THEN, TOKEN_END,
    TOKEN_GIVEN, TOKEN_CASE,
    TOKEN_FOR, TOKEN_IN, TOKEN_WHILE, TOKEN_DO,
    TOKEN_BREAK, TOKEN_SKIP,
    TOKEN_FUNCTION, TOKEN_RETURN, TOKEN_HOOK,
    TOKEN_CLASS, TOKEN_INTERFACE, TOKEN_AS, TOKEN_FROM,
    TOKEN_PUBLIC, TOKEN_PROTECTED, TOKEN_PRIVATE,
    TOKEN_ISOLATED, TOKEN_EXCLUSIVE,
    TOKEN_GET, TOKEN_SET, TOKEN_SHARED,
    TOKEN_ENUM, TOKEN_NAMESPACE, TOKEN_IMPORT, TOKEN_ALIAS,
    TOKEN_PASTE, TOKEN_PASTELN,
    TOKEN_THIS, TOKEN_ORIG, TOKEN_BASE,
    TOKEN_IS,
    TOKEN_TRUE, TOKEN_FALSE, TOKEN_NULL,
    TOKEN_TRY, TOKEN_CATCH, TOKEN_FINALLY, TOKEN_THROW,
    TOKEN_KILL, TOKEN_UNLOCK, TOKEN_LOCK,
    TOKEN_INTERPOLATION,

    // Control & Diagnostics
    TOKEN_ERROR,
    TOKEN_EOF
} TokenType;

/**
 * Token representation in C (Zero-Allocation strategy):
 * Instead of allocating a string via malloc(), 'start' points directly
 * into the source code buffer, along with its 'length'.
 */
typedef struct {
    TokenType type;
    const char* start; // Direct pointer into source buffer
    int length;        // Length of token in bytes
    int line;          // 1-based source line number
    int col;           // 1-based source column number
} Token;

// Scanner interface functions
void krb_init_scanner(const char* source);
Token krb_scan_token(void);
Token krb_peek_token(void);
bool krb_is_swap_ahead(void);
void* krb_save_scanner_state(void);
void krb_restore_scanner_state(void* state);
void krb_free_scanner_state(void* state);

#endif // KUROBA_SCANNER_H
