# Namespaces, Packages & Standard Library (Std.Math)

Kuroba features a modern, symbol-based namespace and packaging system designed to keep code organized, clean, and zero-dependency.

---

## 1. Namespaces & Modules Architecture

Kuroba organizes code using a strict hierarchy:

$$\text{Namespace} \rightarrow \text{Module (Optional Slice)} \rightarrow \text{Members (Functions, Constants, Tables)}$$

### A. The `Main` Namespace (Application Root)
* `Main` is the single, unified entry point for executable applications.
* **`Main` is strictly indivisible** : attempting `namespace Main ~Module` will raise a `SyntaxError`.
* **`Main` cannot be imported** : attempting `import Main;` from another script will raise an `ImportError`.

```krb
import Std ~(Math) alias ~;

namespace Main then
    pasteLn("Application started!");
    pasteLn("PI: " + Math.PI);
end
```

### B. Library Namespaces & Modular Slices (`~Module`)
Libraries define a namespace (e.g., `Std`, `Game`) and can optionally be split into modular slices using the raven-feather tilde `~` signature:

```krb
~~ Split into modular slices (e.g. inside lib/std/)
namespace Std ~Math then
    iconst PI = 3.141592653589793;
    function abs(ivar x) then ... end
end
```

Or as a single unified library without modules:
```krb
namespace Game then
    function start() then ... end
end
```

### C. File-Name Independence (Pure Symbol Discovery)
Kuroba uses **pure symbol discovery**:
* The physical file name on disk (e.g. `math.krb`, `math_utils.krb`) **does not matter**.
* Kuroba scans package files and indexes them strictly by their declared `namespace <Name> [~<Module>]`.
* Multiple module slices can even reside in the same file.

### D. Standalone Scripts (Without Namespace)
* A script without any `namespace ... then` block runs normally as an autonomous script.
* However, a script without a declared namespace **cannot be imported** by other files.

---

## 2. Import Syntax

Imports reside at the top of the file (outside the `namespace` block) and target namespaces and their optional module slices:

### A. Importing the Entire Namespace
```krb
~~ 1. Standard import : accessible via Std.<Module>
import Std;
pasteLn(Std.Math.PI);

~~ 2. Namespace alias : accessible via S.<Module>
import Std alias S;
pasteLn(S.Math.PI);

~~ 3. Direct root import : exposes all modules directly in scope
import Std alias ~;
pasteLn(Math.PI);
```

### B. Importing Specific Module Slices (`~(...)`)
```krb
~~ 1. Specific module into root scope (Math accessible directly)
import Std ~(Math) alias ~;
pasteLn(Math.PI);

~~ 2. Specific module under package namespace (accessible via Std.Math)
import Std ~(Math);
pasteLn(Std.Math.PI);

~~ 3. Specific module under package alias (accessible via S.Math)
import Std ~(Math) alias S;
pasteLn(S.Math.PI);
```

---

## 3. Std.Math Reference

The `Std.Math` module provides a comprehensive suite of mathematical constants, hardware-accelerated calculations, trigonometry, and gaming/scripting helpers.

### Import:
```krb
import Std ~(Math) alias ~;
```

---

### Constants

| Constant | Value | Description |
| :--- | :--- | :--- |
| `Math.PI` | `3.141592653589793` | Archimedes' constant $\pi$ |
| `Math.TAU` | `6.283185307179586` | Circle constant $\tau = 2\pi$ |
| `Math.E` | `2.718281828459045` | Euler's number $e$ |

---

### Polyvalent Randomness

Kuroba features a single versatile `random(...)` function that adapts to the number of arguments:

```krb
~~ 0 arguments: Float between 0.0 (inclusive) and 1.0 (exclusive)
ivar floatVal = Math.random();

~~ 1 argument: Integer between 1 and max (inclusive)
ivar dice = Math.random(6);           ~~ Random integer 1, 2, 3, 4, 5, or 6

~~ 2 arguments: Integer between min and max (inclusive)
ivar damage = Math.random(10, 25);    ~~ Random integer between 10 and 25

~~ Random selection from a List
ivar weapons = ["Sword", "Bow", "Axe", "Staff"];
ivar chosen = Math.randomItem(weapons);
```

---

### Rounding & Truncation

| Function | Signature | Description |
| :--- | :--- | :--- |
| `Math.floor(x)` | `(ivar x) -> Int` | Returns the largest integer less than or equal to `x` |
| `Math.ceil(x)` | `(ivar x) -> Int` | Returns the smallest integer greater than or equal to `x` |
| `Math.round(x)` | `(ivar x) -> Int` | Rounds `x` to the nearest integer |
| `Math.trunc(x)` | `(ivar x) -> Int` | Discards fractional digits, truncating towards zero |

---

### Basic Arithmetic & Clamping

| Function | Signature | Description |
| :--- | :--- | :--- |
| `Math.abs(x)` | `(ivar x) -> Number` | Returns the absolute value of `x` |
| `Math.min(a, b)` | `(ivar a, ivar b) -> Number` | Returns the smaller of two numbers |
| `Math.max(a, b)` | `(ivar a, ivar b) -> Number` | Returns the larger of two numbers |
| `Math.clamp(val, min, max)` | `(ivar val, ivar min, ivar max) -> Number` | Constrains `val` within `[min, max]` |
| `Math.sign(x)` | `(ivar x) -> Int` | Returns `1` if $x > 0$, `-1` if $x < 0$, or `0` |

---

### Powers & Logarithms

| Function | Signature | Description |
| :--- | :--- | :--- |
| `Math.sqrt(x)` | `(ivar x) -> Float` | Returns the square root of `x` |
| `Math.pow(base, exp)` | `(ivar base, ivar exp) -> Number` | Returns `base` raised to the power `exp` |
| `Math.log(x)` | `(ivar x) -> Float` | Returns the natural logarithm ($\ln$) of `x` |
| `Math.log10(x)` | `(ivar x) -> Float` | Returns the base-10 logarithm of `x` |
| `Math.exp(x)` | `(ivar x) -> Float` | Returns Euler's number raised to power `x` ($e^x$) |

---

### Trigonometry & Angles

All trigonometric functions operate in **radians**. Conversion helpers `degToRad` and `radToDeg` are included.

| Function | Signature | Description |
| :--- | :--- | :--- |
| `Math.sin(rad)` | `(ivar rad) -> Float` | Sine of an angle |
| `Math.cos(rad)` | `(ivar rad) -> Float` | Cosine of an angle |
| `Math.tan(rad)` | `(ivar rad) -> Float` | Tangent of an angle |
| `Math.asin(x)` | `(ivar x) -> Float` | Arcsine (in radians) of `x` |
| `Math.acos(x)` | `(ivar x) -> Float` | Arccosine (in radians) of `x` |
| `Math.atan(x)` | `(ivar x) -> Float` | Arctangent (in radians) of `x` |
| `Math.atan2(y, x)` | `(ivar y, ivar x) -> Float` | Angle (in radians) between positive x-axis and point `(x, y)` |
| `Math.degToRad(deg)` | `(ivar deg) -> Float` | Converts degrees to radians |
| `Math.radToDeg(rad)` | `(ivar rad) -> Float` | Converts radians to degrees |

---

### Geometry & Animation (Gamedev)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `Math.dist(x1, y1, x2, y2)` | `(x1, y1, x2, y2) -> Float` | Euclidean distance between two points $(x_1, y_1)$ and $(x_2, y_2)$ |
| `Math.lerp(a, b, t)` | `(a, b, t) -> Float` | Linear interpolation between `a` and `b` by weight `t` ($a + (b - a) \times t$) |

---

## 4. Std.Time Reference

The `Std.Time` module provides high-precision timing, CPU-friendly synchronous sleep, timestamping, date/clock breakdown, and game development helpers.

### Import:
```krb
import Std ~(Time) alias ~;
```

---

### Pause & Animation

| Function | Signature | Description |
| :--- | :--- | :--- |
| `Time.sleep(ms)` | `(ivar ms)` | Synchronously suspends execution for `ms` milliseconds using CPU-friendly `Atomics.wait` (0% CPU burn) |
| `Time.sleepSec(sec)` | `(ivar sec)` | Convenience wrapper suspending execution for `sec` seconds (`sec * 1000`) |

---

### Timestamps & Chronometry

| Function | Signature | Description |
| :--- | :--- | :--- |
| `Time.now()` | `() -> Int` | Returns current Unix epoch timestamp in milliseconds |
| `Time.unix()` | `() -> Int` | Returns current Unix timestamp in whole seconds |
| `Time.perf()` | `() -> Float` | High-resolution performance timestamp in milliseconds with sub-millisecond precision |
| `Time.hires()` | `() -> Float` | Alias for `Time.perf()` |

---

### Clock & Date Breakdown

| Function | Signature | Description |
| :--- | :--- | :--- |
| `Time.clock()` | `() -> Table` | Returns a Kuroba Table with detailed components: `{ year, month, day, hours, minutes, seconds, ms }` |
| `Time.iso()` | `() -> String` | Returns standard ISO date string (`"YYYY-MM-DDTHH:mm:ss"`) |

```krb
ivar t = Time.clock();
pasteLn(t.year + "-" + t.month + "-" + t.day + " " + t.hours + ":" + t.minutes + ":" + t.seconds);
```

---

### Gamedev & Profiling Helpers

| Function | Signature | Description |
| :--- | :--- | :--- |
| `Time.since(timestamp)` | `(ivar t0) -> Int` | Convenience helper calculating elapsed time since `t0` (`Time.now() - t0`) |
| `Time.format(ms)` | `(ivar ms) -> String` | Formats milliseconds into human-readable chrono string (`"MM:SS"` or `"HH:MM:SS"`) |
| `Time.stopwatch()` | `() -> Table` | Creates a stateful stopwatch Table with `.elapsed()` and `.reset()` methods |

#### Stopwatch Usage:
```krb
ivar chrono = Time.stopwatch();

~~ Execute profiled workload...
Time.sleep(150);

pasteLn("Workload took: " + chrono.elapsed() + " ms (" + Time.format(chrono.elapsed()) + ")");

chrono.reset(); ~~ Reset stopwatch to 0
```

---

## 5. Std.String Reference

The `Std.String` module provides comprehensive text processing, manipulation, splitting, searching, and case transformations.

### Import:
```krb
import Std ~(String) alias ~;
```

---

### Constants

| Constant | Value | Description |
| :--- | :--- | :--- |
| `String.DIGITS` | `"0123456789"` | Numeric decimal digits |
| `String.ASCII_LOWER` | `"abcdefghijklmnopqrstuvwxyz"` | Lowercase ASCII letters |
| `String.ASCII_UPPER` | `"ABCDEFGHIJKLMNOPQRSTUVWXYZ"` | Uppercase ASCII letters |

---

### Functions

| Function | Signature | Description |
| :--- | :--- | :--- |
| `String.count(str)` | `(ivar str) -> Int` | Returns the total character length of `str` |
| `String.upper(str)` | `(ivar str) -> String` | Returns `str` converted to uppercase |
| `String.lower(str)` | `(ivar str) -> String` | Returns `str` converted to lowercase |
| `String.trim(str)` | `(ivar str) -> String` | Returns `str` with leading and trailing whitespace stripped |
| `String.split(str, sep)` | `(ivar str, ivar sep) -> List<String>` | Splits `str` by `sep` delimiter into a Kuroba `List` |
| `String.join(list, sep)` | `(ivar list, ivar sep) -> String` | Concatenates elements of `list` separated by `sep` |
| `String.replace(str, target, repl)` | `(str, target, repl) -> String` | Replaces all occurrences of `target` with `repl` |
| `String.contains(str, sub)` | `(str, sub) -> Bool` | Returns `TRUE` if `sub` is present in `str`, else `FALSE` |
| `String.startsWith(str, prefix)` | `(str, prefix) -> Bool` | Checks if `str` begins with `prefix` |
| `String.endsWith(str, suffix)` | `(str, suffix) -> Bool` | Checks if `str` ends with `suffix` |
| `String.indexOf(str, sub)` | `(str, sub) -> Int` | Returns 0-based index of first occurrence of `sub`, or `-1` |
| `String.slice(str, start, end)` | `(str, start, end) -> String` | Extracts a substring from `start` up to `end` index |
| `String.repeat(str, n)` | `(ivar str, ivar n) -> String` | Repeats `str` `n` times |
| `String.reverse(str)` | `(ivar str) -> String` | Reverses the characters of `str` |

---

## 6. Complete Example

```krb
import Std ~(Math, Time, String) alias ~;

namespace Main then
    pasteLn("Dungeon run started at: " + Time.iso());
    ivar chrono = Time.stopwatch();

    ivar rawInput = "  guerrier,mage,voleur  ";
    ivar classes = String.split(String.trim(rawInput), ",");
    
    pasteLn("Nombre de classes : " + classes.count());
    for (ivar i = 0; i < classes.count(); i++) then
        pasteLn(~"Classe {i + 1}: {String.upper(classes[i])} (Longueur: {String.count(classes[i])})");
    end

    ivar total = chrono.elapsed();
    pasteLn("Durée d'initialisation : " + total + " ms (" + Time.format(total) + ")");
end
```
