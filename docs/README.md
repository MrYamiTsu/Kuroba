# TULG Documentation

Welcome to the documentation for **TULG** (*This Useless Language*).

## Guides by Topic

1. [Variables & Types](variables-and-types.md)
   Declaration (`ivar`), constants (`iconst`), type coercion, nullability `~(Type)`, strict reassignment, and dynamic retyping (`var~Type = val;`).

2. [Operators & Expressions](operators.md)
   Arithmetic precedence, equality (`==`, `!=`), short-circuit logic (`&&`, `||`, `!`), and native swap (`<->`).

3. [Control Flow](control-flow.md)
   Conditional blocks (`if / elif / else / end`) and multi-branch matching (`given / case: / break; / case: ~`).

4. [Error Reference](errors.md)
   Overview of runtime and syntax diagnostics (`SyntaxError`, `TypeError`, `ReferenceError`, `MathError`).

---

## Language Cheatsheet

```tulg
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
```

