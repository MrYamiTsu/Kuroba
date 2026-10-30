# TULG — This Useless Language

**TULG** (*This Useless Language*) is a lightweight, interpreted programming language built from scratch in Node.js. It features a recursive descent parser, optional static typing with automatic type inference, smart type coercion, Lua-style block syntax, unique control-flow semantics, and clean colored diagnostic errors.

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

*(Or via Node directly: `node index.js script.tulg`)*

---

## Syntax at a Glance

| Feature | Syntax Example | Description |
| :--- | :--- | :--- |
| **Output** | `paste("Hello!");` | Prints value or expression to stdout |
| **Comments** | `~~ comment` | Single-line comment to end of line |
| **Variables** | `ivar score = 100;` | Variable declaration with type inference |
| **Coercion** | `ivar~String id = 42;` | Explicit casting (`~String`, `~Number`, `~Bool`) |
| **Reassignment** | `score = 150;` | Strict-typed variable update |
| **Conditionals** | `if cond then ... else ... end` | Lua-style block ending with `end` |
| **Matching** | `given x then case: 1 ... end` | Multi-branch matching with `break;` |
| **Default Fallback** | `case: ~` | Fallback branch (redirects here if `break;` is omitted) |
| **Logical Ops** | `a && b`, `a \|\| b`, `!c` | Short-circuit boolean logic |
| **Equality** | `x == y`, `x != y` | Strict equality (`0 == FALSE`, `1 == TRUE`) |

👉 **[📖 Read the Full Language Reference & Syntax Specification](docs/syntax.md)**  
*(Contains detailed explanations, edge cases, error codes, and extensive code samples)*

---

## Architecture Overview

The codebase is organized into modular components with zero third-party dependencies:

```text
├── index.js      # CLI Entry point (flags, argument validation, execution)
├── lexer.js      # Lexical analysis (token stream with line/col tracking)
├── parser.js     # Syntactic analysis (Recursive descent parser building AST)
├── evaluator.js  # Runtime environment (AST evaluation & memory management)
├── errors.js     # Centralized colored error reporting utility
├── tulg.cmd      # Windows batch launcher
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
- [x] Explicit smart typing & coercion (`ivar~String`, `ivar~Number`, `ivar~Bool`)
- [x] Strict variable reassignment (`x = 20;`)
- [x] Single-line comments (`~~`)
- [x] Professional colored error reporting (`printErr`)
- [x] Boolean literals (`TRUE`, `FALSE`), strict equality (`==`) and inequality (`!=`) with special rules (`0 == FALSE`, `1 == TRUE`)
- [x] Conditional branch statements (`if / elif / else / end`)
- [x] Multi-branch conditional matching (`given / case: / break; / case: ~`)
- [x] Logical operators (`&&`, `||`, `!`) with short-circuit evaluation

### Upcoming: Control Flow & Error Handling
- [ ] Comparison operators (`<`, `>`, `<=`, `>=`)
- [ ] Modulo operator (`%`)
- [ ] Loop structures (`while`, `do ... while`, `for`, `continue;`)
- [ ] Exception & error handling (`try / catch / finally / end`)

### Upcoming: Types & Variables
- [ ] Constants declaration (`iconst PI = 3.14;`)
- [ ] Explicit variable transtyping (`Type~variable`, e.g. `String~score = 100;`)
- [ ] Additional core types (`NULL`, floating-point numbers / `Float`)
- [ ] Length introspection property/function (`length`) for strings, arrays, etc.

### Upcoming: Standard I/O & File System
- [ ] Console output: `paste` (without newline) vs `pasteLn` (with newline)
- [ ] Console input: `copy(...)` (with optional prompt, blocking for user input)
- [ ] File I/O: `pasteInFile("path.txt", data)` (write/append)
- [ ] File I/O: `copyInFile("path.txt")` (read file contents)
- [ ] System clock & timestamp access (`time.now()`)

### Upcoming: Modules & Metaprogramming
- [ ] Multi-file module imports (`import "file.tulg"`)
- [ ] User-defined functions (`fn name(args) ... end`)
- [ ] Native recursion helpers (`recur(...)` alongside loops/conditionals)
- [ ] Function hooking & interception (Lua-inspired function wrapping & callbacks)

### Upcoming: Data Structures
- [ ] Dynamic Arrays / Tables (`[item1, item2, ...]`) with indexing & manipulation

### Upcoming: Object-Oriented Programming (OOP)
- [ ] Class definitions (`class ... end`) with constructors & methods
- [ ] Encapsulation & Access Modifiers (`public` / `private`)
- [ ] Interfaces & structural contracts
