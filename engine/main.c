/**
 * Kuroba (KRB) Native Engine — Phase 9 (v1.1.0)
 * ============================================
 * MOTEUR C NATIF COMPLET (FULL KUROBA VM)
 */

#define _CRT_SECURE_NO_WARNINGS
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "include/vm.h"
#include "include/scanner.h"

static char *read_file_from_disk(const char *path)
{
    FILE *file = fopen(path, "rb");
    if (file == NULL)
    {
        fprintf(stderr, "Impossible d'ouvrir le fichier \"%s\".\n", path);
        return NULL;
    }

    fseek(file, 0L, SEEK_END);
    size_t fileSize = ftell(file);
    rewind(file);

    char *buffer = (char *)malloc(fileSize + 1);
    if (buffer == NULL)
    {
        fprintf(stderr, "Pas assez de memoire pour lire \"%s\".\n", path);
        fclose(file);
        return NULL;
    }

    size_t bytesRead = fread(buffer, sizeof(char), fileSize, file);
    buffer[bytesRead] = '\0';

    fclose(file);
    return buffer;
}

static int get_unclosed_depth(const char *src)
{
    krb_init_scanner(src);
    int depth = 0;
    for (;;)
    {
        Token t = krb_scan_token();
        if (t.type == TOKEN_EOF)
            break;
        if (t.type == TOKEN_THEN || t.type == TOKEN_DO)
            depth++;
        else if (t.type == TOKEN_END)
            depth--;
        else if (t.type == TOKEN_LEFT_PAREN)
            depth++;
        else if (t.type == TOKEN_RIGHT_PAREN)
            depth--;
        else if (t.type == TOKEN_LEFT_BRACKET)
            depth++;
        else if (t.type == TOKEN_RIGHT_BRACKET)
            depth--;
        else if (t.type == TOKEN_LEFT_BRACE)
            depth++;
        else if (t.type == TOKEN_RIGHT_BRACE)
            depth--;
    }
    return depth > 0 ? depth : 0;
}

static void repl(void)
{
    printf("\x1b[36m   _  ___   _ ____   ___  ____    _    \x1b[0m\n");
    printf("\x1b[36m  | |/ / | | |  _ \\ / _ \\| __ )  / \\   \x1b[0m\n");
    printf("\x1b[36m  | ' /| | | | |_) | | | |  _ \\ / _ \\  \x1b[0m\n");
    printf("\x1b[36m  | . \\| |_| |  _ <| |_| | |_) / ___ \\ \x1b[0m\n");
    printf("\x1b[36m  |_|\\_\\\\___/|_| \\_\\\\___/|____/_/   \\_\\  \x1b[33mv1.1.0 Interactive Shell\x1b[0m\n");
    printf("\x1b[90m  Type 'exit()' or press Ctrl+C to quit, 'clear()' to clear screen.\x1b[0m\n");

    krb_init_vm();
    char line[2048];
    char buffer[32768];
    buffer[0] = '\0';

    for (;;)
    {
        if (buffer[0] == '\0')
        {
            printf("\x1b[32m>>> \x1b[0m");
        }
        else
        {
            printf("\x1b[33m... \x1b[0m");
        }
        fflush(stdout);

        if (!fgets(line, sizeof(line), stdin))
        {
            printf("\n");
            break;
        }

        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r'))
        {
            line[--len] = '\0';
        }

        char *p = line;
        while (*p == ' ' || *p == '\t')
            p++;

        if (strcmp(p, "exit()") == 0 || strcmp(p, "exit") == 0)
        {
            break;
        }
        if (strcmp(p, "clear()") == 0 || strcmp(p, "clear") == 0)
        {
            system("cls");
            buffer[0] = '\0';
            continue;
        }

        if (buffer[0] != '\0')
        {
            strcat(buffer, "\n");
        }
        strcat(buffer, line);

        if (get_unclosed_depth(buffer) <= 0)
        {
            krb_interpret_source(buffer);
            buffer[0] = '\0';
        }
    }

    krb_free_vm();
}

int main(int argc, char *argv[])
{
    if (argc >= 2)
    {
        if (strcmp(argv[1], "-v") == 0 || strcmp(argv[1], "--version") == 0)
        {
            printf("Kuroba (KRB) v1.1.0 (Native C Engine)\n");
            return 0;
        }
        if (strcmp(argv[1], "-h") == 0 || strcmp(argv[1], "--help") == 0)
        {
            printf("Usage:\n");
            printf("  kuroba [options] [file.krb] [args...]\n\n");
            printf("Options:\n");
            printf("  (no args)                  Start the interactive REPL shell\n");
            printf("  <file.krb>                 Execute the specified script\n");
            printf("  -v, --version              Show language version\n");
            printf("  -h, --help                 Show this help message\n");
            return 0;
        }

        krb_init_vm();
        char *source = read_file_from_disk(argv[1]);
        if (source != NULL)
        {
            krb_interpret_source(source);
            free(source);
        }
        krb_free_vm();
        return 0;
    }

    repl();
    return 0;
}
