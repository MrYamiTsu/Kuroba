const { printErr } = require('./errors');

// ============================================================================
// 1. KEYWORDS & SYMBOL DEFINITIONS
// ============================================================================

const KEYWORDS = {
    'TRUE':   { type: 'BOOL',  value: true },
    'FALSE':  { type: 'BOOL',  value: false },
    'paste':  { type: 'PASTE', value: 'paste' },
    'ivar':   { type: 'IVAR',  value: 'ivar' },
    'iconst': { type: 'ICONST',  value: 'iconst' },
    'if':     { type: 'IF',    value: 'if' },
    'then':   { type: 'THEN',  value: 'then' },
    'elif':   { type: 'ELIF',  value: 'elif' },
    'else':   { type: 'ELSE',  value: 'else' },
    'end':    { type: 'END',   value: 'end' },
    'given':  { type: 'GIVEN', value: 'given' },
    'case':   { type: 'CASE',  value: 'case' },
    'break':  { type: 'BREAK', value: 'break' },
};

const SYMBOLS = {
    ';': 'SEMICOLON',
    '+': 'PLUS',
    '-': 'MINUS',
    '*': 'MULT',
    '/': 'DIVIDE',
    '(': 'LPAREN',
    ')': 'RPAREN',
    ':': 'COLON',
};

// ============================================================================
// 2. TOKENIZER MAIN LOOP
// ============================================================================

function tokenize(input) {
    let tokens = [];
    let cursor = 0;
    let line = 1;
    let col = 1;

    const isDigit = (c) => c >= '0' && c <= '9';
    const isLetter = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');

    while (cursor < input.length) {
        let char = input[cursor];

        // --------------------------------------------------------------------
        // Whitespace & Line tracking
        // --------------------------------------------------------------------
        if (char === ' ') {
            cursor++;
            col++;
            continue;
        }
        if (char === '\n') {
            cursor++;
            line++;
            col = 1;
            continue;
        }
        if (char === '\r') {
            cursor++;
            continue;
        }

        // --------------------------------------------------------------------
        // Comments & Tildes
        // --------------------------------------------------------------------
        if (char === '~') {
            if (input[cursor + 1] === '~') {
                while (cursor < input.length && input[cursor] !== '\n') {
                    cursor++;
                }
                continue;
            }
            tokens.push({ type: 'TILDE', value: '~', line, col });
            cursor++;
            col++;
            continue;
        }

        // --------------------------------------------------------------------
        // String Literals
        // --------------------------------------------------------------------
        if (char === '"') {
            let startLine = line;
            let startCol = col;
            cursor++;
            col++;
            let str = '';

            while (cursor < input.length && input[cursor] !== '"') {
                if (input[cursor] === '\n') {
                    line++;
                    col = 1;
                } else {
                    col++;
                }
                str += input[cursor];
                cursor++;
            }

            if (cursor >= input.length || input[cursor] !== '"') {
                printErr(`[SyntaxError: Line ${startLine}, Col ${startCol}] Unterminated string literal. Expected closing quote '"'.`);
            }

            cursor++;
            col++;
            tokens.push({ type: 'STRING', value: str, line: startLine, col: startCol });
            continue;
        }

        // --------------------------------------------------------------------
        // Numeric Literals
        // --------------------------------------------------------------------
        if (isDigit(char)) {
            let startLine = line;
            let startCol = col;
            let numStr = '';

            while (cursor < input.length && isDigit(input[cursor])) {
                numStr += input[cursor];
                cursor++;
                col++;
            }

            tokens.push({ type: 'NUMBER', value: Number(numStr), line: startLine, col: startCol });
            continue;
        }

        // --------------------------------------------------------------------
        // Identifiers & Keywords
        // --------------------------------------------------------------------
        if (isLetter(char)) {
            let startLine = line;
            let startCol = col;
            let word = '';

            while (cursor < input.length && isLetter(input[cursor])) {
                word += input[cursor];
                cursor++;
                col++;
            }

            let kw = KEYWORDS[word];
            if (kw) {
                tokens.push({ type: kw.type, value: kw.value, line: startLine, col: startCol });
            } else {
                tokens.push({ type: 'IDENTIFIER', value: word, line: startLine, col: startCol });
            }
            continue;
        }

        // --------------------------------------------------------------------
        // Operators & Punctuation
        // --------------------------------------------------------------------
        if (char === '=') {
            if (input[cursor + 1] === '=') {
                tokens.push({ type: 'EQUALS', value: '==', line, col });
                cursor += 2;
                col += 2;
            } else {
                tokens.push({ type: 'ASSIGN', value: '=', line, col });
                cursor++;
                col++;
            }
            continue;
        }

        if (char === '&') {
            if (input[cursor + 1] === '&') {
                tokens.push({ type: 'AND', value: '&&', line, col });
                cursor += 2;
                col += 2;
                continue;
            }
            printErr(`[SyntaxError: Line ${line}, Col ${col}] Unexpected single '&'. Did you mean '&&'?`);
        }

        if (char === '|') {
            if (input[cursor + 1] === '|') {
                tokens.push({ type: 'OR', value: '||', line, col });
                cursor += 2;
                col += 2;
                continue;
            }
            printErr(`[SyntaxError: Line ${line}, Col ${col}] Unexpected single '|'. Did you mean '||'?`);
        }

        if (char === '!') {
            if (input[cursor + 1] === '=') {
                tokens.push({ type: 'NOTEQUALS', value: '!=', line, col });
                cursor += 2;
                col += 2;
            } else {
                tokens.push({ type: 'NOT', value: '!', line, col });
                cursor++;
                col++;
            }
            continue;
        }

        if (SYMBOLS[char]) {
            tokens.push({ type: SYMBOLS[char], value: char, line, col });
            cursor++;
            col++;
            continue;
        }

        printErr(`[SyntaxError: Line ${line}, Col ${col}] Unexpected character '${char}'.`);
    }

    return tokens;
}

module.exports = { tokenize };
