# Console I/O & Interactive Input

Kuroba provides synchronous, zero-dependency console input/output and screen management primitives for building interactive command-line programs.

---

## Output (`paste`, `pasteLn`)

Print values to standard output (`stdout`):

- **`paste(...)`** — Prints the evaluated value without appending a newline.
- **`pasteLn(...)`** — Prints the evaluated value followed by a newline (`\n`).
- **`pasteLn();`** — Prints an empty line.

```krb
~~ No trailing newline
paste("Loading: ");
paste("50%...");
pasteLn(" Done!");

~~ Empty line
pasteLn();
```

Parentheses are strictly required. Missing parentheses will trigger a `SyntaxError`.

---

## Interactive Input (`copy`, `copyKey`)

Both functions are **expressions** that evaluate synchronously and return a `String`.

### Line Input: `copy(...)`

Reads an entire line from the user until the **Enter** key is pressed:

- `copy("Invite: ")` — Displays the optional prompt string without a newline, then blocks until input is submitted.
- `copy()` — Blocks for input directly without displaying a prompt.
- Trailing newline characters (`\r`, `\n`) are automatically stripped.

```krb
~~ Capture user input into a variable
ivar nom = copy("Entrez votre nom : ");
pasteLn("Bienvenue, " + nom + " !");

~~ Type coercion works automatically
ivar~Int age = copy("Votre age : ");
pasteLn("Dans 10 ans : " + (age + 10));

~~ Pause execution as a standalone statement
copy("Appuyez sur Entree pour continuer...");
```

---

### Single Keypress: `copyKey()`

Blocks and captures a **single keypress immediately** without waiting for the Enter key:

- Takes no prompt (use `paste(...)` beforehand if an invite is needed).
- Operates in terminal raw mode and restores normal mode automatically upon return.
- Safe interrupt: pressing `Ctrl+C` terminates cleanly with exit code 130.

```krb
paste("Voulez-vous sauvegarder ? (o/n) : ");
ivar key = copyKey();
pasteLn("");

if (key == "o" || key == "O") then
    pasteLn("Sauvegarde effectuee !");
else
    pasteLn("Operation annulee.");
end
```

---

## Screen Management (`clear`)

Clears the terminal console screen:

- `clear();` — Clears the screen immediately.
- `clear(condition);` — Clears the screen only if the condition evaluates to truthy (`TRUE` or `1`).

```krb
~~ Conditional screen clear
clear(round > 1);

~~ Immediate screen clear
clear();
```

