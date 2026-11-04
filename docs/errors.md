# Error Reference

Kuroba prints colored diagnostic errors directly to the console with precise line and column information to make debugging intuitive.

---

## 1. SyntaxError

Occurs during lexical tokenization or grammatical parsing when source code violates Kuroba's grammar:
- Missing semicolons (`;`) on non-block statements
- Unclosed strings or unmatched parentheses
- Unexpected characters or illegal tokens
- Illegal `return` outside of a function body
- Invalid hook target syntax

```text
[SyntaxError: Line 2, Col 1] Missing semicolon ';' at the end of statement.
[SyntaxError: Line 4, Col 12] Unclosed parenthesis. Missing closing ')' to match '(' at Line 4, Col 6.
[SyntaxError: Line 10, Col 5] Return statements are only allowed inside functions.
```

---

## 2. TypeError

Occurs when operations or assignments violate type safety contracts:
- Reassigning a variable with an incompatible type
- Reassigning or retyping an immutable constant (`iconst`)
- Assigning `NULL` to a non-nullable `~(Type)` variable or field
- Failed explicit cast (e.g. `"abc"` to `Int`)
- Invoking a non-callable value
- Passing arguments with invalid explicit types to typed function parameters
- Attempting to destroy an `iconst` with `kill`
- Intercepting a target that is not a function with `hook`

```text
[TypeError] Cannot assign type 'String' to variable 'count' of type 'Int'.
[TypeError] Cannot reassign constant 'PORT'.
[TypeError] Cannot assign NULL to non-nullable variable 'user' of type '(String)'.
[TypeError] Cannot call non-function value of type 'String'.
[TypeError] Parameter 'age' expects type 'Int', got 'String'.
[TypeError] Cannot kill constant variable 'PORT'.
[TypeError] Cannot hook non-function target 'score' of type 'Int'.
```

---

## 3. ReferenceError

Occurs when referencing an undeclared identifier or calling intercepted context out of bounds:
- Accessing or reassigning an undeclared variable
- Calling an undeclared function
- Calling `this()` outside of an active `hook` interception block
- Destroying an undeclared variable with `kill`
- Intercepting an undeclared function with `hook`

```text
[ReferenceError] Variable 'unknown' is not defined.
[ReferenceError] Cannot reassign undeclared variable 'total'.
[ReferenceError] Cannot call 'this()' outside of a hook interception.
[ReferenceError] Cannot kill undefined variable 'temp'.
```

---

## 4. MathError

Occurs when an undefined mathematical operation is attempted:
- Division by zero
- Modulo by zero

```text
[MathError] Division by zero is undefined.
[MathError] Modulo by zero is undefined.
```

---

## 5. IndexError

Occurs when attempting to access an index outside the boundaries of a collection, or using a non-integer index:

```text
[IndexError] Index 5 out of bounds for list of length 2.
[IndexError] List index must be an integer, got 'abc'.
```
