# Operators & Expressions

Kuroba evaluates expressions following standard mathematical and logical precedence rules.

---

## Operator Precedence Table

Operators are evaluated in order from highest precedence (Level 1) to lowest (Level 10):

| Level | Category | Operator | Description | Associativity |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Primary** | `(...)`, `[]`, `.`, `()` | Grouping, indexing, member access, function calls | Left-to-right |
| **2** | **Unary** | `!`, `++`, `--`, `-` | Logical NOT, postfix step increment/decrement, negation | Right-to-left |
| **3** | **Multiplicative** | `*`, `/`, `%` | Multiplication, division, modulo | Left-to-right |
| **4** | **Additive** | `+`, `-` | Addition, string concatenation, subtraction | Left-to-right |
| **5** | **Relational** | `<`, `>`, `<=`, `>=` | Numeric and comparative order checks | Left-to-right |
| **6** | **Equality** | `==`, `!=` | Strict equality with boolean/NULL coercion | Left-to-right |
| **7** | **Logical AND** | `&&` | Short-circuit boolean AND | Left-to-right |
| **8** | **Logical OR** | `||` | Short-circuit boolean OR | Left-to-right |
| **9** | **Native Swap** | `<->` | Atomic in-place variable swap | Non-associative |
| **10** | **Assignment** | `=`, `+=`, `-=`, `*=`, `/=`, `%=` | Variable assignment and compound updates | Right-to-left |

---

## Arithmetic (`+`, `-`, `*`, `/`, `%`)

Follows standard arithmetic order:

```krb
ivar result = 10 + 2 * 3;     ~~ 16
ivar forced = (10 + 2) * 3;   ~~ 36
ivar remainder = 14 % 5;      ~~ 4
```

Division or modulo by zero raises a `MathError`:
```krb
ivar err1 = 10 / 0;           ~~ [MathError] Division by zero is undefined.
ivar err2 = 10 % 0;           ~~ [MathError] Modulo by zero is undefined.
```

### String Concatenation (`+`)
Strings concatenate seamlessly with `+`. If one operand is a String and the other is a number or boolean, it is automatically converted to text:

```krb
ivar greeting = "Hello, " + "World!"; ~~ "Hello, World!"
ivar scoreMsg = "Score: " + 100;       ~~ "Score: 100"
```

---

## Zen String Interpolation (`~"..."`)

Kuroba features native string interpolation using the raven-feather tilde prefix `~"..."`. Any valid Kuroba expression can be evaluated inside `{...}`:

```krb
ivar hp = 85;
ivar maxHp = 100;
ivar nom = "Shinobi";

~~ Embedded variables and arithmetic
ivar msg = ~"Héros: {nom} | PV: {hp}/{maxHp} | Prochain niveau: {hp + 15}";
pasteLn(msg); ~~ "Héros: Shinobi | PV: 85/100 | Prochain niveau: 100"

~~ Embedded expressions and table lookups
ivar hero = { stats: { force: 25 } };
pasteLn(~"Force: {hero.stats.force}");
```

To include literal `{` or `}` inside an interpolated string, escape them with `\\{` or `\\}`.

---

## Comparisons (`<`, `>`, `<=`, `>=`)

Order comparisons evaluate to `TRUE` or `FALSE`:

```krb
pasteLn(10 < 20);             ~~ TRUE
pasteLn(10 > 20);             ~~ FALSE
pasteLn(15 <= 15);            ~~ TRUE
pasteLn(20 >= 25);            ~~ FALSE
```

---

## Equality (`==`, `!=`)

Kuroba enforces type safety during equality comparisons, with explicit coercion for booleans and `NULL`:

```krb
pasteLn(10 == 10);            ~~ TRUE
pasteLn("a" == "a");          ~~ TRUE
pasteLn(1 == TRUE);           ~~ TRUE (1 coerces to TRUE)
pasteLn(0 == FALSE);          ~~ TRUE (0 coerces to FALSE)
pasteLn(NULL == NULL);        ~~ TRUE
```

Comparing incompatible types (e.g. `String` and `Int`) evaluates safely to `FALSE` without crashing:
```krb
pasteLn("10" == 10);          ~~ FALSE
```

---

## Logical Operators (`&&`, `||`, `!`)

Kuroba implements short-circuit evaluation for boolean logic:

```krb
ivar a = TRUE;
ivar b = FALSE;

pasteLn(a && b);              ~~ FALSE
pasteLn(a || b);              ~~ TRUE
pasteLn(!a);                  ~~ FALSE
```

### Short-Circuit Guarantee:
If the left side of `&&` is `FALSE`, the right side is not evaluated.  
If the left side of `||` is `TRUE`, the right side is not evaluated.

---

## Bitwise Operators (`&`, `|`, `^`, `<<`, `>>`)

Perform bitwise integer operations:

```krb
ivar flags = 1 | 2 | 4;       ~~ 7 (Bitwise OR)
ivar masked = flags & 2;      ~~ 2 (Bitwise AND)
ivar flipped = flags ^ 2;     ~~ 5 (Bitwise XOR)
ivar shifted = 1 << 3;        ~~ 8 (Bitwise Left Shift)
ivar halved = 16 >> 2;        ~~ 4 (Bitwise Right Shift)
```

---

## Native Variable Swap (`<->`)

Exchanges the values of two variables in-place without requiring a temporary variable:

```krb
ivar x = 10;
ivar y = 99;

x <-> y;
pasteLn(x);                   ~~ 99
pasteLn(y);                   ~~ 10
```

### Swap Safety Rules:
1. Both variables must be previously declared.
2. Constants (`iconst`) cannot be swapped.
3. Both variables must share the same type.
4. If one variable is non-nullable (`~(Type)`), the other variable cannot transfer a `NULL` value into it:
   ```krb
   ivar~Int nullNum = NULL;
   ivar~(Int) strictNum = 5;
   nullNum <-> strictNum;     ~~ [TypeError] Cannot swap NULL into non-nullable variable 'strictNum'.
   ```

---

## Step Operators (`++`, `--`)

In-place unary step operators:

```krb
ivar count = 0;
count++;                      ~~ 1
count--;                      ~~ 0
```

---

## Compound Assignment (`+=`, `-=`, `*=`, `/=`, `%=`)

In-place arithmetic reassignment shortcuts:

```krb
ivar score = 10;
score += 5;                   ~~ 15
score -= 3;                   ~~ 12
score *= 2;                   ~~ 24
score /= 4;                   ~~ 6
score %= 4;                   ~~ 2
```

---

## Member Access & Methods (`.`)

Invokes built-in methods on collections (`List`, `Stack`, `Queue`):

```krb
ivar~List<Int> numbers = [1, 2, 3];
pasteLn(numbers.count());     ~~ 3
numbers.push(4);
```

---

## Indexing (`[]`)

Retrieves or mutates elements by 0-based integer index or table key:

```krb
~~ 1. List Indexing (Read & Write)
ivar~List<String> items = ["sword", "shield"];
pasteLn(items[0]);            ~~ "sword"
items[0] = "spear";

~~ 2. String Character Indexing (Read-Only)
ivar text = "Kuroba";
pasteLn(text[0]);             ~~ "K"
pasteLn(text[5]);             ~~ "a"
~~ Strings are immutable in Kuroba: text[0] = "X" will raise an error

~~ 3. Table Key Indexing (Read & Write)
ivar~Table hero = { name: "Shinobi", hp: 100 };
pasteLn(hero["name"]);        ~~ "Shinobi"
hero["hp"] -= 20;
```

---

## Function Invocation (`()`)

Executes named functions, lambdas, or table methods:

```krb
function multiply(ivar a, ivar b) then
    return a * b;
end

ivar res = multiply(6, 7);    ~~ 42
```
