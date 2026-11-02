# Kuroba Documentation

Welcome to the documentation for **Kuroba** (*KRB*).

## Guides by Topic

1. [Variables & Types](variables-and-types.md)
   Declaration (`ivar`), constants (`iconst`), type coercion, nullability `~(Type)`, strict reassignment, and dynamic retyping (`var~Type = val;`).

2. [Operators & Expressions](operators.md)
   Arithmetic precedence, equality (`==`, `!=`), short-circuit logic (`&&`, `||`, `!`), and native swap (`<->`).

3. [Control Flow](control-flow.md)
   Conditional blocks (`if / elif / else / end`), multi-branch matching (`given / case:`), loops (`for`, `while`, `do ... while`), flow control (`break;`, `skip;`), screen clearing (`clear(...)`), and process termination (`exit(...)`).

4. [Error Reference](errors.md)
   Overview of runtime and syntax diagnostics (`SyntaxError`, `TypeError`, `ReferenceError`, `MathError`).

5. [Console & I/O](io.md)
   Standard output (`paste`, `pasteLn`), interactive input (`copy`, `copyKey`), and screen clearing (`clear`).

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

~~ Interactive console input & clear
clear();
ivar pseudo = copy("Nom : ");
pasteLn("Bienvenue " + pseudo);
```

---

## Full Syntax Reference

| Category | Syntax | Description |
| :--- | :--- | :--- |
| **Output** | `paste(x);`, `pasteLn(x);` | Prints without newline (`paste`) or with newline (`pasteLn`) |
| **Input** | `copy("...");`, `copyKey();` | Line input expression (`copy`) or single key capture (`copyKey`) |
| **Screen** | `clear();`, `clear(cond);` | Terminal clear immediately or guarded by condition |
| **Comments** | `~~ comment` | Single-line comment to end of line |
| **Variables** | `ivar x = 10;` | Inferred typed variable |
| **Constants** | `iconst PI = 3.14;` | Read-only constant |
| **Coercion** | `ivar~Int age = "25";` | Type coercion (`~String`, `~Int`, `~Float`, `~Bool`) |
| **Non-Nullable** | `ivar~(String) u = "...";` | Strict non-nullable contract |
| **Retyping** | `x~String = "A";` | In-place dynamic transtyping |
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

