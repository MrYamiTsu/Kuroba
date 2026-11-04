# Control Flow

Kuroba provides clean, structured control flow statements. Block statements conclude with the `end` keyword and do not require a trailing semicolon.

---

## 1. Conditionals (`if / elif / else / end`)

Evaluates boolean expressions:
- Compound expressions and comparisons must be enclosed in parentheses `(...)`.
- Single variable checks or negated single variables do not require parentheses: `if ready then`, `if !active then`.

```krb
ivar score = 75;

if (score == 100) then
    pasteLn("Perfect score!");
elif (score >= 75) then
    pasteLn("Good job!");
else
    pasteLn("Try again.");
end

ivar running = TRUE;
if running then
    pasteLn("System operational.");
end
```

---

## 2. Pattern Matching (`given / case: / break; / case: ~`)

Branch selector matching a target value against `case:` options:
- `case: <value>` matches when equal to the target.
- `break;` exits the `given` block immediately.
- `case: ~` serves as the default fallback branch.
- **Kuroba Redirect Rule**: If `break;` is omitted from a matching case, execution does not bleed into subsequent cases — it redirects straight to `case: ~`.

```krb
ivar role = "admin";

given role then
    case: "user"
        pasteLn("Standard user dashboard");
        break;
    case: "admin"
        pasteLn("Full administrative privileges");
        break;
    case: ~
        pasteLn("Unknown role; access restricted.");
end
```

---

## 3. For Loops (`for ... then ... end`)

Iterative 3-clause loop with mandatory enclosing parentheses `(init; condition; update)`:
- `break;` exits the loop immediately.
- `skip;` skips the remainder of the iteration, executes the update clause, and continues to the next step.

```krb
for (ivar i = 0; i < 5; i++) then
    pasteLn(i);
end

for (ivar k = 0; k < 10; k++) then
    if (k == 8) then
        break;  ~~ Terminate loop early
    end
    if (k % 2 == 0) then
        skip;   ~~ Skip even numbers
    end
    pasteLn(k);
end
```

---

## 4. Collection Iteration (`for ... in`)

Kuroba provides native collection iteration over `List`, `Stack`, `Queue`, and `Table`:

### Single Variable (`for (item in col)`)
Receives each element directly (or field value on `Table`):

```krb
ivar~List<String> fruits = ["apple", "banana", "cherry"];
for (fruit in fruits) then
    pasteLn(fruit);
end
```

### Two Variables (`for (i, item in col)`)
Receives the index (`0, 1, 2...`) and element on collections, or the field key (`String`) and its value on `Table`:

```krb
ivar~Table hero = {
    name: "Kuroba",
    hp: 100,
    class: "Shinobi"
};

for (key, val in hero) then
    paste(key);
    paste(" => ");
    pasteLn(val);
end
```

Both `break;` and `skip;` are fully supported inside collection loops.

---

## 5. While Loops (`while <cond> then ... end`)

Pre-test loop supporting `break;` and `skip;`:

```krb
ivar count = 0;
while (count < 3) then
    pasteLn(count);
    count++;
end

ivar active = TRUE;
while active then
    pasteLn("Running once");
    active = FALSE;
end
```

---

## 6. Do-While Loops (`do ... while <cond>;`)

Post-test loop guaranteed to execute its body at least once. Concludes with `while <cond>;` and does not require `end`:

```krb
ivar n = 0;
do
    pasteLn(n);
    n++;
while (n < 3);

do
    pasteLn("Executed exactly once even though false!");
while (FALSE);
```

---

## 7. Function Returns (`return`)

Exits the active function immediately and optionally passes a value back to the caller. Returns cleanly propagate through all nested loops and conditionals:

```krb
function findFirstEven(ivar~List<Int> numbers) then
    for (n in numbers) then
        if (n % 2 == 0) then
            return n; ~~ Exits loop and function immediately
        end
    end
    return -1;
end
```

> For complete details on functions, parameters, and `hook` interception, see [Functions & Interception (Hooks)](functions.md).

---

## 8. Process Termination (`exit(...)`)

Terminates the program immediately or serves as an inline guard clause without requiring an `if` statement:
- `exit();` — Exits immediately with code `0`.
- `exit(condition);` — Exits with code `0` if the expression evaluates to truthy (`TRUE` or `1`).

```krb
ivar hp = 100;
exit(hp <= 0); ~~ Guard clause: does not exit since hp <= 0 is FALSE

pasteLn("Player is alive!");
```

---

## 9. Screen Clearing (`clear(...)`)

Clears the terminal console screen immediately or conditionally:
- `clear();` — Clears the screen immediately.
- `clear(condition);` — Clears the screen only if the condition evaluates to truthy.

```krb
clear(round > 1); ~~ Only clear from round 2 onwards
clear();          ~~ Unconditional clear
```

> For interactive console input and output primitives, see [Console & Interactive I/O](io.md).
