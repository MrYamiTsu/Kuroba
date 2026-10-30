# Control Flow

Block statements end with `end` and do not require a trailing semicolon.

## Conditionals (`if / elif / else / end`)

Evaluates boolean expressions:

- Comparisons and compound expressions must be wrapped in `(...)`.
- Single variables or `!` checks do not require parentheses.

```tulg
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
- **TULG Redirect Rule**: If `break;` is omitted in a matching case, execution does not bleed into the next case — it jumps straight to `case: ~`.

```tulg
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

