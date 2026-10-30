# Operators & Expressions

## Arithmetic (`+`, `-`, `*`, `/`)

Follows standard mathematical precedence. Parentheses can be nested freely:

```tulg
ivar result = 10 + 2 * 3;     ~~ 16
ivar forced = (10 + 2) * 3;   ~~ 36
```

Strings concatenate with `+`:

```tulg
ivar greeting = "Hello, " + "World!";
```

Division by zero raises a `MathError`:
```tulg
ivar err = 10 / 0;            ~~ MathError: Division by zero is undefined.
```

## Equality (`==`, `!=`)

TULG uses strict equality with specific boolean coercion rules:

- `0 == FALSE` evaluates to `TRUE`
- `1 == TRUE` evaluates to `TRUE`
- `NULL == NULL` evaluates to `TRUE`

```tulg
paste(10 == 10);     ~~ TRUE
paste(10 != 20);     ~~ TRUE
paste(0 == FALSE);   ~~ TRUE
paste(1 == TRUE);    ~~ TRUE
```

## Logical Operators (`&&`, `||`, `!`)

Evaluate conditions with short-circuiting:

- `!` inverts truthiness (`!TRUE` -> `FALSE`, `!0` -> `TRUE`).
- `&&` requires both operands to be truthy.
- `||` requires at least one operand to be truthy.

```tulg
ivar a = TRUE;
ivar b = FALSE;

paste(!a);           ~~ FALSE
paste(a && b);       ~~ FALSE
paste(a || b);       ~~ TRUE
```

## Variable Swap (`<->`)

Exchanges the values of two variables in-place:

```tulg
ivar x = 10;
ivar y = 99;

x <-> y;
paste(x);            ~~ 99
paste(y);            ~~ 10
```

### Swap Rules
- Both variables must be declared.
- Constants (`iconst`) cannot be swapped.
- Both variables must share the same type.
- Cannot transfer `NULL` into a non-nullable variable:

```tulg
ivar~Int nullNum = NULL;
ivar~(Int) strictNum = 5;

nullNum <-> strictNum; ~~ TypeError: Cannot swap NULL into non-nullable variable 'strictNum'.
```

