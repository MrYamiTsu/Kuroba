# Variables & Types

Kuroba provides a robust, expressive type system featuring automatic type inference, explicit type coercion, strict non-nullability contracts, dynamic in-place retyping, Lua-inspired associative tables, typed collections, first-class functions, and explicit lifecycle management.

---

## 1. Type System Overview

| Type | Kind | Example Literal | Description |
| :--- | :--- | :--- | :--- |
| **`Int`** | Primitive | `42`, `-10`, `0` | 64-bit integer numbers |
| **`Float`** | Primitive | `3.14`, `-0.05` | Floating-point numbers |
| **`String`** | Primitive | `"Kuroba"`, `""` | UTF-8 text strings |
| **`Bool`** | Primitive | `TRUE`, `FALSE` | Boolean truth values (note: `1 == TRUE`, `0 == FALSE`) |
| **`NULL`** | Primitive | `NULL` | Represents the intentional absence of a value |
| **`List`** | Compound | `[1, 2, 3]` | Dynamic, 0-indexed ordered array |
| **`Stack`** | Compound | `[10, 20]` | LIFO (Last In, First Out) stack |
| **`Queue`** | Compound | `["A", "B"]` | FIFO (First In, First Out) queue |
| **`Table`** | Compound | `{ name: "Kuroba", hp: 100 }` | Key-value associative dictionary with typed fields |
| **`Function`** | First-Class | `function f(...) then ... end` | Named or anonymous callable closure |

---

## 2. Declarations (`ivar`, `iconst`)

Variables are declared using `ivar`. Their type is automatically inferred from the assigned expression:

```krb
ivar name = "Kuroba"; ~~ Inferred as String
ivar age = 25;        ~~ Inferred as Int
ivar ratio = 3.14;    ~~ Inferred as Float
ivar ready = TRUE;    ~~ Inferred as Bool
```

Constants are declared using `iconst`. They are strictly immutable:

```krb
iconst PORT = 8080;
PORT = 3000;          ~~ [TypeError] Cannot reassign constant 'PORT'.
```

---

## 3. Explicit Types & Coercion (`~Type`)

To enforce a specific type or convert an input value at declaration, append `~Type` to `ivar`:

```krb
ivar~Int num = "42";         ~~ Automatically coerced from String to Int 42
ivar~Float decimal = "3.14"; ~~ Automatically coerced to Float 3.14
ivar~String text = 100;      ~~ Automatically coerced to String "100"
ivar~Bool flag = 1;          ~~ Automatically coerced to Bool TRUE (0 becomes FALSE)
```

If an explicit conversion is invalid, a `TypeError` is thrown:

```krb
ivar~Int invalid = "abc";    ~~ [TypeError] Cannot cast value 'abc' to type 'Int'.
```

---

## 4. Nullability Contracts (`~(Type)`)

By default, variables in Kuroba are **nullable** and can hold `NULL`:

```krb
ivar~String role = "editor";
role = NULL;                 ~~ Allowed
```

To forbid `NULL` and guarantee that a variable always holds a concrete value, wrap the type in parentheses `~(Type)`:

```krb
ivar~(String) user = "admin";
user = NULL;                 ~~ [TypeError] Cannot assign NULL to non-nullable variable 'user' of type '(String)'.
```

---

## 5. Reassignment & Dynamic Retyping

### Standard Reassignment
Reassigning a variable without modifying its type requires no keyword:

```krb
ivar score = 10;
score = 20;                  ~~ Allowed (Int -> Int)
score = "high";              ~~ [TypeError] Cannot assign type 'String' to variable 'score' of type 'Int'.
```

### Dynamic In-Place Retyping (`var~Type = ...`)
To explicitly change the type or nullability of an existing variable in-place, append `~Type` or `~(Type)` during assignment:

```krb
ivar score = 100;            ~~ Inferred as Int
score~String = "Top Score";  ~~ Retyped to String
score~Float = 99.5;          ~~ Retyped to Float

~~ Dynamically enforcing non-nullability:
ivar~String role = "guest";  ~~ Nullable String
role~(String) = "admin";     ~~ Retyped to non-nullable (String)
role = NULL;                 ~~ [TypeError] Cannot assign NULL to non-nullable variable 'role'.
```

---

## 6. Lists & Collections (`List<Type>`)

Kuroba features dynamic arrays with support for generic typing, nullability contracts, 0-based index access, and compound mutations.

```krb
ivar fruits = ["apple", "banana", "cherry"];
pasteLn(fruits[0]);   ~~ "apple"

fruits[1] = "mango";
fruits[0] += " pie";
pasteLn(fruits);      ~~ ["apple pie", "mango", "cherry"]
```

### Generic Typing Matrix
| Syntax | List Nullable? | Elements Nullable? | Description |
| :--- | :---: | :---: | :--- |
| `ivar~List<Type>` | **Yes** | **Yes** | Nullable list; elements can be `Type` or `NULL`. |
| `ivar~List<(Type)>` | **Yes** | **No** | Nullable list; elements must strictly be non-null `Type`. |
| `ivar~(List<Type>)` | **No** | **No** | Non-nullable list and non-nullable elements. |

```krb
ivar~List<(Int)> ids = [1, 2, 3];
ids[0] = NULL;  ~~ [TypeError] Cannot assign NULL to non-nullable element of list 'ids'.
```

### List Methods (`.push`, `.pop`, `.peek`, `.count`)
```krb
ivar~List<Int> numbers = [10, 30];
numbers.push(20, 1);     ~~ Inserts 20 at index 1 -> [10, 20, 30]
pasteLn(numbers.peek(1));~~ 20 (inspects element at index 1)
pasteLn(numbers.pop(0)); ~~ 10 (removes and returns element at index 0)
pasteLn(numbers.count());~~ 2
```

---

## 7. Stacks & Queues (`Stack<Type>`, `Queue<Type>`)

### Stacks (LIFO: Last In, First Out)
```krb
ivar~Stack<Int> stack = [10, 20];
stack.push(30);        ~~ Pushes 30 to top: [10, 20, 30]
pasteLn(stack.peek()); ~~ 30 (inspects top without removing)
pasteLn(stack.pop());  ~~ 30 (removes and returns top)
pasteLn(stack.count());~~ 2
```

### Queues (FIFO: First In, First Out)
```krb
ivar~Queue<String> clients = ["Alice", "Bob"];
clients.push("Charlie");   ~~ Adds to back
pasteLn(clients.peek());   ~~ "Alice" (inspects front without removing)
pasteLn(clients.pop());    ~~ "Alice" (removes and returns front)
pasteLn(clients.count());  ~~ 2
```

---

## 8. Tables (`Table`, `{ key: value }`)

Associative key-value tables supporting field-level typing, dynamic field creation, and methods:

```krb
ivar~Table hero = {
    name: "Kuroba",
    hp: 100,
    alive: TRUE
};

pasteLn(hero["name"]); ~~ "Kuroba"
hero["hp"] -= 20;      ~~ In-place compound update
hero["mana"] = 50;     ~~ Dynamically adds field 'mana'
```

Reading a non-existent field safely returns `NULL`.

### Field-Level Typing
```krb
ivar~Table config = {
    port~Int: "8080",      ~~ Auto-coerced to Int 8080
    host~(String): "local" ~~ Non-nullable strict String
};

config["host"] = NULL;     ~~ [TypeError] Cannot assign NULL to non-nullable field 'host'.
```

---

## 9. Functions as First-Class Values (`Function`)

Functions can be passed into variables, stored inside table fields as methods, and passed into other routines:

```krb
function multiply(ivar a, ivar b) then
    return a * b;
end

ivar fn = multiply;
pasteLn(fn(6, 7)); ~~ 42
pasteLn(fn);        ~~ <function multiply>
```

Anonymous lambdas use the signature tilde syntax `function ~(...)`:

```krb
ivar square = function ~(ivar x) then
    return x * x;
end;

pasteLn(square(5)); ~~ 25
```

> For full details on closures, recursion, and monkey-patching, see [Functions & Interception (Hooks)](functions.md).

---

## 10. Variable Lifecycle & Manual Destruction (`kill`)

Kuroba provides the `kill` statement to explicitly destroy variables from memory and eliminate them from their active scope:

```krb
ivar buffer = [1, 2, 3, 4, 5];
pasteLn(buffer.count()); ~~ 5

kill buffer;             ~~ Releases variable and frees its scope entry

pasteLn(buffer);         ~~ [ReferenceError] Variable 'buffer' is not defined.
```

### Safety Rules:
1. **Undefined Variables**: Attempting to kill an undeclared variable throws a `ReferenceError`:
   ```krb
   kill unexisting;      ~~ [ReferenceError] Cannot kill undefined variable 'unexisting'.
   ```
2. **Constant Protection**: Constants declared with `iconst` cannot be destroyed:
   ```krb
   iconst PI = 3.14159;
   kill PI;              ~~ [TypeError] Cannot kill constant variable 'PI'.
   ```
3. **Lexical Unshadowing**: When an inner shadowed variable is killed, the outer variable becomes visible again in that scope:
   ```krb
   ivar val = "global";
   if (TRUE) then
       ivar val = "local";
       kill val;
       pasteLn(val);     ~~ "global"
   end
   ```
