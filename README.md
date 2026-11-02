<div align="center">

<img src="docs/kuroba.png" alt="Kuroba Logo" width="120" />

# Kuroba — KRB

<sub>A minimalist, zero-dependency interpreted language</sub>

<br/>
<br/>

_Blending ideas from multiple modern languages into a clean AST interpreter with hybrid typing, native swap, and expressive control flow._

<br/>

[![Version](https://img.shields.io/badge/version-v1.0.2-blue.svg?style=for-the-badge&logo=semver)](package.json)
[![Node](https://img.shields.io/badge/node->=%2016.0.0-339933.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Dependencies](<https://img.shields.io/badge/dependencies-0%20(pure%20vanilla)-orange.svg?style=for-the-badge>)](package.json)
[![License](https://img.shields.io/badge/license-MIT-purple.svg?style=for-the-badge)](LICENSE)

<br/>

[**Quickstart**](#quickstart) •
[**Showcase**](#showcase) •
[**Features**](#key-highlights) •
[**Notable Differences**](#notable-differences) •
[**Architecture**](#architecture) •
[**Roadmap**](#roadmap) •
[**Full Documentation**](docs/README.md)

---

</div>

<br/>

## Key Highlights

<table>
<tr>
<td width="50%">

### Zero External Dependencies

Written entirely from scratch in vanilla Node.js without third-party packages. Fast, lightweight, and fully transparent.

</td>
<td width="50%">

### Hybrid Type System

Automatic type inference (`ivar x = 10;`), explicit coercion (`ivar~String n = 42;`), and strict non-nullability contracts (`ivar~(String) name = "...";`).

</td>
</tr>
<tr>
<td width="50%">

### Native Swap Operator (`<->`)

Atomic in-place variable swap (`a <-> b;`) enforcing type equality, immutability checks, and non-nullability safety at runtime.

</td>
<td width="50%">

### Expressive Control Flow

Clean block boundaries (`end`), multi-branch pattern matching (`given / case:`), and inline conditional guard clauses (`exit(cond);`).

</td>
</tr>
<tr>
<td width="50%">

### Human-Friendly Diagnostics

Colored, contextual error reporting (`SyntaxError`, `TypeError`, `ReferenceError`, `MathError`) with exact line and column tracking.

</td>
<td width="50%">

### Dynamic Retyping / Transtyping

Update a variable's type and nullability dynamically with `var~Type = val;` or `var~(Type) = val;`, with constant protection.

</td>
</tr>
</table>

---

## Showcase

Here is a quick look at programming in **Kuroba**:

```krb
~~ Define constants and inferred variables
iconst MAX_PLAYERS = 4;
ivar score = 100;
ivar~String username = 42;         ~~ Smart coercion: coerced to "42"
ivar~(Int) rank = 1;               ~~ Strict non-nullable Int

~~ Guard clause: exits immediately if condition is met
exit(score < 0);

~~ Native variable swap with strict type safety
ivar playerA = 10;
ivar playerB = 99;
playerA <-> playerB;               ~~ playerA is now 99, playerB is 10

~~ Conditional logic
if (playerA > 50 && rank == 1) then
    paste("Top tier champion!");
end

~~ Pattern matching with automatic fallback redirection
given username then
    case: "admin"
        paste("Access Granted");
        break;
    case: ~
        paste("Welcome Guest: " + username);
end
```

---

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.0.0 or higher recommended)

### Installation

Clone the repository:

```bash
git clone https://github.com/MrYamiTsu/Kuroba.git
cd Kuroba
```

### Running Kuroba Scripts

Kuroba source files use the `.krb` extension:

```bash
# Windows launcher (runs main.krb by default)
.\kuroba

# Quick alias
.\kb

# Run a specific script
.\kuroba path/to/script.krb

# Cross-platform via Node.js
node index.js path/to/script.krb
```

### CLI Options

| Command / Flag             | Description                                    |
| :------------------------- | :--------------------------------------------- |
| `.\kuroba` (or `.\kb`)     | Executes the default entry file (`main.krb`)   |
| `.\kuroba <file.krb>`      | Executes the provided `.krb` source file       |
| `.\kuroba -v`, `--version` | Displays current engine version and build info |
| `.\kuroba -h`, `--help`    | Prints the CLI help manual                     |

---

## Notable Differences

Kuroba combines concepts from multiple language paradigms while introducing its own signature syntax and ergonomics:

| Concept | Kuroba Syntax | How it Differs from JS / Python / C |
| :--- | :--- | :--- |
| **Comments** | `~~ comment` | Double-tilde zen feather comments instead of `//` or `#`. |
| **Native Swap** | `a <-> b;` | Atomic in-place variable swap with strict runtime type & nullability validation. No temp variable or tuple destructuring. |
| **Coercion & Nullability** | `ivar~Int n = "42";`<br/>`ivar~(String) u = "A";` | Type coercion prefix `~Type` and strict non-nullability contracts `~(Type)` directly at variable declaration. |
| **Dynamic Retyping** | `score~String = "A";` | Dynamic type transtyping without redeclaration or shadowing. Constants remain immutable. |
| **Skip Statement** | `skip;` | Replaces the traditional `continue;` inside loops for cleaner, more intentional iteration skipping. |
| **Inline Guards** | `exit(cond);`<br/>`clear(cond);` | Evaluates a guard condition directly in the statement call without wrapping in an `if` block. |
| **Pattern Match Fallback** | `case: ~` | Fallback default branch in `given / case:` blocks using the signature tilde symbol `~`. |
| **Interactive Key Capture** | `copyKey()` | Synchronous, zero-dependency single-character keyboard capture in terminal raw mode without waiting for Enter. |

> Looking for the complete language cheatsheet and guide? **[Browse Full Documentation & Syntax Reference](docs/README.md)**

---

## Architecture

Kuroba is designed as a classic, modular 3-stage interpreted engine:

```text
 ┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────────┐
 │ Source Code │ ───> │ Lexer        │ ───> │ Parser      │ ───> │ Evaluator    │
 │   (.krb)    │      │ (Tokens)     │      │ (AST)       │      │ (Runtime Env)│
 └─────────────┘      └──────────────┘      └─────────────┘      └──────────────┘
                             │                     │                    │
                             └──────────┬──────────┴────────────────────┘
                                        ▼
                             [ Centralized Diagnostics ]
                                  (errors.js)
```

```text
Kuroba/
├── index.js          # CLI entrypoint & argument parsing
├── kuroba.cmd        # Windows primary launcher
├── kb.cmd            # Windows short alias launcher
├── config.json       # Engine configuration & version metadata
├── package.json      # Project manifest
├── main.krb          # Default playground entry file
├── src/              # Interpreter Core
│   ├── lexer.js          # Lexical analysis & token stream generation
│   ├── parser.js         # Recursive descent parser producing the AST
│   ├── evaluator.js      # AST runtime evaluator & memory environment
│   └── errors.js         # Colored diagnostic reporting engine
└── docs/             # Technical Specification & Manuals
    ├── README.md         # Documentation index & cheatsheet
    ├── variables-and-types.md
    ├── operators.md
    ├── control-flow.md
    └── errors.md
```

---

## Roadmap

### Core Engine `(v1.0.0)`

- [x] Recursive descent arithmetic engine (`+`, `-`, `*`, `/`, `(...)`)
- [x] Multi-line program execution with mandatory semicolons (`;`)
- [x] Output statement (`paste(...)`)
- [x] Variable inference (`ivar`) & constants (`iconst`)
- [x] Single-line comments (`~~`)
- [x] Diagnostic error engine (`printErr`)
- [x] Booleans (`TRUE`, `FALSE`), equality (`==`, `!=`) with `0 == FALSE` and `1 == TRUE`
- [x] Conditional branches (`if / elif / else / end`)
- [x] Pattern matching (`given / case: / break; / case: ~`)
- [x] Short-circuit logic (`&&`, `||`, `!`)

### Phase 1: Fundamental Operators & Types `(Completed - v1.0.1)`

- [x] Native variable swap operator (`<->`)
- [x] Distinct `Int` and `Float` types
- [x] `NULL` literal and nullability support
- [x] Non-nullable enforcement (`~(Type)`)
- [x] Order comparisons (`<`, `>`, `<=`, `>=`)
- [x] Modulo operator (`%`)
- [x] Dynamic variable transtyping (`var~Type = val;` and `var~(Type) = val;`)

### Phase 2: Iteration & Interactive Console `(Completed - v1.0.2)`

- [x] Process termination & inline conditional guard (`exit()`, `exit(cond)`)
- [x] Output formatting: `paste` (no newline) vs `pasteLn` (with newline)
- [x] Compound assignment & step operators (`+=`, `-=`, `*=`, `/=`, `%=`, `++`, `--`)
- [x] Loop structures:
  - [x] Classical `for` loops (`for (...) then ... end`) with `break;` and `skip;`
  - [x] `while <cond> then ... end`
  - [x] `do ... while <cond>;`
- [x] Interactive console input: `copy(...)` (blocking prompt) and `copyKey()` (single keypress)
- [x] Console screen management: `clear()`, `clear(cond)`

### Phase 3: Data Structures & Collections

- [x] Strict block scoping (variables declared in `if`, `while`, `do-while`, and `for` blocks expire at `end`)
- [ ] Multi-line block comments (`~~{{ ... }}~~`)
- [ ] Dynamic Arrays / Tables (`[1, 2, 3]`) with indexing (`arr[0]`)
- [ ] Stacks (LIFO) and Queues (FIFO) collections
- [ ] Dictionaries / Key-Value objects (`{ key: value }`)
- [ ] Collection iteration (`for item in list ... end`)

### Phase 4: Functions & Metaprogramming

- [ ] Variable lifecycle & manual destruction (`kill variable;`)
- [ ] First-class functions (`fn name(args) ... end`) with lexical function scopes & `return`
- [ ] Tail-call safe recursion helpers (`recur(...)`)
- [ ] Function interception & callbacks

### Phase 5: Object-Oriented Programming (OOP) & Namespaces

- [ ] Class definitions (`class ... end`) with constructors & methods
- [ ] Single inheritance (`class Sub extends Super ... end`) and `super(...)`
- [ ] Instance reference (`this` / `self`)
- [ ] Encapsulation & Access Modifiers (`public` / `private`)
- [ ] Static members (`static fn ...`, `static ivar ...`)
- [ ] Interfaces & structural contracts (`interface ... end`)
- [ ] Namespaces (`namespace Name ... end`) for cross-file architecture

### Phase 6: Exception Handling & Modular Architecture

- [ ] Exception throwing and handling (`throw`, `try / catch / finally / end`)
- [ ] Package architecture with strict metadata headers (`package Name { ... }`)
- [ ] Lightweight library headers (`library Name;`)
- [ ] Unified import system (`import Package;`)
- [ ] Package aliasing (`import Package alias Short;` and prefix drop `import Package alias ~;`)
- [ ] Selective library imports with signature tilde syntax (`import Package ~(LibA, LibB);`)
- [ ] Combined selective imports with prefix drop (`import Package ~(LibA) alias ~;`)
- [ ] Multi-file module imports & exports (`import "file.krb"`, `export`)

### Phase 7: Built-in Packages (`Std`, `Web`, `App`) & Developer Tooling

- [ ] Built-in `Std` Package:
  - `Std.Math` (trigonometry, rounding, powers, constants)
  - `Std.Time` (clock, timestamps, async delays `sleep(ms)`)
  - `Std.IO` (file reading & writing: `pasteInFile`, `copyInFile`)
  - `Std.String` (string length, substring, split, join, trim, casing)
  - `Std.Json` (JSON parsing & stringifying)
  - `Std.Sys` (command-line arguments `args`, environment variables `env`)
- [ ] Built-in `Web` Package:
  - Native HTTP web server (`Web.serve`, `Web.listen`)
  - Lightweight API routing & request/response handling (`Web.get`, `Web.post`)
  - Network requests client (`Web.fetch`)
- [ ] Built-in `App` Package (Native GUI & 2D Game Engine):
  - Native window creation with framerate and resolution control (`App.window`, `App.fps`)
  - 2D Canvas & graphical rendering (shapes, colors, sprites, text rendering style WPF / Raylib)
  - Game / application loop hooks (`App.onUpdate`, `App.onDraw`)
  - Real-time input handling for games and desktop apps (`App.isKeyDown`, `App.mousePos`)
- [ ] Interactive REPL shell (launching `kb` with no arguments starts interactive shell)
- [ ] Interactive CLI Debugger (`--debug` flag with step execution and AST inspector)

---

## License

This project is licensed under the **MIT License**.
