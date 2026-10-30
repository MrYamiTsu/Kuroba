# TULG Language Reference & Syntax Specification

This document provides the full, in-depth specification for **TULG** (*This Useless Language*).

---

## Table of Contents

1. [Statements & Semicolons (`;`)](#1-statements--semicolons)
2. [Comments (`~~`)](#2-comments)
3. [Output (`paste`)](#3-output-paste)
4. [Variables & Type Inference (`ivar`)](#4-variables--type-inference-ivar)
5. [Constants (`iconst`)](#5-constants-iconst)
6. [Forced Typing & Smart Coercion (`ivar~Type`, `iconst~Type`)](#6-forced-typing--smart-coercion-ivartype-iconsttype)
7. [Variable Reassignment & Strict Typing](#7-variable-reassignment--strict-typing)
8. [Variable Swap (`<->`)](#8-variable-swap--)
9. [Arithmetic & Operator Precedence](#9-arithmetic--operator-precedence)
10. [Booleans, Strict Equality & Inequality (`==`, `!=`)](#10-booleans-strict-equality--inequality--)
11. [Conditional Statements (`if / elif / else / end`)](#11-conditional-statements-if--elif--else--end)
12. [Multi-Branch Matching (`given / case: / break; / case: ~`)](#12-multi-branch-matching-given--case--break--case-)
13. [Logical Operators (`&&`, `||`, `!`)](#13-logical-operators---)
14. [Error Handling & Diagnostics](#14-error-handling--diagnostics)

---

### 1. Statements & Semicolons

Every simple statement in TULG must end with a mandatory semicolon (`;`):

```text
paste("Hello World!");
```

Block statements (`if ... end`, `given ... end`) are self-terminating and do not require semicolons after `end`.

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

Booleans printed with `paste()` are always formatted in uppercase (`TRUE` or `FALSE`).

---

### 4. Variables & Type Inference (`ivar`)

Variables are declared using the `ivar` keyword (*init variable*). TULG automatically infers the data type based on the initial value:

```text
ivar count = 10;                // Inferred as Number
ivar greeting = "Hello there";  // Inferred as String
ivar isRunning = TRUE;          // Inferred as Bool

paste(greeting);
paste(count + 5);
```

---

### 5. Constants (`iconst`)

Constants are declared using the `iconst` keyword (*init constant*). Like variables, their type is inferred or can be explicitly assigned with `~Type`. Once initialized, a constant cannot be reassigned:

```text
iconst MAX_USERS = 100;
iconst APP_NAME = "TULG App";
iconst~Bool IS_PROD = 1;

MAX_USERS = 200; // [TypeError] Cannot reassign constant 'MAX_USERS'.
```

---

### 6. Forced Typing, Smart Coercion & Nullability (`~Type`, `~(Type)`)

TULG supports optional explicit typing using the tilde `~` operator attached to `ivar` or `iconst`. Supported types are `String`, `Int`, `Float`, and `Bool`.

#### A. Nullable by Default vs Non-Nullable (`~(Type)`)
By default, variables in TULG are nullable and can receive `NULL`:
```text
ivar~String nickname = "Fox";
nickname = NULL; // Valid: variables are nullable by default

ivar~(String) username = "Admin";
username = NULL; // [TypeError] Cannot assign NULL to non-nullable variable 'username' of type '(String)'.
```

#### B. Numbers: Int and Float
- `Int`: Integer numbers (`42`, `-10`).
- `Float`: Floating-point decimals (`3.14`, `0.5`).

```text
ivar~Int entier = "100";    // Coerced to 100
ivar~Float ratio = "12.34"; // Coerced to 12.34
```

#### C. Value to String (`~String`)
Automatically converts numbers and booleans to strings:

```text
ivar~String code = 101; // Converted automatically to "101"
paste(code + " is text"); // Output: 101 is text
```

#### D. Value to Bool (`~Bool`)
Automatically coerces numbers (`1` to `TRUE`, `0` to `FALSE`):

```text
ivar~Bool isActive = 1; // Coerced to TRUE
paste(isActive);        // Output: TRUE
```

---

### 6. Variable Reassignment & Strict Typing

Once a variable is declared with `ivar`, its value can be updated without the `ivar` keyword. TULG enforces strict type safety:

```text
ivar score = 10;
score = 25;         // Valid (Number -> Number)
score = score + 15; // Valid: now 40

ivar status = "Pending";
status = "Complete"; // Valid (String -> String)

score = "40"; // [TypeError] Cannot assign type 'String' to variable 'score' of type 'Number'.
```

---

### 8. Variable Swap (`<->`)

TULG provides a native bidirectional swap operator `<->` to exchange the values of two variables cleanly without temporary variables.

#### Swap Rules:
- Both variables must already be declared.
- Neither variable can be an immutable constant (`iconst`).
- Both variables must share the same type (strict type safety).
- If one variable is non-nullable (`~(Type)`), the other variable cannot transfer a `NULL` value into it.

```text
ivar a = 10;
ivar b = 99;

a <-> b;
paste(a); // Output: 99
paste(b); // Output: 10

ivar~String nullableText = NULL;
ivar~(String) strictText = "Hello";

nullableText <-> strictText; // [TypeError] Cannot swap NULL into non-nullable variable 'strictText'.
```

---

### 9. Arithmetic & Operator Precedence

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

### 8. Booleans, Strict Equality & Inequality (`==`, `!=`)

- **Literals**: Boolean literals must always be uppercase: `TRUE` and `FALSE`.
- **Strict Equality (`==`) & Inequality (`!=`)**: Mathematical operations are evaluated before equality.
- **Special Truthy Coercion**: In TULG, `0 == FALSE` and `1 == TRUE` (and vice-versa) evaluate to `TRUE`.

```text
paste(TRUE);          // Output: TRUE
paste(FALSE);         // Output: FALSE
paste(1 + 1 == 2);    // Output: TRUE
paste(10 == 20);      // Output: FALSE
paste(10 != 20);      // Output: TRUE

// Special rules:
paste(0 == FALSE);    // Output: TRUE
paste(0 != FALSE);    // Output: FALSE
paste(1 != TRUE);     // Output: FALSE
paste(1 == TRUE);     // Output: TRUE
paste(0 == TRUE);     // Output: FALSE
```

---

### 9. Conditional Statements (`if / elif / else / end`)

TULG features Lua-inspired conditional blocks ending with `end`. Semicolons are not required after `end`.

#### Condition Rules:
- **Single Boolean Variable / Unary NOT**: Parentheses are optional (e.g. `if isReady then` or `if !isBusy then`).
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

### 10. Multi-Branch Matching (`given / case: / break; / case: ~`)

TULG provides a structured matching mechanism with unique semantics:
- **`given <target> then ... end`**: Evaluates an expression and matches against `case:` branches.
- **`case: <value>`**: Specifies an expected value to match.
- **`break;`**: Exits the `given` block immediately.
- **`case: ~ (Default Fallback)`**: The default fallback case using TULG's signature tilde `~` operator.
- **TULG Redirect Semantics**: If `break;` is omitted in a matching case, execution does not bleed into subsequent cases. Instead, it jumps directly to `case: ~` (the default) as a safety net!

```text
ivar role = "admin";

given role then
    case: "user"
        paste("Standard user");
        break;
    case: "admin"
        paste("Administrator detected!");
        break;
    case: ~
        paste("Unknown role (fallback)");
end
```

---

### 11. Logical Operators (`&&`, `||`, `!`)

- **`!` (Logical NOT)**: Unary operator that inverts truthiness (`!TRUE` -> `FALSE`, `!0` -> `TRUE`, `!1` -> `FALSE`). Can be used directly in conditions: `if !isBusy then`.
- **`&&` (Logical AND)**: Returns `TRUE` only if both operands are truthy. Employs short-circuit evaluation.
- **`||` (Logical OR)**: Returns `TRUE` if either operand is truthy. Employs short-circuit evaluation.

```text
ivar isReady = TRUE;
ivar isBusy = FALSE;

paste(!isReady);      // Output: FALSE
paste(!isBusy);       // Output: TRUE
paste(TRUE && TRUE);  // Output: TRUE
paste(TRUE && FALSE); // Output: FALSE
paste(TRUE || FALSE); // Output: TRUE

ivar score = 100;
ivar vip = TRUE;

if (score == 100 && vip) then
    paste("VIP score granted!");
end
```

---

### 12. Error Handling & Diagnostics

TULG provides precise, formatted errors in bright red directly to the console without internal stack traces:

- **SyntaxError**: Reports the exact line and column of unclosed quotes, parentheses, missing semicolons, or invalid characters.
  ```text
  [SyntaxError: at Line 2, Col 1] Missing semicolon ';' at the end of statement.
  [SyntaxError: at Line 4, Col 12] Unclosed parenthesis. Missing closing ')' to match '(' at Line 4, Col 6.
  ```
- **TypeError**: Reports invalid type conversions and assignments.
  ```text
  [TypeError] Cannot cast value 'World' to type 'Number'.
  [TypeError] Cannot assign type 'String' to variable 'score' of type 'Number'.
  ```
- **ReferenceError**: Reports attempts to use undeclared variables.
  ```text
  [ReferenceError] Variable 'unknownVar' is not defined.
  ```
- **MathError**: Protects against illegal math operations.
  ```text
  [MathError] Division by zero is undefined.
  ```

