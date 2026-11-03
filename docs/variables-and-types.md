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

---

## Lists & Collections (`[...]`, `List<Type>`)

Kuroba features dynamic arrays with support for generic typing, nullability contracts, 0-based index access, and compound mutations.

### Declaration and Literals

```krb
~~ Inferred dynamic list
ivar fruits = ["pomme", "banane", "cerise"];

~~ Empty list
ivar empty = [];

~~ Nested multidimensional lists (matrices)
ivar grid = [[1, 2], [3, 4]];
pasteLn(grid[1][0]); ~~ Outputs 3
```

### Element Access & Mutation

Elements are accessed via bracket notation (`list[index]`). Indices must be integers and within the bounds `[0, length - 1]`.

```krb
ivar scores = [10, 20, 30];

pasteLn(scores[0]);   ~~ 10
scores[1] = 99;       ~~ Assignment
scores[0] += 5;       ~~ Compound addition (15)
scores[2]++;          ~~ Step increment (31)

pasteLn(scores);      ~~ [15, 99, 31]
```

Accessing an invalid index immediately halts execution with an `IndexError`:

```krb
pasteLn(scores[5]);   ~~ [IndexError] Index 5 out of bounds for list of length 3.
```

### Generic Typing & Nullability Matrix

Kuroba provides compile-and-runtime type safety on list elements using generic syntax `~List<Type>`:

| Syntax | List Nullable? | Elements Nullable? | Description |
| :--- | :---: | :---: | :--- |
| `ivar~List<Type>` | **Yes** | **Yes** | Nullable list; elements can be `Type` or `NULL`. |
| `ivar~List<(Type)>` | **Yes** | **No** | Nullable list; elements must strictly be non-null `Type`. |
| `ivar~(List<Type>)` | **No** | **No** | Non-nullable list and non-nullable elements. |

```krb
~~ Nullable list with nullable Strings
ivar~List<String> notes = ["ok", NULL, "bien"];

~~ Nullable list where elements CANNOT be NULL
ivar~List<(Int)> ids = [1, 2, 3];
ids[0] = NULL;  ~~ [TypeError] Cannot assign NULL to non-nullable element of list 'ids'.

~~ Strict non-nullable list and elements
ivar~(List<Int>) coords = [10, 20];
coords = NULL;  ~~ [TypeError] Cannot assign NULL to non-nullable variable 'coords'.
```

### Constant Lists

When defined with `iconst`, neither the variable nor the individual elements can be modified:

```krb
iconst ORIGIN = [0, 0];
ORIGIN[0] = 5;  ~~ [TypeError] Cannot modify elements of constant list 'ORIGIN'.
```

### Element Coercion

Like scalar variables declared with `~Type`, generic list elements are automatically coerced to the target element type whenever possible:

```krb
~~ Numbers are automatically cast to Strings:
ivar~List<String> labels = [10, 20, "ok"]; ~~ Result: ["10", "20", "ok"]

~~ Numeric strings are automatically cast to Ints / Floats:
ivar~List<Int> numbers = ["42", 100];      ~~ Result: [42, 100]

~~ Mutating with auto-coercion:
numbers[0] = "99";                         ~~ Coerced to 99
```

If conversion is impossible (e.g. `ivar~List<Int> bad = ["abc"];`), a `TypeError` is thrown.

### Dynamic List Retyping (`list~List<NewType> = ...`)

You can dynamically retype existing lists to a different element type in-place:

```krb
ivar~List<String> rawData = ["10", "20", "30"];

~~ Dynamically retype the entire list to Ints:
rawData~List<Int> = rawData;               ~~ Result: [10, 20, 30]
rawData[0] += 5;                           ~~ 15
pasteLn(rawData);                          ~~ [15, 20, 30]
```

---

## Stacks & Queues (`Stack<Type>`, `Queue<Type>`)

Kuroba provides first-class support for Stacks (LIFO) and Queues (FIFO) with the same generic typing, nullability contracts, and element coercion as Lists.

### Stacks (LIFO: Last In, First Out)

Elements are pushed to and popped from the top of the stack:

```krb
ivar~Stack<Int> pile = [10, 20];
pile.push(30);        ~~ Pushes 30 to top: [10, 20, 30]
pasteLn(pile.peek()); ~~ 30 (inspects top without removing)
pasteLn(pile.pop());  ~~ 30 (removes and returns top)
pasteLn(pile.count());~~ 2
```

### Queues (FIFO: First In, First Out)

Elements are pushed to the back and popped from the front:

```krb
ivar~Queue<String> clients = ["Alice", "Bob"];
clients.push("Charlie");   ~~ Adds to back
pasteLn(clients.peek());   ~~ "Alice" (inspects front without removing)
pasteLn(clients.pop());    ~~ "Alice" (removes and returns front)
pasteLn(clients.count());  ~~ 2
```

### List Methods (`.push`, `.pop`, `.peek`, `.count`)

The same methods are available on standard lists with positional parameters:

```krb
ivar~List<Int> list = [10, 30];
list.push(20, 1);    ~~ Inserts 20 at index 1 -> [10, 20, 30]
pasteLn(list.peek(1)); ~~ 20 (inspects element at index 1)
pasteLn(list.pop(0));  ~~ 10 (removes and returns element at index 0)
pasteLn(list.count()); ~~ 2
```





