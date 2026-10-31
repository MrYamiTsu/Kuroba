# TULG — This Useless Language

**TULG** (_This Useless Language_) is a lightweight, interpreted programming language built from scratch in Node.js. It features a recursive descent parser, optional static typing with automatic type inference, smart type coercion, Lua-style block syntax, unique control-flow semantics, and clean colored diagnostic errors.

---

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)

### Running TULG Scripts

TULG source files use the `.tulg` extension. Run any script with the bundled launcher:

```bash
.\tulg              # Runs main.tulg automatically
.\tulg script.tulg  # Runs any specified script
```

_(Or via Node directly: `node index.js script.tulg`)_

---

## Syntax at a Glance

| Feature              | Syntax Example                  | Description                                             |
| :------------------- | :------------------------------ | :------------------------------------------------------ |
| **Output**           | `paste("Hello!");`              | Prints value or expression to stdout                    |
| **Comments**         | `~~ comment`                    | Single-line comment to end of line                      |
| **Variables**        | `ivar score = 100;`             | Variable declaration with type inference                |
| **Constants**        | `iconst PI = 3.14;`             | Immutable constant declaration                          |
| **Coercion**         | `ivar~String id = 42;`          | Explicit casting (`~String`, `~Int`, `~Float`, `~Bool`) |
| **Non-Nullable**     | `ivar~(String) id = "X";`       | Strict non-nullable typing                              |
| **Reassignment**     | `score = 150;`                  | Strict-typed variable update                            |
| **Conditionals**     | `if cond then ... else ... end` | Lua-style block ending with `end`                       |
| **Matching**         | `given x then case: 1 ... end`  | Multi-branch matching with `break;`                     |
| **Default Fallback** | `case: ~`                       | Fallback branch (redirects here if `break;` is omitted) |
| **Logical Ops**      | `a && b`, `a \|\| b`, `!c`      | Short-circuit boolean logic                             |
| **Equality**         | `x == y`, `x != y`              | Strict equality (`0 == FALSE`, `1 == TRUE`)             |
| **Comparisons**      | `<`, `>`, `<=`, `>=`            | Order comparisons with arithmetic precedence            |
| **Modulo**           | `10 % 3`                        | Remainder operator                                      |
| **Retype**           | `score~String = "A";`           | Explicit variable retyping / transtyping                |
| **Swap**             | `a <-> b;`                      | Native variable swap with strict type safety            |

-> **[Browse the Full TULG Documentation](docs/README.md)**  
_(Guides for variables & types, operators, control flow, and error reference)_

---

## Architecture Overview

The codebase is organized into modular components with zero third-party dependencies:

```text
├── index.js      # CLI Entry point (flags, argument validation, execution)
├── tulg.cmd      # Windows batch launcher
├── src/          # Interpreter engine
│   ├── lexer.js      # Lexical analysis (token stream with line/col tracking)
│   ├── parser.js     # Syntactic analysis (Recursive descent parser building AST)
│   ├── evaluator.js  # Runtime environment (AST evaluation & memory management)
│   └── errors.js     # Centralized colored error reporting utility
├── docs/
│   └── syntax.md # Full language specification & syntax manual
└── main.tulg     # Sample TULG source code
```

---

## Roadmap

### Core Features Implemented

- [x] Arithmetic engine with precedence & parentheses (`+`, `-`, `*`, `/`, `(...)`)
- [x] Multi-line program execution with mandatory semicolons (`;`)
- [x] Built-in output statement (`paste(...)`)
- [x] Variable declaration with type inference (`ivar x = 10;`)
- [x] Constants declaration (`iconst PI = 3;`)
- [x] Explicit smart typing & coercion (`ivar~String`, `ivar~Number`, `ivar~Bool`)
- [x] Strict variable reassignment (`x = 20;`)
- [x] Single-line comments (`~~`)
- [x] Professional colored error reporting (`printErr`)
- [x] Boolean literals (`TRUE`, `FALSE`), strict equality (`==`) and inequality (`!=`) with special rules (`0 == FALSE`, `1 == TRUE`)
- [x] Conditional branch statements (`if / elif / else / end`)
- [x] Multi-branch conditional matching (`given / case: / break; / case: ~`)
- [x] Logical operators (`&&`, `||`, `!`) with short-circuit evaluation

### Phase 1: Fundamental Operators & Types (Completed - v1.0.1)

- [x] Native variable swap mechanism (`<->`)
- [x] Renamed `Number` to `Int` and added floating-point decimals (`Float`)
- [x] `NULL` literal and null-safety basics
- [x] Non-nullable type enforcement (`~(Type)`)
- [x] Comparison operators (`<`, `>`, `<=`, `>=`)
- [x] Modulo operator (`%`)
- [x] Explicit variable transtyping (`var~Type = val;`)

### Phase 2: Iteration & Interactive Console

- [ ] Loop structures (`while`, `do ... while`, `for`, `continue;`)
- [ ] Distinct console output: `paste` (no newline) vs `pasteLn` (with newline)
- [ ] User console input: `copy(...)` (with optional prompt, blocking execution)
- [ ] Process termination & exit codes (`exit(code)`)

### Phase 3: Data Structures & Collections

- [ ] Dynamic Arrays / Tables (`[item1, item2, ...]`) with bracket indexing (`arr[0]`)
- [ ] Stacks (LIFO: push/pop) and Queues (FIFO: enqueue/dequeue) collections
- [ ] Key-Value Dictionaries / Objects (`{ key: value, ... }`) with dot & bracket access
- [ ] Length introspection property/function (`length`) for strings, arrays, and dictionaries
- [ ] Collection iteration (`for item in list ... end`, `for key, val in dict ... end`)

### Phase 4: Functions & Metaprogramming

- [ ] Variable scoping & lifecycle (lexical environments, `kill variable;`)
- [ ] User-defined functions (`fn name(args) ... end`) with `return`
- [ ] Native recursion helpers (`recur(...)` with tail-call safety)
- [ ] Function hooking & interception (Lua-inspired function wrapping & callbacks)

### Phase 5: Error Handling, Asynchrony & System Modules

- [ ] Exception & error handling (`try / catch / finally / end`)
- [ ] Asynchronous timer / delays (`sleep(ms)`)
- [ ] Multi-file module imports (`import "file.tulg"`)
- [ ] File I/O: `pasteInFile("path.txt", data)` (write/append)
- [ ] File I/O: `copyInFile("path.txt")` (read file contents)
- [ ] System clock & timestamp access (`time.now()`)
- [ ] Command-line arguments access (`args` list)

### Phase 6: Object-Oriented Programming (OOP)

- [ ] Class definitions (`class ... end`) with constructors & methods
- [ ] Encapsulation & Access Modifiers (`public` / `private`)
- [ ] Interfaces & structural contracts

### Phase 7: Standard Library & Debugging Tools

- [ ] Built-in standard library modules (`math.*`, `str.*`, `json.*`)
- [ ] Interactive Debugger / Debug mode (`--debug` flag with step execution and AST inspector)
- [ ] Interactive REPL shell (launching `tulg` with no arguments starts interactive prompt)
- [ ] Multi-line block comments
