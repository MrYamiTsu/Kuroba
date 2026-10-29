# TULG — This Useless Language

**TULG** (_This Useless Language_) is a lightweight, interpreted programming language built from scratch in Node.js. It features a recursive descent parser, optional static typing with automatic type inference, smart type coercion, strict syntax enforcement, and detailed error diagnostics.

---

## Table of Contents

1. [Installation & Execution](#installation--execution)
2. [Language Syntax & Features](#language-syntax--features)
   - [Statements & Semicolons](#statements--semicolons)
   - [Output (`paste`)](#output-paste)
   - [Variables & Type Inference (`ivar`)](#variables--type-inference-ivar)
   - [Forced Typing & Smart Coercion (`ivar~Type`)](#forced-typing--smart-coercion-ivartype)
   - [Arithmetic & Operator Precedence](#arithmetic--operator-precedence)
3. [Error Handling & Diagnostics](#error-handling--diagnostics)
4. [Architecture Overview](#architecture-overview)
5. [Roadmap](#roadmap)

---

## Installation & Execution

### Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or newer).

### Running a TULG Script

TULG source files must use the `.tulg` extension. Run any script using the `tulg` command:

```bash
tulg <filename>.tulg
```

**Examples:**

```bash
tulg main.tulg   # Runs main.tulg
tulg             # Runs main.tulg automatically if no argument is given!
```

*(You can also use `node index.js <filename>.tulg`)*

---

## Language Syntax & Features

### 1. Statements & Semicolons

Every statement in TULG must end with a mandatory semicolon (`;`):

```text
paste("Hello World!");
```

---

### 2. Comments (`~~`)

Single-line comments start with a double tilde `~~` and continue to the end of the line:

```text
~~ This is a full-line comment
ivar name = "TULG"; ~~ This is an end-of-line comment
~~ paste("This line will be ignored");
```

---

### 3. Output (`paste`)

The `paste(...)` keyword evaluates any expression inside its parentheses and prints the result to standard output:

```text
paste("Welcome to TULG!");
paste(42);
paste((10 + 5) * 2);
```

---

### 3. Variables & Type Inference (`ivar`)

Variables are declared using the `ivar` keyword (_init variable_). TULG automatically infers the data type based on the assigned value:

```text
ivar count = 10;                // Inferred as Number
ivar greeting = "Hello there";  // Inferred as String

paste(greeting);
paste(count + 5);
```

---

### 4. Forced Typing & Smart Coercion (`ivar~Type`)

TULG supports optional explicit typing using the tilde `~` operator attached to `ivar`. Supported explicit types are `String` and `Number`:

#### A. Number to String (`ivar~String`)

Automatically converts numbers to strings:

```text
ivar~String code = 101; // Converted automatically to "101"
paste(code + " is text"); // Output: 101 is text
```

#### B. String to Number (`ivar~Number`)

Attempts to parse the string into a valid number. If the string contains non-numeric text, a runtime `TypeError` is triggered:

```text
ivar~Number validNum = "42";  // Converted automatically to 42
paste(validNum + 8);          // Output: 50

ivar~Number invalidNum = "abc"; // [TypeError] Cannot cast value 'abc' to type 'Number'.
```

---

### 5. Variable Reassignment

Once a variable is declared with `ivar`, its value can be updated without the `ivar` keyword. TULG enforces strict type safety during reassignment:

```text
ivar score = 10;
score = 25;         // Valid (Number -> Number)
score = score + 15; // Valid: now 40

ivar status = "Pending";
status = "Complete"; // Valid (String -> String)

score = "40"; // [TypeError] Cannot assign type 'String' to variable 'score' of type 'Number'.
```

---

### 6. Arithmetic & Operator Precedence

TULG includes full standard mathematical precedence (`*` and `/` take priority over `+` and `-`) and arbitrary parenthesis nesting:

```text
ivar result = 10 + 2 * 3;       // 16 (not 36)
ivar forced = (10 + 2) * 3;     // 36
ivar complex = (456 - 12) * 10; // 4440

paste(result);
paste(forced);
paste(complex);
```

String concatenation is supported with the `+` operator:

```text
ivar firstName = "Ada";
ivar lastName = "Lovelace";
paste("Hello, " + firstName + " " + lastName + "!");
```

---

### 7. Booleans & Strict Equality (`==`)
TULG supports booleans with strict syntax and custom coercion semantics:

- **Literals**: Boolean literals must always be uppercase: `TRUE` and `FALSE`.
- **Strict Equality (`==`)**: Evaluates expressions and checks equality. Standard mathematical operations (`+`, `-`, `*`, `/`) are evaluated before `==`.
- **Special Truthy Coercion**: In TULG, `0 == FALSE` and `1 == TRUE` (and vice-versa) evaluate to `TRUE`.

```text
paste(TRUE);          // Output: TRUE
paste(FALSE);         // Output: FALSE
paste(1 + 1 == 2);    // Output: TRUE
paste(10 == 20);      // Output: FALSE

// Special rules:
paste(0 == FALSE);    // Output: TRUE
paste(1 == TRUE);     // Output: TRUE
paste(0 == TRUE);     // Output: FALSE

// Variables:
ivar~Bool isActive = 1; // Coerced to TRUE
paste(isActive);        // Output: TRUE
```

---

### 8. Conditional Statements (`if / elif / else / end`)
TULG features Lua-inspired conditional blocks ending with `end`. Semicolons are not required after `end`.

#### Condition Rules:
- **Single Boolean Variable**: Parentheses are optional (e.g. `if isReady then`).
- **Expressions & Comparisons**: Must be enclosed in parentheses `(...)` (e.g. `if (score == 100) then`).

```text
ivar score = 50;

if (score == 100) then
    paste("Perfect score!");
elif (score == 50) then
    paste("Average score!");
else
    paste("Keep trying!");
end

ivar isReady = TRUE;
if isReady then
    paste("System ready.");
end
```

---

## Error Handling & Diagnostics

TULG provides precise, formatted errors in bright red directly to the console without internal stack traces:

- **SyntaxError**: Reports the exact line and column of unclosed quotes, parentheses, missing semicolons, or invalid characters.
  ```text
  [SyntaxError: at Line 2, Col 1] Missing semicolon ';' at the end of statement.
  [SyntaxError: at Line 4, Col 12] Unclosed parenthesis. Missing closing ')' to match '(' at Line 4, Col 6.
  ```
- **TypeError**: Reports invalid type conversions.
  ```text
  [TypeError] Cannot cast value 'World' to type 'Number'.
  ```
- **ReferenceError**: Reports attempts to use undeclared variables.
  ```text
  [ReferenceError] Variable 'unknownVar' is not defined.
  ```
- **MathError**: Protects against illegal math operations.
  ```text
  [MathError] Division by zero is undefined.
  ```

---

## Architecture Overview

The codebase is organized into modular components:

```text
├── index.js      # CLI Entry point (validates arguments and coordinates execution)
├── lexer.js      # Lexical analysis (tokenizes characters into token stream with line/col tracking)
├── parser.js     # Syntactic analysis (Recursive descent parser building the AST)
├── evaluator.js  # Runtime environment (executes the AST and manages memory)
├── errors.js     # Centralized formatted error reporting utility
└── main.tulg     # Sample TULG source code
```

---

## Roadmap

- [x] Arithmetic engine with precedence & parentheses (`+`, `-`, `*`, `/`, `(...)`)
- [x] Multi-line program execution with mandatory semicolons (`;`)
- [x] Built-in output statement (`paste(...)`)
- [x] Variable declaration with type inference (`ivar x = 10;`)
- [x] Explicit smart typing & coercion (`ivar~String`, `ivar~Number`)
- [x] Strict variable reassignment (`x = 20;`)
- [x] Single-line comments (`~~`)
- [x] Professional colored error reporting (`printErr`)
- [x] Boolean literals (`TRUE`, `FALSE`) and strict equality (`==`) with special rules (`0 == FALSE`, `1 == TRUE`)
- [x] Conditional branch statements (`if / elif / else / end`)
- [ ] Comparison operators (`!=`, `<`, `>`, `<=`, `>=`)
- [ ] Logical operators (`&&`, `||`, `!`)
- [ ] Loop constructs (`while` / `for`)
- [ ] Custom functions (`fn` / user-defined routines)
