# Functions & Metaprogramming in Kuroba

Kuroba treats functions as first-class citizens (`First-Class Functions`). They can be declared globally, assigned to variables, passed as callbacks, stored inside `Table` collections as methods, and dynamically intercepted using native `hook` expressions.

---

## 1. Function Declaration (`function ... then ... end`)

Named functions are declared with the `function` keyword, followed by the function name, a comma-separated parameter list where each parameter begins with `ivar`, and an enclosed block terminated by `end`:

```krb
function addition(ivar a, ivar b) then
    return a + b;
end

pasteLn(addition(10, 5)); ~~ 15
```

### Parameter Typing & Nullability
Parameters can be optionally typed using Kuroba's signature tilde syntax `~Type` or made strictly non-nullable with `~(Type)`:

```krb
function multiplier(ivar~Int x, ivar~Int y) then
    return x * y;
end

pasteLn(multiplier(6, 7)); ~~ 42
```

---

## 2. Return Values & Procedures

- A function can return any expression using `return expr;`.
- Calling `return;` with no arguments immediately exits the function and returns `NULL`.
- If execution reaches `end` without encountering an explicit `return`, the function automatically returns `NULL`:

```krb
function saluer(ivar nom) then
    paste("Bonjour, ");
    pasteLn(nom);
    ~~ No explicit return -> returns NULL automatically
end

ivar res = saluer("Kuroba");
pasteLn(res); ~~ NULL
```

---

## 3. Anonymous Functions (`function ~(...)`)

Anonymous functions use Kuroba's signature raven feather tilde (`~`) in place of a function name. They can be stored in variables or passed as values:

```krb
ivar doubler = function ~(ivar n) then
    return n * 2;
end;

pasteLn(doubler(21)); ~~ 42
```

### Methods in Tables
Functions can be stored directly inside `Table` collections to act as methods:

```krb
ivar heros = {
    nom: "Kuroba",
    saluer: function ~(ivar cible) then
        pasteLn("En garde, " + cible + " !");
    end
};

heros["saluer"]("Dragon"); ~~ En garde, Dragon !
```

---

## 4. Lexical Scoping & Closures

Every function captures its enclosing environment at declaration time. Variables in the parent scope remain accessible and can be mutated across multiple invocations:

```krb
function creerCompteur() then
    ivar count = 0;
    return function ~() then
        count++;
        return count;
    end;
end

ivar cpt = creerCompteur();
pasteLn(cpt()); ~~ 1
pasteLn(cpt()); ~~ 2
pasteLn(cpt()); ~~ 3
```

---

## 5. Recursion

Kuroba functions natively support recursion. A function can invoke itself within its own body:

```krb
function factorielle(ivar n) then
    if (n <= 1) then
        return 1;
    end
    return n * factorielle(n - 1);
end

pasteLn(factorielle(5)); ~~ 120
```

---

## 6. Function Interception (`hook ... then ... end`)

Kuroba provides native function hooking inspired by game modding architectures. A `hook` intercepts any existing function (or table method) without modifying its original implementation.

Inside the body of a `hook`, the keyword **`this(...)`** automatically refers to the original function:

```krb
function calculerTotal(ivar prix, ivar quantite) then
    return prix * quantite;
end

~~ VIP Hook: intercepts calculerTotal and applies a 20% discount
hook calculerTotal(ivar prix, ivar quantite) then
    pasteLn("VIP Discount applied!");
    return this(prix, quantite) * 0.8;
end

pasteLn(calculerTotal(50, 2)); ~~ 80
```

### Hooking Table Methods (Game Modding Pattern)

Hooks can wrap methods inside `Table` structures directly:

```krb
ivar Game = {
    init: function ~(ivar self) then
        return { score: 100 };
    end
};

hook Game["init"](ivar self) then
    ivar res = this(self);
    res["giga_mode"] = TRUE;
    return res;
end

ivar session = Game["init"](Game);
pasteLn(session["giga_mode"]); ~~ TRUE
```

### Chained Hooks
Multiple hooks can be stacked on the same function. Each `this(...)` call seamlessly delegates to the next hook in the chain until reaching the original function.

### Conditional Cancellation vs Override
- **Preserving Return Values (`return this(...)`)**: Recommended practice. Ensures that whatever the original function returns is cleanly passed back to the caller.
- **Conditional Interception / Cancel**: You can choose whether or not to invoke `this(...)` based on runtime state:
  ```krb
  hook tirer(ivar cible) then
      if (cible["invincible"]) then
          pasteLn("Shield absorbed the shot!");
          return 0; ~~ 'this' is bypassed completely
      end
      return this(cible);
  end
  ```
- **Parameter Naming & Transformation**: Parameter names in the hook are purely local to the hook and do not need to match the original parameter names. Furthermore, arguments can be altered before passing them to `this(...)`:
  ```krb
  hook calculerTotal(ivar p, ivar q) then
      return this(p * 2, q); ~~ Alters price before forwarding
  end
  ```
