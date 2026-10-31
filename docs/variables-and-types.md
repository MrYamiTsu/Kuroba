# Variables & Types

## Declarations (`ivar`, `iconst`)

Variables are declared with `ivar`. Their type is inferred from the initial value:

```krb
ivar name = "Kuroba"; ~~ String
ivar age = 25;        ~~ Int
ivar ratio = 3.14;    ~~ Float
ivar ready = TRUE;    ~~ Bool
```

Constants use `iconst` and cannot be reassigned:

```krb
iconst PORT = 8080;
PORT = 3000;          ~~ TypeError: Cannot reassign constant 'PORT'.
```

## Explicit Types & Coercion (`~Type`)

Append `~Type` to cast a value on assignment:

```krb
ivar~Int num = "42";         ~~ Coerced to 42
ivar~Float decimal = "3.14"; ~~ Coerced to 3.14
ivar~String text = 100;      ~~ Coerced to "100"
ivar~Bool flag = 1;          ~~ Coerced to TRUE (0 becomes FALSE)
```

If conversion fails, a `TypeError` is thrown:
```krb
ivar~Int invalid = "abc";    ~~ TypeError: Cannot cast value 'abc' to type 'Int'.
```

## Nullability

By default, every variable can hold `NULL`:

```krb
ivar~String role = "editor";
role = NULL;                 ~~ Allowed
```

To forbid `NULL`, wrap the type in parentheses `~(Type)`:

```krb
ivar~(String) user = "admin";
user = NULL;                 ~~ TypeError: Cannot assign NULL to non-nullable variable 'user' of type '(String)'.
```

## Reassignment

Variables can be updated without `ivar`. The new value must match the variable's type:

```krb
ivar score = 10;
score = 20;                  ~~ Allowed (Int -> Int)

score = "high";              ~~ TypeError: Cannot assign type 'String' to variable 'score' of type 'Int'.
```

## Dynamic Retyping / Transtyping (`var~Type = ...`)

To explicitly change the type or nullability of an existing variable, append `~Type` or `~(Type)` to the variable name during assignment:

```krb
ivar score = 100;            ~~ Inferred as Int
score~String = "Top Score";  ~~ Retyped to String
score~Float = 99.5;          ~~ Retyped to Float

~~ Dynamically enforcing non-nullability:
ivar~String role = "guest";  ~~ Nullable String
role~(String) = "admin";     ~~ Retyped to non-nullable (String)
role = NULL;                 ~~ TypeError: Cannot assign NULL to non-nullable variable 'role' of type '(String)'.
```

Constants (`iconst`) cannot be retyped and will produce a `TypeError`.


