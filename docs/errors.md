# Error Reference

Kuroba prints colored diagnostic errors directly to the console with line and column information.

## SyntaxError

Occurs during lexical or grammatical parsing:

- Missing semicolons
- Unterminated strings or unclosed parentheses
- Unexpected characters or tokens

```text
[SyntaxError: Line 2, Col 1] Missing semicolon ';' at the end of statement.
[SyntaxError: Line 4, Col 12] Unclosed parenthesis. Missing closing ')' to match '(' at Line 4, Col 6.
```

## TypeError

Occurs when types do not match expectations:

- Reassigning a variable with an incompatible type
- Reassigning an `iconst`
- Assigning `NULL` to a non-nullable `~(Type)` variable
- Failed explicit cast

```text
[TypeError] Cannot assign type 'String' to variable 'count' of type 'Int'.
[TypeError] Cannot reassign constant 'PORT'.
[TypeError] Cannot assign NULL to non-nullable variable 'user' of type '(String)'.
```

## ReferenceError

Occurs when accessing or reassigning an undeclared identifier:

```text
[ReferenceError] Variable 'unknown' is not defined.
[ReferenceError] Cannot reassign undeclared variable 'total'.
```

## MathError

Occurs on undefined mathematical operations:

```text
[MathError] Division by zero is undefined.
```

