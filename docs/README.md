# Kuroba Documentation

Welcome to the official technical specification and language reference for **Kuroba** (*KRB*), a modern, zen, interpreted programming language engineered in pure Node.js with zero external dependencies.

---

## Guides by Topic

1. **[Variables & Types](variables-and-types.md)**  
   Declarations (`ivar`, `iconst`), type system overview, type coercion (`~Type`), strict non-nullability contracts (`~(Type)`), dynamic retyping, lists, stacks, queues, tables, first-class functions, and manual destruction (`kill`).

2. **[Operators & Expressions](operators.md)**  
   Operator precedence table, arithmetic, string concatenation, equality coercion, short-circuit logic, step operators, compound assignments, member access, collection indexing, function calls, and atomic swap (`<->`).

3. **[Control Flow](control-flow.md)**  
   Conditionals (`if / elif / else / end`), pattern matching (`given / case:` with Kuroba redirect rule), 3-clause for loops, native collection iteration (`for ... in`), while and do-while loops, flow controls (`break;`, `skip;`), function returns (`return`), inline guards (`exit`), and screen clearing (`clear`).

4. **[Functions & Interception (Hooks)](functions.md)**  
   Named functions, parameter typing, anonymous lambdas (`function ~`), closures, lexical scopes, recursion, table methods, and native function interception (`hook` with implicit `this(...)`).

5. **[Console, Interactive I/O & REPL](io.md)**  
   Synchronous console output (`paste`, `pasteLn`), line input (`copy`), instant single-keypress capture (`copyKey`), screen management (`clear`), and the Interactive REPL Shell (`krb`).

6. **[Error Reference](errors.md)**  
   Overview and diagnostics for all 5 runtime and syntax error classes (`SyntaxError`, `TypeError`, `ReferenceError`, `MathError`, `IndexError`).

---

## Language Cheatsheet

```krb
~~ 1. Variables, Constants & Types
ivar count = 10;                     ~~ Inferred as Int
iconst MAX_USERS = 100;              ~~ Immutable constant
ivar~Int coerced = "50";             ~~ Coerced to Int 50
ivar~(String) strictUser = "admin";  ~~ Non-nullable strict String

~~ 2. Native Atomic Swap
ivar a = 1;
ivar b = 2;
a <-> b;                             ~~ a is now 2, b is now 1

~~ 3. Conditionals & Pattern Matching
if (count >= 10 && a == 2) then
    pasteLn("Condition satisfied!");
end

given strictUser then
    case: "admin"
        pasteLn("Admin console unlocked");
        break;
    case: ~
        pasteLn("Standard access");
end

~~ 4. Collections: Lists, Stacks, Queues & Tables
ivar~List<String> inventory = ["Sword", "Shield"];
inventory.push("Potion");

ivar~Table hero = { name: "Shinobi", hp: 100 };
hero.hp -= 15;

~~ 5. Collection Iteration (for in)
for (i, item in inventory) then
    pasteLn(i + ": " + item);
end

for (key, val in hero) then
    pasteLn(key + " => " + val);
end

~~ 6. Functions, Closures & Recursion
function multiply(ivar a, ivar b) then
    return a * b;
end

ivar square = function ~(ivar n) then
    return n * n;
end;

~~ 7. Native Function Interception (Hooks)
hook multiply(ivar a, ivar b) then
    pasteLn("Calculation intercepted!");
    return this(a, b) * 2;           ~~ Calls original function via this(...)
end

pasteLn(multiply(3, 4));             ~~ Prints log, returns 24

~~ 8. Variable Lifecycle
ivar tempBuffer = [1, 2, 3];
kill tempBuffer;                     ~~ Frees variable from memory and scope
```

---

## Full Syntax Reference

| Category | Syntax | Description |
| :--- | :--- | :--- |
| **Output** | `paste(x);`, `pasteLn(x);` | Prints without newline (`paste`) or with newline (`pasteLn`) |
| **Input** | `copy("...");`, `copyKey();` | Line input expression (`copy`) or raw single key capture (`copyKey`) |
| **Screen** | `clear();`, `clear(cond);` | Clears console immediately or guarded by condition |
| **Comments** | `~~ comment`, `~~{{ ... }}` | Single-line and multi-line block comments |
| **Variables** | `ivar x = 10;` | Variable declaration with inferred type |
| **Constants** | `iconst PORT = 8080;` | Read-only constant (cannot be reassigned or killed) |
| **Coercion** | `ivar~Int age = "25";` | Type coercion prefix (`~String`, `~Int`, `~Float`, `~Bool`) |
| **Non-Nullable** | `ivar~(String) u = "...";` | Strict non-nullable contract (rejects `NULL`) |
| **Lists** | `[1, 2, 3]`, `list[0]` | Dynamic arrays with 0-based indexing and nesting |
| **Generic Lists** | `ivar~List<Int> l = [];` | Strongly typed lists with optional element nullability |
| **Stacks & Queues** | `ivar~Stack<Int> s = [];`<br/>`ivar~Queue<String> q = [];` | LIFO Stack and FIFO Queue collections |
| **Tables** | `ivar~Table t = { a: 1 };`<br/>`t.a = 2;` | Key-value associative tables with field-level typing |
| **Collection Methods** | `.push()`, `.pop()`, `.peek()`, `.count()` | Methods for Lists, Stacks, and Queues |
| **Index Mutation** | `list[0] = v;`, `list[0] += 5;` | In-place element reassignment and compound operators |
| **Dynamic Retyping** | `x~String = "A";` | Dynamic in-place transtyping for variables and fields |
| **Compound Assign** | `x += 5;`, `x *= 2;` | Arithmetic updates (`+=`, `-=`, `*=`, `/=`, `%=`) |
| **Step Operators** | `i++`, `i--` | Postfix step increment and decrement |
| **Native Swap** | `a <-> b;` | Atomic in-place variable swap with type & null safety |
| **Conditionals** | `if c then ... elif ... else ... end` | Conditional block branching |
| **Pattern Match** | `given x then case: ... break; case: ~ end` | Value pattern matching with fallback (`case: ~`) |
| **For Loops** | `for (init; cond; step) then ... end` | 3-clause iterative loop supporting `break;` and `skip;` |
| **Collection Loops** | `for (item in col) then ... end`<br/>`for (i, item in col) then ... end` | Native iteration over List, Stack, Queue, and Table |
| **While Loop** | `while c then ... end` | Pre-test conditional loop |
| **Do-While Loop** | `do ... while c;` | Post-test loop guaranteed to execute at least once |
| **Guard Exit** | `exit();`, `exit(cond);` | Immediate or conditional process exit |
| **Functions** | `function f(ivar a) then ... end` | First-class named functions with lexical closure |
| **Anonymous Functions** | `function ~(ivar a) then ... end` | Raven-feather tilde (`~`) anonymous lambdas |
| **Returns** | `return expr;`, `return;` | Immediate function return (defaults to `NULL`) |
| **Function Hooks** | `hook target(args) then ... end` | Function interception with original invocation via `this(...)` |
| **Variable Destruction** | `kill x;` | Explicitly frees variable from memory and active scope |
| **CLI Arguments** | `args`, `Std.Sys.args` | Immutable List of CLI arguments with `.count()` and indexing |
