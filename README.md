<div align="center">

<img src="docs/kuroba.png" alt="Kuroba Logo" width="120" />

# Kuroba — KRB

<sub>A minimalist, zero-dependency interpreted language</sub>

<br/>
<br/>

_Blending ideas from multiple modern languages into a clean AST interpreter with hybrid typing, native swap, and expressive control flow._

<br/>

[![Version](https://img.shields.io/badge/version-v1.0.3-blue.svg?style=for-the-badge&logo=semver)](package.json)
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
# Launch the Interactive REPL Shell (no arguments)
.\krb
# or
.\kuroba

# Run a specific script with arguments
.\krb path/to/script.krb --speed 50 --verbose
# or
.\kuroba path/to/script.krb --speed 50 --verbose

# Cross-platform via Node.js
node index.js                      # Starts REPL
node index.js path/to/script.krb   # Runs script
```

### CLI Options

| Command / Flag                     | Description                                                  |
| :--------------------------------- | :----------------------------------------------------------- |
| `.\krb` / `.\kuroba` / `node index.js` | Launches the interactive REPL shell (Read-Eval-Print Loop)   |
| `.\krb <file.krb> [args...]`          | Executes the script with command-line arguments              |
| `.\krb -i`, `--repl`                   | Explicitly forces interactive REPL mode                    |
| `.\krb -v`, `--version`                | Displays current engine version and build info             |
| `.\krb -h`, `--help`                   | Prints the CLI help manual                                 |

### Interactive REPL Shell

Kuroba features a built-in, zero-dependency interactive REPL shell for instant experimentation:

- **Immediate Expression Evaluation**: Type any expression (`42`, `"Hello"`, `x + 10`, `TRUE`, `[1, 2, 3]`) to print its result immediately in cyan.
- **Persistent Environment**: Variables (`ivar`, `iconst`), tables, and functions persist across your REPL session.
- **Smart Multi-line Input**: Blocks with unclosed `then ... end`, `do ... end`, `{{ ... }}`, `[ ... ]`, or `( ... )` automatically enter multi-line continuation mode (`... `).
- **Graceful Error Recovery**: Runtime, syntax, and type errors are displayed in red without terminating your shell session.
- **Built-in Commands**:
  - `help()` — Displays quick REPL cheatsheet and tips.
  - `clear()` — Clears the terminal screen.
  - `exit()` (or `Ctrl+C`) — Exits the interactive shell. Pressing `Ctrl+C` while typing multi-line input cancels the pending buffer.

---

## Notable Differences

Kuroba combines concepts from multiple language paradigms while introducing its own signature syntax and ergonomics:

| Concept                         | Kuroba Syntax                                                              | How it Differs from JS / Python / C                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Comments**                    | `~~ comment`<br/>`~~{{ block }}`                                           | Double-tilde zen feather comments (`~~`) and multi-line block comments (`~~{{ ... }}`) instead of `//` or `/* */`.          |
| **Native Swap**                 | `a <-> b;`                                                                 | Atomic in-place variable swap with strict runtime type & nullability validation. No temp variable or tuple destructuring.   |
| **Coercion & Nullability**      | `ivar~Int n = "42";`<br/>`ivar~(String) u = "A";`                          | Type coercion prefix `~Type` and strict non-nullability contracts `~(Type)` directly at variable declaration.               |
| **Dynamic Retyping**            | `score~String = "A";`                                                      | Dynamic type transtyping without redeclaration or shadowing. Constants remain immutable.                                    |
| **Generic Lists & Nullability** | `ivar~List<(String)> l;`<br/>`ivar~(List<Int>) n;`                         | Dynamic arrays with generic element types and precise nullability matrix on both the list and its items.                    |
| **Collection Iteration**        | `for (item in list)`<br/>`for (i, item in list)`<br/>`for (k, v in table)` | Zen, unified iteration without variable declaration boilerplate. Seamlessly supports `List`, `Stack`, `Queue`, and `Table`. |
| **Skip Statement**              | `skip;`                                                                    | Replaces the traditional `continue;` inside loops for cleaner, more intentional iteration skipping.                         |
| **Inline Guards**               | `exit(cond);`<br/>`clear(cond);`                                           | Evaluates a guard condition directly in the statement call without wrapping in an `if` block.                               |
| **Pattern Match Fallback**      | `case: ~`                                                                  | Fallback default branch in `given / case:` blocks using the signature tilde symbol `~`.                                     |
| **Explicit Destruction**        | `kill variable;`                                                           | Explicit variable destruction from active scope with strict declaration checks and constant protection.                     |
| **Functions & Closures**        | `function f(ivar x)`<br/>`function ~(ivar x)`                              | First-class functions, signature tilde lambdas, lexical closures, and value returns via `return`.                           |
| **Native Interception (Hooks)** | `hook f(x) then ... end`                                                   | Transparent native monkey-patching with original function delegation via `this(...)`.                                       |
| **Interactive Key Capture**     | `copyKey()`                                                                | Synchronous, zero-dependency single-character keyboard capture in terminal raw mode without waiting for Enter.              |
| **Native CLI Arguments**        | `args`, `Std.Sys.args`                                                   | Pre-populated, immutable `List<String>` of command-line arguments with full `.count()` and `[i]` support.             |

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
├── krb.cmd           # Windows short alias launcher
├── config.json       # Engine configuration & version metadata
├── package.json      # Project manifest
├── main.krb          # Default playground entry file
├── src/              # Interpreter Core
│   ├── lexer.js          # Lexical analysis & token stream generation
│   ├── parser.js         # Recursive descent parser producing the AST
│   ├── evaluator/        # Modular runtime evaluators
│   │   ├── index.js          # Evaluator entry point & scope dispatcher
│   │   ├── control.js        # Branches, loops, return propagation
│   │   ├── functions.js      # Closures, lambdas, and hook interception
│   │   ├── collections.js    # List, Stack, Queue, Table methods
│   │   ├── variables.js      # Declarations, types, kill statement
│   │   └── types.js          # Value formatting & type coercion
│   └── errors.js         # Colored diagnostic reporting engine
├── examples/         # Showcase Games & Demos
│   ├── deckbuilder.krb   # Roguelike Deckbuilder (Slay the Spire / Balatro style, Relic Hooks)
│   ├── casino.krb        # Full terminal casino (VIP Hook, Slots, Blackjack, Roulette)
│   ├── rpg.krb           # Tactical Boss Rush RPG (Relic Hooks, Classes, Queue logs)
│   └── dungeon.krb       # 2D ASCII Rogue-lite Crawler (Vampiric Blade Hook, Undo Stack)
└── docs/             # Technical Specification & Manuals
    ├── README.md         # Documentation index & cheatsheet
    ├── variables-and-types.md
    ├── operators.md
    ├── control-flow.md
    ├── functions.md      # First-class functions, closures & hooks
    ├── io.md             # Interactive console I/O & clear
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

### Phase 3: Data Structures & Collections `(Completed - v1.0.3)`

- [x] Strict block scoping (variables declared in `if`, `while`, `do-while`, and `for` blocks expire at `end`)
- [x] Multi-line block comments (`~~{{ ... }}`)
- [x] Dynamic Arrays / Tables (`[1, 2, 3]`) with indexing (`arr[0]`), generic typing (`List<Type>`), and compound operators
- [x] Stacks (LIFO) and Queues (FIFO) collections (`Stack<Type>`, `Queue<Type>`) with `.push()`, `.pop()`, `.peek()`, and `.count()`
- [x] Dictionaries / Key-Value Tables (`Table`, `{ key: value }`) with field-level typing (`key~Type`), dynamic addition, and field retyping (`table.key~Type = ...`)
- [x] Collection iteration (`for (item in list)` and `for (i, item in list)`) across `List`, `Stack`, `Queue`, and `Table`

### Phase 4: Functions, Metaprogramming & Developer Ergonomics `(v1.0.4)`

- [x] Variable lifecycle & manual destruction (`kill variable;`)
- [x] First-class functions (`function name(args) ... end` and `function ~(args) ... end`) with lexical closures & `return`
- [x] Function interception (`hook target(args) then ... end` with `this(...)`) & callbacks
- [x] Interactive REPL shell (launching `krb` with no arguments starts an interactive session)
- [x] CLI arguments support (`args` list & `Std.Sys.args`)

### Phase 5: The Vital Standard Library & Multi-File Imports `(v1.0.5)`

- [ ] Built-in `Std.Math` Essentials:
  - [ ] Native random generator (`alea(min, max)` or `random()`)
  - [ ] Mathematical functions (`floor`, `ceil`, `abs`, `min`, `max`, `sqrt`, `pow`)
  - [ ] Mathematical constants (`PI`, `E`)
- [ ] Built-in `Std.Time` (Animation & Tempo):
  - [ ] Synchronous animation delay `sleep(ms)`
  - [ ] High-resolution clock timestamp `now()` in milliseconds
- [ ] Built-in `Std.String` & Zen Syntax Sugar:
  - [ ] Zen String Interpolation with signature tilde: `~"PV: {hp}/{maxHp} - Nom: {nom}"`
  - [ ] Length property / method on strings: `.count()` and `.length()`
  - [ ] Character index read access: `str[0]`
  - [ ] String utilities: `.split()`, `.trim()`, `.upper()`, `.lower()`
- [ ] Built-in `Std.IO` (Filesystem & Persistence):
  - [ ] Synchronous file operations: `fileRead(path)`, `fileWrite(path, content)`, `fileAppend(path, content)`, `fileExists(path)`
- [ ] Pragmatic Multi-File Imports:
  - [ ] Clean script importing: `import "monstres.krb";`

### Phase 6: Exception Handling & Zen Object-Oriented Programming `(v1.0.6)`

- [ ] Exception throwing and handling (`throw`, `try / catch(err) / finally / end`)
- [ ] Tail-call safe recursion optimization (`recur(...)` or TCO engine)
- [ ] Ergonomic Zen Classes (designed as a clean, structured abstraction over `Table`):
  - [ ] Class definition `class Name ... end` with constructor and instance methods
  - [ ] Single inheritance `class Sub extends Super ... end` with `super(...)`
  - [ ] Instance reference (`this`)
- [ ] Namespaces & modular scoping (`namespace Name ... end`)

### Phase 7: Modular Ecosystem, Standard Extended & Tooling `(v1.0.7)`

- [ ] Architecture of strict packages & libraries (`package Name { ... }`, `library Name;`)
- [ ] Selective and aliased package imports (`import Package ~(LibA) alias ~;`)
- [ ] Built-in `StdE` Package (Standard Extended):
  - [ ] `StdE.Json` (native parse and stringify of Tables to JSON)
  - [ ] `StdE.Path` (join, resolve, dirname, basename, extname)
  - [ ] `StdE.Process` (spawning child processes, command execution, pipes)
  - [ ] `StdE.Term` (ANSI text colors & styles, terminal dimensions, cursor positioning)
- [ ] Built-in `Web` Package (Networking & HTTP):
  - [ ] HTTP client fetcher (`Web.fetch` for REST API queries)
  - [ ] Native HTTP web server (`Web.serve`, `Web.listen`)
- [ ] Developer Tooling & CLI Ergonomics:
  - [ ] Official code formatter (`krb fmt`)
  - [ ] Built-in test runner (`krb test`)
  - [ ] Interactive CLI Debugger (`--debug` flag with step execution and AST inspector)

### Phase 8: 2D Game Engine (Package App) & Web Learning Hub `(v1.0.8)`

- [ ] Built-in `App` Package (Native GUI & 2D Game Engine):
  - [ ] Native window creation with framerate and resolution control (`App.window`, `App.fps`)
  - [ ] 2D Canvas & graphical rendering (shapes, colors, sprites, text rendering style Raylib / SDL)
  - [ ] Game / application loop hooks (`App.onUpdate`, `App.onDraw`)
  - [ ] Real-time input handling for games and desktop apps (`App.isKeyDown`, `App.mousePos`)
- [ ] Official Kuroba Web Platform & In-Browser Playground:
  - [ ] Zero-install web interpreter running directly in the browser (pure JS / WebAssembly engine)
  - [ ] Live interactive terminal with syntax highlighting, auto-complete, and output console
- [ ] Interactive Learning Manual (_"Tour of Kuroba"_ / _"The Raven's Manual"_):
  - [ ] Progressive step-by-step interactive lessons from basic syntax to OOP and packages
  - [ ] In-browser code challenges with instant automated grading test suites

---

## License

This project is licensed under the **MIT License**.
