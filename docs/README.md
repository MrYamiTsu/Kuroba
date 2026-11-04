# Kuroba Documentation

Welcome to the documentation for **Kuroba** (*KRB*).

## Guides by Topic

1. [Variables & Types](variables-and-types.md)
   Declaration (`ivar`), constants (`iconst`), type coercion, nullability `~(Type)`, strict reassignment, and dynamic retyping (`var~Type = val;`).

2. [Operators & Expressions](operators.md)
   Arithmetic precedence, equality (`==`, `!=`), short-circuit logic (`&&`, `||`, `!`), and native swap (`<->`).

3. [Control Flow](control-flow.md)
   Conditional blocks (`if / elif / else / end`), multi-branch matching (`given / case:`), loops (`for`, `while`, `do ... while`), collection iteration (`for ... in`), flow control (`break;`, `skip;`), screen clearing (`clear(...)`), and process termination (`exit(...)`).

4. [Error Reference](errors.md)
   Overview of runtime and syntax diagnostics (`SyntaxError`, `TypeError`, `ReferenceError`, `MathError`).

5. [Console & I/O](io.md)
   Standard output (`paste`, `pasteLn`), interactive input (`copy`, `copyKey`), and screen clearing (`clear`).

6. [Functions & Metaprogramming](functions.md)
   Named and anonymous functions (`function ~`), closures, lexical scoping, recursion, and native function interception (`hook` with `this(...)`).

---

## Language Cheatsheet

```krb
~~ Variables and constants
ivar count = 10;
iconst PI = 3.14;
ivar~Int coerced = "50";
ivar~(String) strictUser = "admin";

~~ Operations
count = count + 5;
ivar a = 1;
ivar b = 2;
a <-> b;

~~ Conditions
if (count == 15 && a == 2) then
    paste("Condition met");
end

~~ Given / Case matching
given strictUser then
    case: "admin"
        paste("Access granted");
        break;
    case: ~
        paste("Unknown role");
end

~~ Loops and flow control
for (ivar i = 0; i < 3; i++) then
    pasteLn(i);
end

~~ Dynamic lists & indexing
ivar inventory = ["Potion", "Katana", "Elixir"];
inventory[0] = "Mega Potion";
inventory[1] += " +1";
pasteLn(inventory);

~~ Interactive console input & clear
clear();
ivar pseudo = copy("Nom : ");
pasteLn("Bienvenue " + pseudo);

~~ Functions, closures & recursion
function add(ivar a, ivar b) then
    return a + b;
end
ivar double = function ~(ivar n) then return n * 2; end;

~~ Function interception with hook
hook add(ivar a, ivar b) then
    return this(a, b) * 10;
end
pasteLn(add(2, 3)); ~~ 50
```

---

## Full Syntax Reference

| Category | Syntax | Description |
| :--- | :--- | :--- |
| **Output** | `paste(x);`, `pasteLn(x);` | Prints without newline (`paste`) or with newline (`pasteLn`) |
| **Input** | `copy("...");`, `copyKey();` | Line input expression (`copy`) or single key capture (`copyKey`) |
| **Screen** | `clear();`, `clear(cond);` | Terminal clear immediately or guarded by condition |
| **Comments** | `~~ comment`, `~~{{ ... }}` | Single-line and multi-line block comments |
| **Variables** | `ivar x = 10;` | Inferred typed variable |
| **Constants** | `iconst PI = 3.14;` | Read-only constant |
| **Coercion** | `ivar~Int age = "25";` | Type coercion (`~String`, `~Int`, `~Float`, `~Bool`) |
| **Non-Nullable** | `ivar~(String) u = "...";` | Strict non-nullable contract |
| **Lists / Arrays** | `[1, 2, 3]`, `list[0]` | Dynamic arrays with 0-based indexing and nesting |
| **Generic Lists** | `ivar~List<Int> l = [1];`<br/>`ivar~List<(String)> strict = [];` | Typed lists with optional element non-nullability contracts |
| **Stacks & Queues** | `ivar~Stack<Int> s = [];`<br/>`ivar~Queue<String> q = [];` | LIFO Stack and FIFO Queue collections |
| **Tables** | `ivar~Table t = { a: 1 };`<br/>`t["a"] = 2;` | Key-value associative tables with field-level typing and retyping |
| **Collection Methods** | `.push()`, `.pop()`, `.peek()`, `.count()` | Object method operations on Lists, Stacks, and Queues |
| **Index Mutation** | `list[0] = v;`, `list[0] += 5;` | In-place element reassignment and compound operators |
| **Retyping** | `x~String = "A";`<br/>`list~List<Int> = list;` | In-place dynamic transtyping for variables and lists |
| **Compound Assign** | `x += 5;`, `x *= 2;` | Arithmetic in-place update (`+=`, `-=`, `*=`, `/=`, `%=`) |
| **Step Operators** | `i++`, `i--` | Step increment / decrement |
| **Native Swap** | `a <-> b;` | Atomic in-place variable swap |
| **Conditionals** | `if c then ... else ... end` | Conditional block statement |
| **Loops** | `for (...) then ... end` | 3-clause for loop with `break;` and `skip;` |
| **While Loop** | `while c then ... end` | Pre-test conditional loop |
| **Do-While Loop** | `do ... while c;` | Post-test loop guaranteed to execute at least once |
| **Matching** | `given x then case: ... end` | Pattern matching with `break;` and `case: ~` fallback |
| **Guard Exit** | `exit();`, `exit(cond);` | Immediate or conditional process exit |
| **Equality & Logic** | `==`, `!=`, `&&`, `\|\|`, `!` | Strict equality with boolean/NULL coercion |
| **Variable Destruction** | `kill x;` | Explicitly frees variable from memory and scope |
| **Collection Loop** | `for (item in col) then ... end`<br/>`for (i, item in col) then ... end` | Native collection iteration over List, Stack, Queue, Table |
| **Functions** | `function name(ivar a) then ... end` | First-class named functions with lexical scope |
| **Anonymous Functions** | `function ~(ivar a) then ... end` | Signature raven-feather tilde (`~`) anonymous functions |
| **Return** | `return expr;`, `return;` | Function return (defaults to `NULL` if omitted) |
| **Function Hooks** | `hook fn(args) then ... end` | Method & function interception calling `this(args)` |

