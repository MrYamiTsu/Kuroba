<div align="center">

<img src="web/assets/kuroba.png" alt="Kuroba Logo" width="120" />

# Kuroba — KRB

<sub>A minimalist, zero-dependency interpreted language</sub>

<br/>
<br/>

_Blending ideas from multiple modern languages into a clean AST interpreter with hybrid typing, native swap, and expressive control flow._

<br/>

[![Version](https://img.shields.io/badge/version-v1.0.6-blue.svg?style=for-the-badge&logo=semver)](package.json)
[![Website](https://img.shields.io/badge/website-live-success.svg?style=for-the-badge&logo=githubpages)](https://mryamitsu.github.io/Kuroba/)
[![Node](https://img.shields.io/badge/node->=%2016.0.0-339933.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Dependencies](<https://img.shields.io/badge/dependencies-0%20(pure%20vanilla)-orange.svg?style=for-the-badge>)](package.json)
[![License](https://img.shields.io/badge/license-MIT-purple.svg?style=for-the-badge)](LICENSE)

<br/>

[**Official Website**](https://mryamitsu.github.io/Kuroba/) •
[**Live Playground**](https://mryamitsu.github.io/Kuroba/playground.html) •
[**Technical Documentation**](https://mryamitsu.github.io/Kuroba/docs.html) •
[**Quickstart**](#quickstart) •
[**Showcase**](#showcase) •
[**Architecture**](#architecture) •
[**Roadmap**](#roadmap)

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

Clean block boundaries (`end`), multi-branch pattern matching (`given / case ... then`), robust exception handling (`try / catch / finally`), and inline conditional guard clauses (`exit(cond);`).

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
    case "admin" then
        paste("Access Granted");
        break;
    case ~ then
        paste("Welcome Guest: " + username);
end

~~ Exception handling with structured recovery
try
    ivar res = 100 / 0;
catch (ivar err) then
    pasteLn("Intercepted: " + err.exName);
finally
    pasteLn("Execution restored.");
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

| Command / Flag                         | Description                                                |
| :------------------------------------- | :--------------------------------------------------------- |
| `.\krb` / `.\kuroba` / `node index.js` | Launches the interactive REPL shell (Read-Eval-Print Loop) |
| `.\krb <file.krb> [args...]`           | Executes the script with command-line arguments            |
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

| Concept                         | Kuroba Syntax                                                              | How it Differs from JS / Python / C                                                                                       |
| :------------------------------ | :------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Comments**                    | `~~ comment`<br/>`~~{{ block }}`                                           | Double-tilde feather comments (`~~`) and multi-line block comments (`~~{{ ... }}`) instead of `//` or `/* */`.            |
| **Native Swap**                 | `a <-> b;`                                                                 | Atomic in-place variable swap with strict runtime type & nullability validation. No temp variable or tuple destructuring. |
| **Coercion & Nullability**      | `ivar~Int n = "42";`<br/>`ivar~(String) u = "A";`                          | Type coercion prefix `~Type` and strict non-nullability contracts `~(Type)` directly at variable declaration.             |
| **Dynamic Retyping**            | `score~String = "A";`                                                      | Dynamic type transtyping without redeclaration or shadowing. Constants remain immutable.                                  |
| **Generic Lists & Nullability** | `ivar~List<(String)> l;`<br/>`ivar~(List<Int>) n;`                         | Dynamic arrays with generic element types and precise nullability matrix on both the list and its items.                  |
| **Collection Iteration**        | `for (item in list)`<br/>`for (i, item in list)`<br/>`for (k, v in table)` | Unified iteration without variable declaration boilerplate. Seamlessly supports `List`, `Stack`, `Queue`, and `Table`.    |
| **Skip Statement**              | `skip;`                                                                    | Replaces the traditional `continue;` inside loops for cleaner, more intentional iteration skipping.                       |
| **Inline Guards**               | `exit(cond);`<br/>`clear(cond);`                                           | Evaluates a guard condition directly in the statement call without wrapping in an `if` block.                             |
| **Pattern Match Fallback**      | `case ~ then`                                                              | Fallback default branch in `given / case ... then` blocks using the signature tilde symbol `~`.                           |
| **Exception Handling**          | `throw <expr>;`<br/>`try ... catch (ivar e) ... finally ... end`           | Uncaught throws exit with vermilion diagnostic `#FF5500`. Try/catch safely traps user throws and native runtime errors.   |
| **Explicit Destruction**        | `kill variable;`                                                           | Explicit variable destruction from active scope with strict declaration checks and constant protection.                   |
| **Functions & Closures**        | `function f(ivar x)`<br/>`function ~(ivar x)`                              | First-class functions, signature tilde lambdas, lexical closures, and value returns via `return`.                         |
| **Native Interception (Hooks)** | `hook f(x) then ... end`                                                   | Transparent native monkey-patching with original function delegation via `this(...)`.                                     |
| **Interactive Key Capture**     | `copyKey()`                                                                | Synchronous, zero-dependency single-character keyboard capture in terminal raw mode without waiting for Enter.            |
| **Native CLI Arguments**        | `args`                                                                     | Pre-populated, immutable `List<String>` of command-line arguments with full `.count()` and `[i]` support.                 |

> Looking for the complete language specification and cheatsheet? **[Browse the Official Web Documentation](https://mryamitsu.github.io/Kuroba/docs.html)** or test snippets directly in the **[Interactive Live Playground](https://mryamitsu.github.io/Kuroba/playground.html)**.

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
├── main.krb          # Full test suite & language validation runner
├── src/              # Interpreter Core (Modular Lexer, Parser, AST Evaluator)
│   ├── errors.js         # Colored diagnostic reporting engine & try/catch context
│   ├── repl.js           # Interactive REPL shell with multi-line support
│   ├── lexer/            # Modular Lexical Analysis
│   │   ├── tokens.js         # Keywords, symbols, and character classification
│   │   └── index.js          # Lexer engine & token stream generator
│   ├── parser/           # Modular AST Recursive Descent Parser
│   │   ├── cursor.js         # Token cursor, lookahead, and consumption utilities
│   │   ├── types.js          # Type annotation & nullability contract parser
│   │   ├── expressions.js    # Precedence hierarchy & primary expressions
│   │   ├── control.js        # Control structures (if, for, while, given, try, hook...)
│   │   ├── statements.js     # Statements, assignments, variable declarations & program
│   │   └── index.js          # Parser entrypoint parse(tokens)
│   ├── evaluator/        # Modular Runtime AST Evaluators (Zero circular imports)
│   │   ├── index.js          # Main AST dispatcher evaluate(node, env)
│   │   ├── operations.js     # Arithmetic, comparison, unary & logical operations
│   │   ├── scope.js          # Environment scope frames and lookup
│   │   ├── types.js          # Type coercion, checking and value representations
│   │   ├── io.js             # Built-in I/O (paste, pasteln, copy, clear, exit)
│   │   ├── tables.js         # Table literals & property mutations
│   │   ├── collections.js    # List, Stack, Queue methods and indexing
│   │   ├── variables.js      # Variable declarations, retyping, and destruction (kill)
│   │   ├── functions.js      # Closures, lambdas, returns and hook interception
│   │   ├── control.js        # Flow control (if, for, for-in, while, do-while, given, try)
│   │   └── packages.js       # Modular package imports and namespaces
│   └── runtime/          # Built-in runtime native functions (Math, Date, IO)
│       └── natives.js        # Standard library natives bridge
├── lib/              # Core Standard Library source (.krb)
│   └── std/              # io.krb, math.krb, string.krb, time.krb
├── web/              # Official Website, Web Docs & Interactive IDE
│   ├── index.html        # Language showcase & architectural principles
│   ├── docs.html         # Complete technical documentation & spec
│   ├── playground.html   # Fullscreen IDE & live virtual terminal
│   ├── css/style.css     # Official stylesheet (strict 5-color palette)
│   ├── js/kuroba-web.js  # Zero-dependency client-side AST engine
│   └── js/playground.js  # Interactive IDE controller & samples
├── tools/            # Development & packaging utilities
│   └── bundle-web.js     # Standalone browser bundle builder
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
- [x] Pattern matching (`given / case ... then / break; / case ~ then`)
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

### Phase 4: Functions, Metaprogramming & Developer Ergonomics `(Completed - v1.0.4)`

- [x] Variable lifecycle & manual destruction (`kill variable;`)
- [x] First-class functions (`function name(args) ... end` and `function ~(args) ... end`) with lexical closures & `return`
- [x] Function interception (`hook target(args) then ... end` with `this(...)`) & callbacks
- [x] Interactive REPL shell (launching `krb` with no arguments starts an interactive session)
- [x] CLI arguments support (`args` list & `Std.Sys.args`)

### Phase 5: The Vital Standard Library & Multi-File Imports `(Completed - v1.0.5)`

- [x] Namespaces & Modular Scoping:
  - [x] Application root namespace: `namespace Main then ... end` (strictly indivisible, non-importable)
  - [x] Modular library slices: `namespace Package ~Module then ... end`
  - [x] Pure symbol discovery (file-name independent module resolution)
  - [x] Autonomous standalone scripts support (run without namespace, cannot be imported)
- [x] Pragmatic Multi-File & Package Imports:
  - [x] Full package & selective module imports: `import Std;`, `import Std alias S;`, `import Std ~(Math) alias ~;`
  - [x] Direct root module exposure via `alias ~`
  - [x] Isolated module scope execution with cached table exports
- [x] Built-in `Std.Math` Essentials:
  - [x] Polyvalent random generator (`random()`, `random(max)`, `random(min, max)`, `randomItem(list)`)
  - [x] Mathematical functions (`floor`, `ceil`, `round`, `trunc`, `abs`, `min`, `max`, `clamp`, `sign`, `lerp`, `dist`, `sqrt`, `pow`, `log`, `log10`, `exp`)
  - [x] Trigonometry & Inverses (`sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `degToRad`, `radToDeg`)
  - [x] Mathematical constants (`PI`, `TAU`, `E`)
- [x] Built-in `Std.Time` (Animation, Precision & Benchmarking):
  - [x] CPU-friendly synchronous sleep: `sleep(ms)`, `sleepSec(sec)` using native `Atomics.wait`
  - [x] High-precision timestamps: `now()`, `unix()`, `perf()` / `hires()`
  - [x] Clock & ISO formatting: `clock()` (Table), `iso()`
  - [x] Gamedev helpers: `since(t0)`, `format(ms)`, closure-based `stopwatch()`
- [x] Built-in `Std.String` & Syntax Sugar:
  - [x] String Interpolation with signature tilde: `~"PV: {hp}/{maxHp} - Nom: {nom}"`
  - [x] Character index read access: `str[0]`
  - [x] Comprehensive string utilities: `upper`, `lower`, `count`, `trim`, `split`, `join`, `replace`, `contains`, `startsWith`, `endsWith`, `indexOf`, `slice`, `repeat`, `reverse`
- [x] Built-in `Std.IO` (Filesystem & Persistence):
  - [x] Synchronous file operations: `fileCopy(path)`, `filePaste(path, content)`, `filePasteLn(path, content)`, `fileAppend(path, content)`, `fileExists(path)`, `fileKill(path)`

### Phase 6: Exception Handling & Web Documentation `(Completed - v1.0.6)`

- [x] Official "Kuroba" Web Presence, Documentation & Live Playground:
  - [x] Responsive, artisanal web documentation replacing repository markdown
  - [x] Client-side zero-install in-browser AST code runner & virtual terminal with multi-file namespace workspace (`main.krb` + custom `.krb` tabs)
  - [x] Strict 5-color palette, bespoke engineering typography (`Space Grotesk`, `IBM Plex Sans`, `IBM Plex Mono`), zero external npm dependencies
- [x] Exception throwing and handling (`throw`, `try / catch(ivar e) / finally / end`):
  - [x] Distinct vermilion / orange-red diagnostics (`#FF5500`) with line/col reporting
  - [x] Structured exception metadata tables (`exName`, `exLines`, `exCode`, `exContext`, `exTime`)
  - [x] Safe runtime error trapping (`MathError`, `TypeError`, `IndexError`, `IOError`) translated to structured tables
  - [x] Optional `then` keyword across `try`, `catch`, and `finally`
- [x] Call stack depth limit with catchable `[RecursionError]` diagnostics

### Phase 7: Object-Oriented Programming & Language Ergonomics `(v1.0.7)`

- [ ] Ergonomic Classes (designed as a clean, structured abstraction over `Table`):
  - [ ] Class definition `class Name ... end` with constructor and instance methods
  - [ ] Single inheritance `class Sub extends Super ... end` with `super(...)`
  - [ ] Instance reference (`this`)
  - [ ] Encapsulation & Access Modifiers (`public`, `private`)
  - [ ] Static class members (`static ivar`, `static function`)
  - [ ] Class Method Interception (`hook ClassName.method(args) then ... end`)
  - [ ] Namespaces integration & class scoping
- [ ] Type & Value Constructs:
  - [ ] Runtime type checking operator (`is`, e.g., `if (enemy is Boss) then`)
  - [ ] Native Enumerations (`enum State then IDLE, RUNNING, PAUSED end`)
  - [ ] Multi-variable single-line declarations with trailing value propagation (`ivar a, b = 1, 2;`, `ivar c, d = 4;` -> both `4`, `ivar e, f, g = 2, 5;` -> `g` takes `5`)
  - [x] Default parameter values in functions

### Phase 8: Asynchronism, Modular Ecosystem & Web `(v1.0.8)`

- [ ] Concurrency & Asynchronous Programming:
  - [ ] Non-blocking async routines (`async` / `await`) and lightweight coroutines (`task` / `yield`)
- [ ] Built-in `StdE` Package (Standard Extended):
  - [ ] `StdE.Json` (native parse and stringify of Tables to JSON)
  - [ ] `StdE.Path` (join, resolve, dirname, basename, extname)
  - [ ] `StdE.Process` (spawning child processes, command execution, pipes)
  - [ ] `StdE.Term` (ANSI text colors & styles, terminal dimensions, cursor positioning)
- [ ] Built-in `Web` Package (Networking & HTTP):
  - [ ] HTTP client fetcher (`Web.fetch` for REST API queries)
  - [ ] Native HTTP web server (`Web.serve`, `Web.listen`)

### Phase 9: Native 2D Game Engine (`App`), Developer Tooling & Tour `(v1.0.9)`

- [ ] Built-in `App` Package (Native GUI & 2D Game Engine):
  - [ ] Native window creation with framerate and resolution control (`App.window`, `App.fps`)
  - [ ] 2D Canvas & graphical rendering (shapes, colors, sprites, text rendering style Raylib / SDL)
  - [ ] Game / application loop hooks (`App.onUpdate`, `App.onDraw`)
  - [ ] Real-time input handling for games and desktop apps (`App.isKeyDown`, `App.mousePos`)
- [ ] Developer Tooling & CLI Ergonomics:
  - [ ] Official code formatter (`krb fmt`)
  - [ ] Built-in test runner (`krb test`)
  - [ ] Interactive CLI Debugger (`--debug` flag with step execution and AST inspector)
  - [ ] Official VS Code Language Server Protocol (`LSP`) with live diagnostics & autocomplete
- [ ] Interactive Learning Manual (_"Tour of Kuroba"_ / _"The Raven's Manual"_):
  - [ ] Progressive step-by-step interactive lessons from basic syntax to OOP and packages
  - [ ] In-browser code challenges with instant automated grading test suites

### Phase 10: Embedding SDK, Package Manager & Standalone Compiler `(v2.0.0)`

- [ ] Kuroba Embeddable SDK (Lua-inspired Native Integration):
  - [ ] Bidirectional Host API for embedding Kuroba into C# (Unity), Godot, Node.js, and Browser apps
- [ ] Bytecode Virtual Machine & Standalone Compilation:
  - [ ] Bytecode VM optimization pass for high-throughput execution
  - [ ] Standalone executable builder (`krb build game.krb --out game.exe`) with zero runtime prerequisites
- [ ] Official Package Manager (`kpm` / `krb install`):
  - [ ] Project dependency manifest (`kuroba.json`) and community module registry (`krb publish`, `krb install`)

---

## License

This project is licensed under the **MIT License**.
