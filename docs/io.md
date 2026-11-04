# Console I/O & Interactive Input

Kuroba provides synchronous, zero-dependency console input/output and screen management primitives for building responsive command-line applications and interactive games.

---

## 1. Output (`paste`, `pasteLn`)

Print evaluated expressions to standard output (`stdout`):
- **`paste(...)`** — Prints without appending a newline.
- **`pasteLn(...)`** — Prints followed by a newline (`
`).
- **`pasteLn();`** — Prints an empty line.

```krb
paste("Loading: ");
paste("50%...");
pasteLn(" Done!");

pasteLn(); ~~ Empty line
```

### Value Formatting Rules
When printed with `paste` or `pasteLn`, Kuroba formats all runtime values intuitively:
- **Primitives**: `Int`, `Float`, `String`, `Bool` (`TRUE` / `FALSE`), and `NULL` are printed as their natural string representations.
- **Lists**: Rendered in array notation: `[1, 2, 3]`.
- **Stacks & Queues**: Formatted with their element order: `[10, 20]`.
- **Tables**: Formatted as structured key-value maps: `{name: "Kuroba", hp: 100}`.
- **Functions**: Formatted with their identifier: `<function greet>` or `<function ~>` for anonymous lambdas.

---

## 2. Interactive Input (`copy`, `copyKey`)

Both functions are **synchronous expressions** that block for user input and return a `String`.

### Line Input: `copy(...)`
Reads an entire line from the user until the **Enter** key is pressed:
- `copy("Prompt: ")` — Displays an optional prompt string without a trailing newline, then waits for input.
- `copy()` — Waits for input without displaying a prompt.
- Trailing newline characters (``, `
`) are automatically stripped.

```krb
ivar username = copy("Enter your username: ");
pasteLn("Welcome, " + username + "!");

~~ Automatic type coercion on input:
ivar~Int age = copy("Your age: ");
pasteLn("In 10 years you will be: " + (age + 10));

~~ Pause execution:
copy("Press Enter to continue...");
```

---

### Single Keypress: `copyKey()`
Blocks and captures a **single keypress immediately** without waiting for the Enter key:
- Operates in terminal raw mode and restores normal mode automatically upon return.
- Safe interrupt: pressing `Ctrl+C` cleanly terminates execution with standard exit code 130.

```krb
paste("Do you want to save? (y/n): ");
ivar key = copyKey();
pasteLn("");

if (key == "y" || key == "Y") then
    pasteLn("Saved successfully!");
else
    pasteLn("Operation cancelled.");
end
```

---

## 3. Screen Management (`clear`)

Clears the terminal console screen:
- `clear();` — Clears the screen immediately.
- `clear(condition);` — Clears the screen only if the condition evaluates to truthy (`TRUE` or `1`).

```krb
clear(score > 100); ~~ Conditional clear
clear();            ~~ Immediate clear
```


---

## 4. Interactive REPL Shell (`kb` / `krb`)

Kuroba includes a zero-dependency interactive shell for testing snippets and learning syntax:

```bash
# Launch interactive REPL
.\kb
# or
.\krb
```

### Features & Capabilities

- **Instant Expression Evaluation**: Values like `42`, `"Kuroba"`, `TRUE`, `[1, 2, 3]`, and math expressions `10 + 20` evaluate and print their result immediately in cyan.
- **Stateful Scope**: Declared variables (`ivar`, `iconst`) and functions remain accessible throughout the REPL session:
  ```krb
  >>> ivar x = 10;
  >>> x * 5
  50
  >>> function double(ivar n) then return n * 2; end
  >>> double(x)
  20
  ```
- **Smart Multi-line Buffering**: Writing open blocks (`if ... then`, `while ... do`, `function ... do`, `{{ ... }}`) switches the prompt to `... ` until closed by `end` or `}}`.
- **Cancellation**: Pressing `Enter` on an empty line in multi-line mode or pressing `Ctrl+C` cancels pending input without exiting.
- **Built-in Session Commands**:
  - `help()` — Displays shell usage tips.
  - `clear()` — Clears the terminal screen.
  - `exit()` (or `Ctrl+C` on empty buffer) — Exits the shell cleanly.
