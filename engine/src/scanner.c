#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/scanner.h"

typedef struct
{
    const char *start;
    const char *current;
    int line;
    int col;
} Scanner;

static Scanner scanner;

void krb_init_scanner(const char *source)
{
    if ((unsigned char)source[0] == 0xEF &&
        (unsigned char)source[1] == 0xBB &&
        (unsigned char)source[2] == 0xBF)
    {
        source += 3;
    }

    scanner.start = source;
    scanner.current = source;
    scanner.line = 1;
    scanner.col = 1;
}

static bool is_at_end(void)
{
    return *scanner.current == '\0';
}

static char advance(void)
{
    scanner.current++;
    scanner.col++;
    return scanner.current[-1];
}

static char peek(void)
{
    return *scanner.current;
}

static char peek_next(void)
{
    if (is_at_end())
        return '\0';
    return scanner.current[1];
}

static bool match(char expected)
{
    if (is_at_end())
        return false;
    if (*scanner.current != expected)
        return false;
    scanner.current++;
    scanner.col++;
    return true;
}

static Token make_token(TokenType type)
{
    Token token;
    token.type = type;
    token.start = scanner.start;
    token.length = (int)(scanner.current - scanner.start);
    token.line = scanner.line;
    token.col = scanner.col - token.length;
    return token;
}

static Token error_token(const char *message)
{
    Token token;
    token.type = TOKEN_ERROR;
    token.start = message;
    token.length = (int)strlen(message);
    token.line = scanner.line;
    token.col = scanner.col;
    return token;
}

static void skip_whitespace_and_comments(void)
{
    for (;;)
    {
        char c = peek();
        switch (c)
        {
        case ' ':
        case '\r':
        case '\t':
            advance();
            break;
        case '\n':
            scanner.line++;
            scanner.col = 1;
            scanner.current++;
            break;
        case '~':
            if (peek_next() == '~')
            {
                if (scanner.current[2] == '{' && scanner.current[3] == '{')
                {
                    advance();
                    advance();
                    advance();
                    advance();
                    while (!is_at_end())
                    {
                        if (peek() == '}' && peek_next() == '}')
                        {
                            advance();
                            advance();
                            break;
                        }
                        if (peek() == '\n')
                        {
                            scanner.line++;
                            scanner.col = 1;
                            scanner.current++;
                        }
                        else
                        {
                            advance();
                        }
                    }
                }
                else
                {
                    while (peek() != '\n' && !is_at_end())
                    {
                        advance();
                    }
                }
            }
            else
            {
                return;
            }
            break;
        default:
            return;
        }
    }
}

static bool is_digit(char c)
{
    return c >= '0' && c <= '9';
}

static bool is_alpha(char c)
{
    return (c >= 'a' && c <= 'z') ||
           (c >= 'A' && c <= 'Z') ||
           c == '_' ||
           ((unsigned char)c >= 0x80);
}

static Token string(void)
{
    while (peek() != '"' && !is_at_end())
    {
        if (peek() == '\n')
        {
            scanner.line++;
            scanner.col = 1;
        }
        if (peek() == '\\' && peek_next() != '\0')
        {
            advance();
        }
        advance();
    }

    if (is_at_end())
        return error_token("Chaine de caracteres non fermee.");

    advance();
    return make_token(TOKEN_STRING);
}

static Token interpolated_string(void)
{
    while (!is_at_end())
    {
        if (peek() == '"' && scanner.current[-1] != '\\')
            break;
        if (peek() == '\n')
        {
            scanner.line++;
            scanner.col = 1;
        }
        advance();
    }
    if (is_at_end())
        return error_token("Chaine interpolee non terminee.");
    advance();
    return make_token(TOKEN_INTERPOLATION);
}

static Token number(void)
{
    while (is_digit(peek()))
        advance();

    if (peek() == '.' && is_digit(peek_next()))
    {
        advance();
        while (is_digit(peek()))
            advance();
    }

    return make_token(TOKEN_NUMBER);
}

static TokenType check_keyword(int start, int length, const char *rest, TokenType type)
{
    if (scanner.current - scanner.start == start + length &&
        memcmp(scanner.start + start, rest, length) == 0)
    {
        return type;
    }
    return TOKEN_IDENTIFIER;
}

static TokenType identifier_type(void)
{
    switch (scanner.start[0])
    {
    case 'a':
        if (scanner.current - scanner.start > 1)
        {
            switch (scanner.start[1])
            {
            case 's':
                return check_keyword(2, 0, "", TOKEN_AS);
            case 'l':
                return check_keyword(2, 3, "ias", TOKEN_ALIAS);
            }
        }
        break;
    case 'b':
        if (scanner.current - scanner.start > 1)
        {
            switch (scanner.start[1])
            {
            case 'r':
                return check_keyword(2, 3, "eak", TOKEN_BREAK);
            case 'a':
                return check_keyword(2, 2, "se", TOKEN_BASE);
            }
        }
        break;
    case 'c':
        if (scanner.current - scanner.start > 1)
        {
            switch (scanner.start[1])
            {
            case 'a':
                if (scanner.current - scanner.start > 2)
                {
                    switch (scanner.start[2])
                    {
                    case 's':
                        return check_keyword(3, 1, "e", TOKEN_CASE);
                    case 't':
                        return check_keyword(3, 2, "ch", TOKEN_CATCH);
                    }
                }
                break;
            case 'l':
                return check_keyword(2, 3, "ass", TOKEN_CLASS);
            }
        }
        break;
    case 'd':
        return check_keyword(1, 1, "o", TOKEN_DO);
    case 'e':
        if (scanner.current - scanner.start > 1)
        {
            switch (scanner.start[1])
            {
            case 'l':
                if (scanner.current - scanner.start > 2)
                {
                    switch (scanner.start[2])
                    {
                    case 'i':
                        return check_keyword(3, 1, "f", TOKEN_ELIF);
                    case 's':
                        return check_keyword(3, 1, "e", TOKEN_ELSE);
                    }
                }
                break;
            case 'n':
                if (scanner.current - scanner.start > 2)
                {
                    switch (scanner.start[2])
                    {
                    case 'd':
                        return check_keyword(3, 0, "", TOKEN_END);
                    case 'u':
                        return check_keyword(3, 1, "m", TOKEN_ENUM);
                    }
                }
                break;
            case 'x':
                return check_keyword(2, 7, "clusive", TOKEN_EXCLUSIVE);
            }
        }
        break;
    case 'f':
        if (scanner.current - scanner.start > 1)
        {
            switch (scanner.start[1])
            {
            case 'i':
                return check_keyword(2, 5, "nally", TOKEN_FINALLY);
            case 'o':
                return check_keyword(2, 1, "r", TOKEN_FOR);
            case 'r':
                return check_keyword(2, 2, "om", TOKEN_FROM);
            case 'u':
                return check_keyword(2, 6, "nction", TOKEN_FUNCTION);
            }
        }
        break;
    case 'g':
        if (scanner.current - scanner.start > 1)
        {
            switch (scanner.start[1])
            {
            case 'e':
                return check_keyword(2, 1, "t", TOKEN_GET);
            case 'i':
                return check_keyword(2, 3, "ven", TOKEN_GIVEN);
            }
        }
        break;
    case 'h':
        return check_keyword(1, 3, "ook", TOKEN_HOOK);
    case 'i':
        if (scanner.current - scanner.start > 1)
        {
            switch (scanner.start[1])
            {
            case 'f':
                return check_keyword(2, 0, "", TOKEN_IF);
            case 'n':
                if (scanner.current - scanner.start == 2)
                    return TOKEN_IN;
                return check_keyword(2, 7, "terface", TOKEN_INTERFACE);
            case 's':
                if (scanner.current - scanner.start == 2)
                    return TOKEN_IS;
                if (scanner.current - scanner.start == 7)
                    return check_keyword(2, 5, "ealed", TOKEN_ISEALED);
                return check_keyword(2, 6, "olated", TOKEN_ISOLATED);
            case 'm':
                return check_keyword(2, 4, "port", TOKEN_IMPORT);
            case 'v':
                return check_keyword(2, 2, "ar", TOKEN_IVAR);
            case 'c':
                return check_keyword(2, 4, "onst", TOKEN_ICONST);
            }
        }
        break;
    case 'k':
        return check_keyword(1, 3, "ill", TOKEN_KILL);
    case 'l':
        return check_keyword(1, 3, "ock", TOKEN_LOCK);
    case 'n':
        return check_keyword(1, 8, "amespace", TOKEN_NAMESPACE);
    case 'o':
        return check_keyword(1, 3, "rig", TOKEN_ORIG);
    case 'p':
        if (scanner.current - scanner.start > 1)
        {
            switch (scanner.start[1])
            {
            case 'a':
                if (scanner.current - scanner.start == 5)
                    return check_keyword(2, 3, "ste", TOKEN_PASTE);
                if (scanner.current - scanner.start == 7)
                    return check_keyword(2, 5, "steLn", TOKEN_PASTELN);
                break;
            case 'u':
                return check_keyword(2, 4, "blic", TOKEN_PUBLIC);
            case 'r':
                if (scanner.current - scanner.start > 2)
                {
                    switch (scanner.start[2])
                    {
                    case 'i':
                        return check_keyword(3, 4, "vate", TOKEN_PRIVATE);
                    case 'o':
                        return check_keyword(3, 6, "tected", TOKEN_PROTECTED);
                    }
                }
                break;
            }
        }
        break;
    case 'r':
        return check_keyword(1, 5, "eturn", TOKEN_RETURN);
    case 's':
        if (scanner.current - scanner.start > 1)
        {
            switch (scanner.start[1])
            {
            case 'e':
                return check_keyword(2, 1, "t", TOKEN_SET);
            case 'k':
                return check_keyword(2, 2, "ip", TOKEN_SKIP);
            case 'h':
                return check_keyword(2, 4, "ared", TOKEN_SHARED);
            }
        }
        break;
    case 't':
        if (scanner.current - scanner.start > 1)
        {
            switch (scanner.start[1])
            {
            case 'h':
                if (scanner.current - scanner.start > 2)
                {
                    switch (scanner.start[2])
                    {
                    case 'e':
                        return check_keyword(3, 1, "n", TOKEN_THEN);
                    case 'i':
                        return check_keyword(3, 1, "s", TOKEN_THIS);
                    case 'r':
                        return check_keyword(3, 2, "ow", TOKEN_THROW);
                    }
                }
                break;
            case 'r':
                return check_keyword(2, 1, "y", TOKEN_TRY);
            }
        }
        break;
    case 'u':
        return check_keyword(1, 5, "nlock", TOKEN_UNLOCK);
    case 'w':
        return check_keyword(1, 4, "hile", TOKEN_WHILE);
    case 'F':
        return check_keyword(1, 4, "ALSE", TOKEN_FALSE);
    case 'T':
        return check_keyword(1, 3, "RUE", TOKEN_TRUE);
    case 'N':
        return check_keyword(1, 3, "ULL", TOKEN_NULL);
    }

    return TOKEN_IDENTIFIER;
}

static Token identifier(void)
{
    while (is_alpha(peek()) || is_digit(peek()))
        advance();
    return make_token(identifier_type());
}

Token krb_scan_token(void)
{
    skip_whitespace_and_comments();
    scanner.start = scanner.current;

    if (is_at_end())
        return make_token(TOKEN_EOF);

    char c = advance();

    if (is_alpha(c))
        return identifier();
    if (is_digit(c))
        return number();

    switch (c)
    {
    case '(':
        return make_token(TOKEN_LEFT_PAREN);
    case ')':
        return make_token(TOKEN_RIGHT_PAREN);
    case '{':
        return make_token(TOKEN_LEFT_BRACE);
    case '}':
        return make_token(TOKEN_RIGHT_BRACE);
    case '[':
        return make_token(TOKEN_LEFT_BRACKET);
    case ']':
        return make_token(TOKEN_RIGHT_BRACKET);
    case ';':
        return make_token(TOKEN_SEMICOLON);
    case ':':
        return make_token(TOKEN_COLON);
    case ',':
        return make_token(TOKEN_COMMA);
    case '.':
        return make_token(TOKEN_DOT);
    case '~':
        if (peek() == '"')
        {
            advance();
            return interpolated_string();
        }
        return make_token(TOKEN_TILDE);
    case '+':
        if (match('+'))
            return make_token(TOKEN_PLUS_PLUS);
        if (match('='))
            return make_token(TOKEN_PLUS_EQUAL);
        return make_token(TOKEN_PLUS);
    case '-':
        if (match('-'))
            return make_token(TOKEN_MINUS_MINUS);
        if (match('='))
            return make_token(TOKEN_MINUS_EQUAL);
        return make_token(TOKEN_MINUS);
    case '*':
        if (match('='))
            return make_token(TOKEN_STAR_EQUAL);
        return make_token(TOKEN_STAR);
    case '/':
        if (match('='))
            return make_token(TOKEN_SLASH_EQUAL);
        return make_token(TOKEN_SLASH);
    case '%':
        if (match('='))
            return make_token(TOKEN_PERCENT_EQUAL);
        return make_token(TOKEN_PERCENT);
    case '&':
        if (match('&'))
            return make_token(TOKEN_AND_AND);
        return error_token("Symbole '&' seul inattendu. Voulez-vous dire '&&' ?");
    case '|':
        if (match('|'))
            return make_token(TOKEN_OR_OR);
        return error_token("Symbole '|' seul inattendu. Voulez-vous dire '||' ?");
    case '!':
        return make_token(match('=') ? TOKEN_BANG_EQUAL : TOKEN_BANG);
    case '=':
        return make_token(match('=') ? TOKEN_EQUAL_EQUAL : TOKEN_EQUAL);
    case '<':
        if (peek() == '-' && peek_next() == '>')
        {
            advance();
            advance();
            return make_token(TOKEN_SWAP);
        }
        return make_token(match('=') ? TOKEN_LESS_EQUAL : TOKEN_LESS);
    case '>':
        return make_token(match('=') ? TOKEN_GREATER_EQUAL : TOKEN_GREATER);
    case '"':
        return string();
    }

    return error_token("Caractere inattendu.");
}

Token krb_peek_token(void)
{
    Scanner saved = scanner;
    Token tok = krb_scan_token();
    scanner = saved;
    return tok;
}

bool krb_is_swap_ahead(void)
{
    const char *p = scanner.current;
    while (*p != '\0' && *p != ';' && *p != '\n')
    {
        if (*p == '(')
            return false;
        if (*p == '"')
        {
            p++;
            while (*p != '\0' && *p != '"' && *p != '\n')
            {
                if (*p == '\\' && p[1] != '\0')
                    p += 2;
                else
                    p++;
            }
            if (*p == '"')
                p++;
            continue;
        }
        if (p[0] == '<' && p[1] == '-' && p[2] == '>')
        {
            return true;
        }
        p++;
    }
    return false;
}

void *krb_save_scanner_state(void)
{
    Scanner *s = (Scanner *)malloc(sizeof(Scanner));
    *s = scanner;
    return s;
}

void krb_restore_scanner_state(void *state)
{
    if (state != NULL)
    {
        scanner = *(Scanner *)state;
    }
}

void krb_free_scanner_state(void *state)
{
    if (state != NULL)
    {
        free(state);
    }
}
