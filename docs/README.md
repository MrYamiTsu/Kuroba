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

