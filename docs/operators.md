# Operators & Expressions

## Arithmetic (`+`, `-`, `*`, `/`, `%`)

Follows standard mathematical precedence. Parentheses can be nested freely:

```krb
ivar result = 10 + 2 * 3;     ~~ 16
ivar forced = (10 + 2) * 3;   ~~ 36
ivar remainder = 14 % 5;      ~~ 4
```

Strings concatenate with `+`:

```krb
ivar greeting = "Hello, " + "World!";
```

Division or modulo by zero raises a `MathError`:
```krb
ivar err1 = 10 / 0;           ~~ MathError: Division by zero is undefined.
ivar err2 = 10 % 0;           ~~ MathError: Division or modulo by zero is undefined.
```

## Comparisons (`<`, `>`, `<=`, `>=`)

Order comparisons evaluate to `TRUE` or `FALSE`:

```krb
paste(10 < 20);               ~~ TRUE
paste(10 > 20);               ~~ FALSE
paste(15 <= 15);              ~~ TRUE
paste(20 >= 25);              ~~ FALSE
```

Can be used in conditions with standard precedence (arithmetic runs before comparison):

```krb
ivar score = 45;
if (score + 5 >= 50) then
    paste("Passed");
end
```

## Equality (`==`, `!=`)

Kuroba uses strict equality with specific boolean coercion rules:

- `0 == FALSE` evaluates to `TRUE`
- `1 == TRUE` evaluates to `TRUE`
- `NULL == NULL` evaluates to `TRUE`

```krb
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

```krb
ivar a = TRUE;
ivar b = FALSE;

paste(!a);           ~~ FALSE
paste(a && b);       ~~ FALSE
paste(a || b);       ~~ TRUE
```

## Variable Swap (`<->`)

Exchanges the values of two variables in-place:

```krb
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
- If one variable is non-nullable (`~(Type)`), the other variable cannot transfer a `NULL` value into it:

```krb
ivar~Int nullNum = NULL;
ivar~(Int) strictNum = 5;

nullNum <-> strictNum; ~~ TypeError: Cannot swap NULL into non-nullable variable 'strictNum'.
```

## Increment & Decrement (`++`, `--`)

In-place unary step operators:

```krb
ivar count = 0;
count++;    ~~ 1
count--;    ~~ 0
```

## Compound Assignments (`+=`, `-=`, `*=`, `/=`, `%=`)

In-place arithmetic reassignment shortcuts:

```krb
ivar score = 10;
score += 5;    ~~ 15
score -= 3;    ~~ 12
score *= 2;    ~~ 24
score /= 4;    ~~ 6
score %= 4;    ~~ 2
```

