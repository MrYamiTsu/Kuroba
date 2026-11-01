# Control Flow

Block statements end with `end` and do not require a trailing semicolon.

## Conditionals (`if / elif / else / end`)

Evaluates boolean expressions:

- Comparisons and compound expressions must be wrapped in `(...)`.
- Single variables or `!` checks do not require parentheses.

```krb
ivar score = 75;

if (score == 100) then
    paste("Perfect");
elif (score == 75) then
    paste("Good job");
else
    paste("Try again");
end

ivar ready = TRUE;
if ready then
    paste("System ready");
end

if !ready then
    paste("System paused");
end
```

## Pattern Matching (`given / case: / break; / case: ~`)

Branch selector matching a target value against `case:` values:

- `case: <value>` matches when equal to the target.
- `break;` exits the `given` block.
- `case: ~` is the default fallback.
- **Kuroba Redirect Rule**: If `break;` is omitted in a matching case, execution does not bleed into the next case — it jumps straight to `case: ~`.

```krb
ivar role = "admin";

given role then
    case: "user"
        paste("User dashboard");
        break;
    case: "admin"
        paste("Admin console");
        break;
    case: ~
        paste("Unknown role");
end
```

## Process Termination (`exit(...)`)

Terminates the program immediately or serves as an inline guard clause without requiring an `if` block:

- `exit();` — Exits immediately with code `0`.
- `exit(condition);` — Exits with code `0` if the expression evaluates to truthy (`TRUE` or `1`). If falsy (`FALSE` or `0`), it acts as a no-op and execution continues.

```krb
ivar hp = 100;

~~ Guard clause: does not exit because hp <= 0 is FALSE
exit(hp <= 0);

paste("Player is alive!");

~~ Immediate exit
exit();

paste("This line is never reached.");
```

## Loops (`for ... then ... end`)

Iterative loop structure with mandatory parentheses enclosing the 3 clauses (`init; condition; update`):

- `break;` — Exits the loop immediately.
- `skip;` — Skips the remainder of the current iteration, runs the update clause, and advances to the next iteration.

```krb
~~ Standard for loop with increment operator
for (ivar i = 0; i < 5; i++) then
    pasteLn(i);
end

~~ Loop with break and skip
for (ivar k = 0; k < 10; k++) then
    if (k == 8) then
        break; ~~ Terminate loop
    end
    if (k % 2 == 0) then
        skip;  ~~ Skip even numbers
    end
    pasteLn(k);
end
```



