/**
 * Kuroba — In-Browser Runtime Engine v1.0.6
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
    let activeInputHandler = null;
    let activeAbortHandler = null;
    let activeRunAborted = false;
    let evalOpCount = 0;

    async function mapAsync(arr, fn) {
        const out = [];
        for (let i = 0; i < arr.length; i++) {
            out.push(await fn(arr[i], i));
        }
        return out;
    }

    class KurobaAbortError extends Error {
        constructor() {
            super('[Stopped] Execution stopped by user.');
            this.isKurobaAbort = true;
        }
    }

    let tryDepth = 0;
    function pushTryContext() { tryDepth++; }
    function popTryContext() { tryDepth--; }
    function isInsideTry() { return tryDepth > 0; }

    class KurobaUserException extends Error {
        constructor(value, formattedMsg) {
            super(formattedMsg);
            this.isKurobaUserException = true;
            this.value = value;
            this.formattedMsg = formattedMsg;
        }
    }

    class KurobaRuntimeError extends Error {
        constructor(message) {
            super(message);
            this.isKurobaRuntimeError = true;
            this.message = message;
        }
    }

    function printErr(msg) {
        if (tryDepth > 0) {
            throw new KurobaRuntimeError(msg);
        }
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

    function formatTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `${date} ${time}`;
}

function formatExceptionMessage(rawVal, line, col, fallbackFormatted) {
    let name = "Exception";
    let showLines = true;
    let showTime = false;
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
        if ('exTime' in rawVal.fields) {
            let tVal = rawVal.fields.exTime.value;
            showTime = (tVal !== false && tVal !== 0 && tVal !== null);
        }
        if ('exCode' in rawVal.fields && rawVal.fields.exCode.value !== null) {
            code = rawVal.fields.exCode.value;
        }
        if ('exContext' in rawVal.fields && rawVal.fields.exContext.value !== null) {
            context = String(rawVal.fields.exContext.value);
        }
    }

    let loc = (line !== undefined) ? `Line ${line}, Col ${col}` : null;
    let header = `[${name}${showLines && loc ? ': ' + loc : ''}]`;

    let desc = (context !== null) ? context : fallbackFormatted;
    if (code !== null) {
        desc = `Error ${code}: ${desc}`;
    }

    let timePrefix = showTime ? `[${formatTimestamp()}] ` : '';
    return `${timePrefix}${header} ${desc}`;
}

function parseRuntimeErrorToTable(message) {
    let match = message.match(/^\[([a-zA-Z]+)(?::\s*Line\s*(\d+),\s*Col\s*(\d+))?\]\s*(.*)$/s);
    let name = match ? match[1] : "RuntimeError";
    let context = match ? match[4] : message;
    return {
        kind: 'Table',
        fields: {
            exName: { value: name, type: 'String', isNullable: false },
            exContext: { value: context, type: 'String', isNullable: false },
            exTime: { value: false, type: 'Bool', isNullable: false }
        }
    };
}

    // =========================================================================
    // 1. LEXER
    // =========================================================================
    // ============================================================================
// Kuroba Lexer: Token Definitions, Keywords & Predicates
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
  alias: { type: "ALIAS", value: "alias" },
  namespace: { type: "NAMESPACE", value: "namespace" },
  try: { type: "TRY", value: "try" },
  catch: { type: "CATCH", value: "catch" },
  finally: { type: "FINALLY", value: "finally" },
  is: { type: "IS", value: "is" },
  class: { type: "CLASS", value: "class" },
  public: { type: "PUBLIC", value: "public" },
  private: { type: "PRIVATE", value: "private" },
  from: { type: "FROM", value: "from" },
  base: { type: "BASE", value: "base" }
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
  "}": "RBRACE",
};

const isDigit = (c) => c >= "0" && c <= "9";
const isLetter = (c) =>
  (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
const isIdentChar = (c) => isLetter(c) || isDigit(c);



    


// ============================================================================
// Kuroba Lexer: Tokenizer Scanner
// ============================================================================

function tokenize(input) {
  let tokens = [];
  let cursor = 0;
  let line = 1;
  let col = 1;

  while (cursor < input.length) {
    let char = input[cursor];

    // Whitespace & Line tracking
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

    // Comments & Tildes
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

    // String Literals
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

    // Numeric Literals
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

    // Identifiers & Keywords
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

    // Operators & Punctuation
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

class ParserCursor {
    constructor(tokens) {
        this.tokens = tokens;
        this.cursor = 0;
    }

    formatLocation(token) {
        if (!token) return 'at end of file';
        return `Line ${token.line}, Col ${token.col}`;
    }

    peek() {
        return this.tokens[this.cursor];
    }

    previous() {
        return this.tokens[this.cursor - 1];
    }

    isAtEnd() {
        return this.cursor >= this.tokens.length;
    }

    check(type) {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    advance() {
        if (!this.isAtEnd()) this.cursor++;
        return this.previous();
    }

    match(...types) {
        for (let type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    consume(type, message) {
        if (this.check(type)) return this.advance();
        let token = this.peek() || this.previous();
        printErr(`[SyntaxError: ${this.formatLocation(token)}] ${message}`);
    }

    isPropertyAssignAhead() {
        let k = this.cursor;
        
        while (this.tokens[k] && this.tokens[k].type === 'IDENTIFIER' && this.tokens[k + 1] && this.tokens[k + 1].type === 'DOT') {
            k += 2;
        }

        return this.tokens[k] && this.tokens[k].type === 'IDENTIFIER' && this.tokens[k + 1] && [
            'ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN', 'INCREMENT', 'DECREMENT', 'TILDE'
        ].includes(this.tokens[k + 1].type);
    }
}



    

class ParserTypes extends ParserCursor {
    parseType() {
        let isNullable = true;
        let baseType = null;
        let elemType = null;
        let isElemNullable = true;

        if (this.match('LPAREN')) {
            isNullable = false;
            baseType = this.consume('IDENTIFIER', "Expected type identifier inside '(...)'. (e.g. String, Int, List)").value;
            
            if ((baseType === 'List' || baseType === 'Stack' || baseType === 'Queue') && this.match('LESS')) {
                isElemNullable = false;

                if (this.match('LPAREN')) {
                    elemType = this.consume('IDENTIFIER', "Expected element type inside 'List<(...)>'.").value;
                    this.consume('RPAREN', "Expected closing ')' after element type.");
                } else {
                    elemType = this.consume('IDENTIFIER', "Expected element type inside 'List<...>'.").value;
                }

                this.consume('GREATER', "Expected closing '>' after List type.");
            }

            this.consume('RPAREN', "Expected closing ')' after non-nullable type.");
        } else {
            baseType = this.consume('IDENTIFIER', "Expected type identifier after '~' (e.g. String, Int, List).").value;

            if ((baseType === 'List' || baseType === 'Stack' || baseType === 'Queue') && this.match('LESS')) {
                if (this.match('LPAREN')) {
                    isElemNullable = false;
                    elemType = this.consume('IDENTIFIER', "Expected element type inside 'List<(...)>'.").value;
                    this.consume('RPAREN', "Expected closing ')' after element type.");
                } else {
                    isElemNullable = true;
                    elemType = this.consume('IDENTIFIER', "Expected element type inside 'List<...>'.").value;
                }

                this.consume('GREATER', "Expected closing '>' after List type.");
            }
        }

        return { baseType, isNullable, elemType, isElemNullable };
    }
}



    



class ParserExpressions extends ParserTypes {
    parsePrimary() {
        let token = this.peek();

        if (!token) {
            printErr("[SyntaxError: at end of file] Unexpected end of input. Expected expression.");
        }

        let expr = null;

        if (this.match('LBRACKET')) {
            let elements = [];

            if (!this.check('RBRACKET')) {
                while (true) {
                    elements.push(this.parseLogicOr());
                    if (!this.match('COMMA')) break;
                    if (this.check('RBRACKET')) break;
                }
            }

            this.consume('RBRACKET', "Expected closing ']' after list elements.");
            expr = { type: 'ListLiteral', elements };
        }
        else if (this.match('LBRACE')) {
            let entries = [];

            if (!this.check('RBRACE')) {
                while (true) {
                    let key = null;

                    if (this.match('IDENTIFIER', 'STRING')) {
                        key = this.previous().value;
                    } else {
                        printErr(`[SyntaxError: ${this.formatLocation(this.peek())}] Expected key (identifier or string) in Table literal.`);
                    }

                    let typeInfo = null;
                    if (this.match('TILDE')) {
                        typeInfo = this.parseType();
                    }

                    this.consume('COLON', `Expected ':' after key '${key}' in Table literal.`);
                    let value = this.parseLogicOr();
                    entries.push({ key, value, typeInfo });

                    if (!this.match('COMMA')) break;
                    if (this.check('RBRACE')) break;
                }
            }
            this.consume('RBRACE', "Expected closing '}' after Table entries.");
            expr = { type: 'TableLiteral', entries };
        }
        else if (this.match('COPY', 'COPYKEY')) {
            let isOneKey = (this.previous().type === 'COPYKEY');

            this.consume('LPAREN', "Expected '(' after 'copy'.");

            let prompt = null;
            if (!this.check('RPAREN')) {
                prompt = this.parseLogicOr();
            }

            this.consume('RPAREN', "Expected ')' after 'copy' prompt.");
            expr = { type: 'CopyExpression', prompt, oneKey: isOneKey };
        }
        else if (this.match('FUNCTION')) {
            expr = this.parseFunctionDeclaration(true);
        }
        else if (this.match('THIS')) {
            expr = { type: 'Variable', name: 'this' };
        }
        else if (this.match('BASE')) {
            expr = { type: 'Variable', name: 'base' };
        }
        else if (this.match('IDENTIFIER')) {
            expr = { type: 'Variable', name: this.previous().value };
        }
        else if (this.match('INT', 'STRING', 'BOOL', 'FLOAT', 'NULL')) {
            return this.previous().value;
        }
        else if (this.match('INTERPOLATEDSTRING')) {
            return this.parseInterpolatedString(this.previous());
        }
        else if (this.match('LPAREN')) {
            let openParen = this.previous();
            expr = this.parseLogicOr();

            if (!this.match('RPAREN')) {
                printErr(`[SyntaxError: ${this.formatLocation(this.peek() || openParen)}] Unclosed parenthesis. Missing closing ')' to match '(' at Line ${openParen.line}, Col ${openParen.col}.`);
            }
        }
        else {
            printErr(`[SyntaxError: ${this.formatLocation(token)}] Unexpected token '${token.value}' of type '${token.type}'.`);
        }

        while (true) {
            if (this.match('LBRACKET')) {
                let index = this.parseLogicOr();
                this.consume('RBRACKET', "Expected closing ']' after index.");
                expr = { type: 'IndexAccess', target: expr, index };
            } else if (this.match('DOT')) {
                let memberName = this.consume('IDENTIFIER', "Expected property or method name after '.' (e.g. push, pop, peek, count, args).").value;
                if (this.match('LPAREN')) {
                    let args = [];

                    if (!this.check('RPAREN')) {
                        while (true) {
                            args.push(this.parseLogicOr());
                            if (!this.match('COMMA')) break;
                        }
                    }

                    this.consume('RPAREN', "Expected ')' after method arguments.");
                    expr = { type: 'MethodCall', target: expr, method: memberName, args };
                } else {
                    expr = { type: 'IndexAccess', target: expr, index: memberName, isDotAccess: true };
                }
            } else if (this.match('LPAREN')) {
                let args = [];

                if (!this.check('RPAREN')) {
                    while (true) {
                        args.push(this.parseLogicOr());
                        if (!this.match('COMMA')) break;
                    }
                }

                this.consume('RPAREN', "Expected ')' after function arguments.");
                expr = { type: 'CallExpression', caller: expr, args };
            } else {
                break;
            }
        }

        return expr;
    }

    parseInterpolatedString(token) {
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
                const innerAst = new this.constructor(innerTokens).parseProgram();

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

    parseUnary() {
        if (this.match('NOT', 'MINUS')) {
            let op = this.previous().value;
            let right = this.parseUnary();
            return { type: 'UnaryExpression', operator: op, right };
        }
        return this.parsePrimary();
    }

    parseMult() {
        let left = this.parseUnary();

        while (this.match('MULT', 'DIVIDE', 'MODULO')) {
            let op = this.previous().value;
            let right = this.parseUnary();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    parseAdd() {
        let left = this.parseMult();

        while (this.match('PLUS', 'MINUS')) {
            let op = this.previous().value;
            let right = this.parseMult();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    parseComparaison() {
        let left = this.parseAdd();

        while (this.match('LESS', 'GREATER', 'LESSEQUAL', 'GREATEREQUAL', 'IS')) {
            let opToken = this.previous();

            if (opToken.type === 'IS') {
                let targetSpec = null;

                if (this.match('NULL')) {
                    targetSpec = { kind: 'literal', value: null, label: 'NULL' };
                } else if (this.match('BOOL')) {
                    let bVal = this.previous().value;
                    targetSpec = { kind: 'literal', value: bVal, label: bVal ? 'TRUE' : 'FALSE' };
                } else {
                    targetSpec = { kind: 'type', typeInfo: this.parseType() };
                }

                left = { type: 'IsExpression', left, targetSpec };
            } else {
                let right = this.parseAdd();
                left = { type: 'MathExpression', operator: opToken.value, left, right };
            }
        }
        
        return left;
    }

    parseEquality() {
        let left = this.parseComparaison();

        while (this.match('EQUALS', 'NOTEQUALS')) {
            let op = this.previous().value;
            let right = this.parseComparaison();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    parseLogicAnd() {
        let left = this.parseEquality();

        while (this.match('AND')) {
            let op = this.previous().value;
            let right = this.parseEquality();
            left = { type: 'LogicalExpression', operator: op, left, right };
        }

        return left;
    }

    parseLogicOr() {
        let left = this.parseLogicAnd();

        while (this.match('OR')) {
            let op = this.previous().value;
            let right = this.parseLogicAnd();
            left = { type: 'LogicalExpression', operator: op, left, right };
        }

        return left;
    }

    parseCondition() {
        if (this.match('LPAREN')) {
            let cond = this.parseLogicOr();
            this.consume('RPAREN', "Unclosed parenthesis in condition.");
            return cond;
        } else if (this.check('IDENTIFIER')) {
            return { type: 'Variable', name: this.advance().value };
        } else if (this.check('NOT')) {
            return this.parseUnary();
        } else {
            printErr("[SyntaxError] Comparisons in conditions must be wrapped in parentheses '(...)'.");
        }
    }
}



    



class ParserControl extends ParserExpressions {
    parseIfStatement() {
        let cond = this.parseCondition();
        this.consume('THEN', "Expected 'then' after 'if' condition.");

        let thenBranch = [];
        while (!this.check('ELIF') && !this.check('ELSE') && !this.check('END') && !this.isAtEnd()) {
            thenBranch.push(this.parseStatement());
        }

        let elifBranches = [];
        while (this.match('ELIF')) {
            let elifCond = this.parseCondition();
            this.consume('THEN', "Expected 'then' after 'elif' condition.");

            let elifBody = [];
            while (!this.check('ELIF') && !this.check('ELSE') && !this.check('END') && !this.isAtEnd()) {
                elifBody.push(this.parseStatement());
            }
            elifBranches.push({ condition: elifCond, body: elifBody });
        }

        let elseBranch = null;
        if (this.match('ELSE')) {
            elseBranch = [];
            while (!this.check('END') && !this.isAtEnd()) {
                elseBranch.push(this.parseStatement());
            }
        }

        this.consume('END', "Unclosed 'if' block. Expected 'end'.");
        return {
            type: 'IfStatement',
            condition: cond,
            thenBranch,
            elifBranches,
            elseBranch
        };
    }

    parseForStatement() {
        let startToken = this.previous();
        this.consume('LPAREN', "Expected '(' before for-loop header.");

        let isForIn = false;
        for (let i = this.cursor; i < this.tokens.length; i++) {
            if (this.tokens[i].type === 'SEMICOLON' || this.tokens[i].type === 'RPAREN') break;
            if (this.tokens[i].type === 'IN') {
                isForIn = true;
                break;
            }
        }

        if (isForIn) {
            this.consume('IVAR', "Expected 'ivar' before variable name in for-in loop.");
            let firstVar = this.consume('IDENTIFIER', "Expected variable name in for-in loop.").value;
            let indexVar = null;
            let itemVar = firstVar;

            if (this.match('COMMA')) {
                indexVar = firstVar;
                itemVar = this.consume('IDENTIFIER', "Expected item variable name after ',' in for-in loop.").value;
            }

            this.consume('IN', "Expected 'in' keyword in for-in loop.");
            let iterable = this.parseLogicOr();
            this.consume('RPAREN', "Expected ')' after for-in loop header.");
            this.consume('THEN', "Expected 'then' after for-in loop header.");

            let body = [];
            while (!this.check('END') && !this.isAtEnd()) {
                body.push(this.parseStatement());
            }
            this.consume('END', "Unclosed 'for' loop. Expected 'end'.");

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
        if (!this.check('SEMICOLON')) {
            if (this.match('IVAR', 'ICONST')) {
                init = this.parseVarDeclaration();
            } else {
                init = this.parseAssignmentOrExpr();
            }
        }
        this.consume('SEMICOLON', "Expected ';' after for-loop initialization.");

        let condition = null;
        if (!this.check('SEMICOLON')) {
            condition = this.parseLogicOr();
        }
        this.consume('SEMICOLON', "Expected ';' after for-loop condition.");

        let update = null;
        if (!this.check('RPAREN')) {
            update = this.parseAssignmentOrExpr();
        }
        this.consume('RPAREN', "Expected ')' after for-loop header.");
        this.consume('THEN', "Expected 'then' after for-loop header.");

        let body = [];
        while (!this.check('END') && !this.isAtEnd()) {
            body.push(this.parseStatement());
        }
        this.consume('END', "Unclosed 'for' loop. Expected 'end'.");

        return {
            type: 'ForStatement',
            init,
            condition,
            update,
            body
        };
    }

    parseAssignmentOrExpr() {
        if (this.check('IDENTIFIER') && this.tokens[this.cursor + 1] && this.tokens[this.cursor + 1].type === 'INCREMENT') {
            let varName = this.advance().value;
            this.advance();
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: '+', left: { type: 'Variable', name: varName }, right: 1 }
            };
        }
        if (this.check('IDENTIFIER') && this.tokens[this.cursor + 1] && this.tokens[this.cursor + 1].type === 'DECREMENT') {
            let varName = this.advance().value;
            this.advance();
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: '-', left: { type: 'Variable', name: varName }, right: 1 }
            };
        }
        if (this.check('IDENTIFIER') && this.tokens[this.cursor + 1] && ['ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN'].includes(this.tokens[this.cursor + 1].type)) {
            let varName = this.advance().value;
            let assignToken = this.advance();
            let expr = this.parseLogicOr();
            if (assignToken.type === 'ASSIGN') {
                return { type: 'VarAssign', name: varName, value: expr };
            }
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: OP_MAP[assignToken.type], left: { type: 'Variable', name: varName }, right: expr }
            };
        }
        return this.parseLogicOr();
    }

    parseGivenStatement() {
        let exprTarget = this.parseEquality();
        let cases = [];

        this.consume('THEN', "Expected 'then' after 'given' expression.");

        while (!this.check('END') && !this.isAtEnd()) {
            this.consume('CASE', "Expected 'case' in 'given' block.");

            let isDefault = false;
            let caseValue = null;

            if (this.match('TILDE')) {
                isDefault = true;
            } else {
                caseValue = this.parseEquality();
            }

            this.consume('THEN', "Expected 'then' after case condition.");

            let caseBody = [];
            while (!this.check('CASE') && !this.check('END') && !this.isAtEnd()) {
                caseBody.push(this.parseStatement());
            }

            cases.push({ isDefault, value: caseValue, body: caseBody });
        }

        this.consume('END', "Unclosed 'given' block. Expected 'end'.");
        return {
            type: 'GivenStatement',
            target: exprTarget,
            cases
        };
    }

    parseWhileStatement() {
        let condition = this.parseCondition();
        this.consume('THEN', "Expected 'then' after 'while' condition.");

        let body = [];
        while (!this.check('END') && !this.isAtEnd()) {
            body.push(this.parseStatement());
        }
        this.consume('END', "Unclosed 'while' loop. Expected 'end'.");
        
        return {
            type: 'WhileStatement',
            condition,
            body
        };
    }

    parseDoWhileStatement() {
        let body = [];
        while (!this.check('WHILE') && !this.isAtEnd()) {
            body.push(this.parseStatement());
        }
        this.consume('WHILE', "Expected 'while' after 'do' loop body.");
        let condition = this.parseCondition();
        this.consume('SEMICOLON', "Expected ';' after 'do ... while' condition.");
        
        return {
            type: 'DoWhileStatement',
            condition,
            body
        };
    }

    parseParameterList() {
        let params = [];

        if (!this.check('RPAREN')) {
            while (true) {
                this.consume('IVAR', "Expected 'ivar' before parameter name.");

                let typeInfo = null;
                if (this.match('TILDE')) {
                    typeInfo = this.parseType();
                }

                let paramName = this.consume('IDENTIFIER', "Expected parameter name.").value;
                let hasDefault = false;
                let defaultValue = null;

                if (this.match('ASSIGN')) {
                    hasDefault = true;
                    defaultValue = this.parseLogicOr();
                }

                params.push({ name: paramName, typeInfo, hasDefault, defaultValue });

                if (!this.match('COMMA')) break;
            }
        }

        return params;
    }

    parseHookStatement() {
        let startToken = this.previous();
        
        let varName = this.consume('IDENTIFIER', "Expected function name or table after 'hook'.").value;
        let target = { type: 'Variable', name: varName };

        while (this.match('LBRACKET')) {
            let index = this.parseLogicOr();
            this.consume('RBRACKET', "Expected ']' after index in hook target.");
            target = { type: 'IndexAccess', target, index };
        }

        this.consume('LPAREN', "Expected '(' after hook target.");
        let params = this.parseParameterList();

        this.consume('RPAREN', "Expected ')' after hook parameters.");
        this.consume('THEN', "Expected 'then' after hook header.");

        let body = [];
        while (!this.check('END') && !this.isAtEnd()) {
            body.push(this.parseStatement());
        }

        this.consume('END', "Unclosed hook. Expected 'end'.");

        return {
            type: 'HookStatement',
            target,
            params,
            body,
            line: startToken.line,
            col: startToken.col
        };
    }

    parseFunctionDeclaration(isExpression = false) {
        let startToken = this.previous();
        let name = null;
        let isAnonymous = false;

        if (this.match('TILDE')) {
            isAnonymous = true;
        } else if (this.check('IDENTIFIER')) {
            name = this.advance().value;
        } else {
            printErr(`[SyntaxError: Line ${startToken.line}, Col ${startToken.col}] Expected function name or '~' for anonymous function after 'function'.`);
        }

        this.consume('LPAREN', "Expected '(' after function name or '~'.");
        let params = this.parseParameterList();

        this.consume('RPAREN', "Expected ')' after function parameters.");
        this.consume('THEN', "Expected 'then' after function header.");

        let body = [];
        while (!this.check('END') && !this.isAtEnd()) {
            body.push(this.parseStatement());
        }

        this.consume('END', "Unclosed function. Expected 'end'.");

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

    parseTryStatement() {
        let startToken = this.previous();
        this.match('THEN');

        let tryBlock = [];
        while (!this.check('CATCH') && !this.check('FINALLY') && !this.check('END') && !this.isAtEnd()) {
            tryBlock.push(this.parseStatement());
        }

        let catchVar = null;
        let catchBlock = null;

        if (this.match('CATCH')) {
            this.consume('LPAREN', "Expected '(' after 'catch'.");
            this.consume('IVAR', "Expected 'ivar' in catch parameter.");
            catchVar = this.consume('IDENTIFIER', "Expected variable name after 'ivar' in catch.").value;
            this.consume('RPAREN', "Expected ')' after catch parameter.");
            this.match('THEN');

            catchBlock = [];
            while (!this.check('FINALLY') && !this.check('END') && !this.isAtEnd()) {
                catchBlock.push(this.parseStatement());
            }
        }

        let finallyBlock = null;
        if (this.match('FINALLY')) {
            this.match('THEN');

            finallyBlock = [];
            while (!this.check('END') && !this.isAtEnd()) {
                finallyBlock.push(this.parseStatement());
            }
        }

        if (!catchBlock && !finallyBlock) {
            printErr(`[SyntaxError: Line ${startToken.line}, Col ${startToken.col}] 'try' block must contain at least a 'catch' or 'finally' clause.`);
        }

        this.consume('END', "Unclosed 'try' block. Expected 'end'.");

        return {
            type: 'TryStatement',
            tryBlock,
            catchVar,
            catchBlock,
            finallyBlock,
            line: startToken.line,
            col: startToken.col
        };
    }
}



    



class ParserStatements extends ParserControl {
    parseVarDeclaration() {
        let isConst = this.previous().type === 'ICONST';
        let isNullable = true;
        let explType = null;

        let typeInfo = null;
        if (this.match('TILDE')) {
            typeInfo = this.parseType();
            explType = typeInfo.baseType;
            isNullable = typeInfo.isNullable;
        }

        let names = [];
        while (true) {
            names.push(this.consume('IDENTIFIER', "Expected variable name in declaration.").value);
            if (!this.match('COMMA')) break;
        }

        this.consume('ASSIGN', `Missing '=' assignment operator after variable name '${names[names.length - 1]}'.`);

        let values = [];
        while (true) {
            values.push(this.parseLogicOr());
            if (!this.match('COMMA')) break;
        }

        if (values.length > names.length) {
            printErr(`[SyntaxError: ${this.formatLocation(this.peek() || this.previous())}] Too many values in declaration: expected at most ${names.length}, got ${values.length}.`);
        }

        if (names.length === 1) {
            return { type: 'VarDeclar', name: names[0], explType, isNullable, value: values[0], isConst, typeInfo };
        }

        let declarations = names.map((varName, i) => {
            let valueExpr = (i < values.length) ? values[i] : values[values.length - 1];
            return { type: 'VarDeclar', name: varName, explType, isNullable, value: valueExpr, isConst, typeInfo };
        });

        return { type: 'MultiVarDeclar', declarations };
    }

    parseAssignSuffix(targetDesc) {
        if (this.match('INCREMENT')) return { value: 1, operator: '+' };
        if (this.match('DECREMENT')) return { value: 1, operator: '-' };
        if (this.match('ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN')) {
            let op = OP_MAP[this.previous().type] || null;
            let expr = this.parseLogicOr();
            return { value: expr, operator: op };
        }
        printErr(`[SyntaxError: ${this.formatLocation(this.peek())}] Expected assignment operator after ${targetDesc}.`);
    }

    parseStatement() {
        let stmt;

        if (this.match('IF'))       return this.parseIfStatement();
        if (this.match('FOR'))      return this.parseForStatement();
        if (this.match('WHILE'))    return this.parseWhileStatement();
        if (this.match('GIVEN'))    return this.parseGivenStatement();
        if (this.match('DO'))       return this.parseDoWhileStatement();
        if (this.match('FUNCTION')) return this.parseFunctionDeclaration(false);
        if (this.match('HOOK'))     return this.parseHookStatement();
        if (this.match('TRY'))      return this.parseTryStatement();
        if (this.match('CLASS'))    return this.parseClassDeclaration();
        
        if (this.match('IVAR', 'ICONST')) {
            stmt = this.parseVarDeclaration();
        } else if (this.match('RETURN')) {
            let startToken = this.previous();

            let value = null;
            if (!this.check('SEMICOLON')) {
                value = this.parseLogicOr();
            }

            stmt = { type: 'ReturnStatement', value, line: startToken.line, col: startToken.col };
        } else if (this.match('IMPORT')) {
            let pkgName = this.consume('IDENTIFIER', "Expected package name after 'import'.").value;
            let modules = [];

            if (this.match('TILDE')) {
                this.consume('LPAREN', "Expected '(' after '~' in import statement.");

                if (!this.check('RPAREN')) {
                    while (true) {
                        modules.push(this.consume('IDENTIFIER', "Expected module name.").value);
                        if (!this.match('COMMA')) break;
                    }
                }

                this.consume('RPAREN', "Expected ')' after import module list.");
            }

            let aliasName = null;
            if (this.match('ALIAS')) {
                if (this.match('TILDE')) {
                    aliasName = '~';
                } else {
                    aliasName = this.consume('IDENTIFIER', "Expected alias name or '~' after 'alias'.").value;
                }
            }

            stmt = {
                type: 'ImportStatement',
                package: pkgName,
                modules,
                alias: aliasName
            };
        } else if (this.match('NAMESPACE')) {
            let startToken = this.previous();
            let nsName = this.consume('IDENTIFIER', "Expected namespace name after 'namespace'.").value;

            let modName = null;

            if (this.match('TILDE')) {
                if (nsName === 'Main') {
                    printErr(`[SyntaxError: Line ${startToken.line}, Col ${startToken.col}] Namespace 'Main' cannot be split into modules.`);
                }
                
                modName = this.consume('IDENTIFIER', "Expected module name after '~'.").value;
            }

            this.consume('THEN', `Expected 'then' after namespace declaration '${nsName}'.`);

            let body = [];
            while (!this.check('END') && !this.isAtEnd()) {
                body.push(this.parseStatement());
            }

            this.consume('END', `Expected 'end' to close namespace '${nsName}' block.`);

            return {
                type: 'NamespaceStatement',
                namespace: nsName,
                module: modName,
                body,
                line: startToken.line,
                col: startToken.col
            };
        } else if (this.match('PASTE', 'PASTELN')) {
            let isLn = this.previous().type === 'PASTELN';
            let kw = this.previous().value;

            this.consume('LPAREN', `Expected '(' after '${kw}'.`);

            let expr = undefined;
            let isEmpty = false;

            if (isLn && this.check('RPAREN')) {
                isEmpty = true;
            } else {
                expr = this.parseLogicOr();
            }

            this.consume('RPAREN', `Expected ')' after '${kw}' argument.`);
            stmt = { type: 'PasteStatement', expr, newLine: isLn, isEmpty };
        } else if (this.check('COPY') || this.check('COPYKEY')) {
            stmt = this.parsePrimary();
        } else if (this.match('CLEAR')) {
            this.consume('LPAREN', "Expected '(' after 'clear'.");
            
            let condition = null;
            if (!this.check('RPAREN')) {
                condition = this.parseLogicOr();
            }

            this.consume('RPAREN', "Expected ')' after 'clear' condition.");
            stmt = { type: 'ClearStatement', condition };
        } else if (this.match('EXIT')) {
            this.consume('LPAREN', "Expected '(' after 'exit'.");
            
            let condition = null;
            if (!this.check('RPAREN')) {
                condition = this.parseLogicOr();
            }

            this.consume('RPAREN', "Expected ')' after 'exit' condition.");
            stmt = { type: 'ExitStatement', condition };
        } else if (this.match('KILL')) {
            let startToken = this.previous();
            let varName = this.consume('IDENTIFIER', "Expected variable name after 'kill'.").value;
            
            stmt = { type: 'KillStatement', name: varName, line: startToken.line, col: startToken.col };
        } else if (this.match('THROW')) {
            let startToken = this.previous();
            let value = this.parseLogicOr();
            stmt = { type: 'ThrowStatement', value, line: startToken.line, col: startToken.col };
                } else if (this.check('IDENTIFIER') && this.tokens[this.cursor + 1] && this.tokens[this.cursor + 1].type === 'SWAP') {
            let leftVar = this.advance().value;
            this.advance();
            let rightVar = this.consume('IDENTIFIER', "Expected variable name after '<->' swap operator.").value;
            stmt = { type: 'SwapStatement', left: leftVar, right: rightVar };
        } else if (this.match('BREAK')) {
            stmt = { type: 'BreakStatement' };
        } else if (this.match('SKIP')) {
            stmt = { type: 'SkipStatement' };
        } else {
            let expr = this.parseLogicOr();
            const nextToken = this.peek();
            const isAssignOp = nextToken && ['INCREMENT', 'DECREMENT', 'ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN'].includes(nextToken.type);
            
            if (expr.type === 'Variable' && (this.check('TILDE') || isAssignOp)) {
                if (this.match('TILDE')) {
                    let typeInfo = this.parseType();
                    let targetType = typeInfo.baseType;
                    let isNullable = typeInfo.isNullable;

                    this.consume('ASSIGN', `Missing '=' assignment operator after '${expr.name}~${targetType}'.`);
                    let value = this.parseLogicOr();
                    stmt = { type: 'VarRetype', name: expr.name, targetType, isNullable, value, typeInfo };
                } else {
                    let rhs = this.parseAssignSuffix(`variable '${expr.name}'`);
                    stmt = {
                        type: 'VarAssign',
                        name: expr.name,
                        value: rhs.operator
                            ? { type: 'MathExpression', operator: rhs.operator, left: { type: 'Variable', name: expr.name }, right: rhs.value }
                            : rhs.value
                    };
                }
            } else if (expr.type === 'IndexAccess' && (this.check('TILDE') || isAssignOp)) {
                let typeInfo = this.match('TILDE') ? this.parseType() : null;
                let desc = expr.isDotAccess ? `property '${expr.index}'` : 'list index';
                let rhs = this.parseAssignSuffix(desc);
                stmt = {
                    type: 'MemberAssign',
                    target: expr.target,
                    index: expr.index,
                    isDotAccess: expr.isDotAccess,
                    value: rhs.value,
                    operator: rhs.operator,
                    typeInfo
                };
            } else {
                stmt = expr;
            }
        }

        this.consume('SEMICOLON', "Missing semicolon ';' at the end of statement.");
        return stmt;
    }

    parseClassDeclaration() {
        let startToken = this.previous();
        let className = this.consume('IDENTIFIER', "Expected class name after 'class'.").value;
        
        let superClass = null;
        if (this.match('FROM')) {
            superClass = this.consume('IDENTIFIER', `Expected superclass name after 'from' in class '${className}'.`).value;
        }

        this.consume('THEN', `Expected 'then' after class declaration '${className}'.`);

        let fields = [];
        let methods = [];

        while (!this.check('END') && !this.isAtEnd()) {
            let access = 'public';
            if (this.match('PUBLIC')) {
                access = 'public';
            } else if (this.match('PRIVATE')) {
                access = 'private';
            }

            if (this.match('IVAR', 'ICONST')) {
                let decl = this.parseVarDeclaration();
                if (decl.type === 'MultiVarDeclar') {
                    for (let d of decl.declarations) {
                        fields.push({ ...d, access });
                    }
                } else {
                    fields.push({ ...decl, access });
                }
                this.consume('SEMICOLON', "Missing semicolon ';' after field declaration in class.");
            } else if (this.match('FUNCTION')) {
                let method = this.parseFunctionDeclaration(false);
                methods.push({ ...method, access });
            } else {
                let tok = this.peek();
                printErr(`[SyntaxError: ${this.formatLocation(tok)}] Unexpected token '${tok ? tok.value : 'EOF'}' inside class '${className}'. Expected field or method declaration.`);
            }
        }

        this.consume('END', `Expected 'end' to close class '${className}' block.`);

        return {
            type: 'ClassDeclaration',
            name: className,
            superClass,
            fields,
            methods,
            line: startToken.line,
            col: startToken.col
        };
    }

    parseProgram() {
        let statements = [];
        while (!this.isAtEnd()) {
            statements.push(this.parseStatement());
        }

        return {
            type: 'Program',
            body: statements
        };
    }
}



    

function parse(tokens) {
    const parser = new ParserStatements(tokens);
    return parser.parseProgram();
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
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, Math.max(0, ms))),
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
    const getCwd = () => (typeof process !== 'undefined' && typeof process.cwd === 'function') ? process.cwd() : '/';

let currentCliArgs = [];
let currentProjectContext = {
    baseDir: getCwd(),
    entryFilePath: null
};

function setCliArgs(cliArgs) {
    currentCliArgs = Array.isArray(cliArgs) ? [...cliArgs] : [];
}

function setProjectContext(baseDir, entryFilePath = null) {
    currentProjectContext = {
        baseDir: baseDir || getCwd(),
        entryFilePath: entryFilePath || null
    };
}

function getProjectContext() {
    return currentProjectContext;
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
    if (targetType === 'Bool') {
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





    



const KNOWN_TYPES = new Set([
    'Int', 'Float', 'String', 'Bool', 'List', 'Stack', 'Queue', 'Table', 'Function', 'Null'
]);

async function evalMath(node, env, evaluate) {
    let left = await evaluate(node.left, env);
    let right = await evaluate(node.right, env);

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

async function evalUnary(node, env, evaluate) {
    let right = await evaluate(node.right, env);
    if (node.operator === '!') return !isTruthy(right);
    if (node.operator === '-') return -right;
    printErr(`[RuntimeError] Unsupported unary operator '${node.operator}'.`);
}

async function evalLogical(node, env, evaluate) {
    let left = await evaluate(node.left, env);
    if (node.operator === '&&') {
        if (!isTruthy(left)) return false;
        return isTruthy(await evaluate(node.right, env));
    }
    if (node.operator === '||') {
        if (isTruthy(left)) return true;
        return isTruthy(await evaluate(node.right, env));
    }
    printErr(`[RuntimeError] Unsupported logical operator '${node.operator}'.`);
}

async function evalIs(node, env, evaluate) {
    let val = await evaluate(node.left, env);
    let spec = node.targetSpec;

    if (spec.kind === 'literal') {
        return val === spec.value;
    }

    let { baseType, elemType, isElemNullable } = spec.typeInfo;

    if (!KNOWN_TYPES.has(baseType)) {
        let scope = findScope(baseType, env);
        let classEntry = scope && scope.values[baseType];
        if (classEntry && classEntry.value && classEntry.value.kind === 'Class') {
            if (!val || val.kind !== 'Table' || !val.isInstance) return false;

            let curr = val.classRef;

            while (curr) {
                if (curr.name === baseType) return true;
                curr = curr.superClass;
            }
            
            return false;
        }
        
        printErr(`[TypeError] Unknown type '${baseType}' in 'is' check.`);
    }

    if (val && val.isInstance && baseType === 'Table') {
        return true;
    }

    if (getType(val) !== baseType) {
        return false;
    }

    if (node.left.type === 'Variable') {
        let scope = findScope(node.left.name, env);
        let varEntry = scope && scope.values[node.left.name];
        if (varEntry && varEntry.typeInfo && varEntry.typeInfo.elemType) {
            if (varEntry.typeInfo.elemType !== elemType) {
                return false;
            }
            if (!isElemNullable && varEntry.typeInfo.isElemNullable) {
                let items = Array.isArray(val) ? val : val.items;
                return items.every(el => el !== null);
            }
            return true;
        }
    }

    let items = Array.isArray(val) ? val : val.items;
    return items.every(el => {
        if (el === null) return isElemNullable;
        return getType(el) === elemType;
    });
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

async function evalVarDeclar(node, env, evaluate) {
    let rawVal = await evaluate(node.value, env);
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

async function evalVarAssign(node, env, evaluate) {
    let scope = findScope(node.name, env);
    if (!scope) printErr(`[ReferenceError] Cannot reassign undeclared variable '${node.name}'.`);
    let target = scope.values[node.name];
    if (target.isConst) printErr(`[TypeError] Cannot reassign constant '${node.name}'.`);

    let rawVal = await evaluate(node.value, env);
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

async function evalVarRetype(node, env, evaluate) {
    let scope = findScope(node.name, env);
    if (!scope) printErr(`[ReferenceError] Cannot retype undeclared variable '${node.name}'.`);
    let target = scope.values[node.name];
    if (target.isConst) printErr(`[TypeError] Cannot retype constant '${node.name}'.`);

    let rawVal = await evaluate(node.value, env);
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





    




async function evalClassDeclaration(node, env) {
    let superClassObj = null;
    if (node.superClass) {
        const scope = findScope(node.superClass, env);
        const entry = scope && scope.values[node.superClass];
        if (!entry || !entry.value || entry.value.kind !== 'Class') {
            printErr(`[ReferenceError] Cannot inherit from undefined class '${node.superClass}'.`);
        }
        superClassObj = entry.value;
    }

    const classObj = {
        kind: 'Class',
        name: node.name,
        superClass: superClassObj,
        fields: node.fields,
        methods: {},
        constructor: null,
        privateMembers: new Set()
    };

    for (const f of node.fields) {
        if (f.access === 'private') {
            classObj.privateMembers.add(f.name);
        }
    }

    for (const m of node.methods) {
        if (m.access === 'private') {
            classObj.privateMembers.add(m.name);
        }
        if (m.name === node.name) {
            classObj.constructor = m;
        } else {
            classObj.methods[m.name] = m;
        }
    }

    env.values[node.name] = {
        value: classObj,
        type: 'Class',
        isConst: true,
        isNullable: false
    };

    return classObj;
}

function getHierarchy(classObj) {
    const chain = [];
    let curr = classObj;
    while (curr) {
        chain.unshift(curr);
        curr = curr.superClass;
    }
    return chain;
}

function createBaseBinding(instance, currentClass, env, evaluate) {
    const superClass = currentClass.superClass;
    if (!superClass) return null;

    const baseFn = async (rawArgs, callEnv, evalFn) => {
        const activeEval = evalFn || evaluate;
        const activeEnv = callEnv || env;
        if (superClass.constructor) {
            const ctorAst = superClass.constructor;
            const ctorClosure = createScope(env);
            ctorClosure.values['this'] = {
                value: instance,
                type: 'Table',
                isConst: true,
                isNullable: false
            };
            if (superClass.superClass) {
                ctorClosure.values['base'] = {
                    value: createBaseBinding(instance, superClass, env, activeEval),
                    type: 'Base',
                    isConst: true,
                    isNullable: false
                };
            }
            const ctorObj = {
                kind: 'Function',
                name: ctorAst.name,
                params: ctorAst.params,
                body: ctorAst.body,
                closure: ctorClosure,
                boundInstance: instance,
                declaringClass: superClass.name
            };
            return await evalCall({ caller: { type: 'Literal', value: ctorObj }, args: rawArgs }, activeEnv, activeEval);
        } else if (rawArgs.length > 0) {
            printErr(`[TypeError] Superclass '${superClass.name}' has no constructor that takes ${rawArgs.length} arguments.`);
        }
    };

    const baseObj = {
        kind: 'Base',
        isBase: true,
        fn: baseFn,
        superClass,
        instance,
        fields: {}
    };

    const superChain = getHierarchy(superClass);
    for (const ancestor of superChain) {
        for (const [mName, mAst] of Object.entries(ancestor.methods)) {
            const mClosure = createScope(env);
            mClosure.values['this'] = {
                value: instance,
                type: 'Table',
                isConst: true,
                isNullable: false
            };
            if (ancestor.superClass) {
                mClosure.values['base'] = {
                    value: createBaseBinding(instance, ancestor, env, evaluate),
                    type: 'Base',
                    isConst: true,
                    isNullable: false
                };
            }
            const methodFn = {
                kind: 'Function',
                name: mAst.name,
                params: mAst.params,
                body: mAst.body,
                closure: mClosure,
                boundInstance: instance,
                declaringClass: ancestor.name
            };
            baseObj.fields[mName] = {
                value: methodFn,
                type: 'Function',
                isNullable: false,
                isConst: true
            };
        }
    }

    return baseObj;
}

async function instantiateClass(classObj, rawArgs, env, evaluate) {
    const chain = getHierarchy(classObj);
    const privateMembers = new Set();
    const privateOwners = new Map();

    for (const c of chain) {
        for (const pm of c.privateMembers) {
            privateMembers.add(pm);
            privateOwners.set(pm, c.name);
        }
    }

    const instance = {
        kind: 'Table',
        className: classObj.name,
        isInstance: true,
        classRef: classObj,
        fields: {},
        privateMembers,
        privateOwners
    };

    for (const c of chain) {
        const initEnv = createScope(env);
        initEnv.values['this'] = {
            value: instance,
            type: 'Table',
            isConst: true,
            isNullable: false
        };
        if (c.superClass) {
            initEnv.values['base'] = {
                value: createBaseBinding(instance, c, env, evaluate),
                type: 'Base',
                isConst: true,
                isNullable: false
            };
        }

        for (const field of c.fields) {
            let val = null;
            if (field.value !== undefined && field.value !== null) {
                val = await evaluate(field.value, initEnv);
            }

            let fieldType = field.explType || getType(val);
            if (field.typeInfo && field.typeInfo.baseType) {
                fieldType = field.typeInfo.baseType;
                if (!field.typeInfo.isNullable && val === null) {
                    printErr(`[TypeError] Cannot assign NULL to non-nullable field '${field.name}' of type '(${fieldType})'.`);
                }
                if (val !== null) {
                    val = castToType(val, fieldType);
                }
            } else if (!field.isNullable && val === null) {
                printErr(`[TypeError] Cannot assign NULL to non-nullable field '${field.name}'.`);
            }

            instance.fields[field.name] = {
                value: val,
                type: fieldType,
                isNullable: field.isNullable !== false,
                isConst: !!field.isConst
            };
        }
    }

    for (const c of chain) {
        for (const [methodName, methodAst] of Object.entries(c.methods)) {
            const methodClosure = createScope(env);
            methodClosure.values['this'] = {
                value: instance,
                type: 'Table',
                isConst: true,
                isNullable: false
            };
            if (c.superClass) {
                methodClosure.values['base'] = {
                    value: createBaseBinding(instance, c, env, evaluate),
                    type: 'Base',
                    isConst: true,
                    isNullable: false
                };
            }

            const fnObj = {
                kind: 'Function',
                name: methodAst.name,
                params: methodAst.params,
                body: methodAst.body,
                closure: methodClosure,
                boundInstance: instance,
                declaringClass: c.name
            };

            instance.fields[methodName] = {
                value: fnObj,
                type: 'Function',
                isNullable: false,
                isConst: true
            };
        }
    }

    if (classObj.constructor) {
        const ctorAst = classObj.constructor;
        const ctorClosure = createScope(env);
        ctorClosure.values['this'] = {
            value: instance,
            type: 'Table',
            isConst: true,
            isNullable: false
        };
        if (classObj.superClass) {
            ctorClosure.values['base'] = {
                value: createBaseBinding(instance, classObj, env, evaluate),
                type: 'Base',
                isConst: true,
                isNullable: false
            };
        }

        const ctorFn = {
            kind: 'Function',
            name: ctorAst.name,
            params: ctorAst.params,
            body: ctorAst.body,
            closure: ctorClosure,
            boundInstance: instance,
            declaringClass: classObj.name
        };

        await evalCall({ caller: { type: 'Literal', value: ctorFn }, args: rawArgs }, env, evaluate);
    } else if (rawArgs.length > 0) {
        printErr(`[TypeError] Class '${classObj.name}' has no constructor that takes ${rawArgs.length} arguments.`);
    }

    return instance;
}

function checkPrivateAccess(target, memberName, env, isMethod = false) {
    if (!target || !target.isInstance || !target.privateMembers || !target.privateMembers.has(memberName)) {
        return;
    }

    const activeThis = findScope('this', env);
    const callerThis = activeThis ? activeThis.values['this'].value : null;

    if (!callerThis || callerThis !== target) {
        const kind = isMethod ? 'method' : 'member';
        printErr(`[TypeError] Cannot access private ${kind} '${memberName}' of class '${target.className}'.`);
    }

    if (target.privateOwners && target.privateOwners.has(memberName)) {
        const ownerClass = target.privateOwners.get(memberName);
        const activeFnScope = findScope('__currentFunction', env);
        const currentFn = activeFnScope ? activeFnScope.values['__currentFunction'].value : null;
        if (currentFn && currentFn.declaringClass && currentFn.declaringClass !== ownerClass) {
            const kind = isMethod ? 'method' : 'member';
            printErr(`[TypeError] Cannot access private ${kind} '${memberName}' of parent class '${ownerClass}'.`);
        }
    }
}



    





async function evalListLiteral(node, env, evaluate) {
    return await mapAsync(node.elements, async (el) => await await evaluate(el, env));
}

async function evalIndexAccess(node, env, evaluate) {
    let target = await evaluate(node.target, env);

    if (target && (target.kind === 'Table' || target.isBase)) {
        if (!node.isDotAccess) {
            printErr("[TypeError] Tables do not support bracket indexing. Use dot notation 'table.property' instead.");
        }

        let key = node.index;

        checkPrivateAccess(target, key, env, false);

        if (key in target.fields) {
            return target.fields[key].value;
        }
        
        return null;
    }

    if (node.isDotAccess) {
        printErr(`[TypeError] Cannot access '${getType(target)}' with dot notation. Use bracket indexing 'list[index]' instead.`);
    }

    if (typeof target === 'string') {
        let idx = await evaluate(node.index, env);
        if (!Number.isInteger(idx)) printErr(`[IndexError] String index must be an integer, got '${idx}'.`);
        if (idx < 0 || idx >= target.length) printErr(`[IndexError] Index ${idx} out of bounds for string of length ${target.length}.`);
        return target[idx];
    }

    if (!Array.isArray(target)) printErr(`[TypeError] Cannot index non-list value of type '${getType(target)}'.`);
    let idx = await evaluate(node.index, env);
    if (!Number.isInteger(idx)) printErr(`[IndexError] List index must be an integer, got '${idx}'.`);
    if (idx < 0 || idx >= target.length) printErr(`[IndexError] Index ${idx} out of bounds for list of length ${target.length}.`);
    return target[idx];
}

function applyCompoundOp(currVal, rhsVal, operator) {
    switch (operator) {
        case '+': return currVal + rhsVal;
        case '-': return currVal - rhsVal;
        case '*': return currVal * rhsVal;
        case '/':
            if (rhsVal === 0) printErr("[MathError] Division by zero is undefined.");
            return currVal / rhsVal;
        case '%':
            if (rhsVal === 0) printErr("[MathError] Division or modulo by zero is undefined.");
            return currVal % rhsVal;
        default:
            return rhsVal;
    }
}

async function evalMemberAssign(node, env, evaluate) {
    let root = node.target;
    while (root && root.type === 'IndexAccess') {
        root = root.target;
    }

    let rootVarEntry = null;
    if (root && root.type === 'Variable') {
        let scope = findScope(root.name, env);
        if (!scope) printErr(`[ReferenceError] Variable '${root.name}' is not defined.`);
        
        rootVarEntry = scope.values[root.name];
        if (rootVarEntry.isConst && root.name !== 'this') {
            printErr(`[TypeError] Cannot modify constant '${root.name}'.`);
        }
    }

    let container = await evaluate(node.target, env);

    if (node.isDotAccess) {
        if (!container || container.kind !== 'Table') {
            printErr(`[TypeError] Cannot set property '${node.index}' on non-Table value of type '${getType(container)}'.`);
        }

        checkPrivateAccess(container, node.index, env, false);

        let key = node.index;
        let newVal = await evaluate(node.value, env);

        if (node.operator) {
            let currVal = (key in container.fields) ? container.fields[key].value : 0;
            newVal = applyCompoundOp(currVal, newVal, node.operator);
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
            container.fields[key] = { value: newVal, type: targetType, isNullable };
            return newVal;
        }

        if (key in container.fields) {
            let field = container.fields[key];
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

        container.fields[key] = {
            value: newVal,
            type: getType(newVal),
            isNullable: true
        };
        return newVal;
    }

    if (container && container.kind === 'Table') {
        printErr(`[TypeError] Tables do not support bracket assignment. Use dot notation 'table.${await evaluate(node.index, env)} = ...' instead.`);
    }

    if (!Array.isArray(container)) {
        printErr(`[TypeError] Cannot index non-list value of type '${getType(container)}'.`);
    }

    let idx = await evaluate(node.index, env);
    if (!Number.isInteger(idx)) printErr(`[IndexError] List index must be an integer, got '${idx}'.`);
    if (idx < 0 || idx >= container.length) {
        printErr(`[IndexError] Index ${idx} out of bounds for list of length ${container.length}.`);
    }

    let newVal = await evaluate(node.value, env);
    if (node.operator) {
        newVal = applyCompoundOp(container[idx], newVal, node.operator);
    }

    let listTypeInfo = (node.target.type === 'Variable') ? rootVarEntry?.typeInfo : null;
    if (listTypeInfo && listTypeInfo.elemType) {
        if (newVal === null) {
            if (!listTypeInfo.isElemNullable) {
                printErr(`[TypeError] Cannot assign NULL to non-nullable element of list '${node.target.name}'.`);
            }
        } else {
            newVal = castToType(newVal, listTypeInfo.elemType);
        }
    } else if (node.typeInfo) {
        let targetType = node.typeInfo.baseType;
        if (!node.typeInfo.isNullable && newVal === null) {
            printErr(`[TypeError] Cannot assign NULL to non-nullable element of type '(${targetType})'.`);
        }
        if (newVal !== null) {
            newVal = castToType(newVal, targetType);
        }
    }

    container[idx] = newVal;
    return newVal;
}

async function evalMethodCall(node, env, evaluate) {
    let target = await evaluate(node.target, env);
    let targetType = getType(target);

    if (target && (target.kind === 'Table' || target.isBase)) {
        let methodName = node.method;

        checkPrivateAccess(target, methodName, env, true);

        if (methodName in target.fields) {
            let fnObj = target.fields[methodName].value;
            if (fnObj && fnObj.kind === 'Class') {
                return await instantiateClass(fnObj, node.args, env, evaluate);
            }

            if (fnObj && fnObj.kind === 'Function') {
                if (fnObj.isNative) {
                    let evaluatedArgs = await mapAsync(node.args, async (a) => await await evaluate(a, env));
                    return await fnObj.fn(...evaluatedArgs);
                }
                return await evalCall({ caller: { type: 'Literal', value: fnObj }, args: node.args }, env, evaluate);
            }

            printErr(`[TypeError] Field '${methodName}' on Table is not a callable function.`);
        }

        let targetDesc = target.isInstance ? `class '${target.className}'` : 'Table';
        printErr(`[ReferenceError] Method or field '${methodName}' does not exist on ${targetDesc}.`);
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

            let val = await evaluate(node.args[0], env);

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
                    let pos = await evaluate(node.args[1], env);
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

                let pos = await evaluate(node.args[0], env);
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

                let pos = await evaluate(node.args[0], env);
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



    



async function evalTableLiteral(node, env, evaluate) {
    let fields = {};

    for (let entry of node.entries) {
        let rawVal = await evaluate(entry.value, env);
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

async function evalPropertyAssign(node, env, evaluate) {
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
    let newVal = await evaluate(node.value, env);

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




    



async function executeBlock(statements, parentEnv, evaluate) {
    let blockEnv = createScope(parentEnv);
    for (let stmt of statements) {
        let res = await evaluate(stmt, blockEnv);
        if (res && (res.isBreak || res.isSkip || res.isReturn)) return res;
    }
    return null;
}

async function evalIf(node, env, evaluate) {
    if (isTruthy(await evaluate(node.condition, env))) {
        return await executeBlock(node.thenBranch, env, evaluate);
    }
    if (node.elifBranches && node.elifBranches.length > 0) {
        for (let elif of node.elifBranches) {
            if (isTruthy(await evaluate(elif.condition, env))) {
                return await executeBlock(elif.body, env, evaluate);
            }
        }
    }
    if (node.elseBranch) {
        return await executeBlock(node.elseBranch, env, evaluate);
    }
}

async function evalFor(node, env, evaluate) {
    let forEnv = createScope(env);
    if (node.init) await evaluate(node.init, forEnv);

    while (true) {
        if (node.condition && !isTruthy(await evaluate(node.condition, forEnv))) break;
        let res = await executeBlock(node.body, forEnv, evaluate);
        
        if (res && res.isBreak) break;

        if (node.update) await evaluate(node.update, forEnv);

        if (res && res.isReturn) return res;
    }
}

async function evalWhile(node, env, evaluate) {
    while (isTruthy(await evaluate(node.condition, env))) {
        let res = await executeBlock(node.body, env, evaluate);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    }
}

async function evalDoWhile(node, env, evaluate) {
    do {
        let res = await executeBlock(node.body, env, evaluate);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    } while (isTruthy(await evaluate(node.condition, env)));
}

async function evalGiven(node, env, evaluate) {
    let val = await evaluate(node.target || node.expr, env);
    let matchedIndex = -1;
    let defaultIndex = -1;

    for (let i = 0; i < node.cases.length; i++) {
        let c = node.cases[i];
        
        if (c.isDefault) {
            defaultIndex = i;
        } else if (matchedIndex === -1) {
            let caseVal = await evaluate(c.value !== undefined ? c.value : c.condition, env);
            if (caseVal === val) matchedIndex = i;
        }
    }

    if (matchedIndex !== -1) {
        let res = await executeBlock(node.cases[matchedIndex].body, env, evaluate);
        if ((!res || !res.isBreak) && defaultIndex !== -1) {
            await executeBlock(node.cases[defaultIndex].body, env, evaluate);
        }
    } else if (defaultIndex !== -1) {
        await executeBlock(node.cases[defaultIndex].body, env, evaluate);
    }
}

async function evalForIn(node, env, evaluate) {
    let collection = await evaluate(node.iterable, env);
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

        let res = await executeBlock(node.body, forEnv, evaluate);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    }
}

async function evalThrow(node, env, evaluate) {
    let rawVal = await evaluate(node.value, env);
    let formattedMsg = formatExceptionMessage(rawVal, node.line, node.col, formatKurobaValue(rawVal));
    if (isInsideTry()) {
        throw new KurobaUserException(rawVal, formattedMsg);
    }
    printException(formattedMsg);
}

async function evalTry(node, env, evaluate) {
    let tryEnv = createScope(env);
    let caughtValue = null;
    let hasError = false;
    let blockResult = null;
    let unhandledError = null;

    pushTryContext();
    try {
        blockResult = await executeBlock(node.tryBlock, tryEnv, evaluate);
    } catch (err) {
        hasError = true;
        if (err && err.isKurobaUserException) {
            caughtValue = err.value;
        } else if (err && err.isKurobaRuntimeError) {
            caughtValue = parseRuntimeErrorToTable(err.message);
        } else {
            unhandledError = err;
        }
    } finally {
        popTryContext();
    }

    if (unhandledError) throw unhandledError;

    if (hasError && node.catchBlock) {
        let catchEnv = createScope(env);
        if (node.catchVar) {
            catchEnv.values[node.catchVar] = {
                value: caughtValue,
                type: getType(caughtValue),
                isConst: false,
                isNullable: true
            };
        }
        blockResult = await executeBlock(node.catchBlock, catchEnv, evaluate);
    }

    if (node.finallyBlock) {
        let finallyEnv = createScope(env);
        let finRes = await executeBlock(node.finallyBlock, finallyEnv, evaluate);
        if (finRes && (finRes.isReturn || finRes.isBreak || finRes.isSkip)) {
            blockResult = finRes;
        }
    }

    return blockResult;
}



    



const MAX_CALL_DEPTH = 512;
let callDepth = 0;

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

async function evalReturn(node, env, evaluate) {
    let value = null;
    if (node.value !== null && node.value !== undefined) {
        value = await evaluate(node.value, env);
    }
    return { isReturn: true, value };
}

async function evalCall(node, env, evaluate) {
    if (callDepth >= MAX_CALL_DEPTH) {
        printErr(`[RecursionError] Maximum recursion depth (${MAX_CALL_DEPTH}) exceeded.`);
    }

    let caller = await evaluate(node.caller, env);
    
    if (caller && caller.kind === 'Class') {
        
        return await instantiateClass(caller, node.args, env, evaluate);
    }

    if (caller && caller.isBase) {
        return await caller.fn(node.args, env, evaluate);
    }
    
    if (!caller || caller.kind !== 'Function') {
        let typeName = getType(caller);
        printErr(`[TypeError] Cannot call non-function value of type '${typeName}'.`);
    }

    if (caller.isNative) {
        let evaluatedArgs = await mapAsync(node.args, async (a) => await await evaluate(a, env));
        return await caller.fn(...evaluatedArgs);
    }

    let minArgs = 0;
    for (let i = 0; i < caller.params.length; i++) {
        if (!caller.params[i].hasDefault) {
            minArgs = i + 1;
        }
    }
    let maxArgs = caller.params.length;

    if (node.args.length < minArgs || node.args.length > maxArgs) {
        let funcName = caller.name || '~';
        if (minArgs === maxArgs) {
            printErr(`[TypeError] Function '${funcName}' expects ${maxArgs} arguments, got ${node.args.length}.`);
        } else {
            printErr(`[TypeError] Function '${funcName}' expects between ${minArgs} and ${maxArgs} arguments, got ${node.args.length}.`);
        }
    }

    if (callDepth >= MAX_CALL_DEPTH) {
        let funcName = caller.name || '~';
        printErr(`[RecursionError] Maximum recursion depth (${MAX_CALL_DEPTH}) exceeded in function '${funcName}'.`);
    }

    callDepth++;
    try {
        let fnEnv = createScope(caller.closure);

        for (let i = 0; i < caller.params.length; i++) {
            let param = caller.params[i];
            let argVal;
            if (i < node.args.length) {
                argVal = await evaluate(node.args[i], env);
            } else if (param.defaultClosure) {
                let defaultEnv = { values: fnEnv.values, parent: param.defaultClosure };
                argVal = await evaluate(param.defaultValue, defaultEnv);
            } else {
                argVal = await evaluate(param.defaultValue, fnEnv);
            }

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
            let res = await evaluate(stmt, fnEnv);
            if (res && res.isReturn) {
                return res.value;
            }
        }

        return null;
    } finally {
        callDepth--;
    }
}

async function evalHook(node, env, evaluate) {
    let origFunc = await evaluate(node.target, env);

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
    let hookParams = node.params.map((p, i) => {
        let origParam = origFunc.params && origFunc.params[i];
        if (!p.hasDefault && origParam && origParam.hasDefault) {
            return {
                ...p,
                hasDefault: true,
                defaultValue: origParam.defaultValue,
                defaultClosure: origParam.defaultClosure || origFunc.closure
            };
        }
        return p;
    });

    let hookFunc = {
        kind: 'Function',
        name: origFunc.name,
        params: hookParams,
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
        let table = await evaluate(node.target.target, env);
        let key = String(await evaluate(node.target.index, env));

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



    // Web IO functions (async for integrated terminal input)
    async function evalPaste(node, env) {
        if (node.isEmpty) {
            if (node.newLine && activePrintHandler) activePrintHandler('', true);
            return null;
        }
        let val = await evaluate(node.expr, env);
        let txt = formatKurobaValue(val);
        if (activePrintHandler) activePrintHandler(txt, node.newLine);
        return val;
    }

    async function evalCopy(node, env) {
        let promptText = "";
        if (node.prompt !== null) {
            let val = await evaluate(node.prompt, env);
            promptText = formatKurobaValue(val);
        }

        if (activeInputHandler) {
            return await activeInputHandler(promptText, !!node.oneKey);
        }

        let fallbackPrompt = promptText || "Entrée Kuroba :";
        let result = (typeof prompt === 'function' ? prompt(fallbackPrompt) : "") || "";
        if (node.oneKey) return result.charAt(0);
        return result;
    }

    async function evalClear(node, env) {
        if (node.condition !== null) {
            let condVal = await evaluate(node.condition, env);
            if (!isTruthy(condVal)) return null;
        }
        if (activeClearHandler) activeClearHandler();
        return null;
    }

    async function evalExit(node, env) {
        if (node.condition !== null) {
            let condVal = await evaluate(node.condition, env);
            if (!isTruthy(condVal)) return null;
        }
        if (activePrintHandler) activePrintHandler("[Exit] Exécution interrompue par instruction exit.", true);
        throw new Error("[Exit] Programme arrêté (exit).");
    }

    // Web Packages functions (using virtual stdlib + user workspace files)
    const moduleCache = {};
    let activeWorkspaceFiles = {};
    let workspaceModuleCache = {};
    let activeWorkspaceImports = new Set();

    async function evaluateNamespaceBody(statements, topImports = []) {
        const fileScope = createScope();
        for (const [name, fn] of Object.entries(natives)) {
            fileScope.values['__native_' + name] = {
                value: { kind: 'Function', isNative: true, fn },
                type: 'Function',
                isConst: true,
                isNullable: false
            };
        }
        for (const imp of topImports) {
            await evaluate(imp, fileScope);
        }
        const moduleScope = createScope(fileScope);
        for (const stmt of statements) {
            await evaluate(stmt, moduleScope);
        }
        const tableFields = {};
        for (const [varName, varEntry] of Object.entries(moduleScope.values)) {
            tableFields[varName] = {
                value: varEntry.value,
                type: varEntry.type,
                isNullable: varEntry.isNullable
            };
        }
        return { kind: 'Table', fields: tableFields };
    }

    async function discoverNamespaceModules(pkgName) {
        const discovered = {};

        if (pkgName === 'Std') {
            for (const [fileName, source] of Object.entries(VIRTUAL_STD_FILES)) {
                const ast = parse(tokenize(source));
                const topImports = ast.body.filter(s => s.type === 'ImportStatement');
                for (const stmt of ast.body) {
                    if (stmt.type === 'NamespaceStatement' && stmt.namespace === pkgName) {
                        const modName = stmt.module || pkgName;
                        const cacheKey = pkgName + ':' + modName;
                        if (!moduleCache[cacheKey]) {
                            moduleCache[cacheKey] = {
                                isRoot: !stmt.module,
                                table: await evaluateNamespaceBody(stmt.body, topImports)
                            };
                        }
                        discovered[modName] = moduleCache[cacheKey];
                    }
                }
            }
        }

        for (const [fileName, source] of Object.entries(activeWorkspaceFiles)) {
            if (fileName === 'main.krb' || !source || !source.trim()) continue;
            const ast = parse(tokenize(source));
            const topImports = ast.body.filter(s => s.type === 'ImportStatement');
            for (const stmt of ast.body) {
                if (stmt.type === 'NamespaceStatement' && stmt.namespace === pkgName) {
                    const modName = stmt.module || pkgName;
                    const cacheKey = pkgName + ':' + modName + ':' + (stmt.module ? 'sub' : 'root');
                    if (!workspaceModuleCache[cacheKey]) {
                        if (activeWorkspaceImports.has(cacheKey)) {
                            const modLabel = stmt.module ? (pkgName + '~' + stmt.module) : pkgName;
                            printErr("[ImportError] Circular import detected for namespace '" + modLabel + "'.");
                        }
                        activeWorkspaceImports.add(cacheKey);
                        try {
                            workspaceModuleCache[cacheKey] = {
                                isRoot: !stmt.module,
                                table: await evaluateNamespaceBody(stmt.body, topImports)
                            };
                        } finally {
                            activeWorkspaceImports.delete(cacheKey);
                        }
                    }
                    discovered[modName] = workspaceModuleCache[cacheKey];
                }
            }
        }

        return discovered;
    }

    async function evalImport(node, env) {
        if (node.package === 'Main') {
            printErr("[ImportError] Cannot import namespace 'Main'. 'Main' is the execution root.");
        }

        const availableModules = await discoverNamespaceModules(node.package);
        if (Object.keys(availableModules).length === 0) {
            printErr("[ImportError] Unknown package or namespace '" + node.package + "'. Create a file with 'namespace " + node.package + " then ... end' or import 'Std'.");
        }

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
            for (const [modName, entry] of Object.entries(modulesToBind)) {
                if (entry.isRoot) {
                    for (const [fieldName, fieldDef] of Object.entries(entry.table.fields)) {
                        if (fieldName !== 'args' && fieldName !== 'Std') {
                            env.values[fieldName] = {
                                value: fieldDef.value,
                                type: fieldDef.type,
                                isConst: true,
                                isNullable: fieldDef.isNullable
                            };
                        }
                    }
                } else {
                    env.values[modName] = {
                        value: entry.table,
                        type: 'Table',
                        isConst: true,
                        isNullable: false
                    };
                }
            }
            return null;
        }

        const targetName = node.alias || node.package;
        if (!env.values[targetName]) {
            env.values[targetName] = {
                value: { kind: 'Table', fields: {} },
                type: 'Table',
                isConst: true,
                isNullable: false
            };
        }
        const pkgTable = env.values[targetName].value;
        for (const [modName, entry] of Object.entries(modulesToBind)) {
            if (entry.isRoot) {
                for (const [fieldName, fieldDef] of Object.entries(entry.table.fields)) {
                    if (fieldName !== 'args' && fieldName !== 'Std') {
                        pkgTable.fields[fieldName] = fieldDef;
                    }
                }
            } else {
                pkgTable.fields[modName] = {
                    value: entry.table,
                    type: 'Table',
                    isNullable: false
                };
            }
        }
        return null;
    }

    async function evalNamespace(node, env) {
        let result = null;
        for (let stmt of node.body) {
            result = await evaluate(stmt, env);
            if (result && (result.isReturn || result.isBreak || result.isSkip)) return result;
        }
        return result;
    }

    // Evaluator main loop
    











async function evaluate(node, env = createScope()) {
    if (!node || !node.type) return node;
    if (activeRunAborted) throw new KurobaAbortError();
    if (++evalOpCount % 2000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (activeRunAborted) throw new KurobaAbortError();
    }

    switch (node.type) {
        case 'Program':
            for (let stmt of node.body) await evaluate(stmt, env);
            return;
        case 'NamespaceStatement':
            for (const stmt of node.body) {
                let res = await evaluate(stmt, env);
                if (res && (res.isReturn || res.isBreak || res.isSkip)) return res;
            }
            return null;
        case 'InterpolatedString': 
            let res = '';
            for (let part of node.parts) {
                let v = await evaluate(part, env);
                res += (v === null ? 'null' : String(v));
            }
            return res;
        case 'Literal':             return node.value;
        case 'VarDeclar':           return await evalVarDeclar(node, env, evaluate);
        case 'MultiVarDeclar': {
            let lastVal = null;
            for (let decl of node.declarations) {
                lastVal = evalVarDeclar(decl, env, evaluate);
            }
            return lastVal;
        }
        case 'VarAssign':           return await evalVarAssign(node, env, evaluate);
        case 'Variable':            return await evalVariable(node, env);
        case 'VarRetype':           return await evalVarRetype(node, env, evaluate);
        case 'SwapStatement':       return await evalSwap(node, env);
        case 'IfStatement':         return await evalIf(node, env, evaluate);
        case 'ForStatement':        return await evalFor(node, env, evaluate);
        case 'WhileStatement':      return await evalWhile(node, env, evaluate);
        case 'DoWhileStatement':    return await evalDoWhile(node, env, evaluate);
        case 'GivenStatement':      return await evalGiven(node, env, evaluate);
        case 'ForInStatement':      return await evalForIn(node, env, evaluate);
        case 'BreakStatement':      return { isBreak: true };
        case 'SkipStatement':       return { isSkip: true };
        case 'PasteStatement':      return await evalPaste(node, env, evaluate);
        case 'CopyExpression':      return await evalCopy(node, env, evaluate);
        case 'ClearStatement':      return await evalClear(node, env, evaluate);
        case 'ExitStatement':       return await evalExit(node, env, evaluate);
        case 'ThrowStatement':      return await evalThrow(node, env, evaluate);
        case 'TryStatement':        return await evalTry(node, env, evaluate);
        case 'MathExpression':      return await evalMath(node, env, evaluate);
        case 'UnaryExpression':     return await evalUnary(node, env, evaluate);
        case 'LogicalExpression':   return await evalLogical(node, env, evaluate);
        case 'IsExpression':        return await evalIs(node, env, evaluate);
        case 'ListLiteral':         return await evalListLiteral(node, env, evaluate);
        case 'IndexAccess':         return await evalIndexAccess(node, env, evaluate);
        case 'MemberAssign':        return await evalMemberAssign(node, env, evaluate);
        case 'MethodCall':          return await evalMethodCall(node, env, evaluate);
        case 'TableLiteral':        return await evalTableLiteral(node, env, evaluate);
        case 'KillStatement':       return await evalKill(node, env);
        case 'FunctionDeclaration': return await evalFunctionDeclaration(node, env);
        case 'ReturnStatement':     return await evalReturn(node, env, evaluate);
        case 'CallExpression':      return await evalCall(node, env, evaluate);
        case 'HookStatement':       return await evalHook(node, env, evaluate);
        case 'ImportStatement':     return await evalImport(node, env, evaluate);
        case 'ClassDeclaration':    return await evalClassDeclaration(node, env);
        default:
            printErr(`[RuntimeError] Unknown AST node type '${node.type}'.`);
    }
}



    // Expose Kuroba API on global window
    global.Kuroba = {
        version: '1.0.6',
        run: async function(sourceCode, options = {}) {
            activePrintHandler = options.onPrint || ((t, nl) => console.log(t));
            activeErrorHandler = options.onError || ((err) => { throw new Error(err); });
            activeClearHandler = options.onClear || (() => {});
            activeInputHandler = options.onInput || null;
            activeAbortHandler = options.onAbort || null;
            activeWorkspaceFiles = options.files || {};
            workspaceModuleCache = {};
            activeWorkspaceImports.clear();
            activeRunAborted = false;
            evalOpCount = 0;
            tryDepth = 0;

            const tokens = tokenize(sourceCode);
            const ast = parse(tokens);
            const globalScope = createScope();
            return await evaluate(ast, globalScope);
        },
        abort: function() {
            activeRunAborted = true;
            if (activeAbortHandler) activeAbortHandler();
        },
        tokenize: tokenize,
        parse: parse
    };

})(typeof window !== 'undefined' ? window : global);
