<div align="center">

<img src="web/assets/kuroba.png" alt="Kuroba Logo" width="120" />

# Kuroba — KRB

<sub>A minimalist, zero-dependency interpreted language</sub>

<br/>
<br/>

_Blending ideas from multiple modern languages into a clean C99 bytecode VM &amp; WebAssembly runtime with hybrid typing, native swap, and expressive OOP._

<br/>

[![Version](https://img.shields.io/badge/version-v1.1.0-blue.svg?style=for-the-badge&logo=semver)](package.json)
[![Website](https://img.shields.io/badge/website-live-success.svg?style=for-the-badge&logo=githubpages)](https://mryamitsu.github.io/Kuroba/)
[![Engine](https://img.shields.io/badge/engine-pure%20C99-00599C.svg?style=for-the-badge&logo=c)](engine/)
[![Dependencies](<https://img.shields.io/badge/dependencies-0%20(standalone)-orange.svg?style=for-the-badge>)](package.json)
[![License](https://img.shields.io/badge/license-MIT-purple.svg?style=for-the-badge)](LICENSE)

<br/>

[**Official Website**](https://mryamitsu.github.io/Kuroba/) •
[**Interactive Learning Manual**](https://mryamitsu.github.io/Kuroba/learn.html) •
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

Native engine written entirely from scratch in pure C99 (< 250 KB binary) with zero runtime dependencies. Sub-millisecond startup and tiny memory footprint.

</td>
<td width="50%">

### Hybrid Type System

Automatic type inference (`ivar x = 10;`), explicit coercion (`ivar~String n = 42;`), sealed variables (`isealed s = 1;`), and strict non-nullability contracts (`ivar~(String) name = "...";`). Variable names also natively support UTF-8 characters and emojis (`ivar 🚀 = 100;`).

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

Update a variable's type dynamically with `[Type]var = val;` or cast expressions with `[Type]expr`, with constant and sealed protection.

</td>
</tr>
<tr>
<td width="50%">

### Declarative Classes &amp; OOP

Clean abstraction over `Table` with C#-style constructors, `toString()`, operator overloading (`operator +`), and strict encapsulation (`public`, `private`, `protected`, `isolated`, `exclusive`).

</td>
<td width="50%">

### Runtime Type &amp; State Inspection (`is`)

Polymorphic type and lock validation (`val is Type`, `fn is Function`, `fn is NULL`, `seal is lock`, `hero is Player`) with zero boilerplate.

</td>
</tr>
</table>

---

## Showcase

Here is a quick look at programming in **Kuroba**:

```krb
~~ Define constants, sealed variables, and inferred variables (emojis supported)
iconst MAX_PLAYERS = 4;
ivar score = 100;
ivar 🚀 = 50;                       ~~ Variable names support UTF-8 and emojis
ivar~String username = 42;         ~~ Smart coercion: coerced to "42"
ivar~(Int) rank = 1;               ~~ Strict non-nullable Int

~~ Sealed variable: protected against reassignment until unlocked
isealed vaultKey = "ALPHA";
unlock vaultKey;
vaultKey = "BETA";                 ~~ Auto-reseals immediately after assignment

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
    end
    case ~ then
        paste("Welcome Guest: " + username);
    end
end

~~ Exception handling with structured recovery
try
    ivar res = 100 / 0;
catch (ivar err) then
    pasteLn("Intercepted: " + err.eName);
finally
    pasteLn("Execution restored.");
end
```

---

## Quickstart

### Prerequisites

- Prebuilt standalone binary included (`engine/kuroba.exe` on Windows), or any C99 compiler (`clang` or `gcc`) to build from source.

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
.\krb.cmd
# or directly via native binary:
.\engine\kuroba.exe

# Run a specific script with arguments
.\krb.cmd path/to/script.krb --speed 50 --verbose
# or
.\engine\kuroba.exe path/to/script.krb --speed 50 --verbose
```

### CLI Options

| Command / Flag                             | Description                                                |
| :----------------------------------------- | :--------------------------------------------------------- |
| `.\krb.cmd` / `.\engine\kuroba.exe`        | Launches the interactive REPL shell (Read-Eval-Print Loop) |
| `.\engine\kuroba.exe <file.krb> [args...]` | Executes the script with command-line arguments            |
| `.\engine\kuroba.exe -i`, `--repl`         | Explicitly forces interactive REPL mode                    |
| `.\engine\kuroba.exe -v`, `--version`      | Displays current engine version and build info             |
| `.\engine\kuroba.exe -h`, `--help`         | Prints the CLI help manual                                 |

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

| Concept                         | Kuroba Syntax                                                                             | How it Differs from JS / Python / C                                                                                                                                       |
| :------------------------------ | :---------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Comments**                    | `~~ comment`<br/>`~~{{ block }}`                                                          | Double-tilde feather comments (`~~`) and multi-line block comments (`~~{{ ... }}`) instead of `//` or `/* */`.                                                            |
| **Native Swap**                 | `a <-> b;`                                                                                | Atomic in-place variable swap with strict runtime type & nullability validation. No temp variable or tuple destructuring.                                                 |
| **Coercion & Nullability**      | `ivar~Int n = "42";`<br/>`ivar~(String) u = "A";`                                         | Type coercion prefix `~Type` and strict non-nullability contracts `~(Type)` directly at variable declaration. Variable names also support emojis (`ivar 🚀 = 1;`).        |
| **Sealed Entities**             | `isealed key = 1;`<br/>`unlock key;`<br/>`key is lock`                                    | Variables, functions, and methods protected against mutation/hooking until unlocked via `unlock`; auto-reseals after one change, inspectable via `is lock` / `is unlock`. |
| **Dynamic Retyping & Cast**     | `[String]score = "A";`<br/>`[Int]b + [Int]c`                                              | Dynamic type transtyping without redeclaration (`[Type]var = val;`) and prefix expression casting (`[Type]operand`).                                                      |
| **Generic Lists & Nullability** | `ivar~List<(String)> l;`<br/>`ivar~(List<Int>) n;`                                        | Dynamic arrays with generic element types and precise nullability matrix on both the list and its items.                                                                  |
| **Nested Mutations**            | `grid[y][x] = "#";`<br/>`enemies[i].hp -= 10;`<br/>`player.bag[0] = "Bow";`               | Arbitrary mixed `[...]` and `.prop` assignment chains with compound operators, retyping, and `iconst` root protection.                                                    |
| **Recursive Project Imports**   | `namespace Utils`<br/>`namespace Game ~Combat`<br/>`import Game;`                         | Symbol-based recursive `.krb` discovery across project subfolders (CLI & Web) with circular import detection.                                                             |
| **Collection Iteration**        | `for (ivar item in list)`<br/>`for (ivar i, item in list)`<br/>`for (ivar k, v in table)` | Unified indexed and key-value iteration across `List`, `Stack`, `Queue`, and `Table`.                                                                                     |
| **Skip Statement**              | `skip;`                                                                                   | Replaces the traditional `continue;` inside loops for cleaner, more intentional iteration skipping.                                                                       |
| **Inline Guards**               | `exit(cond);`<br/>`clear(cond);`                                                          | Evaluates a guard condition directly in the statement call without wrapping in an `if` block.                                                                             |
| **Pattern Match Fallback**      | `case ~ then`                                                                             | Fallback default branch in `given / case ... then` blocks using the signature tilde symbol `~`.                                                                           |
| **Exception Handling**          | `throw <expr>;`<br/>`try ... catch (ivar e) ... finally ... end`                          | Uncaught throws exit with vermilion diagnostic `#FF5500`. Try/catch safely traps user throws and native runtime errors.                                                   |
| **Explicit Destruction**        | `kill variable;`                                                                          | Explicit variable destruction from active scope with strict declaration checks and constant protection.                                                                   |
| **Classes & OOP**               | `class Hero from Entity`<br/>`operator +(other)`<br/>`function toString()`                | Ergonomic classes with C#-style constructors, encapsulation, `from` / `base` inheritance, `toString()` protocol, and operator overloading.                                |
| **Functions & Closures**        | `ivar~Function cb`<br/>`isealed f = function ~(x)`<br/>`function f(ivar x)`               | First-class typed functions (`~Function`), `iconst` / `isealed` lockable lambdas, lexical closures, and null-function checks (`is NULL`).                                 |
| **Native Interception (Hooks)** | `hook f(x) then ... end`<br/>`hook Class.m(x) then ... end`                               | Transparent native monkey-patching with original function delegation via `orig(...)`. `this` strictly refers to the class instance.                                       |
| **Interactive Key Capture**     | `copyKey()`                                                                               | Synchronous, zero-dependency single-character keyboard capture in terminal raw mode without waiting for Enter.                                                            |
| **Native CLI Arguments**        | `args`                                                                                    | Pre-populated, immutable `List<String>` of command-line arguments with full `.count()` and `[i]` support.                                                                 |

> Looking to master Kuroba step by step? Try the **[50-Lesson Interactive Learning Manual](https://mryamitsu.github.io/Kuroba/learn.html)**, **[Browse the Official Web Documentation](https://mryamitsu.github.io/Kuroba/docs.html)**, or test snippets in the **[Interactive Live Playground](https://mryamitsu.github.io/Kuroba/playground.html)**.

---

## Architecture

Kuroba is designed as a high-performance bytecode-compiled native engine:

```text
 ┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────────┐
 │ Source Code │ ───> │ Fast Scanner │ ───> │ Bytecode    │ ───> │ Bytecode VM  │
 │   (.krb)    │      │ (Tokens)     │      │ Compiler    │      │ (Native C)   │
 └─────────────┘      └──────────────┘      └─────────────┘      └──────────────┘
                             │                     │                    │
                             └──────────┬──────────┴────────────────────┘
                                        ▼
                             [ Structured Error Tables ]
                                 (eName, eContext)
```

```text
Kuroba/
├── engine/           # Pure C99 High-Performance Native Engine
│   ├── kuroba.exe        # Prebuilt native binary executable (< 250 KB)
│   ├── main.c            # CLI entrypoint, REPL shell & file runner
│   ├── include/          # Engine header declarations
│   │   ├── common.h          # Standard includes, definitions & debug toggles
│   │   ├── chunk.h           # Bytecode chunk representation & opcodes
│   │   ├── compiler.h        # Bytecode compiler interface
│   │   ├── memory.h          # Dynamic memory allocation & garbage safety
│   │   ├── object.h          # Runtime objects (strings, lists, tables, functions)
│   │   ├── scanner.h         # Lexer & token scanning interface
│   │   ├── table.h           # Hash table implementation for fields & globals
│   │   ├── value.h           # Tagged union value representation
│   │   └── vm.h              # Virtual machine state & stack frame definitions
│   └── src/              # Engine implementation source
│       ├── chunk.c           # Bytecode emission & constant pool management
│       ├── compiler.c        # Single-pass Pratt parser & bytecode generator
│       ├── debug.c           # Bytecode disassembler & diagnostic tooling
│       ├── memory.c          # Allocation & memory safety manager
│       ├── object.c          # Object allocation & string interning
│       ├── scanner.c         # High-speed UTF-8 token scanner
│       ├── stdlib_krb.c      # Native standard library bindings (I/O, Math, Time)
│       ├── table.c           # Hash table lookup & linear probing
│       ├── value.c           # Value operations & conversions
│       └── vm.c              # Bytecode interpreter loop & call stack engine
├── lib/              # Core Standard Library (.krb)
│   ├── std/              # io.krb, math.krb, string.krb, time.krb
│   └── stde/             # json.krb, path.krb, process.krb, random.krb, term.krb
├── web/              # Official Website, Web Docs, Learning Manual & Interactive IDE
│   ├── index.html          # Language showcase & architectural principles
│   ├── docs.html           # Complete technical documentation & specification
│   ├── learn.html          # 50-lesson interactive Learning Manual with WASM grading
│   ├── playground.html     # Fullscreen IDE & live virtual terminal
│   ├── kuroba_wasm.c       # Native C-to-WebAssembly runtime bridge
│   ├── css/style.css       # Official stylesheet (strict 5-color palette)
│   ├── js/kuroba-engine.js # Emscripten WebAssembly loader & virtual FS
│   ├── js/learn.js         # Learning Manual controller & automated grading harness
│   ├── js/lessons-part1.js # Interactive lessons 1–26 (Chapters 1–4)
│   ├── js/lessons-part2.js # Interactive lessons 27–50 (Chapters 5–8)
│   └── js/playground.js    # Interactive IDE controller & samples
├── tools/            # Build & SSOT version sync scripts
│   ├── build-wasm.js       # Emscripten C-to-WASM build script
│   └── sync-version.js     # Single Source of Truth version synchronizer
├── main.krb          # TDD test suite & language validation runner
├── config.json       # Engine configuration & version metadata
├── package.json      # Project manifest & npm scripts
├── kuroba.cmd        # Windows primary launcher shortcut
└── krb.cmd           # Windows short alias launcher shortcut
```

---

## Roadmap &amp; Update Log <a id="roadmap"></a>

> Track the full interactive release changelog with code previews on the [Official Update Log](https://mryamitsu.github.io/Kuroba/updates.html).

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
- [x] Dynamic variable transtyping and expression casting (`[Type]var = val;` and `[Type]operand`)

### Phase 2: Iteration & Interactive Console `(Completed - v1.0.2)`

- [x] Process termination & inline conditional guard (`exit()`, `exit(cond)`)
- [x] Output formatting: `paste` (no newline) vs `pasteLn` (with newline)
- [x] Compound assignment & step operators (`+=`, `-=`, `*=`, `/=`, `%=`, `++`, `--`)
- [x] Loop structures:
  - [x] Classical `for` loops (`for (...) then ... end`) with `break;` and `skip;`
  - [x] `while <cond> then ... end`
  - [x] `do [then] ... while <cond>;`
- [x] Interactive console input: `copy(...)` (blocking prompt) and `copyKey()` (single keypress)
- [x] Console screen management: `clear()`, `clear(cond)`

### Phase 3: Data Structures & Collections `(Completed - v1.0.3)`

- [x] Strict block scoping (variables declared in `if`, `while`, `do-while`, and `for` blocks expire at `end`)
- [x] Multi-line block comments (`~~{{ ... }}`)
- [x] Dynamic Arrays / Tables (`[1, 2, 3]`) with indexing (`arr[0]`), generic typing (`List<Type>`), and compound operators
- [x] Stacks (LIFO) and Queues (FIFO) collections (`Stack<Type>`, `Queue<Type>`) with `.push()`, `.pop()`, `.peek()`, and `.count()`
- [x] Dictionaries / Key-Value Tables (`Table`, `{ key: value }`) with field-level typing (`key~Type`), dynamic addition, and field retyping (`table.key~Type = ...`)
- [x] Collection iteration (`for (ivar item in list)` and `for (ivar i, item in list)`) across `List`, `Stack`, `Queue`, and `Table`

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
  - [x] Structured exception metadata tables (`eName`, `eLines`, `eCode`, `eContext`, `eTime`, `eLine`, `eCol`)
  - [x] Safe runtime error trapping (`MathError`, `TypeError`, `IndexError`, `IOError`) translated to structured tables
  - [x] Optional `then` keyword across `try`, `catch`, and `finally`
- [x] Call stack depth limit with catchable `[RecursionError]` diagnostics

### Phase 7: Object-Oriented Programming & Language Ergonomics `(Completed - v1.0.7)`

- [x] Ergonomic Classes (designed as a clean, structured abstraction over `Table`):
  - [x] Class definition `class Name ... end` with constructor and instance methods
  - [x] Single inheritance `class Sub from Super ... end` with `base(...)` and `base.method(...)`
  - [x] Instance reference (`this`)
  - [x] Encapsulation & Access Modifiers (`public`, `private`)
  - [x] Static class members (`shared ivar`, `shared function`, and `shared then ... end` blocks)
  - [x] Class Method Interception (`hook ClassName.method(args) then ... end`)
  - [x] Namespaces integration & class scoping (`namespace Name ~class ClassName [from SuperClass] then ... end`, qualified paths `Entities.Player`)
- [x] Type & Value Constructs:
  - [x] Runtime type checking operator (`is`, e.g., `if (x is Int) then`, `is NULL`, `is TRUE`, `is List<Int>`, `is Player`, `is Table`)
  - [x] Native Enumerations (`enum State then IDLE, RUNNING, PAUSED end`)
  - [x] Multi-variable single-line declarations with trailing value propagation (`ivar a, b = 1, 2;`, `ivar c, d = 4;` -> both `4`, `ivar e, f, g = 2, 5;` -> `g` takes `5`)
  - [x] Default parameter values in functions
  - [x] Arbitrary nested member and index assignments (`grid[y][x] = "#";`, `enemies[i].hp -= 10;`, `player.bag[0] = "Bow";`) with `iconst` root immutability protection
  - [x] Recursive multi-file project imports in CLI (`namespace Utils`, `namespace Game ~Combat`, subfolder `.krb` discovery, and `[ImportError]` circular import guards)

### Phase 8: OOP Finalization & Modular StdE `(Completed - v1.0.8)`

- [x] OOP Contracts, Visibility & Ergonomics:
  - [x] Extended Visibility Modifiers (`protected`, `isolated`, `exclusive`):
    - [x] `protected ivar/iconst/function`: accessible across class hierarchies (parent and subclasses), hidden from external consumers
    - [x] `isolated ivar/iconst/function`: strictly exclusive to the declaring class, completely uninherited and inaccessible by child classes
    - [x] `exclusive ivar/iconst/function`: publicly accessible on declaring class, strictly uninherited and absent from child classes
  - [x] Custom Property Accessors (`get` / `set`):
    - [x] Property interceptor syntax (`get prop then ... end`, `set prop(val) then ... end`) with raw backing storage access via `value`
    - [x] Immutability protection (`iconst` read-only getters, syntax rejection on setters)
  - [x] Interface contracts (`interface IEntity then ... end`, `class Player from Super as IEntity`) & runtime conformance (`player is IEntity`)
- [x] Built-in `StdE` Package (Standard Extended):
  - [x] `StdE.Random` (dedicated stochastic engine decoupled from `Std.Math`: `seed`, `int`, `float`, `item`, `shuffle`, `chance`, `uuid`, `token`)
  - [x] `StdE.Json` (native bidirectional parse and stringify of Tables to JSON, formatted read/write, minify)
  - [x] `StdE.Path` (cross-platform path resolution: `join`, `resolve`, `dirname`, `basename`, `extname`, `isAbsolute`, `normalize`, `relative`, `parse`, `format`, `sep`, `delimiter`)
  - [x] `StdE.Process` (child process execution, commands, environment variables, working directory, and system introspection)
  - [x] `StdE.Term` (ANSI colors, terminal styling, dimensions, and cursor control)

### Phase 9: Pure C Native Engine Transformation `(v1.1.0)`

- [x] Next-Gen Pure C High-Performance Engine Transformation (Lua-Inspired Architecture):
  - [x] Complete native rewrite in pure C (C99) (`engine/`) for maximal speed, sub-millisecond startup, and tiny binary footprint (< 250 KB)
  - [x] Ultra-fast Bytecode Compiler & Virtual Machine with compact bytecode instruction dispatch
  - [x] Gradual type annotations on function parameters (`ivar~Type param`) and strict non-nullability contracts (`ivar~(Type) strict`)
  - [x] First-class UTF-8 and Emoji variable identifier support
  - [x] Zero-dependency interactive terminal input primitives (`copy()`, `copyKey()`) and full CLI shell REPL
  - [x] Comprehensive 187/187 native crash test suite (`main.krb`) passing with 100% success rate
- [x] Sealed variables (`isealed`) with explicit one-shot unlock mechanics (`unlock var;`), auto-reseal, and manual re-locking (`lock var;`)

### Phase 10: Advanced OOP & Language Extensions `(v1.1.1)`

- [x] OOP Refinements & Language Ergonomics:
  - [x] Textual representation & string inspection protocol (`toString()` auto-invoked by `paste` and `~` string interpolation)
  - [x] Basic operator overloading for vectors, games, and math (`operator +`, `operator -`, `operator *`, etc.)
  - [x] First-class `Function` type enforcement (`ivar~Function`, `is Function`) and null-function semantics
- [ ] Integrated Unit Testing System:
  - [ ] Built-in test runner CLI (`krb test` with automated test file discovery `*.test.krb`)
  - [ ] Native test block & assertions (`test "feature" then ... end`, `assert(cond)`, `assertEqual(a, b)`)
  - [ ] Clean formatted terminal report (passed, failed, duration, error diffs and stack traces)
- [x] Interactive Learning Manual:
  - [x] Progressive step-by-step interactive lessons from basic syntax to OOP and packages
  - [x] In-browser code challenges with instant automated grading test suites

### Phase 11: Native Asynchronism, Full-Stack Web & Universal Tooling `(v1.1.2)`

- [ ] Native Concurrency & Asynchronous Programming:
  - [ ] Event loop integration & cooperative coroutines / fibers in C (`async function`, `await expr`, `yield`)
  - [ ] Non-blocking native I/O (epoll / IOCP / kqueue) replacing synchronous blocking primitives
  - [ ] Asynchronous exception handling and timeout cancellation within `try / catch`
- [ ] Full-Stack `Web` Package (Native HTTP & Networking):
  - [ ] High-performance HTTP Client (`Web.fetch`, `Web.get`, `Web.post` with query params, headers, JSON conversion)
  - [ ] Native HTTP Server (`Web.serve`, `Web.listen`) with request routing (`req.method`, `req.url`, `req.headers`, `req.body`, `req.query`)
  - [ ] Server Response & Middleware Pipeline (`res.status`, `res.json`, `res.text`, `res.header`, `res.sendFile`, route dispatching)
  - [ ] Static asset serving for HTML/CSS/JS with sub-millisecond response times
- [ ] Built-in `App` Package (Native 2D Game Engine):
  - [ ] Native window creation with framerate and resolution control (`App.window`, `App.fps`)
  - [ ] 2D Canvas & graphical rendering (shapes, colors, sprites, text rendering style Raylib / SDL)
  - [ ] Game / application loop hooks (`App.onUpdate`, `App.onDraw`)
  - [ ] Real-time input handling for games and desktop apps (`App.isKeyDown`, `App.mousePos`)
- [ ] Universal Distribution, Tooling & Ecosystem:
  - [ ] Single self-contained native binary (`engine/kuroba.exe` on Windows, `kuroba` on macOS/Linux) with bundled `Std`/`StdE` (zero external dependencies)
  - [ ] One-liner installation scripts (`irm ... | iex` on Windows PowerShell, `curl ... | bash` on macOS/Linux)
  - [ ] Official npm global distribution (`npm install -g kuroba`)
  - [ ] Package Manager & Developer Tooling (`kpm` / `krb install`, `krb publish`, `krb fmt`, VS Code LSP)
  - [ ] Website & Documentation Internationalization (`i18n`)

---

## License

This project is licensed under the **MIT License**.
