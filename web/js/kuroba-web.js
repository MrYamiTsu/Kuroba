/**
 * Kuroba (黒羽) — In-Browser Runtime Engine v1.0.5
 * Zero External Dependencies • Pure Vanilla JavaScript
 */
(function(global) {
    'use strict';

    // Embedded Standard Library Files
    const VIRTUAL_STD_FILES = {
  "io.krb": "~~ ============================================================================\n~~ Kuroba Std Library: IO\n~~ ============================================================================\nnamespace Std ~IO then\n    iconst fileCopy    = __native_ioCopy;\n    iconst filePaste   = __native_ioPaste;\n    iconst filePasteLn = __native_ioPasteLn;\n    iconst fileAppend  = __native_ioAppend;\n    iconst fileExists  = __native_ioExists;\n    iconst fileKill    = __native_ioKill;\nend",
  "math.krb": "~~ ============================================================================\n~~ Kuroba Std Library: Math\n~~ ============================================================================\nnamespace Std ~Math then\n    iconst PI  = 3.141592653589793;\n    iconst TAU = 6.283185307179586;\n    iconst E   = 2.718281828459045;\n\n    iconst random = __native_random;\n    iconst sqrt   = __native_sqrt;\n    iconst pow    = __native_pow;\n    iconst sin    = __native_sin;\n    iconst cos    = __native_cos;\n    iconst tan    = __native_tan;\n    iconst asin   = __native_asin;\n    iconst acos   = __native_acos;\n    iconst atan   = __native_atan;\n    iconst atan2  = __native_atan2;\n    iconst log    = __native_log;\n    iconst log10  = __native_log10;\n    iconst exp    = __native_exp;\n\n    function randomItem(ivar list) then\n        if (list.count() == 0) then\n            return NULL;\n        end\n        ivar idx = random(0, list.count() - 1);\n        return list[idx];\n    end\n\n    function abs(ivar x) then\n        if (x < 0) then\n            return 0 - x;\n        end\n        return x;\n    end\n\n    function min(ivar a, ivar b) then\n        if (a < b) then\n            return a;\n        end\n        return b;\n    end\n\n    function max(ivar a, ivar b) then\n        if (a > b) then\n            return a;\n        end\n        return b;\n    end\n\n    function clamp(ivar val, ivar minVal, ivar maxVal) then\n        if (val < minVal) then\n            return minVal;\n        end\n        if (val > maxVal) then\n            return maxVal;\n        end\n        return val;\n    end\n\n    function trunc(ivar x) then\n        ivar i = 0;\n        i~Int = x;\n        return i;\n    end\n\n    function floor(ivar x) then\n        ivar i = 0;\n        i~Int = x;\n        if (x < 0 && x != i) then\n            return i - 1;\n        end\n        return i;\n    end\n\n    function ceil(ivar x) then\n        ivar i = 0;\n        i~Int = x;\n        if (x > 0 && x != i) then\n            return i + 1;\n        end\n        return i;\n    end\n\n    function round(ivar x) then\n        return floor(x + 0.5);\n    end\n\n    function dist(ivar x1, ivar y1, ivar x2, ivar y2) then\n        ivar dx = x2 - x1;\n        ivar dy = y2 - y1;\n        return sqrt((dx * dx) + (dy * dy));\n    end\n\n    function degToRad(ivar deg) then\n        return deg * (PI / 180.0);\n    end\n\n    function radToDeg(ivar rad) then\n        return rad * (180.0 / PI);\n    end\n\n    function sign(ivar x) then\n        if (x > 0) then return 1; end\n        if (x < 0) then return 0 - 1; end\n        return 0;\n    end\n\n    function lerp(ivar a, ivar b, ivar t) then\n        return a + (b - a) * t;\n    end\nend",
  "string.krb": "~~ ============================================================================\n~~ Kuroba Std Library: String\n~~ ============================================================================\nnamespace Std ~String then\n    iconst DIGITS      = \"0123456789\";\n    iconst ASCII_LOWER = \"abcdefghijklmnopqrstuvwxyz\";\n    iconst ASCII_UPPER = \"ABCDEFGHIJKLMNOPQRSTUVWXYZ\";\n\n    iconst upper      = __native_strUpper;\n    iconst lower      = __native_strLower;\n    iconst count      = __native_strCount;\n    iconst trim       = __native_strTrim;\n    iconst split      = __native_strSplit;\n    iconst replace    = __native_strReplace;\n    iconst contains   = __native_strContains;\n    iconst startsWith = __native_strStartsWith;\n    iconst endsWith   = __native_strEndsWith;\n    iconst indexOf    = __native_strIndexOf;\n    iconst slice      = __native_strSlice;\n    iconst repeat     = __native_strRepeat;\n    iconst reverse    = __native_strReverse;\n    iconst join       = __native_strJoin;\nend\n",
  "time.krb": "~~ ============================================================================\n~~ Kuroba Std Library: Time\n~~ ============================================================================\nnamespace Std ~Time then\n    iconst sleep  = __native_sleep;\n    iconst now    = __native_now;\n    iconst unix   = __native_unix;\n    iconst perf   = __native_perf;\n    iconst hires  = __native_perf;\n    iconst clock  = __native_clock;\n    iconst iso    = __native_iso;\n    iconst format = __native_timeFormat;\n\n    function sleepSec(ivar sec) then\n        sleep(sec * 1000);\n    end\n\n    function since(ivar timestamp) then\n        return now() - timestamp;\n    end\n    \n    function stopwatch() then\n        ivar start = now();\n        return {\n            elapsed: function ~() then\n                return now() - start;\n            end,\n            reset: function ~() then\n                start = now();\n                return start;\n            end\n        };\n    end\nend\n"
};
    
    // In-memory Virtual Filesystem for Std.IO in the browser
    const virtualFS = {
        'memo.txt': 'Bienvenue dans Kuroba Web Storage !\n',
        'savegame.dat': 'Héros: Kenji\nNiveau: 10\n'
    };

    // Load from localStorage if available
    try {
        const saved = localStorage.getItem('kuroba_virtual_fs');
        if (saved) Object.assign(virtualFS, JSON.parse(saved));
    } catch(e) {}

    function persistVirtualFS() {
        try {
            localStorage.setItem('kuroba_virtual_fs', JSON.stringify(virtualFS));
        } catch(e) {}
    }

    let activePrintHandler = (txt, nl) => console.log(txt);
    let activeErrorHandler = (err) => { throw new Error(err); };
    let activeClearHandler = () => {};

    function printErr(msg) {
        if (activeErrorHandler) {
            activeErrorHandler(msg);
        } else {
            console.error(msg);
        }
        throw new Error(msg);
    }

    function printException(msg) {
        if (activeErrorHandler) {
            activeErrorHandler(msg, true);
        } else {
            console.error(msg);
        }
        throw new Error(msg);
    }

    // =========================================================================
    // 1. LEXER
    // =========================================================================
    

// ============================================================================
// 1. KEYWORDS & SYMBOL DEFINITIONS
// ============================================================================

const KEYWORDS = {
  TRUE: { type: "BOOL", value: true },
  FALSE: { type: "BOOL", value: false },
  NULL: { type: "NULL", value: null },
  paste: { type: "PASTE", value: "paste" },
  pasteLn: { type: "PASTELN", value: "pasteLn" },
  copy: { type: "COPY", value: "copy" },
  copyKey: { type: "COPYKEY", value: "copyKey" },
  ivar: { type: "IVAR", value: "ivar" },
  iconst: { type: "ICONST", value: "iconst" },
  if: { type: "IF", value: "if" },
  then: { type: "THEN", value: "then" },
  elif: { type: "ELIF", value: "elif" },
  else: { type: "ELSE", value: "else" },
  end: { type: "END", value: "end" },
  for: { type: "FOR", value: "for" },
  while: { type: "WHILE", value: "while" },
  given: { type: "GIVEN", value: "given" },
  do: { type: "DO", value: "do" },
  in: { type: "IN", value: "in" },
  case: { type: "CASE", value: "case" },
  break: { type: "BREAK", value: "break" },
  skip: { type: "SKIP", value: "skip" },
  clear: { type: "CLEAR", value: "clear" },
  exit: { type: "EXIT", value: "exit" },
  kill: { type: "KILL", value: "kill" },
  throw: { type: "THROW", value: "throw" },
  function: { type: "FUNCTION", value: "function" },
  return: { type: "RETURN", value: "return" },
  hook: { type: "HOOK", value: "hook" },
  this: { type: "THIS", value: "this" },
  import: { type: "IMPORT", value: "import" },
  alias:  { type: "ALIAS",  value: "alias" },
  namespace: { type: "NAMESPACE", value: "namespace" }
};

const SYMBOLS = {
  ";": "SEMICOLON",
  "+": "PLUS",
  "-": "MINUS",
  "*": "MULT",
  "/": "DIVIDE",
  "(": "LPAREN",
  ")": "RPAREN",
  ":": "COLON",
  "%": "MODULO",
  "[": "LBRACKET",
  "]": "RBRACKET",
  ",": "COMMA",
  ".": "DOT",
  "{": "LBRACE",
  "}": "RBRACE"
};

// ============================================================================
// 2. TOKENIZER MAIN LOOP
// ============================================================================

function tokenize(input) {
  let tokens = [];
  let cursor = 0;
  let line = 1;
  let col = 1;

  const isDigit = (c) => c >= "0" && c <= "9";
  const isLetter = (c) =>
    (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  const isIdentChar = (c) => isLetter(c) || isDigit(c);

  while (cursor < input.length) {
    let char = input[cursor];

    // --------------------------------------------------------------------
    // Whitespace & Line tracking
    // --------------------------------------------------------------------
    if (char === " ") {
      cursor++;
      col++;
      continue;
    }
    if (char === "\n") {
      cursor++;
      line++;
      col = 1;
      continue;
    }
    if (char === "\r") {
      cursor++;
      continue;
    }

    // --------------------------------------------------------------------
    // Comments & Tildes
    // --------------------------------------------------------------------
    if (char === "~") {
      if (input[cursor + 1] === "~") {
        if (input[cursor + 2] === "{" && input[cursor + 3] === "{") {
          let startLine = line;
          let startCol = col;
          cursor += 4;
          col += 4;
          let closed = false;

          while (cursor < input.length) {
            if (input[cursor] === "}" && input[cursor + 1] === "}") {
              cursor += 2;
              col += 2;
              closed = true;
              break;
            }

            if (input[cursor] === "\n") {
              line++;
              col = 1;
            } else {
              col++;
            }

            cursor++;
          }

          if (!closed) {
            printErr(
              `[SyntaxError: Line ${startLine}, Col ${startCol}] Unclosed multi-line comment. Expected '}}'.`,
            );
          }

          continue;
        } else {
          while (cursor < input.length && input[cursor] !== "\n") {
            cursor++;
          }
          continue;
        }
      }
      if (input[cursor + 1] === '"') {
        let startLine = line;
        let startCol = col;
        cursor += 2;
        col += 2;
        let str = "";

        while (cursor < input.length && input[cursor] !== '"') {
          if (input[cursor] === "\\") {
            str += input[cursor] + (input[cursor + 1] || "");
            cursor += 2;
            col += 2;
            continue;
          }
          if (input[cursor] === "\n") {
            line++;
            col = 1;
          } else {
            col++;
          }
          str += input[cursor];
          cursor++;
        }

        if (cursor >= input.length || input[cursor] !== '"') {
          printErr(`[SyntaxError: Line ${startLine}, Col ${startCol}] Unterminated interpolated string literal.`);
        }

        cursor++;
        col++;

        tokens.push({
          type: "INTERPOLATEDSTRING",
          value: str,
          line: startLine,
          col: startCol,
        });
        continue;
      }
      tokens.push({ type: "TILDE", value: "~", line, col });
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
      let str = "";

      while (cursor < input.length && input[cursor] !== '"') {
        if (input[cursor] === "\n") {
          line++;
          col = 1;
        } else {
          col++;
        }
        str += input[cursor];
        cursor++;
      }

      if (cursor >= input.length || input[cursor] !== '"') {
        printErr(
          `[SyntaxError: Line ${startLine}, Col ${startCol}] Unterminated string literal. Expected closing quote '"'.`,
        );
      }

      cursor++;
      col++;
      tokens.push({
        type: "STRING",
        value: str,
        line: startLine,
        col: startCol,
      });
      continue;
    }

    // --------------------------------------------------------------------
    // Numeric Literals
    // --------------------------------------------------------------------
    if (isDigit(char)) {
      let startLine = line;
      let startCol = col;
      let numStr = "";

      while (cursor < input.length && isDigit(input[cursor])) {
        numStr += input[cursor];
        cursor++;
        col++;
      }

      if (input[cursor] === "." && isDigit(input[cursor + 1])) {
        numStr += input[cursor];
        cursor++;
        col++;

        while (cursor < input.length && isDigit(input[cursor])) {
          numStr += input[cursor];
          cursor++;
          col++;
        }
      }

      let numVal = Number(numStr);
      let numType = Number.isInteger(numVal) ? "INT" : "FLOAT";
      tokens.push({
        type: numType,
        value: numVal,
        line: startLine,
        col: startCol,
      });
      continue;
    }

    // --------------------------------------------------------------------
    // Identifiers & Keywords
    // --------------------------------------------------------------------
    if (isLetter(char)) {
      let startLine = line;
      let startCol = col;
      let word = "";

      while (cursor < input.length && isIdentChar(input[cursor])) {
        word += input[cursor];
        cursor++;
        col++;
      }

      let kw = KEYWORDS[word];
      if (kw) {
        tokens.push({
          type: kw.type,
          value: kw.value,
          line: startLine,
          col: startCol,
        });
      } else {
        tokens.push({
          type: "IDENTIFIER",
          value: word,
          line: startLine,
          col: startCol,
        });
      }
      continue;
    }

    // --------------------------------------------------------------------
    // Operators & Punctuation
    // --------------------------------------------------------------------
    if (char === "=") {
      if (input[cursor + 1] === "=") {
        tokens.push({ type: "EQUALS", value: "==", line, col });
        cursor += 2;
        col += 2;
      } else {
        tokens.push({ type: "ASSIGN", value: "=", line, col });
        cursor++;
        col++;
      }
      continue;
    }

    if (char === "&") {
      if (input[cursor + 1] === "&") {
        tokens.push({ type: "AND", value: "&&", line, col });
        cursor += 2;
        col += 2;
        continue;
      }
      printErr(
        `[SyntaxError: Line ${line}, Col ${col}] Unexpected single '&'. Did you mean '&&'?`,
      );
    }

    if (char === "|") {
      if (input[cursor + 1] === "|") {
        tokens.push({ type: "OR", value: "||", line, col });
        cursor += 2;
        col += 2;
        continue;
      }
      printErr(
        `[SyntaxError: Line ${line}, Col ${col}] Unexpected single '|'. Did you mean '||'?`,
      );
    }

    if (char === "!") {
      if (input[cursor + 1] === "=") {
        tokens.push({ type: "NOTEQUALS", value: "!=", line, col });
        cursor += 2;
        col += 2;
      } else {
        tokens.push({ type: "NOT", value: "!", line, col });
        cursor++;
        col++;
      }
      continue;
    }

    if (char === "<") {
      if (input[cursor + 1] === "-" && input[cursor + 2] === ">") {
        tokens.push({ type: "SWAP", value: "<->", line, col });
        cursor += 3;
        col += 3;
        continue;
      }
      if (input[cursor + 1] === "=") {
        tokens.push({ type: "LESSEQUAL", value: "<=", line, col });
        cursor += 2;
        col += 2;
        continue;
      }
      tokens.push({ type: "LESS", value: "<", line, col });
      cursor++;
      col++;
      continue;
    }

    if (char === ">") {
      if (input[cursor + 1] === "=") {
        tokens.push({ type: "GREATEREQUAL", value: ">=", line, col });
        cursor += 2;
        col += 2;
        continue;
      }
      tokens.push({ type: "GREATER", value: ">", line, col });
      cursor++;
      col++;
      continue;
    }

    if (char === "+" && input[cursor + 1] === "+") {
      tokens.push({ type: "INCREMENT", value: "++", line, col });
      cursor += 2;
      col += 2;
      continue;
    }

    if (char === "-" && input[cursor + 1] === "-") {
      tokens.push({ type: "DECREMENT", value: "--", line, col });
      cursor += 2;
      col += 2;
      continue;
    }

    if (
      (char === "+" ||
        char === "-" ||
        char === "*" ||
        char === "/" ||
        char === "%") &&
      input[cursor + 1] === "="
    ) {
      let opList = {
        "+": "PLUSASSIGN",
        "-": "MINUSASSIGN",
        "*": "MULTASSIGN",
        "/": "DIVIDEASSIGN",
        "%": "MODULOASSIGN",
      };
      tokens.push({ type: opList[char], value: char + "=", line, col });
      cursor += 2;
      col += 2;
      continue;
    }

    if (SYMBOLS[char]) {
      tokens.push({ type: SYMBOLS[char], value: char, line, col });
      cursor++;
      col++;
      continue;
    }

    printErr(
      `[SyntaxError: Line ${line}, Col ${col}] Unexpected character '${char}'.`,
    );
  }

  return tokens;
}




    // =========================================================================
    // 2. PARSER
    // =========================================================================
    


const OP_MAP = {
    'PLUSASSIGN': '+',
    'MINUSASSIGN': '-',
    'MULTASSIGN': '*',
    'DIVIDEASSIGN': '/',
    'MODULOASSIGN': '%'
};

function parse(tokens) {
    let cursor = 0;

    // ========================================================================
    // 1. TOKEN STREAM CURSOR & MATCHING UTILITIES
    // ========================================================================

    function formatLocation(token) {
        if (!token) return 'at end of file';
        return `Line ${token.line}, Col ${token.col}`;
    }

    function peek() {
        return tokens[cursor];
    }

    function previous() {
        return tokens[cursor - 1];
    }

    function isAtEnd() {
        return cursor >= tokens.length;
    }

    function check(type) {
        if (isAtEnd()) return false;
        return peek().type === type;
    }

    function advance() {
        if (!isAtEnd()) cursor++;
        return previous();
    }

    function match(...types) {
        for (let type of types) {
            if (check(type)) {
                advance();
                return true;
            }
        }
        return false;
    }

    function consume(type, message) {
        if (check(type)) return advance();
        let token = peek() || previous();
        printErr(`[SyntaxError: ${formatLocation(token)}] ${message}`);
    }

    function isPropertyAssignAhead() {
        let k = cursor;
        
        while (tokens[k] && tokens[k].type === 'IDENTIFIER' && tokens[k + 1] && tokens[k + 1].type === 'DOT') {
            k += 2;
        }

        return tokens[k] && tokens[k].type === 'IDENTIFIER' && tokens[k + 1] && [
            'ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN', 'INCREMENT', 'DECREMENT', 'TILDE'
        ].includes(tokens[k + 1].type);
    }

    // ========================================================================
    // 2. EXPRESSION PARSING (PRECEDENCE HIERARCHY)
    // ========================================================================

    function parsePrimary() {
        let token = peek();

        if (!token) {
            printErr("[SyntaxError: at end of file] Unexpected end of input. Expected expression.");
        }

        let expr = null;

        if (match('LBRACKET')) {
            let elements = [];

            if (!check('RBRACKET')) {
                while (true) {
                    elements.push(parseLogicOr());
                    if (!match('COMMA')) break;
                    if (check('RBRACKET')) break;
                }
            }

            consume('RBRACKET', "Expected closing ']' after list elements.");

            expr = { type: 'ListLiteral', elements };
        }
        else if (match('LBRACE')) {
            let entries = [];

            if (!check('RBRACE')) {
                while (true) {
                    let key = null;

                    if (match('IDENTIFIER', 'STRING')) {
                        key = previous().value;
                    } else {
                        printErr(`[SyntaxError: ${formatLocation(peek())}] Expected key (identifier or string) in Table literal.`);
                    }

                    let typeInfo = null;

                    if (match('TILDE')) {
                        typeInfo = parseType();
                    }

                    consume('COLON', `Expected ':' after key '${key}' in Table literal.`);

                    let value = parseLogicOr();
                    entries.push({ key, value, typeInfo });

                    if (!match('COMMA')) break;
                    if (check('RBRACE')) break;
                }
            }
            consume('RBRACE', "Expected closing '}' after Table entries.");
            expr = { type: 'TableLiteral', entries };
        }
        else if (match('COPY', 'COPYKEY')) {
            let isOneKey = (previous().type === 'COPYKEY');

            consume('LPAREN', "Expected '(' after 'copy'.");

            let prompt = null;
            if (!check('RPAREN')) {
                prompt = parseLogicOr();
            }

            consume('RPAREN', "Expected ')' after 'copy' prompt.");
            expr = { type: 'CopyExpression', prompt, oneKey: isOneKey };
        }
        else if (match('FUNCTION')) {
            expr = parseFunctionDeclaration(true);
        }
        else if (match('THIS')) {
            expr = { type: 'Variable', name: 'this' };
        }
        else if (match('IDENTIFIER')) {
            expr = { type: 'Variable', name: previous().value };
        }
        else if (match('INT', 'STRING', 'BOOL', 'FLOAT', 'NULL')) {
            return previous().value;
        }
        else if (match('INTERPOLATEDSTRING')) {
            return parseInterpolatedString(previous());
        }
        else if (match('LPAREN')) {
            let openParen = previous();
            expr = parseLogicOr();

            if (!match('RPAREN')) {
                printErr(`[SyntaxError: ${formatLocation(peek() || openParen)}] Unclosed parenthesis. Missing closing ')' to match '(' at Line ${openParen.line}, Col ${openParen.col}.`);
            }
        }
        else {
            printErr(`[SyntaxError: ${formatLocation(token)}] Unexpected token '${token.value}' of type '${token.type}'.`);
        }

        while (true) {
            if (match('LBRACKET')) {
                let index = parseLogicOr();
                consume('RBRACKET', "Expected closing ']' after index.");
                expr = { type: 'IndexAccess', target: expr, index };
            } else if (match('DOT')) {
                let memberName = consume('IDENTIFIER', "Expected property or method name after '.' (e.g. push, pop, peek, count, args).").value;
                if (match('LPAREN')) {
                    let args = [];

                    if (!check('RPAREN')) {
                        while (true) {
                            args.push(parseLogicOr());
                            if (!match('COMMA')) break;
                        }
                    }

                    consume('RPAREN', `Expected ')' after method arguments.`);
                    expr = { type: 'MethodCall', target: expr, method: memberName, args };
                } else {
                    expr = { type: 'IndexAccess', target: expr, index: memberName, isDotAccess: true };
                }
            } else if (match('LPAREN')) {
                let args = [];

                if (!check('RPAREN')) {
                    while (true) {
                        args.push(parseLogicOr());
                        if (!match('COMMA')) break;
                    }
                }

                consume('RPAREN', "Expected ')' after function arguments.");

                expr = { type: 'CallExpression', caller: expr, args };
            } else {
                break;
            }
        }

        return expr;
    }

    function parseUnary() {
        if (match('NOT', 'MINUS')) {
            let op = previous().value;
            let right = parseUnary();
            return { type: 'UnaryExpression', operator: op, right };
        }
        return parsePrimary();
    }

    function parseMult() {
        let left = parseUnary();

        while (match('MULT', 'DIVIDE', 'MODULO')) {
            let op = previous().value;
            let right = parseUnary();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    function parseAdd() {
        let left = parseMult();

        while (match('PLUS', 'MINUS')) {
            let op = previous().value;
            let right = parseMult();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    function parseComparaison() {
        let left = parseAdd();

        while (match('LESS', 'GREATER', 'LESSEQUAL', 'GREATEREQUAL')) {
            let op = previous().value;
            let right = parseAdd();
            left = { type: 'MathExpression', operator: op, left, right};
        }

        return left;
    }

    function parseEquality() {
        let left = parseComparaison();

        while (match('EQUALS', 'NOTEQUALS')) {
            let op = previous().value;
            let right = parseComparaison();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    function parseLogicAnd() {
        let left = parseEquality();

        while (match('AND')) {
            let op = previous().value;
            let right = parseEquality();
            left = { type: 'LogicalExpression', operator: op, left, right };
        }

        return left;
    }

    function parseLogicOr() {
        let left = parseLogicAnd();

        while (match('OR')) {
            let op = previous().value;
            let right = parseLogicAnd();
            left = { type: 'LogicalExpression', operator: op, left, right };
        }

        return left;
    }

    function parseCondition() {
        if (match('LPAREN')) {
            let cond = parseLogicOr();
            consume('RPAREN', "Unclosed parenthesis in condition.");
            return cond;
        } else if (check('IDENTIFIER')) {
            return { type: 'Variable', name: advance().value };
        } else if (check('NOT')) {
            return parseUnary();
        } else {
            printErr("[SyntaxError] Comparisons in conditions must be wrapped in parentheses '(...)'.");
        }
    }

    // ========================================================================
    // 3. STATEMENT PARSING & CONTROL FLOW
    // ========================================================================

    function parseIfStatement() {
        let cond = parseCondition();
        consume('THEN', "Expected 'then' after 'if' condition.");

        let thenBranch = [];
        while (!check('ELIF') && !check('ELSE') && !check('END') && !isAtEnd()) {
            thenBranch.push(parseStatement());
        }

        let elifBranches = [];
        while (match('ELIF')) {
            let elifCond = parseCondition();
            consume('THEN', "Expected 'then' after 'elif' condition.");

            let elifBody = [];
            while (!check('ELIF') && !check('ELSE') && !check('END') && !isAtEnd()) {
                elifBody.push(parseStatement());
            }
            elifBranches.push({ condition: elifCond, body: elifBody });
        }

        let elseBranch = null;
        if (match('ELSE')) {
            elseBranch = [];
            while (!check('END') && !isAtEnd()) {
                elseBranch.push(parseStatement());
            }
        }

        consume('END', "Unclosed 'if' block. Expected 'end'.");
        return {
            type: 'IfStatement',
            condition: cond,
            thenBranch,
            elifBranches,
            elseBranch
        };
    }

    function parseForStatement() {
        let startToken = previous();
        consume('LPAREN', "Expected '(' before for-loop header.");

        let isForIn = false;
        for (let i = cursor; i < tokens.length; i++) {
            if (tokens[i].type === 'SEMICOLON' || tokens[i].type === 'RPAREN') break;
            if (tokens[i].type === 'IN') {
                isForIn = true;
                break;
            }
        }

        if (isForIn) {
            let firstVar = consume('IDENTIFIER', "Expected variable name in for-in loop.").value;
            let indexVar = null;
            let itemVar = firstVar;

            if (match('COMMA')) {
                indexVar = firstVar;
                itemVar = consume('IDENTIFIER', "Expected item variable name after ',' in for-in loop.").value;
            }

            consume('IN', "Expected 'in' keyword in for-in loop.");
            let iterable = parseLogicOr();
            consume('RPAREN', "Expected ')' after for-in loop header.");
            consume('THEN', "Expected 'then' after for-in loop header.");

            let body = [];
            while (!check('END') && !isAtEnd()) {
                body.push(parseStatement());
            }
            consume('END', "Unclosed 'for' loop. Expected 'end'.");

            return {
                type: 'ForInStatement',
                indexVar,
                itemVar,
                iterable,
                body,
                line: startToken.line,
                col: startToken.col
            };
        }

        let init = null;
        if (!check('SEMICOLON')) {
            if (match('IVAR', 'ICONST')) {
                init = parseVarDeclaration();
            } else {
                init = parseAssignmentOrExpr();
            }
        }
        consume('SEMICOLON', "Expected ';' after for-loop initialization.");

        let condition = null;
        if (!check('SEMICOLON')) {
            condition = parseLogicOr();
        }
        consume('SEMICOLON', "Expected ';' after for-loop condition.");

        let update = null;
        if (!check('RPAREN')) {
            update = parseAssignmentOrExpr();
        }
        consume('RPAREN', "Expected ')' after for-loop header.");
        consume('THEN', "Expected 'then' after for-loop header.");

        let body = [];
        while (!check('END') && !isAtEnd()) {
            body.push(parseStatement());
        }
        consume('END', "Unclosed 'for' loop. Expected 'end'.");

        return {
            type: 'ForStatement',
            init,
            condition,
            update,
            body
        };
    }

    function parseAssignmentOrExpr() {
        if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'INCREMENT') {
            let varName = advance().value;
            advance();
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: '+', left: { type: 'Variable', name: varName }, right: 1 }
            };
        }
        if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'DECREMENT') {
            let varName = advance().value;
            advance();
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: '-', left: { type: 'Variable', name: varName }, right: 1 }
            };
        }
        if (check('IDENTIFIER') && tokens[cursor + 1] && ['ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN'].includes(tokens[cursor + 1].type)) {
            let varName = advance().value;
            let assignToken = advance();
            let expr = parseLogicOr();
            if (assignToken.type === 'ASSIGN') {
                return { type: 'VarAssign', name: varName, value: expr };
            }
            let opMap = {
                'PLUSASSIGN': '+',
                'MINUSASSIGN': '-',
                'MULTASSIGN': '*',
                'DIVIDEASSIGN': '/',
                'MODULOASSIGN': '%'
            };
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: opMap[assignToken.type], left: { type: 'Variable', name: varName }, right: expr }
            };
        }
        return parseLogicOr();
    }

    function parseGivenStatement() {
        let exprTarget = parseEquality();
        let cases = [];

        consume('THEN', "Expected 'then' after 'given' expression.");

        while (!check('END') && !isAtEnd()) {
            consume('CASE', "Expected 'case' in 'given' block.");
            consume('COLON', "Expected ':' after 'case'.");

            let isDefault = false;
            let caseValue = null;

            if (match('TILDE')) {
                isDefault = true;
            } else {
                caseValue = parseEquality();
            }

            let caseBody = [];
            while (!check('CASE') && !check('END') && !isAtEnd()) {
                caseBody.push(parseStatement());
            }

            cases.push({ isDefault, value: caseValue, body: caseBody });
        }

        consume('END', "Unclosed 'given' block. Expected 'end'.");
        return {
            type: 'GivenStatement',
            target: exprTarget,
            cases
        };
    }

    function parseType() {
        let isNullable = true;
        let baseType = null;
        let elemType = null;
        let isElemNullable = true;

        if (match('LPAREN')) {
            isNullable = false;
            baseType = consume('IDENTIFIER', "Expected type identifier inside '(...)'. (e.g. String, Int, List)").value;
            
            if ((baseType === 'List' || baseType === 'Stack' || baseType === 'Queue') && match('LESS')) {
                isElemNullable = false;

                if (match('LPAREN')) {
                    elemType = consume('IDENTIFIER', "Expected element type inside 'List<(...)>'.").value;
                    consume('RPAREN', "Expected closing ')' after element type.");
                } else {
                    elemType = consume('IDENTIFIER', "Expected element type inside 'List<...>'.").value;
                }

                consume('GREATER', "Expected closing '>' after List type.");
            }

            consume('RPAREN', "Expected closing ')' after non-nullable type.");
        } else {
            baseType = consume('IDENTIFIER', "Expected type identifier after '~' (e.g. String, Int, List).").value;

            if ((baseType === 'List' || baseType === 'Stack' || baseType === 'Queue') && match('LESS')) {
                if (match('LPAREN')) {
                    isElemNullable = false;
                    elemType = consume('IDENTIFIER', "Expected element type inside 'List<(...)>'.").value;
                    consume('RPAREN', "Expected closing ')' after element type.");
                } else {
                    isElemNullable = true;
                    elemType = consume('IDENTIFIER', "Expected element type inside 'List<...>'.").value;
                }

                consume('GREATER', "Expected closing '>' after List type.");
            }
        }

        return { baseType, isNullable, elemType, isElemNullable };
    }

    function parseVarDeclaration() {
        let isConst = previous().type === 'ICONST';
        let isNullable = true;
        let explType = null;

        let typeInfo = null;
        if (match('TILDE')) {
            typeInfo = parseType();
            explType = typeInfo.baseType;
            isNullable = typeInfo.isNullable;
        }

        let varName = consume('IDENTIFIER', "Expected variable name in declaration.").value;
        consume('ASSIGN', `Missing '=' assignment operator after variable name '${varName}'.`);
        let value = parseLogicOr();

        return { type: 'VarDeclar', name: varName, explType, isNullable, value, isConst, typeInfo };
    }

    function parseWhileStatement() {
        let condition = parseCondition();
        consume('THEN', "Expected 'then' after 'while' condition.");

        let body = [];
        while (!check('END') && !isAtEnd()) {
            body.push(parseStatement());
        }
        consume('END', "Unclosed 'while' loop. Expected 'end'.");
        
        return {
            type: 'WhileStatement',
            condition,
            body
        };
    }

    function parseDoWhileStatement() {
        let body = [];
        while (!check('WHILE') && !isAtEnd()) {
            body.push(parseStatement());
        }
        consume('WHILE', "Expected 'while' after 'do' loop body.");
        let condition = parseCondition();
        consume('SEMICOLON', "Expected ';' after 'do ... while' condition.")
        
        return {
            type: 'DoWhileStatement',
            condition,
            body
        };
    }

    function parseHookStatement() {
        let startToken = previous();
        
        let varName = consume('IDENTIFIER', "Expected function name or table after 'hook'.").value;
        let target = { type: 'Variable', name: varName };

        while (match('LBRACKET')) {
            let index = parseLogicOr();
            consume('RBRACKET', "Expected ']' after index in hook target.");
            target = { type: 'IndexAccess', target, index };
        }

        consume('LPAREN', "Expected '(' after hook target.");
        let params = [];

        if (!check('RPAREN')) {
            while (true) {
                consume('IVAR', "Expected 'ivar' before parameter name.");

                let typeInfo = null;
                if (match('TILDE')) {
                    typeInfo = parseType();
                }

                let paramName = consume('IDENTIFIER', "Expected parameter name.").value;
                params.push({ name: paramName, typeInfo });

                if (!match('COMMA')) break;
            }
        }

        consume('RPAREN', "Expected ')' after hook parameters.");
        consume('THEN', "Expected 'then' after hook header.");

        let body = [];
        while (!check('END') && !isAtEnd()) {
            body.push(parseStatement());
        }

        consume('END', "Unclosed hook. Expected 'end'.");

        return {
            type: 'HookStatement',
            target,
            params,
            body,
            line: startToken.line,
            col: startToken.col
        };
    }

    function parseFunctionDeclaration(isExpresion = false) {
        let startToken = previous();
        let name = null;
        let isAnonymous = false;

        if (match('TILDE')) {
            isAnonymous = true;
        } else if (check('IDENTIFIER')) {
            name = advance().value;
        } else {
            printErr(`[SyntaxError: Line ${startToken.line}, Col ${startToken.col}] Expected function name or '~' for anonymous function after 'function'.`);
        }

        consume('LPAREN', "Expected '(' after function name or '~'.");
        let params = [];

        if (!check('RPAREN')) {
            while (true) {
                consume('IVAR', "Expected 'ivar' before parameter name.");

                let typeInfo = null;
                if (match('TILDE')) {
                    typeInfo = parseType();
                }

                let paramName = consume('IDENTIFIER', "Expected parameter name.").value;
                params.push({ name: paramName, typeInfo });

                if (!match('COMMA')) break;
            }
        }

        consume('RPAREN', "Expected ')' after function parameters.");
        consume('THEN', "Expected 'then' after function header.");

        let body = [];
        while (!check('END') && !isAtEnd()) {
            body.push(parseStatement());
        }

        consume('END', "Unclosed function. Expected 'end'.");

        return {
            type: 'FunctionDeclaration',
            name,
            isAnonymous,
            params,
            body,
            line: startToken.line,
            col: startToken.col
        };
    }

    function parseInterpolatedString(token) {
        let raw = token.value;
        let parts = [];
        let i = 0;
        let textBuf = "";

        while (i < raw.length) {
            if (raw[i] === '\\' && (raw[i + 1] === '{' || raw[i + 1] === '}' || raw[i + 1] === '"')) {
                textBuf += raw[i + 1];
                i += 2;
                continue;
            }

            if (raw[i] === '{') {
                if (textBuf.length > 0) {
                    parts.push({ type: 'Literal', value: textBuf });
                    textBuf = "";
                }

                i++;
                let exprStr = "";
                let braceCount = 1;

                while (i < raw.length && braceCount > 0) {
                    if (raw[i] === '{') braceCount++;
                    else if (raw[i] === '}') braceCount--;
                    if (braceCount > 0) exprStr += raw[i];
                    i++;
                }

                if (braceCount > 0) {
                    printErr(`[SyntaxError: Line ${token.line}, Col ${token.col}] Unclosed '{' in interpolated string.`);
                }

                const innerTokens = tokenize(exprStr + ";");
                const innerAst = parse(innerTokens);

                if (innerAst.body.length > 0) {
                    parts.push(innerAst.body[0]);
                }

                continue;
            }
            textBuf += raw[i];
            i++;
        }

        if (textBuf.length > 0) {
            parts.push({ type: 'Literal', value: textBuf });
        }

        return {
            type: 'InterpolatedString',
            parts,
            line: token.line,
            col: token.col
        };
    }

    function parseAssignSuffix(targetDesc) {
        if (match('INCREMENT')) return { value: 1, operator: '+' };
        if (match('DECREMENT')) return { value: 1, operator: '-' };
        if (match('ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN')) {
            let op = OP_MAP[previous().type] || null;
            let expr = parseLogicOr();
            return { value: expr, operator: op };
        }
        printErr(`[SyntaxError: ${formatLocation(peek())}] Expected assignment operator after ${targetDesc}.`);
    }

    function parseStatement() {
        let stmt;

        if (match('IF'))       return parseIfStatement();
        if (match('FOR'))      return parseForStatement();
        if (match('WHILE'))    return parseWhileStatement();
        if (match('GIVEN'))    return parseGivenStatement();
        if (match('DO'))       return parseDoWhileStatement();
        if (match('FUNCTION')) return parseFunctionDeclaration(false);
        if (match('HOOK'))     return parseHookStatement();

        if (match('IVAR', 'ICONST')) {
            stmt = parseVarDeclaration();
        } else if (match('RETURN')) {
            let startToken = previous();

            let value = null;
            if (!check('SEMICOLON')) {
                value = parseLogicOr();
            }

            stmt = { type: 'ReturnStatement', value, line: startToken.line, col: startToken.col };
        } else if (match('IMPORT')) {
            let pkgName = consume('IDENTIFIER', "Expected package name after 'import'.").value;
            let modules = [];

            if (match('TILDE')) {
                consume('LPAREN', "Expected '(' after '~' in import statement.");

                if (!check('RPAREN')) {
                    while (true) {
                        modules.push(consume('IDENTIFIER', "Expected module name.").value);
                        if (!match('COMMA')) break;
                    }
                }

                consume('RPAREN', "Expected ')' after import module list.");
            }

            let aliasName = null;
            if (match('ALIAS')) {
                if (match('TILDE')) {
                    aliasName = '~';
                } else {
                    aliasName = consume('IDENTIFIER', "Expected alias name or '~' after 'alias'.").value;
                }
            }

            stmt = {
                type: 'ImportStatement',
                package: pkgName,
                modules,
                alias: aliasName
            };
        } else if (match('NAMESPACE')) {
            let startToken = previous();
            let nsName = consume('IDENTIFIER', "Expected namespace name after 'namespace'.").value;

            let modName = null;

            if (match('TILDE')) {
                if (nsName === 'Main') {
                    printErr(`[SyntaxError: Line ${startToken.line}, Col ${startToken.col}] Namespace 'Main' cannot be split into modules.`);
                }
                
                modName = consume('IDENTIFIER', "Expected module name after '~'.").value;
            }

            consume('THEN', `Expected 'then' after namespace declaration '${nsName}'.`);

            let body = [];
            while (!check('END') && !isAtEnd()) {
                body.push(parseStatement());
            }

            consume('END', `Expected 'end' to close namespace '${nsName}' block.`);

            return {
                type: 'NamespaceStatement',
                namespace: nsName,
                module: modName,
                body,
                line: startToken.line,
                col: startToken.col
            };
        } else if (match('PASTE', 'PASTELN')) {
            let isLn = previous().type === 'PASTELN';
            let kw = previous().value;

            consume('LPAREN', `Expected '(' after '${kw}'.`);

            let expr = undefined;
            let isEmpty = false;

            if (isLn && check('RPAREN')) {
                isEmpty = true;
            } else {
                expr = parseLogicOr();
            }

            consume('RPAREN', `Expected ')' after '${kw}' argument.`);
            stmt = { type: 'PasteStatement', expr, newLine: isLn, isEmpty };
        } else if (check('COPY') || check('COPYKEY')) {
            stmt = parsePrimary();
        } else if (match('CLEAR')) {
            consume('LPAREN', "Expected '(' after 'clear'.");
            
            let condition = null;
            if (!check('RPAREN')) {
                condition = parseLogicOr();
            }

            consume('RPAREN', "Expected ')' after 'clear' condition.");
            stmt = { type: 'ClearStatement', condition };
        } else if (match('EXIT')) {
            consume('LPAREN', "Expected '(' after 'exit'.");
            
            let condition = null;
            if (!check('RPAREN')) {
                condition = parseLogicOr();
            }

            consume('RPAREN', "Expected ')' after 'exit' condition.");
            stmt = { type: 'ExitStatement', condition };
        } else if (match('KILL')) {
            let startToken = previous();
            let varName = consume('IDENTIFIER', "Expected variable name after 'kill'.").value;
            
            stmt = { type: 'KillStatement', name: varName, line: startToken.line, col: startToken.col };
        } else if (match('THROW')) {
            let startToken = previous();
            let value = parseLogicOr();
            stmt = { type: 'ThrowStatement', value, line: startToken.line, col: startToken.col };
        } else if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'LBRACKET') {
            let varName = advance().value;
            advance();
            let index = parseLogicOr();
            consume('RBRACKET', "Expected ']' after list index.");

            let typeInfo = match('TILDE') ? parseType() : null;
            let rhs = parseAssignSuffix(`list index '${varName}[...]'`);
            stmt = { type: 'IndexAssign', name: varName, index, value: rhs.value, operator: rhs.operator, typeInfo };
        } else if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'DOT' && isPropertyAssignAhead()) {
            let varName = advance().value;

            let path = [];
            while (match('DOT')) {
                path.push(consume('IDENTIFIER', "Expected property name after '.'").value);
            }

            let fullPropStr = varName + '.' + path.join('.');
            let typeInfo = match('TILDE') ? parseType() : null;
            let rhs = parseAssignSuffix(`property '${fullPropStr}'`);

            stmt = { 
                type: 'PropertyAssign', 
                name: varName, 
                path, 
                property: path[path.length - 1], 
                value: rhs.value, 
                operator: rhs.operator, 
                typeInfo 
            };
        } else if (check('IDENTIFIER') && tokens[cursor + 1] && ['INCREMENT', 'DECREMENT', 'ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN'].includes(tokens[cursor + 1].type)) {
            let varName = advance().value;
            let rhs = parseAssignSuffix(`variable '${varName}'`);
            stmt = {
                type: 'VarAssign',
                name: varName,
                value: rhs.operator
                    ? { type: 'MathExpression', operator: rhs.operator, left: { type: 'Variable', name: varName }, right: rhs.value }
                    : rhs.value
            };
        } else if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'TILDE') {
            let varName = advance().value;
            advance();

            let typeInfo = parseType();
            let targetType = typeInfo.baseType;
            let isNullable = typeInfo.isNullable;

            consume('ASSIGN', `Missing '=' assignment operator after '${varName}~${targetType}'.`);
            let value = parseLogicOr();
            stmt = { type: 'VarRetype', name: varName, targetType, isNullable, value, typeInfo };
        } else if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'SWAP') {
            let leftVar = advance().value;
            advance();
            let rightVar = consume('IDENTIFIER', "Expected variable name after '<->' swap operator.").value;
            stmt = { type: 'SwapStatement', left: leftVar, right: rightVar };
        } else if (match('BREAK')) {
            stmt = { type: 'BreakStatement' };
        } else if (match('SKIP')) {
            stmt = { type: 'SkipStatement' };
        } else {
            stmt = parseLogicOr();
        }

        consume('SEMICOLON', "Missing semicolon ';' at the end of statement.");
        return stmt;
    }

    // ========================================================================
    // 4. PARSER ENTRYPOINT (PROGRAM)
    // ========================================================================

    let statements = [];
    while (!isAtEnd()) {
        statements.push(parseStatement());
    }

    return {
        type: 'Program',
        body: statements
    };
}




    // =========================================================================
    // 3. RUNTIME NATIVES
    // =========================================================================
    const natives = {
        random: (...args) => {
            if (args.length === 0) return Math.random();
            if (args.length === 1) return Math.floor(Math.random() * Math.floor(args[0])) + 1;
            const min = Math.ceil(args[0]), max = Math.floor(args[1]);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        sqrt: (x) => Math.sqrt(x),
        pow: (b, e) => Math.pow(b, e),
        sin: (x) => Math.sin(x),
        cos: (x) => Math.cos(x),
        tan: (x) => Math.tan(x),
        atan2: (y, x) => Math.atan2(y, x),
        asin: (x) => Math.asin(x),
        acos: (x) => Math.acos(x),
        atan: (x) => Math.atan(x),
        log: (x) => Math.log(x),
        log10: (x) => Math.log10(x),
        exp: (x) => Math.exp(x),
        sleep: (ms) => {
            const end = performance.now() + Math.max(0, ms);
            while (performance.now() < end) {}
        },
        now: () => Date.now(),
        unix: () => Math.floor(Date.now() / 1000),
        perf: () => performance.now(),
        iso: () => new Date().toISOString().slice(0, 19),
        clock: () => {
            const d = new Date();
            const makeField = (v) => ({ value: v, type: 'Int', isNullable: false });
            return {
                kind: 'Table',
                fields: {
                    year: makeField(d.getFullYear()),
                    month: makeField(d.getMonth() + 1),
                    day: makeField(d.getDate()),
                    hours: makeField(d.getHours()),
                    minutes: makeField(d.getMinutes()),
                    seconds: makeField(d.getSeconds()),
                    ms: makeField(d.getMilliseconds())
                }
            };
        },
        timeFormat: (ms) => {
            const totalSec = Math.floor(ms / 1000);
            const hours = Math.floor(totalSec / 3600);
            const minutes = Math.floor((totalSec % 3600) / 60);
            const seconds = totalSec % 60;
            const pad = (n) => (n < 10 ? '0' + n : '' + n);
            return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
        },
        strUpper: (str) => String(str).toUpperCase(),
        strLower: (str) => String(str).toLowerCase(),
        strCount: (str) => String(str).length,
        strTrim: (str) => String(str).trim(),
        strSplit: (str, sep) => String(str).split(sep !== undefined ? String(sep) : ' '),
        strReplace: (str, target, repl) => String(str).replaceAll(String(target), String(repl)),
        strContains: (str, sub) => String(str).includes(String(sub)),
        strStartsWith: (str, prefix) => String(str).startsWith(String(prefix)),
        strEndsWith: (str, suffix) => String(str).endsWith(String(suffix)),
        strIndexOf: (str, sub) => String(str).indexOf(String(sub)),
        strSlice: (str, start, end) => String(str).slice(start, end !== undefined ? end : undefined),
        strRepeat: (str, n) => String(str).repeat(n),
        strReverse: (str) => String(str).split('').reverse().join(''),
        strJoin: (list, sep) => Array.isArray(list) ? list.join(sep !== undefined ? String(sep) : '') : '',
        ioCopy: (filePath) => {
            const p = String(filePath);
            if (!(p in virtualFS)) {
                printErr(`[IOError] File not found: '${p}'.`);
            }
            return virtualFS[p];
        },
        ioPaste: (filePath, content) => {
            const p = String(filePath);
            virtualFS[p] = String(content);
            persistVirtualFS();
            return true;
        },
        ioPasteLn: (filePath, content) => {
            const p = String(filePath);
            virtualFS[p] = (virtualFS[p] || '') + String(content) + '\n';
            persistVirtualFS();
            return true;
        },
        ioAppend: (filePath, content) => {
            const p = String(filePath);
            virtualFS[p] = (virtualFS[p] || '') + String(content);
            persistVirtualFS();
            return true;
        },
        ioExists: (filePath) => {
            return String(filePath) in virtualFS;
        },
        ioKill: (filePath) => {
            const p = String(filePath);
            if (p in virtualFS) {
                delete virtualFS[p];
                persistVirtualFS();
                return true;
            }
            return false;
        }
    };

    // =========================================================================
    // 4. EVALUATOR MODULES
    // =========================================================================
    let currentCliArgs = [];

function setCliArgs(cliArgs) {
    currentCliArgs = Array.isArray(cliArgs) ? [...cliArgs] : [];
}

function initGlobalScope(env, cliArgs = currentCliArgs) {
    const argsList = Array.isArray(cliArgs) ? [...cliArgs] : [];

    env.values['args'] = {
        value: argsList,
        type: 'List',
        isConst: true,
        isNullable: false,
        typeInfo: { baseType: 'List', elemType: 'String', isElemNullable: false }
    };

    const sysTable = {
        kind: 'Table',
        fields: {
            args: {
                value: argsList,
                type: 'List',
                isNullable: false
            }
        }
    };

    const stdTable = {
        kind: 'Table',
        fields: {
            Sys: {
                value: sysTable,
                type: 'Table',
                isNullable: false
            }
        }
    };

    env.values['Std'] = {
        value: stdTable,
        type: 'Table',
        isConst: true,
        isNullable: false
    };
}

function createScope(parent = null, cliArgs = null) {
    const scope = { values: {}, parent };
    if (!parent) {
        initGlobalScope(scope, cliArgs !== null ? cliArgs : currentCliArgs);
    }
    return scope;
}

function findScope(name, env) {
    let curr = env;
    while (curr) {
        if (name in curr.values) return curr;
        curr = curr.parent;
    }
    return null;
}




    

function getType(val) {
    if (val && val.kind) return val.kind;
    if (Array.isArray(val)) return 'List';
    if (typeof val === 'number') return Number.isInteger(val) ? 'Int' : 'Float';
    if (typeof val === 'string') return 'String';
    if (typeof val === 'boolean') return 'Bool';
    if (val === null) return 'Null';
    return 'Unknown';
}

function isTruthy(val) {
    return val === true || val === 1;
}

function isKurobaEqual(a, b) {
    if ((a === 0 && b === false) || (a === false && b === 0)) return true;
    if ((a === 1 && b === true) || (a === true && b === 1)) return true;
    return a === b;
}

function castToType(val, targetType) {
    if (val === null || !targetType) return val;

    if (targetType === 'String') return String(val);
    if (targetType === 'Int' || targetType === 'Float') {
        let numb = Number(val);
        if (isNaN(numb)) {
            printErr(`[TypeError] Cannot cast value '${val}' to type '${targetType}'.`);
        }
        return (targetType === 'Int') ? Math.trunc(numb) : numb;
    }
    if (targetType === 'Bool' || targetType === 'Boolean') {
        if (val === 0 || val === 'FALSE' || val === false) return false;
        if (val === 1 || val === 'TRUE' || val === true) return true;
        return Boolean(val);
    }
    return val;
}

function formatKurobaValue(val, isInsideList = false) {
    if (val === true) return 'TRUE';
    if (val === false) return 'FALSE';
    if (val === null) return 'NULL';
    if (typeof val === 'string' && isInsideList) return `"${val}"`;
    if (val && val.kind === 'Table') {
        let keys = Object.keys(val.fields);
        if (keys.length === 0) return '{}';
        let entries = keys.map(k => `${k}: ${formatKurobaValue(val.fields[k].value, true)}`);
        return '{ ' + entries.join(', ') + ' }';
    }
    if (val && val.kind === 'Function') {
        return val.name ? `<function ${val.name}>` : '<function ~>';
    }
    if (val && val.kind) {
        return '[' + val.items.map(el => formatKurobaValue(el, true)).join(', ') + ']';
    }
    if (Array.isArray(val)) {
        return '[' + val.map(el => formatKurobaValue(el, true)).join(', ') + ']';
    }
    return String(val);
}





    



function evalMath(node, env) {
    let left = evaluate(node.left, env);
    let right = evaluate(node.right, env);

    switch (node.operator) {
        case '==': return isKurobaEqual(left, right);
        case '!=': return !isKurobaEqual(left, right);
        case '+':  return left + right;
        case '-':  return left - right;
        case '*':  return left * right;
        case '/':
            if (right === 0) printErr("[MathError] Division by zero is undefined.");
            return left / right;
        case '%':
            if (right === 0) printErr("[MathError] Division or modulo by zero is undefined.");
            return left % right;
        case '<':  return left < right;
        case '>':  return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        default:
            printErr(`[RuntimeError] Unsupported operator '${node.operator}'.`);
    }
}

function evalUnary(node, env) {
    let right = evaluate(node.right, env);
    if (node.operator === '!') return !isTruthy(right);
    if (node.operator === '-') return -right;
    printErr(`[RuntimeError] Unsupported unary operator '${node.operator}'.`);
}

function evalLogical(node, env) {
    let left = evaluate(node.left, env);
    if (node.operator === '&&') {
        if (!isTruthy(left)) return false;
        return isTruthy(evaluate(node.right, env));
    }
    if (node.operator === '||') {
        if (isTruthy(left)) return true;
        return isTruthy(evaluate(node.right, env));
    }
    printErr(`[RuntimeError] Unsupported logical operator '${node.operator}'.`);
}





    




function validateAndCast(val, targetType, isNullable, typeInfo, varName) {
    if (val === null) {
        if (!isNullable) {
            printErr(`[TypeError] Cannot assign NULL to non-nullable variable '${varName}' of type '(${targetType})'.`);
        }
        return null;
    }

    if (targetType === 'Table') {
        if (val && val.kind === 'Table') return val;
        printErr(`[TypeError] Cannot assign non-Table value of type '${getType(val)}' to variable '${varName}' of type 'Table'.`);
    }

    if (targetType === 'List' || targetType === 'Stack' || targetType === 'Queue') {
        let rawItems = null;

        if (Array.isArray(val)) {
            rawItems = [...val];
        } else if (val && (val.kind === targetType || val.kind === 'Stack' || val.kind === 'Queue')) {
            rawItems = [...val.items];
        } else {
            printErr(`[TypeError] Cannot assign non-collection value of type '${getType(val)}' to variable '${varName}' of type '${targetType}'.`);
        }

        if (typeInfo && typeInfo.elemType) {
            for (let i = 0; i < rawItems.length; i++) {
                let elem = rawItems[i];
                if (elem === null) {
                    if (!typeInfo.isElemNullable) {
                        printErr(`[TypeError] Element at index ${i} in ${targetType} '${varName}' cannot be NULL.`);
                    }
                } else {
                    rawItems[i] = castToType(elem, typeInfo.elemType);
                }
            }
        }

        if (targetType === 'Stack') return { kind: 'Stack', items: rawItems };
        if (targetType === 'Queue') return { kind: 'Queue', items: rawItems };
        
        return rawItems;
    }

    if (targetType) {
        return castToType(val, targetType);
    }
    return val;
}

function evalVarDeclar(node, env) {
    let rawVal = evaluate(node.value, env);
    let val = validateAndCast(rawVal, node.explType, node.isNullable !== false, node.typeInfo, node.name);

    env.values[node.name] = {
        value: val,
        type: node.explType || getType(val),
        isConst: !!node.isConst,
        isNullable: node.isNullable !== false,
        typeInfo: node.typeInfo || null
    };
    return val;
}

function evalVarAssign(node, env) {
    let scope = findScope(node.name, env);
    if (!scope) printErr(`[ReferenceError] Cannot reassign undeclared variable '${node.name}'.`);
    let target = scope.values[node.name];
    if (target.isConst) printErr(`[TypeError] Cannot reassign constant '${node.name}'.`);

    let rawVal = evaluate(node.value, env);
    let val = validateAndCast(rawVal, target.type, target.isNullable, target.typeInfo, node.name);

    let newType = getType(val);
    if (val !== null && target.type !== newType) {
        printErr(`[TypeError] Cannot assign type '${newType}' to variable '${node.name}' of type '${target.type}'.`);
    }

    target.value = val;
    return val;
}

function evalVariable(node, env) {
    let scope = findScope(node.name, env);
    if (scope) return scope.values[node.name].value;
    printErr(`[ReferenceError] Variable '${node.name}' is not defined.`);
}

function evalVarRetype(node, env) {
    let scope = findScope(node.name, env);
    if (!scope) printErr(`[ReferenceError] Cannot retype undeclared variable '${node.name}'.`);
    let target = scope.values[node.name];
    if (target.isConst) printErr(`[TypeError] Cannot retype constant '${node.name}'.`);

    let rawVal = evaluate(node.value, env);
    let val = validateAndCast(rawVal, node.targetType, node.isNullable, node.typeInfo, node.name);

    target.value = val;
    target.type = node.targetType;
    target.isNullable = node.isNullable;
    target.typeInfo = node.typeInfo || null;
    return val;
}

function evalSwap(node, env) {
    let scopeLeft = findScope(node.left, env);
    let scopeRight = findScope(node.right, env);
    if (!scopeLeft) printErr(`[ReferenceError] Cannot swap undeclared variable '${node.left}'.`);
    if (!scopeRight) printErr(`[ReferenceError] Cannot swap undeclared variable '${node.right}'.`);

    let varA = scopeLeft.values[node.left];
    let varB = scopeRight.values[node.right];

    if (varA.isConst) printErr(`[TypeError] Cannot swap constant '${node.left}'.`);
    if (varB.isConst) printErr(`[TypeError] Cannot swap constant '${node.right}'.`);

    if (!varA.isNullable && varB.value === null) printErr(`[TypeError] Cannot swap NULL into non-nullable variable '${node.left}'.`);
    if (!varB.isNullable && varA.value === null) printErr(`[TypeError] Cannot swap NULL into non-nullable variable '${node.right}'.`);
    
    if (varA.type !== varB.type) printErr(`[TypeError] Cannot swap variable '${node.left}' of type '${varA.type}' with variable '${node.right}' of type '${varB.type}'.`);

    let temp = varA.value;
    varA.value = varB.value;
    varB.value = temp;
}

function evalKill(node, env) {
    let scope = findScope(node.name, env);
    if (!scope) {
        printErr(`[ReferenceError: Line ${node.line}] Cannot kill undefined variable '${node.name}'.`);
    }

    let targetVar = scope.values[node.name];
    if (targetVar.isConst) {
        printErr(`[TypeError: Line ${node.line}] Cannot kill constant variable '${node.name}'.`);
    }

    delete scope.values[node.name];
}





    




function evalListLiteral(node, env) {
    return node.elements.map(el => evaluate(el, env));
}

function evalIndexAccess(node, env) {
    let target = evaluate(node.target, env);

    if (target && target.kind === 'Table') {
        if (!node.isDotAccess) {
            printErr("[TypeError] Tables do not support bracket indexing. Use dot notation 'table.property' instead.");
        }
        let key = node.index;
        if (key in target.fields) {
            return target.fields[key].value;
        }
        return null;
    }

    if (node.isDotAccess) {
        printErr(`[TypeError] Cannot access '${getType(target)}' with dot notation. Use bracket indexing 'list[index]' instead.`);
    }

    if (typeof target === 'string') {
        let idx = evaluate(node.index, env);
        if (!Number.isInteger(idx)) printErr(`[IndexError] String index must be an integer, got '${idx}'.`);
        if (idx < 0 || idx >= target.length) printErr(`[IndexError] Index ${idx} out of bounds for string of length ${target.length}.`);
        return target[idx];
    }

    if (!Array.isArray(target)) printErr(`[TypeError] Cannot index non-list value of type '${getType(target)}'.`);
    let idx = evaluate(node.index, env);
    if (!Number.isInteger(idx)) printErr(`[IndexError] List index must be an integer, got '${idx}'.`);
    if (idx < 0 || idx >= target.length) printErr(`[IndexError] Index ${idx} out of bounds for list of length ${target.length}.`);
    return target[idx];
}

function evalIndexAssign(node, env) {
    let scope = findScope(node.name, env);
    if (!scope) printErr(`[ReferenceError] Variable '${node.name}' is not defined.`);

    let targetVar = scope.values[node.name];
    if (targetVar.isConst) {
        let typeName = targetVar.type || 'collection';
        printErr(`[TypeError] Cannot modify elements of constant ${typeName} '${node.name}'.`);
    }

    if (targetVar.value && targetVar.value.kind === 'Table') {
        printErr(`[TypeError] Tables do not support bracket assignment. Use dot notation '${node.name}.${evaluate(node.index, env)} = ...' instead.`);
    }

    let list = targetVar.value;
    if (!Array.isArray(list)) printErr(`[TypeError] Variable '${node.name}' is not a List.`);

    let idx = evaluate(node.index, env);
    if (!Number.isInteger(idx)) printErr(`[IndexError] List index must be an integer, got '${idx}'.`);
    if (idx < 0 || idx >= list.length) printErr(`[IndexError] Index ${idx} out of bounds for list '${node.name}' of length ${list.length}.`);

    let newVal = evaluate(node.value, env);
    if (node.operator) {
        switch (node.operator) {
            case '+': newVal = list[idx] + newVal; break;
            case '-': newVal = list[idx] - newVal; break;
            case '*': newVal = list[idx] * newVal; break;
            case '/':
                if (newVal === 0) printErr("[MathError] Division by zero is undefined.");
                newVal = list[idx] / newVal;
                break;
            case '%':
                if (newVal === 0) printErr("[MathError] Division or modulo by zero is undefined.");
                newVal = list[idx] % newVal;
                break;
        }
    }

    let tInfo = targetVar.typeInfo;
    if (tInfo && tInfo.elemType) {
        if (newVal === null) {
            if (!tInfo.isElemNullable) printErr(`[TypeError] Cannot assign NULL to non-nullable element of list '${node.name}'.`);
        } else {
            newVal = castToType(newVal, tInfo.elemType);
        }
    }

    list[idx] = newVal;
    return newVal;
}

function evalMethodCall(node, env) {
    let target = evaluate(node.target, env);
    let targetType = getType(target);

    if (target && target.kind === 'Table') {
        let methodName = node.method;
        if (methodName in target.fields) {
            let fnObj = target.fields[methodName].value;
            if (fnObj && fnObj.kind === 'Function') {
                if (fnObj.isNative) {
                    let evaluatedArgs = node.args.map(a => evaluate(a, env));
                    return fnObj.fn(...evaluatedArgs);
                }
                
                return evalCall({ caller: { type: 'Literal', value: fnObj }, args: node.args }, env);
            }
            printErr(`[TypeError] Field '${methodName}' on Table is not a callable function.`);
        }
        printErr(`[ReferenceError] Method or field '${methodName}' does not exist on Table.`);
    }

    let isList = Array.isArray(target);
    let isStack = target && target.kind === 'Stack';
    let isQueue = target && target.kind === 'Queue';

    if (!isList && !isStack && !isQueue) {
        printErr(`[TypeError] Cannot call method '.${node.method}()' on type '${targetType}'. Supported types are 'List', 'Stack', 'Queue' and 'Table'.`);
    }

    let items = isList ? target : target.items;
    let method = node.method;
    let tInfo = null;
    
    if (node.target.type === 'Variable') {
        let scope = findScope(node.target.name, env);
        if (scope) tInfo = scope.values[node.target.name].typeInfo;
    }

    switch (method) {
        case 'push': {
            if (node.args.length < 1) {
                printErr(`[TypeError] Method '.push()' expects at least 1 argument.`);
            }

            let val = evaluate(node.args[0], env);

            if (tInfo && tInfo.elemType) {
                if (val === null) {
                    if (!tInfo.isElemNullable) {
                        printErr(`[TypeError] Cannot push NULL into ${targetType} '${node.target.name}' with non-nullable elements.`);
                    }
                } else {
                    val = castToType(val, tInfo.elemType);
                }
            }

            if (isStack) {
                items.push(val);
            } else if (isQueue) {
                items.push(val);
            } else {
                if (node.args.length >= 2) {
                    let pos = evaluate(node.args[1], env);
                    if (!Number.isInteger(pos)) printErr(`[IndexError] Position argument in '.push()' must be an integer, got '${pos}'.`);
                    if (pos < 0 || pos > items.length) printErr(`[IndexError] Position ${pos} out of bounds for list of length ${items.length}.`);
                    items.splice(pos, 0, val);
                } else {
                    items.push(val);
                }
            }

            return val;
        }
        case 'pop': {
            if (items.length === 0) {
                printErr(`[IndexError] Cannot pop from an empty ${targetType}.`);
            }

            if (isStack) {
                return items.pop();
            } else if (isQueue) {
                return items.shift();
            } else {
                if (node.args.length < 1) {
                    printErr(`[TypeError] Method '.pop()' on a List requires an index argument. (e.g. list.pop(0))`);
                }

                let pos = evaluate(node.args[0], env);
                if (!Number.isInteger(pos)) printErr(`[IndexError] Index argument in '.pop()' must be an integer, got '${pos}'.`);
                if (pos < 0 || pos >= items.length) printErr(`[IndexError] Index ${pos} out of bounds for list of length ${items.length}.`);

                return items.splice(pos, 1)[0];
            }
        }
        case 'peek': {
            if (items.length === 0) {
                printErr(`[IndexError] Cannot peek into an empty ${targetType}.`);
            }

            if (isStack) {
                return items[items.length - 1];
            } else if (isQueue) {
                return items[0];
            } else {
                if (node.args.length < 1) {
                    printErr(`[TypeError] Method '.peek()' on a List requires an index argument. (e.g. list.peek(0))`);
                }

                let pos = evaluate(node.args[0], env);
                if (!Number.isInteger(pos)) printErr(`[IndexError] Index argument in '.peek()' must be an integer, got '${pos}'.`);
                if (pos < 0 || pos >= items.length) printErr(`[IndexError] Index ${pos} out of bounds for list of length ${items.length}.`);
                
                return items[pos];
            }
        }
        case 'count': {
            return items.length;
        }
        default:
            printErr(`[TypeError] Unknown method '.${method}()' on type '${targetType}'. Supported methods are 'push', 'pop', 'peek' and 'count'.`);
    }
}

function evalTableLiteral(node, env) {
    let fields = {};

    for (let entry of node.entries) {
        let rawVal = evaluate(entry.value, env);
        let val = rawVal;
        let type = getType(rawVal);
        let isNullable = true;

        if (entry.typeInfo) {
            type = entry.typeInfo.baseType;
            isNullable = entry.typeInfo.isNullable;
            if (!isNullable && rawVal === null) {
                printErr(`[TypeError] Cannot assign NULL to non-nullable field '${entry.key}' of type '(${type})'.`);
            }
            if (rawVal !== null) {
                val = castToType(rawVal, type);
            }
        }

        fields[entry.key] = {
            value: val,
            type: type,
            isNullable: isNullable
        };
    }

    return { kind: 'Table', fields };
}


function evalPropertyAssign(node, env) {
    let scope = findScope(node.name, env);
    if (!scope) printErr(`[ReferenceError] Variable '${node.name}' is not defined.`);

    let targetVar = scope.values[node.name];
    if (targetVar.isConst) {
        printErr(`[TypeError] Cannot modify properties of constant Table '${node.name}'.`);
    }

    if (!targetVar.value || targetVar.value.kind !== 'Table') {
        printErr(`[TypeError] Cannot set property '${node.property}' on non-Table value of type '${getType(targetVar.value)}'.`);
    }

    let table = targetVar.value;
    let path = node.path || [node.property];

    for (let i = 0; i < path.length - 1; i++) {
        let seg = path[i];
        if (!table.fields || !(seg in table.fields)) {
            printErr(`[ReferenceError] Property '${seg}' does not exist on Table.`);
        }
        let child = table.fields[seg].value;
        if (!child || child.kind !== 'Table') {
            printErr(`[TypeError] Cannot access property through non-Table field '${seg}'.`);
        }
        table = child;
    }
    
    let key = path[path.length - 1];
    let newVal = evaluate(node.value, env);

    if (node.operator) {
        let currVal = (key in table.fields) ? table.fields[key].value : 0;
        switch (node.operator) {
            case '+': newVal = currVal + newVal; break;
            case '-': newVal = currVal - newVal; break;
            case '*': newVal = currVal * newVal; break;
            case '/':
                if (newVal === 0) printErr("[MathError] Division by zero is undefined.");
                newVal = currVal / newVal;
                break;
            case '%':
                if (newVal === 0) printErr("[MathError] Division or modulo by zero is undefined.");
                newVal = currVal % newVal;
                break;
        }
    }

    if (node.typeInfo) {
        let targetType = node.typeInfo.baseType;
        let isNullable = node.typeInfo.isNullable;
        if (!isNullable && newVal === null) {
            printErr(`[TypeError] Cannot assign NULL to non-nullable field '${key}' of type '(${targetType})'.`);
        }
        if (newVal !== null) {
            newVal = castToType(newVal, targetType);
        }
        table.fields[key] = { value: newVal, type: targetType, isNullable: isNullable };
        return newVal;
    }

    if (key in table.fields) {
        let field = table.fields[key];
        if (!field.isNullable && newVal === null) {
            printErr(`[TypeError] Cannot assign NULL to non-nullable field '${key}' of type '(${field.type})'.`);
        }
        if (newVal !== null) {
            let actualType = getType(newVal);
            if (field.type !== actualType) {
                printErr(`[TypeError] Cannot assign type '${actualType}' to field '${key}' of type '${field.type}'.`);
            }
        }
        field.value = newVal;
        return newVal;
    }

    table.fields[key] = {
        value: newVal,
        type: getType(newVal),
        isNullable: true
    };

    return newVal;
}





    




function executeBlock(statements, parentEnv) {
    let blockEnv = createScope(parentEnv);
    for (let stmt of statements) {
        let res = evaluate(stmt, blockEnv);
        if (res && (res.isBreak || res.isSkip || res.isReturn)) return res;
    }
    return null;
}

function evalIf(node, env) {
    if (isTruthy(evaluate(node.condition, env))) {
        return executeBlock(node.thenBranch, env);
    }
    if (node.elifBranches && node.elifBranches.length > 0) {
        for (let elif of node.elifBranches) {
            if (isTruthy(evaluate(elif.condition, env))) {
                return executeBlock(elif.body, env);
            }
        }
    }
    if (node.elseBranch) {
        return executeBlock(node.elseBranch, env);
    }
}

function evalFor(node, env) {
    let forEnv = createScope(env);
    if (node.init) evaluate(node.init, forEnv);

    while (true) {
        if (node.condition && !isTruthy(evaluate(node.condition, forEnv))) break;
        let res = executeBlock(node.body, forEnv);
        
        if (res && res.isBreak) break;

        if (node.update) evaluate(node.update, forEnv);

        if (res && res.isReturn) return res;
    }
}

function evalWhile(node, env) {
    while (isTruthy(evaluate(node.condition, env))) {
        let res = executeBlock(node.body, env);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    }
}

function evalDoWhile(node, env) {
    do {
        let res = executeBlock(node.body, env);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    } while (isTruthy(evaluate(node.condition, env)));
}

function evalGiven(node, env) {
    let val = evaluate(node.target || node.expr, env);
    let matchedIndex = -1;
    let defaultIndex = -1;

    for (let i = 0; i < node.cases.length; i++) {
        let c = node.cases[i];
        
        if (c.isDefault) {
            defaultIndex = i;
        } else if (matchedIndex === -1) {
            let caseVal = evaluate(c.value !== undefined ? c.value : c.condition, env);
            if (caseVal === val) matchedIndex = i;
        }
    }

    if (matchedIndex !== -1) {
        let res = executeBlock(node.cases[matchedIndex].body, env);
        if ((!res || !res.isBreak) && defaultIndex !== -1) {
            executeBlock(node.cases[defaultIndex].body, env);
        }
    } else if (defaultIndex !== -1) {
        executeBlock(node.cases[defaultIndex].body, env);
    }
}

function evalForIn(node, env) {
    let collection = evaluate(node.iterable, env);
    if (collection === null || collection === undefined) {
        printErr(`[TypeError: Line ${node.line}] Cannot iterate over '${collection}'.`);
    }

    let pairs = [];
    if (Array.isArray(collection)) {
        for (let i = 0; i < collection.length; i++) {
            pairs.push([i, collection[i]]);
        }
    } else if (collection && (collection.kind === 'Stack' || collection.kind === 'Queue')) {
        let items = collection.items;
        for (let i = 0; i < items.length; i++) {
            pairs.push([i, items[i]]);
        }
    } else if (collection && collection.kind === 'Table') {
        for (let key of Object.keys(collection.fields)) {
            pairs.push([key, collection.fields[key].value]);
        }
    } else {
        let typeName = getType(collection);
        printErr(`[TypeError: Line ${node.line}] Cannot iterate over value of type '${typeName}'. Expected List, Stack, Queue, or Table.`);
    }

    let forEnv = createScope(env);
    for (let [idxOrKey, val] of pairs) {
        if (node.indexVar) {
            forEnv.values[node.indexVar] = {
                value: idxOrKey,
                isConst: false,
                isNullable: true,
                type: typeof idxOrKey === 'number' ? 'Int' : 'String'
            };
        }

        forEnv.values[node.itemVar] = {
            value: val,
            isConst: false,
            isNullable: true,
            type: getType(val)
        };

        let res = executeBlock(node.body, forEnv);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    }
}

function evalThrow(node, env) {
    let rawVal = evaluate(node.value, env);

    let name = "Exception";
    let showLines = true;
    let code = null;
    let context = null;

    if (rawVal && rawVal.kind === 'Table' && rawVal.fields) {
        if ('exName' in rawVal.fields && rawVal.fields.exName.value !== null) {
            name = String(rawVal.fields.exName.value);
        }
        if ('exLines' in rawVal.fields) {
            let lVal = rawVal.fields.exLines.value;
            showLines = (lVal !== false && lVal !== 0);
        }
        if ('exCode' in rawVal.fields && rawVal.fields.exCode.value !== null) {
            code = rawVal.fields.exCode.value;
        }
        if ('exContext' in rawVal.fields && rawVal.fields.exContext.value !== null) {
            context = String(rawVal.fields.exContext.value);
        }
    }

    let loc = (node.line !== undefined) ? `Line ${node.line}, Col ${node.col}` : null;
    let header = `[${name}${showLines && loc ? ': ' + loc : ''}]`;

    let desc = (context !== null) ? context : formatKurobaValue(rawVal);
    if (code !== null) {
        desc = `Error ${code}: ${desc}`;
    }

    printException(`${header} ${desc}`);
}





    




function evalFunctionDeclaration(node, env) {
    let funcObj = {
        kind: 'Function',
        name: node.name,
        params: node.params,
        body: node.body,
        closure: env
    };

    if (!node.isAnonymous && node.name) {
        env.values[node.name] = {
            value: funcObj,
            type: 'Function',
            isConst: false,
            isNullable: false
        };
    }

    return funcObj;
}

function evalReturn(node, env) {
    let value = null;
    if (node.value) {
        value = evaluate(node.value, env);
    }
    return { isReturn: true, value };
}

function evalCall(node, env) {
    let caller = evaluate(node.caller, env);

    if (!caller || caller.kind !== 'Function') {
        let typeName = getType(caller);
        printErr(`[TypeError] Cannot call non-function value of type '${typeName}'.`);
    }

    if (caller.isNative) {
        let evaluatedArgs = node.args.map(a => evaluate(a, env));
        return caller.fn(...evaluatedArgs);
    }

    if (node.args.length !== caller.params.length) {
        let funcName = caller.name || '~';
        printErr(`[TypeError] Function '${funcName}' expects ${caller.params.length} arguments, got ${node.args.length}.`);
    }

    let fnEnv = createScope(caller.closure);

    for (let i = 0; i < caller.params.length; i++) {
        let param = caller.params[i];
        let argVal = evaluate(node.args[i], env);

        if (param.typeInfo) {
            let baseType = param.typeInfo.baseType;
            let isNullable = param.typeInfo.isNullable;

            if (!isNullable && argVal === null) {
                printErr(`[TypeError] Cannot pass NULL to non-nullable parameter '${param.name}' of type '(${baseType})'.`);
            }
            if (argVal !== null) {
                argVal = castToType(argVal, baseType);
            }
        }

        fnEnv.values[param.name] = {
            value: argVal,
            type: getType(argVal),
            isNullable: true,
            isConst: false
        };
    }

    for (let stmt of caller.body) {
        let res = evaluate(stmt, fnEnv);
        if (res && res.isReturn) {
            return res.value;
        }
    }

    return null;
}

function evalHook(node, env) {
    let origFunc = evaluate(node.target, env);

    if (!origFunc || origFunc.kind !== 'Function') {
        let typeName = getType(origFunc);
        printErr(`[TypeError: Line ${node.line}] Cannot hook non-function target of type '${typeName}'.`);
    }

    let hookClosure = createScope(env);
    
    hookClosure.values['this'] = {
        value: origFunc,
        type: 'Function',
        isConst: true,
        isNullable: false
    };
    let hookFunc = {
        kind: 'Function',
        name: origFunc.name,
        params: node.params,
        body: node.body,
        closure: hookClosure
    };

    if (node.target.type === 'Variable') {
        let scope = findScope(node.target.name, env);
        if (!scope) {
            printErr(`[ReferenceError: Line ${node.line}] Variable '${node.target.name}' not found.`);
        }

        scope.values[node.target.name].value = hookFunc;
    } else if (node.target.type === 'IndexAccess') {
        let table = evaluate(node.target.target, env);
        let key = String(evaluate(node.target.index, env));

        if (!table || table.kind !== 'Table') {
            printErr(`[TypeError: Line ${node.line}] Cannot hook into non-Table target.`);
        }

        if (key in table.fields) {
            table.fields[key].value = hookFunc;
        } else {
            table.fields[key] = { value: hookFunc, type: 'Function', isNullable: true };
        }
    }

    return hookFunc;
}



    // Web IO functions
    function evalPaste(node, env) {
        if (node.isEmpty) {
            if (node.newLine && activePrintHandler) activePrintHandler('', true);
            return null;
        }
        let val = evaluate(node.expr, env);
        let txt = formatKurobaValue(val);
        if (activePrintHandler) activePrintHandler(txt, node.newLine);
        return val;
    }

    function evalCopy(node, env) {
        let promptText = "Entrée Kuroba :";
        if (node.prompt !== null) {
            let val = evaluate(node.prompt, env);
            promptText = formatKurobaValue(val);
        }
        let result = prompt(promptText) || "";
        if (node.oneKey) return result.charAt(0);
        return result;
    }

    function evalClear(node, env) {
        if (node.cond !== null) {
            let condVal = evaluate(node.cond, env);
            if (!isTruthy(condVal)) return null;
        }
        if (activeClearHandler) activeClearHandler();
        return null;
    }

    function evalExit(node, env) {
        if (node.cond !== null) {
            let condVal = evaluate(node.cond, env);
            if (!isTruthy(condVal)) return null;
        }
        if (activePrintHandler) activePrintHandler("[Exit] Exécution interrompue par instruction exit.", true);
        throw new Error("[Exit] Programme arrêté (exit).");
    }

    // Web Packages functions (using in-memory virtual standard library)
    const moduleCache = {};

    function evaluateNamespaceBody(statements) {
        const moduleScope = createScope();
        for (const [name, fn] of Object.entries(natives)) {
            moduleScope.values['__native_' + name] = {
                value: { kind: 'Function', isNative: true, fn },
                type: 'Function',
                isConst: true,
                isNullable: false
            };
        }
        for (const stmt of statements) {
            evaluate(stmt, moduleScope);
        }
        const tableFields = {};
        for (const [varName, varEntry] of Object.entries(moduleScope.values)) {
            if (!varName.startsWith('__native_')) {
                tableFields[varName] = {
                    value: varEntry.value,
                    type: varEntry.type,
                    isNullable: varEntry.isNullable
                };
            }
        }
        return { kind: 'Table', fields: tableFields };
    }

    function discoverNamespaceModules(pkgName) {
        const discovered = {};
        for (const [fileName, source] of Object.entries(VIRTUAL_STD_FILES)) {
            const ast = parse(tokenize(source));
            for (const stmt of ast.body) {
                if (stmt.type === 'NamespaceStatement' && stmt.namespace === pkgName) {
                    const modName = stmt.module || pkgName;
                    const cacheKey = pkgName + ':' + modName;
                    if (!moduleCache[cacheKey]) {
                        moduleCache[cacheKey] = evaluateNamespaceBody(stmt.body);
                    }
                    discovered[modName] = moduleCache[cacheKey];
                }
            }
        }
        return discovered;
    }

    function evalImport(node, env) {
        if (node.package === 'Main') {
            printErr("[ImportError] Cannot import namespace 'Main'. 'Main' is the execution root.");
        }
        if (node.package !== 'Std') {
            printErr("[ImportError] Unknown package '" + node.package + "'. Available packages: 'Std'.");
        }
        const availableModules = discoverNamespaceModules(node.package);
        const isFullPackage = !node.modules || node.modules.length === 0;
        const modulesToBind = {};
        if (isFullPackage) {
            Object.assign(modulesToBind, availableModules);
        } else {
            for (const modName of node.modules) {
                if (!(modName in availableModules)) {
                    printErr("[ImportError] Module '" + modName + "' not found in namespace '" + node.package + "'.");
                }
                modulesToBind[modName] = availableModules[modName];
            }
        }

        if (node.alias === '~') {
            for (const [modName, modTable] of Object.entries(modulesToBind)) {
                env.values[modName] = {
                    value: modTable,
                    type: 'Table',
                    isConst: true,
                    isNullable: false
                };
            }
            return null;
        }

        const targetName = node.alias || node.package;
        const pkgTable = {
            kind: 'Table',
            fields: {}
        };
        for (const [modName, modTable] of Object.entries(modulesToBind)) {
            pkgTable.fields[modName] = {
                value: modTable,
                type: 'Table',
                isNullable: false
            };
        }
        env.values[targetName] = {
            value: pkgTable,
            type: 'Table',
            isConst: true,
            isNullable: false
        };
        return null;
    }

    function evalNamespace(node, env) {
        let result = null;
        for (let stmt of node.body) {
            result = evaluate(stmt, env);
            if (result && (result.isReturn || result.isBreak || result.isSkip)) return result;
        }
        return result;
    }

    // Evaluator main loop
    


function evaluate(node, env = createScope()) {
    if (!node || !node.type) return node;

    switch (node.type) {
        case 'Program':
            for (let stmt of node.body) evaluate(stmt, env);
            return;
        case 'NamespaceStatement':
            for (const stmt of node.body) {
                let res = evaluate(stmt, env);
                if (res && (res.isReturn || res.isBreak || res.isSkip)) return res;
            }
            return null;
        case 'InterpolatedString': 
            let res = '';
            for (let part of node.parts) {
                let v = evaluate(part, env);
                res += (v === null ? 'null' : String(v));
            }
            return res;
        case 'Literal':             return node.value;
        case 'VarDeclar':           return evalVarDeclar(node, env);
        case 'VarAssign':           return evalVarAssign(node, env);
        case 'Variable':            return evalVariable(node, env);
        case 'VarRetype':           return evalVarRetype(node, env);
        case 'SwapStatement':       return evalSwap(node, env);
        case 'IfStatement':         return evalIf(node, env);
        case 'ForStatement':        return evalFor(node, env);
        case 'WhileStatement':      return evalWhile(node, env);
        case 'DoWhileStatement':    return evalDoWhile(node, env);
        case 'GivenStatement':      return evalGiven(node, env);
        case 'ForInStatement':      return evalForIn(node, env);
        case 'BreakStatement':      return { isBreak: true };
        case 'SkipStatement':       return { isSkip: true };
        case 'PasteStatement':      return evalPaste(node, env);
        case 'CopyExpression':      return evalCopy(node, env);
        case 'ClearStatement':      return evalClear(node, env);
        case 'ExitStatement':       return evalExit(node, env);
        case 'ThrowStatement':      return evalThrow(node, env);
        case 'MathExpression':      return evalMath(node, env);
        case 'UnaryExpression':     return evalUnary(node, env);
        case 'LogicalExpression':   return evalLogical(node, env);
        case 'ListLiteral':         return evalListLiteral(node, env);
        case 'IndexAccess':         return evalIndexAccess(node, env);
        case 'IndexAssign':         return evalIndexAssign(node, env);
        case 'PropertyAssign':      return evalPropertyAssign(node, env);
        case 'MethodCall':          return evalMethodCall(node, env);
        case 'TableLiteral':        return evalTableLiteral(node, env);
        case 'KillStatement':       return evalKill(node, env);
        case 'FunctionDeclaration': return evalFunctionDeclaration(node, env);
        case 'ReturnStatement':     return evalReturn(node, env);
        case 'CallExpression':      return evalCall(node, env);
        case 'HookStatement':       return evalHook(node, env);
        case 'ImportStatement':     return evalImport(node, env);
        default:
            printErr(`[RuntimeError] Unknown AST node type '${node.type}'.`);
    }
}











    // Expose Kuroba API on global window
    global.Kuroba = {
        version: '1.0.5',
        run: function(sourceCode, options = {}) {
            activePrintHandler = options.onPrint || ((t, nl) => console.log(t));
            activeErrorHandler = options.onError || ((err) => { throw new Error(err); });
            activeClearHandler = options.onClear || (() => {});

            const tokens = tokenize(sourceCode);
            const ast = parse(tokens);
            const globalScope = createScope();
            return evaluate(ast, globalScope);
        },
        tokenize: tokenize,
        parse: parse
    };

})(typeof window !== 'undefined' ? window : global);
