/* ============================================================================
   Kuroba Interactive Learning Manual — Part 2 (Chapters 5–8, Lessons 27–50)
   Clean Comment-Only Starters + Problem-Solving Challenges
   ============================================================================ */

window.KUROBA_LESSONS_PART2 = [
  // ==========================================================================
  // CHAPTER 5: Exceptions & Fault Tolerance (Lessons 27–30)
  // ==========================================================================
  {
    id: 27,
    chapter: 5,
    isBoss: false,
    title: 'Fault Recovery with try / catch',
    summary: 'Keep batch pipelines alive when individual records trigger runtime faults.',
    body: `
      <p>Runtime errors in Kuroba can be intercepted with <code>try ... catch (ivar err) then ... end</code>, where <code>err</code> is a <code>Table</code> containing <code>eName</code> (error class) and <code>eContext</code> (diagnostic message):</p>
      <pre><code class="language-kuroba">try
    ivar v = myList[999];
catch (ivar err) then
    pasteLn(~"Caught {err.eName}"); ~~ Caught IndexError
end</code></pre>
      <p><strong>Challenge:</strong> Declare an empty list <code>faultLog</code> and write <code>batchAverage(ivar batches)</code> where each element is <code>{ sum, count }</code>. Sum <code>b.sum / b.count</code> across all valid batches; whenever a batch divides by zero, catch the error, push <code>err.eName</code> onto <code>faultLog</code>, and keep going! Run it on <code>[{ sum: 100, count: 4 }, { sum: 50, count: 0 }, { sum: 90, count: 3 }, { sum: 10, count: 0 }]</code> into <code>totalAvg</code>.</p>
    `,
    starter: `~~ Fault log list\n\n~~ Implement batchAverage(batches)\n\n~~ Compute totalAvg on the 4 sample batches\n`,
    hint: 'Put try / catch INSIDE the loop over batches so a failing item does not abort the remaining items.',
    solution: `ivar faultLog = [];

function batchAverage(ivar batches) then
    ivar acc = 0;
    for (ivar b in batches) then
        try
            acc += b.sum / b.count;
        catch (ivar err) then
            faultLog.push(err.eName);
        end
    end
    return acc;
end

ivar totalAvg = batchAverage([
    { sum: 100, count: 4 },
    { sum: 50,  count: 0 },
    { sum: 90,  count: 3 },
    { sum: 10,  count: 0 }
]);
`,
    checks: [
      { label: 'totalAvg sums valid batches (25 + 30 = 55)', type: 'krb', expr: 'totalAvg == 55' },
      { label: 'faultLog recorded both "MathError" faults', type: 'krb', expr: 'faultLog.count() == 2 && faultLog[0] == "MathError" && faultLog[1] == "MathError"' }
    ]
  },

  {
    id: 28,
    chapter: 5,
    isBoss: false,
    title: 'Guaranteed Cleanup with finally',
    summary: 'Ensure mutexes and counters are always restored even when an operation crashes.',
    body: `
      <p>A <code>finally</code> block executes whether the <code>try</code> body finishes normally or throws an exception:</p>
      <pre><code class="language-kuroba">try
    riskyCall();
catch (ivar e) then
    handle(e);
finally
    cleanup(); ~~ Always runs
end</code></pre>
      <p><strong>Challenge:</strong> Declare globals <code>mutexHeld = FALSE</code> and <code>completedRuns = 0</code>, and write <code>withLock(ivar divisor)</code> using <code>try / catch / finally</code>:</p>
      <ul>
        <li>Set <code>mutexHeld = TRUE</code> at entry, compute <code>120 / divisor</code> (returning <code>0</code> if an error is caught).</li>
        <li>In <code>finally</code>, always reset <code>mutexHeld = FALSE</code> and increment <code>completedRuns++</code>.</li>
        <li>Call <code>withLock(4)</code> and <code>withLock(0)</code> at the bottom of your script.</li>
      </ul>
    `,
    starter: `~~ Shared mutexHeld & completedRuns state\n\n~~ Implement withLock(divisor) with try / catch / finally\n\n~~ Run withLock(4) and withLock(0)\n`,
    hint: 'Store the result in a local variable inside try/catch, reset mutexHeld and increment completedRuns in finally, then return the result after end.',
    solution: `ivar mutexHeld = FALSE;
ivar completedRuns = 0;

function withLock(ivar divisor) then
    mutexHeld = TRUE;
    ivar res = 0;
    try
        res = 120 / divisor;
    catch (ivar err) then
        res = 0;
    finally
        mutexHeld = FALSE;
        completedRuns++;
    end
    return res;
end

withLock(4);
withLock(0);
`,
    checks: [
      { label: 'Uses try, catch, and finally', type: 'code', pattern: /\btry\b[\s\S]*\bcatch\b[\s\S]*\bfinally\b/ },
      { label: 'withLock(4) == 30, withLock(0) == 0, and mutexHeld is always released', type: 'krb', expr: 'mutexHeld == FALSE && completedRuns == 2 && withLock(6) == 20 && mutexHeld == FALSE && completedRuns == 3' }
    ]
  },

  {
    id: 29,
    chapter: 5,
    isBoss: false,
    title: 'Domain Validation with throw',
    summary: 'Reject invalid inputs with descriptive throw messages before state can be corrupted.',
    body: `
      <p><code>throw &lt;expr&gt;;</code> raises a user exception whose message lands in <code>err.eContext</code>:</p>
      <pre><code class="language-kuroba">if (port &lt; 1 || port &gt; 65535) then
    throw "Port out of range";
end</code></pre>
      <p><strong>Challenge:</strong> Implement <code>registerUser(ivar username, ivar age)</code>:</p>
      <ul>
        <li>If <code>username</code> is <code>NULL</code> or <code>""</code>, throw <code>"Missing username"</code>.</li>
        <li>If <code>age &lt; 13</code>, throw <code>"Underage"</code>.</li>
        <li>Otherwise return <code>{ user: username, age: age, verified: TRUE }</code>.</li>
      </ul>
    `,
    starter: `~~ Implement registerUser(username, age) with throw validation\n`,
    hint: 'Check (username is NULL) || username == "" first, then check age < 13.',
    solution: `function registerUser(ivar username, ivar age) then
    if ((username is NULL) || username == "") then
        throw "Missing username";
    end
    if (age < 13) then
        throw "Underage";
    end
    return { user: username, age: age, verified: TRUE };
end
`,
    checks: [
      { label: 'Valid inputs return { user, age, verified: TRUE }', type: 'krb', script: 'ivar u = registerUser("Kenji", 19);\nif ((u is Table) && u.user == "Kenji" && u.age == 19 && u.verified == TRUE) then pasteLn("__KRB_OK__"); end' },
      { label: 'Throws exact messages on NULL/empty username and age < 13', type: 'krb', script: 'ivar m1 = "";\nivar m2 = "";\nivar m3 = "";\ntry registerUser(NULL, 20); catch (ivar e) then m1 = e.eContext; end\ntry registerUser("", 20); catch (ivar e) then m2 = e.eContext; end\ntry registerUser("Aoi", 10); catch (ivar e) then m3 = e.eContext; end\nif (m1 == "Missing username" && m2 == "Missing username" && m3 == "Underage") then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 30,
    chapter: 5,
    isBoss: true,
    title: 'Atomic Escrow Vault',
    summary: 'Boss Challenge: Guard a sealed escrow balance with rollback safety and audit logging.',
    body: `
      <p><strong>Boss Scenario:</strong> Declare sealed <code>escrowVault = 1000</code> and empty list <code>txHistory</code>, then build <code>settleEscrow(ivar amount, ivar feeDivisor)</code>:</p>
      <ul>
        <li>Inside <code>try</code>: if <code>amount &lt;= 0</code> throw <code>"Invalid escrow"</code>; compute integer <code>fee = amount / feeDivisor</code>; if <code>amount + fee &gt; escrowVault</code> throw <code>"Escrow depleted"</code>.</li>
        <li>When valid, unlock and deduct <code>amount + fee</code> from <code>escrowVault</code>, and push <code>"OK"</code> to <code>txHistory</code>; on any error in <code>catch</code>, push <code>err.eName</code> to <code>txHistory</code> without altering <code>escrowVault</code>.</li>
        <li>In <code>finally</code>, always ensure <code>escrowVault</code> is locked.</li>
        <li>Execute four calls: <code>(200, 10)</code>, <code>(100, 0)</code>, <code>(900, 10)</code>, and <code>(-5, 2)</code>.</li>
      </ul>
    `,
    starter: `~~ Sealed escrowVault (1000) & txHistory list\n\n~~ Implement settleEscrow(amount, feeDivisor)\n\n~~ Execute the 4 test settlements\n`,
    hint: 'Compute fee and validate sufficiency BEFORE unlocking escrowVault, and call lock escrowVault; inside finally.',
    solution: `isealed escrowVault = 1000;
ivar txHistory = [];

function settleEscrow(ivar amount, ivar feeDivisor) then
    try
        if (amount <= 0) then throw "Invalid escrow"; end
        ivar fee = amount / feeDivisor;
        ivar total = amount + fee;
        if (total > escrowVault) then throw "Escrow depleted"; end
        unlock escrowVault;
        escrowVault = escrowVault - total;
        txHistory.push("OK");
    catch (ivar err) then
        txHistory.push(err.eName);
    finally
        lock escrowVault;
    end
end

settleEscrow(200, 10);
settleEscrow(100, 0);
settleEscrow(900, 10);
settleEscrow(-5, 2);
`,
    checks: [
      { label: 'escrowVault equals 780 and remains sealed', type: 'krb', expr: 'escrowVault == 780 && (escrowVault is lock)' },
      { label: 'txHistory recorded ["OK", "MathError", "Exception", "Exception"]', type: 'krb', expr: 'txHistory.count() == 4 && txHistory[0] == "OK" && txHistory[1] == "MathError" && txHistory[2] == "Exception" && txHistory[3] == "Exception"' }
    ]
  },

  // ==========================================================================
  // CHAPTER 6: Functions, Closures & Hooks (Lessons 31–37)
  // ==========================================================================
  {
    id: 31,
    chapter: 6,
    isBoss: false,
    title: 'Typed Signatures & Default Arguments',
    summary: 'Design flexible functions with coerced parameters and sensible defaults.',
    body: `
      <p>Named functions use <code>function name(...) then ... end</code>. Parameters accept type contracts (<code>ivar~Int</code>) and optional literal defaults:</p>
      <pre><code class="language-kuroba">function padScore(ivar~String label, ivar~Int pts = 100) then
    return ~"{label}:{pts}";
end</code></pre>
      <p><strong>Challenge:</strong> Write <code>craftPotion(herb, potency, multiplier)</code>:</p>
      <ul>
        <li><code>herb</code> must be a <strong>non-nullable</strong> <code>String</code>.</li>
        <li><code>potency</code> and <code>multiplier</code> coerce inputs to <code>Int</code> and default to <code>25</code> and <code>1</code>.</li>
        <li>Return <code>~"{herb}+{potency * multiplier}"</code>.</li>
      </ul>
    `,
    starter: `~~ Define craftPotion with typed & default parameters\n`,
    hint: 'Use non-nullable ~(String) on the first parameter and ~Int with = defaults on the second and third.',
    solution: `function craftPotion(ivar~(String) herb, ivar~Int potency = 25, ivar~Int multiplier = 1) then
    return ~"{herb}+{potency * multiplier}";
end
`,
    checks: [
      { label: 'Supports 1, 2, or 3 arguments and coerces numeric strings', type: 'krb', expr: 'craftPotion("Mint") == "Mint+25" && craftPotion("Sage", 40) == "Sage+40" && craftPotion("Lotus", "15", "3") == "Lotus+45"' },
      { label: 'Rejects NULL for the non-nullable herb parameter', type: 'krb', script: 'ivar rejected = FALSE;\ntry craftPotion(NULL); catch (ivar e) then rejected = TRUE; end\nif (rejected) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 32,
    chapter: 6,
    isBoss: false,
    title: 'Tilde Lambdas & Lexical Closures',
    summary: 'Build stateful function factories using anonymous function ~(...) closures.',
    body: `
      <p>Anonymous lambdas use <code>function ~(...) then ... end</code> and capture surrounding local variables in a private closure environment:</p>
      <pre><code class="language-kuroba">function makeScaler(ivar k) then
    return function ~(ivar x) then return x * k; end;
end</code></pre>
      <p><strong>Challenge:</strong> Write <code>makeRateLimiter(ivar maxCalls)</code> returning a 0-argument lambda that returns <code>TRUE</code> for its first <code>maxCalls</code> invocations and <code>FALSE</code> thereafter, with isolated state per limiter.</p>
    `,
    starter: `~~ Implement makeRateLimiter(maxCalls) returning a stateful closure\n`,
    hint: 'Keep a local remaining counter inside makeRateLimiter; inside the returned lambda, decrement it while > 0.',
    solution: `function makeRateLimiter(ivar maxCalls) then
    ivar remaining = maxCalls;
    return function ~() then
        if (remaining > 0) then
            remaining--;
            return TRUE;
        end
        return FALSE;
    end;
end
`,
    checks: [
      { label: 'Uses tilde lambda syntax', type: 'code', pattern: /function\s*~/ },
      { label: 'Enforces independent call quotas per closure instance', type: 'krb', script: 'ivar lim2 = makeRateLimiter(2);\nivar lim1 = makeRateLimiter(1);\nif (lim2() == TRUE && lim2() == TRUE && lim2() == FALSE && lim1() == TRUE && lim1() == FALSE) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 33,
    chapter: 6,
    isBoss: false,
    title: 'First-Class Function Coercion',
    summary: 'Normalize mixed static values and dynamic callbacks into uniform 0-arg callable providers.',
    body: `
      <p>When a value is assigned to <code>ivar~Function</code> (or cast with <code>[Function]expr</code>), existing functions stay as-is while any non-function value is automatically wrapped into a <strong>0-argument getter function</strong> returning that value!</p>
      <pre><code class="language-kuroba">ivar~Function src = 500; ~~ Becomes function ~() -> 500
pasteLn(src());          ~~ 500</code></pre>
      <p><strong>Challenge:</strong> Write <code>readConfig(source, fallback)</code> where both parameters accept <em>either</em> a 0-arg function OR a raw value (with <code>fallback</code> defaulting to <code>"DEFAULT"</code>). Invoke <code>source()</code>; if it returns <code>NULL</code>, return <code>fallback()</code> instead.</p>
    `,
    starter: `~~ Implement readConfig(source, fallback = "DEFAULT") using ~Function coercion\n`,
    hint: 'Annotate both parameters with ~Function so inside the function body both source() and fallback() are guaranteed callable.',
    solution: `function readConfig(ivar~Function source, ivar~Function fallback = "DEFAULT") then
    ivar val = source();
    if (val is NULL) then
        return fallback();
    end
    return val;
end
`,
    checks: [
      { label: 'Works seamlessly on raw literals, lambdas, and NULL fallbacks', type: 'krb', script: 'ivar dyn = function ~() then return "LIVE"; end;\nif (readConfig(8080) == 8080 && readConfig(dyn) == "LIVE" && readConfig(NULL) == "DEFAULT" && readConfig(NULL, 42) == 42) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 34,
    chapter: 6,
    isBoss: false,
    title: 'Null-Function Semantics',
    summary: 'Detect no-op callbacks cleanly using Kuroba\'s unified null-function rules.',
    body: `
      <p>Any <strong>0-argument</strong> function that returns no value (empty body, <code>return;</code>, <code>return NULL;</code>, or <code>ivar~Function cb = NULL;</code>) evaluates to <code>TRUE</code> on both <code>cb is NULL</code> and <code>cb == NULL</code>, while still satisfying <code>cb is Function</code>!</p>
      <pre><code class="language-kuroba">function emptyHook() then end
pasteLn(emptyHook is Function); ~~ TRUE
pasteLn(emptyHook is NULL);     ~~ TRUE</code></pre>
      <p><strong>Challenge:</strong> Write <code>countActiveHooks(ivar hooks)</code> taking a <code>List</code> of mixed values and returning how many entries are <strong>callable Functions that are NOT null-functions</strong>.</p>
    `,
    starter: `~~ Implement countActiveHooks(hooks)\n`,
    hint: 'For each item h in hooks, check both (h is Function) and !(h is NULL).',
    solution: `function countActiveHooks(ivar hooks) then
    ivar active = 0;
    for (ivar h in hooks) then
        if ((h is Function) && !(h is NULL)) then
            active++;
        end
    end
    return active;
end
`,
    checks: [
      { label: 'Distinguishes active callbacks from NULL, no-op 0-arg functions, and non-functions', type: 'krb', script: 'function noop1() then end\nfunction noop2() then return; end\nfunction withArg(ivar x) then end\nfunction withVal() then return 1; end\nivar list = [NULL, noop1, noop2, [Function]NULL, withArg, withVal, 99];\nif (countActiveHooks(list) == 2) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 35,
    chapter: 6,
    isBoss: false,
    title: 'Guarding Lambdas with iconst & isealed',
    summary: 'Protect critical function references from unauthorized replacement.',
    body: `
      <p>Named functions are always mutable (<code>function f()</code>), so when an API callback must be tamper-proof or require explicit authorization to change, bind a tilde lambda to <code>iconst</code> or <code>isealed</code>:</p>
      <pre><code class="language-kuroba">iconst~Function verifySig = function ~(ivar s) then return s != ""; end;
isealed~Function router = function ~() then return "v1"; end;</code></pre>
      <p><strong>Challenge:</strong> Declare two lambda bindings:</p>
      <ul>
        <li><code>coreChecksum</code>: an <strong>immutable</strong> lambda taking <code>(a, b)</code> and returning <code>a * 31 + b</code>.</li>
        <li><code>pricingRule</code>: a <strong>sealed</strong> lambda initially returning <code>p</code> unchanged, then authorized and rotated once so <code>pricingRule(p)</code> returns <code>p - 10</code> (ending sealed!).</li>
      </ul>
    `,
    starter: `~~ Immutable coreChecksum lambda\n\n~~ Sealed pricingRule lambda & authorized rotation\n`,
    hint: 'Use iconst~Function for coreChecksum and isealed~Function for pricingRule, then unlock pricingRule before replacing it.',
    solution: `iconst~Function coreChecksum = function ~(ivar a, ivar b) then
    return a * 31 + b;
end;

isealed~Function pricingRule = function ~(ivar p) then
    return p;
end;

unlock pricingRule;
pricingRule = function ~(ivar p) then
    return p - 10;
end;
`,
    checks: [
      { label: 'coreChecksum is permanently locked and computes a * 31 + b', type: 'krb', script: 'ivar blocked = FALSE;\ntry coreChecksum = 0; catch (ivar e) then blocked = TRUE; end\nif (blocked && (coreChecksum is lock) && coreChecksum(2, 5) == 67) then pasteLn("__KRB_OK__"); end' },
      { label: 'pricingRule(50) == 40 and is sealed again', type: 'krb', expr: '(pricingRule is lock) && pricingRule(50) == 40' }
    ]
  },

  {
    id: 36,
    chapter: 6,
    isBoss: false,
    title: 'Runtime Interception (hook & orig)',
    summary: 'Wrap an existing function non-invasively to clamp inputs and audit results via orig(...).',
    body: `
      <p><code>hook target(...) then ... end</code> intercepts calls to an existing function without touching its source. Inside the hook body, <code>orig(...)</code> invokes the previous implementation:</p>
      <pre><code class="language-kuroba">hook sendPacket(ivar payload) then
    if (payload == "") then return FALSE; end
    return orig(payload);
end</code></pre>
      <p><strong>Challenge:</strong> First define a plain function <code>computeBonus(ivar level)</code> returning <code>level * 10</code>. Then attach a <code>hook</code> onto <code>computeBonus</code> that clamps <code>level</code> into <code>[0, 10]</code> before delegating to <code>orig(level)</code>, and adds a flat <code>+5</code> to the result!</p>
    `,
    starter: `~~ Base computeBonus(level) returning level * 10\n\n~~ Non-invasive hook clamping level into [0..10] and adding +5\n`,
    hint: 'Adjust level inside hook computeBonus(ivar level), then return orig(level) + 5;.',
    solution: `function computeBonus(ivar level) then
    return level * 10;
end

hook computeBonus(ivar level) then
    if (level < 0) then level = 0; end
    if (level > 10) then level = 10; end
    return orig(level) + 5;
end
`,
    checks: [
      { label: 'Defines computeBonus returning level * 10 and wraps it with hook + orig(...)', type: 'code', pattern: /return\s+level\s*\*\s*10\s*;[\s\S]*\bhook\s+computeBonus[\s\S]*\borig\s*\(/ },
      { label: 'Clamps inputs and adds +5: (-3 -> 5, 4 -> 45, 99 -> 105)', type: 'krb', expr: 'computeBonus(-3) == 5 && computeBonus(4) == 45 && computeBonus(99) == 105' }
    ]
  },

  {
    id: 37,
    chapter: 6,
    isBoss: true,
    title: 'Authenticated Webhook Gateway',
    summary: 'Boss Challenge: Combine ~Function coercion, sealed lambdas, and runtime hooks.',
    body: `
      <p><strong>Boss Scenario:</strong> Build an API gateway pipeline:</p>
      <ol>
        <li>Declare <code>deniedCount = 0</code> and a coerced <code>Function</code> variable <code>secretProvider</code> initialized from <code>"KEY-9"</code>.</li>
        <li>Declare a sealed lambda <code>handleRequest(token, amount)</code> returning <code>amount * 2</code> if <code>token == secretProvider()</code>, or <code>-1</code> otherwise.</li>
        <li>Unlock <code>handleRequest</code> and attach a <code>hook</code> that delegates to <code>orig(token, amount)</code>, increments <code>deniedCount</code> whenever the result is <code>-1</code>, and returns the result (leaving <code>handleRequest</code> re-sealed!).</li>
      </ol>
    `,
    starter: `~~ Audit counter & coerced secretProvider\n\n~~ Sealed handleRequest lambda\n\n~~ Authorize & attach audit hook\n`,
    hint: 'Use ivar~Function for secretProvider, isealed~Function for handleRequest, then unlock handleRequest right before hooking it.',
    solution: `ivar deniedCount = 0;
ivar~Function secretProvider = "KEY-9";

isealed~Function handleRequest = function ~(ivar token, ivar amount) then
    if (token == secretProvider()) then
        return amount * 2;
    end
    return -1;
end;

unlock handleRequest;
hook handleRequest(ivar token, ivar amount) then
    ivar res = orig(token, amount);
    if (res == -1) then
        deniedCount++;
    end
    return res;
end
`,
    checks: [
      { label: 'secretProvider is a 0-arg Function returning "KEY-9"', type: 'krb', expr: '(secretProvider is Function) && secretProvider() == "KEY-9"' },
      { label: 'handleRequest is re-sealed after hooking', type: 'krb', expr: 'handleRequest is lock' },
      { label: 'Processes valid tokens and increments deniedCount on bad tokens', type: 'krb', script: 'ivar r1 = handleRequest("KEY-9", 25);\nivar r2 = handleRequest("WRONG", 25);\nivar r3 = handleRequest("BAD", 10);\nif (r1 == 50 && r2 == -1 && r3 == -1 && deniedCount == 2) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  // ==========================================================================
  // CHAPTER 7: Object-Oriented Programming (Lessons 38–45)
  // ==========================================================================
  {
    id: 38,
    chapter: 7,
    isBoss: false,
    title: 'Classes & C#-Style Constructors',
    summary: 'Model stateful objects with typed fields, this references, and new-free instantiation.',
    body: `
      <p>A class constructor has the exact same name as its class and is called directly without <code>new</code>:</p>
      <pre><code class="language-kuroba">class Timer then
    public ivar~Int remaining = 0;
    function Timer(ivar~Int sec) then
        this.remaining = sec;
    end
end
ivar t = Timer(60);</code></pre>
      <p><strong>Challenge:</strong> Implement <code>class Wallet</code>:</p>
      <ul>
        <li>Typed public fields <code>owner</code> (<code>String</code>) and <code>credits</code> (<code>Int</code>) initialized by constructor <code>Wallet(owner, credits)</code>.</li>
        <li>Method <code>transferTo(otherWallet, amount)</code>: if <code>amount &gt; 0 &amp;&amp; this.credits &gt;= amount</code>, move <code>amount</code> to <code>otherWallet.credits</code> and return <code>TRUE</code>; otherwise leave balances unchanged and return <code>FALSE</code>.</li>
      </ul>
    `,
    starter: `~~ Implement class Wallet(owner, credits) & transferTo method\n`,
    hint: 'Inside transferTo, mutate both this.credits -= amount and otherWallet.credits += amount when valid.',
    solution: `class Wallet then
    public ivar~String owner = "";
    public ivar~Int credits = 0;

    function Wallet(ivar~String owner, ivar~Int credits) then
        this.owner = owner;
        this.credits = credits;
    end

    function transferTo(ivar otherWallet, ivar~Int amount) then
        if (amount > 0 && this.credits >= amount) then
            this.credits -= amount;
            otherWallet.credits += amount;
            return TRUE;
        end
        return FALSE;
    end
end
`,
    checks: [
      { label: 'Transfers valid amounts and rejects overdrafts or non-positive amounts', type: 'krb', script: 'ivar w1 = Wallet("Kenji", "100");\nivar w2 = Wallet("Aoi", 30);\nivar ok1 = w1.transferTo(w2, 40);\nivar ok2 = w1.transferTo(w2, 999);\nivar ok3 = w1.transferTo(w2, -5);\nif ((w1 is Wallet) && ok1 == TRUE && ok2 == FALSE && ok3 == FALSE && w1.credits == 60 && w2.credits == 70) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 39,
    chapter: 7,
    isBoss: false,
    title: 'Visibility & Inheritance Boundaries',
    summary: 'Choose between public, protected, private, isolated, and exclusive to enforce exact access contracts.',
    body: `
      <p>Each visibility modifier controls <strong>who can read/write</strong> AND <strong>whether subclasses inherit the field</strong>:</p>
      <ul>
        <li><code>public</code>: External + subclasses.</li>
        <li><code>protected</code>: Hidden externally, inherited &amp; readable in subclasses.</li>
        <li><code>private</code>: Readable only inside the declaring class itself.</li>
        <li><code>isolated</code>: Private AND omitted from child instances.</li>
        <li><code>exclusive</code>: Public on instances of the declaring class, but omitted from child instances.</li>
      </ul>
      <p><strong>Challenge:</strong> Build <code>class Account</code> and subclass <code>class VipAccount from Account</code>:</p>
      <ul>
        <li><code>Account</code> has <code>id = "ACC-1"</code> (accessible externally), <code>tierMultiplier = 3</code> (hidden externally, readable by subclasses), <code>_masterSalt = "s3cr3t"</code> (strictly private to <code>Account</code>), and method <code>checkSalt(s)</code> returning <code>s == this._masterSalt</code>.</li>
        <li><code>VipAccount</code> adds method <code>calcBonus(pts)</code> returning <code>pts * this.tierMultiplier</code>.</li>
      </ul>
    `,
    starter: `~~ Define class Account with public, protected, and private fields\n\n~~ Define subclass VipAccount from Account\n`,
    hint: 'Use public for id, protected for tierMultiplier, and private for _masterSalt.',
    solution: `class Account then
    public ivar id = "ACC-1";
    protected ivar tierMultiplier = 3;
    private ivar _masterSalt = "s3cr3t";

    function checkSalt(ivar s) then
        return s == this._masterSalt;
    end
end

class VipAccount from Account then
    function calcBonus(ivar pts) then
        return pts * this.tierMultiplier;
    end
end
`,
    checks: [
      { label: 'id is public and VipAccount.calcBonus(10) == 30 via protected tierMultiplier', type: 'krb', script: 'ivar v = VipAccount();\nif (v.id == "ACC-1" && v.calcBonus(10) == 30 && v.checkSalt("s3cr3t") == TRUE) then pasteLn("__KRB_OK__"); end' },
      { label: 'External access to tierMultiplier and _masterSalt is rejected', type: 'krb', script: 'ivar v = VipAccount();\nivar b1 = FALSE;\nivar b2 = FALSE;\ntry ivar x = v.tierMultiplier; catch (ivar e) then b1 = TRUE; end\ntry ivar y = v._masterSalt; catch (ivar e) then b2 = TRUE; end\nif (b1 && b2) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 40,
    chapter: 7,
    isBoss: false,
    title: 'Shared Class State & Factories',
    summary: 'Track global instance registries and static helpers on the class itself with shared.',
    body: `
      <p><code>shared</code> members live on the class object (<code>ClassName.member</code>) instead of per-instance tables:</p>
      <pre><code class="language-kuroba">class Ticket then
    shared ivar nextNum = 100;
end</code></pre>
      <p><strong>Challenge:</strong> Implement <code>class ConnectionPool</code>:</p>
      <ul>
        <li><code>shared ivar~Int activeCount = 0;</code> and <code>shared iconst~Int MAX_POOL = 2;</code>.</li>
        <li>Constructor <code>ConnectionPool()</code>: if <code>activeCount &gt;= MAX_POOL</code> throw <code>"Pool exhausted"</code>; otherwise increment <code>activeCount</code> and set <code>this.open = TRUE</code>.</li>
        <li>Method <code>close()</code>: if <code>this.open</code> is true, set <code>this.open = FALSE</code> and decrement <code>activeCount</code> (double-closing must be a safe no-op!).</li>
      </ul>
    `,
    starter: `~~ Implement class ConnectionPool with shared pool cap & idempotent close()\n`,
    hint: 'Guard close() with if (this.open) then ... end so calling close() twice does not decrement activeCount twice.',
    solution: `class ConnectionPool then
    shared ivar~Int activeCount = 0;
    shared iconst~Int MAX_POOL = 2;
    public ivar~Bool open = FALSE;

    function ConnectionPool() then
        if (ConnectionPool.activeCount >= ConnectionPool.MAX_POOL) then
            throw "Pool exhausted";
        end
        ConnectionPool.activeCount += 1;
        this.open = TRUE;
    end

    function close() then
        if (this.open) then
            this.open = FALSE;
            ConnectionPool.activeCount -= 1;
        end
    end
end
`,
    checks: [
      { label: 'Allows 2 active connections and throws "Pool exhausted" on a 3rd', type: 'krb', script: 'ivar c1 = ConnectionPool();\nivar c2 = ConnectionPool();\nivar threw = FALSE;\ntry ConnectionPool(); catch (ivar e) then threw = (e.eContext == "Pool exhausted"); end\nc1.close();\nc1.close();\nivar c3 = ConnectionPool();\nif (threw && ConnectionPool.activeCount == 2 && c3.open == TRUE) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 41,
    chapter: 7,
    isBoss: false,
    title: 'Computed & Validated Properties (get / set)',
    summary: 'Expose clean property syntax backed by private invariants and derived calculations.',
    body: `
      <p><code>get name then ... end</code> and <code>set name(ivar v) then ... end</code> let callers read/write <code>obj.name</code> while executing custom logic under the hood:</p>
      <pre><code class="language-kuroba">class Circle then
    public ivar r = 5;
    get diameter then return this.r * 2; end
end</code></pre>
      <p><strong>Challenge:</strong> Implement <code>class HealthBar(maxHp)</code> backed by private <code>_hp</code> and public <code>maxHp</code> (both initialized to <code>maxHp</code>):</p>
      <ul>
        <li><code>get hp</code> returns <code>this._hp</code>; <code>set hp(v)</code> clamps <code>v</code> into <code>[0, this.maxHp]</code>.</li>
        <li>Read-only computed getter <code>isDead</code> returns <code>TRUE</code> when <code>this._hp == 0</code>, else <code>FALSE</code>.</li>
      </ul>
    `,
    starter: `~~ Implement class HealthBar(maxHp) with hp get/set & isDead getter\n`,
    hint: 'Clamp v against 0 and this.maxHp inside set hp(ivar~Int v), and add get isDead then return this._hp == 0; end.',
    solution: `class HealthBar then
    private ivar~Int _hp = 100;
    public ivar~Int maxHp = 100;

    function HealthBar(ivar~Int maxHp) then
        this.maxHp = maxHp;
        this._hp = maxHp;
    end

    get hp then
        return this._hp;
    end

    set hp(ivar~Int v) then
        if (v < 0) then v = 0; end
        if (v > this.maxHp) then v = this.maxHp; end
        this._hp = v;
    end

    get isDead then
        return this._hp == 0;
    end
end
`,
    checks: [
      { label: 'Clamps hp into [0, maxHp] and updates computed isDead getter', type: 'krb', script: 'ivar b = HealthBar(80);\nb.hp = 150;\nivar hi = b.hp;\nivar alive = !b.isDead;\nb.hp = -20;\nif (hi == 80 && alive && b.hp == 0 && b.isDead == TRUE) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 42,
    chapter: 7,
    isBoss: false,
    title: 'Inheritance & Polymorphic Dispatch',
    summary: 'Chain superclass constructors with base(...) and override methods cleanly across subclasses.',
    body: `
      <p>Subclasses declare <code>class Sub from Super then</code>, initialize inherited state via <code>base(...)</code>, and override methods while still matching <code>instance is Super</code>.</p>
      <p><strong>Challenge:</strong> Define base class <code>Employee(name, basePay)</code> whose <code>monthlyPay()</code> returns <code>this.basePay</code>, and subclass <code>Engineer from Employee</code>:</p>
      <ul>
        <li>Constructor <code>Engineer(name, basePay, commits)</code> chaining <code>base(name, basePay)</code> and storing <code>this.commits = commits</code>.</li>
        <li>Override <code>monthlyPay()</code> to return <code>this.basePay + this.commits * 50</code>.</li>
      </ul>
    `,
    starter: `~~ Base class Employee(name, basePay)\n\n~~ Subclass Engineer from Employee\n`,
    hint: 'Call base(name, basePay); inside function Engineer(...) and override function monthlyPay().',
    solution: `class Employee then
    public ivar name = "";
    public ivar~Int basePay = 0;

    function Employee(ivar name, ivar~Int basePay) then
        this.name = name;
        this.basePay = basePay;
    end

    function monthlyPay() then
        return this.basePay;
    end
end

class Engineer from Employee then
    public ivar~Int commits = 0;

    function Engineer(ivar name, ivar~Int basePay, ivar~Int commits) then
        base(name, basePay);
        this.commits = commits;
    end

    function monthlyPay() then
        return this.basePay + this.commits * 50;
    end
end
`,
    checks: [
      { label: 'Engineer instance satisfies both is Engineer and is Employee', type: 'krb', script: 'ivar dev = Engineer("Ren", 3000, 12);\nif ((dev is Engineer) && (dev is Employee) && dev.name == "Ren" && dev.monthlyPay() == 3600) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 43,
    chapter: 7,
    isBoss: false,
    title: 'Interfaces & State Enumerations',
    summary: 'Combine 0-indexed enum state machines with polymorphic interface contracts.',
    body: `
      <p><code>enum</code> creates an immutable 0-indexed set of named states, and <code>interface</code> + <code>as</code> tags classes with verifiable behavioral contracts:</p>
      <pre><code class="language-kuroba">enum Phase then WARMUP, LIVE, ENDED end ~~ 0, 1, 2
interface IPlugin then function run(); end
class Logger as IPlugin then ... end</code></pre>
      <p><strong>Challenge:</strong></p>
      <ul>
        <li>Declare <code>enum OrderState then PENDING, PAID, SHIPPED end</code>.</li>
        <li>Declare <code>interface IBillable then function totalCents(); end</code>.</li>
        <li>Implement <code>class Order as IBillable</code> starting in <code>OrderState.PENDING</code>, constructor <code>Order(cents)</code>, <code>totalCents()</code> returning the amount, and <code>advance()</code> moving <code>PENDING &rarr; PAID &rarr; SHIPPED</code> (capping at <code>SHIPPED</code>).</li>
      </ul>
    `,
    starter: `~~ OrderState enum\n\n~~ IBillable interface\n\n~~ Order class implementing IBillable\n`,
    hint: 'Since enum values are 0, 1, 2, advance() can increment this.state while this.state < OrderState.SHIPPED.',
    solution: `enum OrderState then
    PENDING,
    PAID,
    SHIPPED
end

interface IBillable then
    function totalCents();
end

class Order as IBillable then
    public ivar state = OrderState.PENDING;
    public ivar~Int cents = 0;

    function Order(ivar~Int cents) then
        this.cents = cents;
    end

    function totalCents() then
        return this.cents;
    end

    function advance() then
        if (this.state < OrderState.SHIPPED) then
            this.state += 1;
        end
        return this.state;
    end
end
`,
    checks: [
      { label: 'OrderState members are 0, 1, 2 and match is OrderState', type: 'krb', expr: 'OrderState.PENDING == 0 && OrderState.SHIPPED == 2 && (OrderState.PAID is OrderState)' },
      { label: 'Order satisfies is IBillable and transitions PENDING -> PAID -> SHIPPED -> SHIPPED', type: 'krb', script: 'ivar ord = Order(2500);\nivar s0 = ord.state;\nivar s1 = ord.advance();\nivar s2 = ord.advance();\nivar s3 = ord.advance();\nif ((ord is IBillable) && ord.totalCents() == 2500 && s0 == 0 && s1 == 1 && s2 == 2 && s3 == 2) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 44,
    chapter: 7,
    isBoss: false,
    title: 'toString() & Operator Overloading',
    summary: 'Give custom value objects native arithmetic, comparison, and string formatting semantics.',
    body: `
      <p>Classes can overload <code>operator +</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>%</code>, <code>==</code>, <code>&lt;</code>, <code>&gt;</code>, unary <code>operator -()</code>, and <code>function toString()</code>:</p>
      <pre><code class="language-kuroba">class Meter then
    public ivar~Int m = 0;
    function Meter(ivar~Int m) then this.m = m; end
    operator +(ivar o) then return Meter(this.m + o.m); end
    operator &lt;(ivar o) then return this.m &lt; o.m; end
    function toString() then return ~"{this.m}m"; end
end</code></pre>
      <p><strong>Challenge:</strong> Implement <code>class Money(cents)</code> representing currency in integer cents:</p>
      <ul>
        <li>Overload <code>+</code> and <code>-</code> (between two <code>Money</code> objects), <code>*</code> (multiplying <code>Money * Int</code>), <code>==</code>, and <code>&lt;</code>.</li>
        <li>Implement <code>toString()</code> formatting <code>250</code> as <code>"$2.50"</code> and <code>1005</code> as <code>"$10.05"</code> (zero-pad single-digit cents!).</li>
      </ul>
    `,
    starter: `~~ Implement class Money(cents) with +, -, *, ==, < and zero-padded toString()\n`,
    hint: 'Compute dollars = this.cents / 100 and rem = this.cents % 100; if rem < 10 format with a leading 0 before rem.',
    solution: `class Money then
    public ivar~Int cents = 0;

    function Money(ivar~Int cents) then
        this.cents = cents;
    end

    operator +(ivar o) then return Money(this.cents + o.cents); end
    operator -(ivar o) then return Money(this.cents - o.cents); end
    operator *(ivar factor) then return Money(this.cents * factor); end
    operator ==(ivar o) then return this.cents == o.cents; end
    operator <(ivar o) then return this.cents < o.cents; end

    function toString() then
        ivar d = this.cents / 100;
        ivar c = this.cents % 100;
        if (c < 10) then
            return ~"\${d}.0{c}";
        end
        return ~"\${d}.{c}";
    end
end
`,
    checks: [
      { label: 'Supports +, -, *, +=, ==, !=, <, >= across Money instances', type: 'krb', script: 'ivar a = Money(250);\na += Money(150);\nivar b = a * 2 - Money(95);\nif (b == Money(705) && b != a && a < b && b >= Money(705)) then pasteLn("__KRB_OK__"); end' },
      { label: 'toString() zero-pads single-digit cents ($10.05) and formats double-digit cents ($2.50)', type: 'krb', expr: '([String]Money(1005)) == "$10.05" && ([String]Money(250)) == "$2.50"' }
    ]
  },

  {
    id: 45,
    chapter: 7,
    isBoss: true,
    title: 'Combat Shielding & Vector Telemetry',
    summary: 'Boss Challenge: Unite inheritance, interfaces, operator overloading, accessors, and class method hooks.',
    body: `
      <p><strong>Boss Scenario:</strong> Build an arena combat unit system from scratch:</p>
      <ol>
        <li><code>class Vec2(x, y)</code> with <code>operator +</code>, <code>operator ==</code>, and <code>toString()</code> returning <code>~"({this.x},{this.y})"</code>.</li>
        <li><code>interface ITargetable then function hit(ivar~Int dmg); end</code>.</li>
        <li><code>class Unit as ITargetable</code> with public <code>pos</code>, protected <code>_hp</code>, getter <code>get hp</code>, <code>move(deltaVec)</code> adding <code>deltaVec</code> to <code>this.pos</code>, and <code>hit(dmg)</code> subtracting <code>dmg</code> (clamped at <code>0</code>) and returning <code>this._hp</code>.</li>
        <li>Subclass <code>Mech from Unit</code> with constructor <code>Mech(startPos, hp)</code> and <code>toString()</code> returning <code>~"Mech@{this.pos}[{this.hp}]"</code>.</li>
        <li>Attach <code>hook Mech.hit(dmg)</code> absorbing <code>10</code> flat armor damage (minimum <code>0</code>) before calling <code>orig(...)</code>.</li>
      </ol>
    `,
    starter: `~~ Vec2 value class\n\n~~ ITargetable interface\n\n~~ Unit base class & Mech subclass\n\n~~ Armor absorption hook on Mech.hit\n`,
    hint: 'Ensure Mech inherits from Unit, overrides toString(), and hook Mech.hit reduces dmg by 10 (clamped >= 0) before calling orig(reduced).',
    solution: `class Vec2 then
    public ivar~Int x = 0;
    public ivar~Int y = 0;
    function Vec2(ivar~Int x, ivar~Int y) then
        this.x = x;
        this.y = y;
    end
    operator +(ivar o) then return Vec2(this.x + o.x, this.y + o.y); end
    operator ==(ivar o) then return this.x == o.x && this.y == o.y; end
    function toString() then return ~"({this.x},{this.y})"; end
end

interface ITargetable then
    function hit(ivar~Int dmg);
end

class Unit as ITargetable then
    public ivar pos = NULL;
    protected ivar~Int _hp = 100;

    get hp then return this._hp; end

    function move(ivar deltaVec) then
        this.pos += deltaVec;
    end

    function hit(ivar~Int dmg) then
        this._hp -= dmg;
        if (this._hp < 0) then this._hp = 0; end
        return this._hp;
    end
end

class Mech from Unit then
    function Mech(ivar startPos, ivar~Int hp) then
        this.pos = startPos;
        this._hp = hp;
    end

    function toString() then
        return ~"Mech@{this.pos}[{this.hp}]";
    end
end

hook Mech.hit(ivar~Int dmg) then
    ivar reduced = dmg - 10;
    if (reduced < 0) then reduced = 0; end
    return orig(reduced);
end
`,
    checks: [
      { label: 'Mech satisfies is Mech, is Unit, and is ITargetable', type: 'krb', script: 'ivar m = Mech(Vec2(1, 2), 100);\nif ((m is Mech) && (m is Unit) && (m is ITargetable)) then pasteLn("__KRB_OK__"); end' },
      { label: 'Movement uses Vec2 operator+, armor hook absorbs 10 dmg, and toString() formats state', type: 'krb', script: 'ivar m = Mech(Vec2(2, 3), 50);\nm.move(Vec2(4, -1));\nm.hit(25);\nm.hit(5);\nif (m.pos == Vec2(6, 2) && m.hp == 35 && ([String]m) == "Mech@(6,2)[35]") then pasteLn("__KRB_OK__"); end' }
    ]
  },

  // ==========================================================================
  // CHAPTER 8: Modules & Standard Libraries (Lessons 46–50)
  // ==========================================================================
  {
    id: 46,
    chapter: 8,
    isBoss: false,
    title: 'Selective Module Unpacking (import)',
    summary: 'Import specific submodules from Std, StdE, or custom package Tables cleanly into scope.',
    body: `
      <p>Rather than writing verbose prefixes like <code>StdE.Path.extname(...)</code> everywhere, <code>import Pkg ~(Member1, Member2) alias ~;</code> binds the selected members directly in scope — and works on custom module tables too:</p>
      <pre><code class="language-kuroba">import Std ~(Math) alias ~;
import StdE ~(Path) alias ~;</code></pre>
      <p><strong>Challenge:</strong> Import <code>Math</code> from <code>Std</code> and <code>Path</code> from <code>StdE</code>. Define a constant module table <code>BillingMod</code> containing <code>tax: 15</code> and a lambda <code>roundCents(v)</code> returning <code>Math.round(v)</code>. Unpack both <code>tax</code> and <code>roundCents</code> from <code>BillingMod</code> via <code>import</code>, then compute <code>finalBill = roundCents(Math.sqrt(200) * 10) + tax + [Int](Path.extname("report.csv") == ".csv")</code> (<code>157</code>).</p>
    `,
    starter: `~~ Import Math & Path\n\n~~ Define BillingMod & unpack its members\n\n~~ Compute finalBill\n`,
    hint: 'Unpack Math from Std, Path from StdE, define iconst BillingMod = { ... };, then import BillingMod ~(tax, roundCents) alias ~;.',
    solution: `import Std ~(Math) alias ~;
import StdE ~(Path) alias ~;

iconst BillingMod = {
    tax: 15,
    roundCents: function ~(ivar v) then return Math.round(v); end
};

import BillingMod ~(tax, roundCents) alias ~;

ivar finalBill = roundCents(Math.sqrt(200) * 10) + tax + [Int](Path.extname("report.csv") == ".csv");
`,
    checks: [
      { label: 'Uses selective import ~( ... ) statements on BillingMod', type: 'code', pattern: /\bimport\s+BillingMod\s*~\s*\(/ },
      { label: 'finalBill computes 141 + 15 + 1 = 157', type: 'krb', expr: 'finalBill == 157' }
    ]
  },

  {
    id: 47,
    chapter: 8,
    isBoss: false,
    title: 'Numerical & Text Pipelines (Std.Math, Std.String)',
    summary: 'Combine Math geometry/clamping with String parsing and normalization.',
    body: `
      <p><code>Std.Math</code> provides <code>abs</code>, <code>min</code>, <code>max</code>, <code>clamp</code>, <code>floor</code>, <code>ceil</code>, <code>round</code>, <code>sqrt</code>, <code>lerp</code>, and <code>dist</code>. <code>Std.String</code> provides <code>trim</code>, <code>upper</code>, <code>lower</code>, <code>split</code>, <code>join</code>, <code>replace</code>, <code>contains</code>, <code>startsWith</code>, <code>endsWith</code>, <code>count</code>, and <code>slice</code>.</p>
      <p><strong>Challenge:</strong> Import <code>Math</code> and <code>String</code> from <code>Std</code>, and write <code>normalizeSlug(ivar rawTitle, ivar~Int maxLen)</code>:</p>
      <ol>
        <li>Trim outer whitespace, convert to lowercase, and replace spaces with hyphens <code>"-"</code>.</li>
        <li>Clamp <code>maxLen</code> into <code>[4, 32]</code> via <code>Math.clamp</code>; if the slug is longer than that limit, truncate it with <code>String.slice</code>.</li>
      </ol>
    `,
    starter: `~~ Import Math & String from Std\n\n~~ Implement normalizeSlug(rawTitle, maxLen)\n`,
    hint: 'Chain String.trim -> String.lower -> String.replace(..., " ", "-"), clamp maxLen between 4 and 32, and slice if String.count(s) > limit.',
    solution: `import Std ~(Math, String) alias ~;

function normalizeSlug(ivar rawTitle, ivar~Int maxLen) then
    ivar s = String.replace(String.lower(String.trim(rawTitle)), " ", "-");
    ivar limit = Math.clamp(maxLen, 4, 32);
    if (String.count(s) > limit) then
        s = String.slice(s, 0, limit);
    end
    return s;
end
`,
    checks: [
      { label: 'Normalizes and slices to clamped length ("tour-of-kuroba")', type: 'krb', expr: 'normalizeSlug("  Tour Of Kuroba Engine  ", 14) == "tour-of-kuroba"' },
      { label: 'Clamps tiny maxLen up to 4 and leaves short slugs intact', type: 'krb', expr: 'normalizeSlug("  Hi World  ", 1) == "hi-w" && normalizeSlug("  Kuroba  ", 20) == "kuroba"' }
    ]
  },

  {
    id: 48,
    chapter: 8,
    isBoss: false,
    title: 'File Rotation & Timestamps (Std.IO, Std.Time)',
    summary: 'Persist formatted logs to the filesystem, read them back, and clean up empty archives.',
    body: `
      <p><code>Std.IO</code> gives synchronous file persistence (<code>filePaste</code>, <code>filePasteLn</code>, <code>fileAppend</code>, <code>fileCopy</code>, <code>fileExists</code>, <code>fileKill</code>), and <code>Std.Time.format(ms)</code> formats milliseconds as <code>"MM:SS"</code>.</p>
      <p><strong>Challenge:</strong> Import <code>Time</code>, <code>IO</code>, and <code>String</code> from <code>Std</code>, and write <code>archiveEvents(ivar path, ivar events)</code> where each element of <code>events</code> is <code>{ ms, tag }</code>:</p>
      <ul>
        <li>If <code>events.count() == 0</code>, delete <code>path</code> with <code>IO.fileKill</code> and return <code>""</code>.</li>
        <li>Otherwise write entries formatted as <code>"[MM:SS] TAG"</code> (with <code>tag</code> uppercased), joined by <code>" | "</code>, to <code>path</code> and return the string read back via <code>IO.fileCopy(path)</code>.</li>
      </ul>
    `,
    starter: `~~ Import Time, IO & String from Std\n\n~~ Implement archiveEvents(path, events)\n`,
    hint: 'Handle events.count() == 0 first with IO.fileKill(path); otherwise build a list of "[MM:SS] TAG" entries, join with " | ", persist via IO.filePaste, and return IO.fileCopy(path).',
    solution: `import Std ~(Time, IO, String) alias ~;

function archiveEvents(ivar path, ivar events) then
    if (events.count() == 0) then
        IO.fileKill(path);
        return "";
    end
    ivar lines = [];
    for (ivar ev in events) then
        lines.push(~"[{Time.format(ev.ms)}] {String.upper(ev.tag)}");
    end
    IO.filePaste(path, String.join(lines, " | "));
    return IO.fileCopy(path);
end
`,
    checks: [
      { label: 'Writes formatted log entries to disk and cleans up when called with empty events', type: 'krb', script: 'ivar txt = archiveEvents("tmp_ev.log", [{ ms: 65000, tag: "boot" }, { ms: 130000, tag: "ready" }]);\nivar existed = IO.fileExists("tmp_ev.log");\nivar cleared = archiveEvents("tmp_ev.log", []);\nivar gone = !IO.fileExists("tmp_ev.log");\nif (existed && txt == "[01:05] BOOT | [02:10] READY" && cleared == "" && gone) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 49,
    chapter: 8,
    isBoss: false,
    title: 'Seeded ProcGen & JSON Persistence (StdE)',
    summary: 'Generate reproducible loot tables with Random.seed and round-trip state through Json.',
    body: `
      <p><code>StdE.Random</code> decouples deterministic game randomness from <code>Math</code>, while <code>StdE.Json</code> parses, validates, formats, and persists structured data:</p>
      <pre><code class="language-kuroba">import StdE ~(Random, Json) alias ~;
Random.seed(99);
Json.isValid("{\"ok\":true}"); ~~ TRUE</code></pre>
      <p><strong>Challenge:</strong> Import <code>Random</code> and <code>Json</code> from <code>StdE</code>, and write <code>loadOrGenerateLoot(ivar rawJson, ivar seedVal)</code>:</p>
      <ul>
        <li>If <code>rawJson</code> is non-null and valid JSON (<code>Json.isValid</code>), return <code>Json.parse(rawJson)</code>.</li>
        <li>Otherwise seed the PRNG with <code>seedVal</code>, shuffle <code>["Ruby", "Sapphire", "Emerald", "Topaz"]</code> in place, roll <code>gold = Random.int(50, 150)</code>, and return <code>Json.stringify({ gold: gold, firstGem: deck[0] })</code>.</li>
      </ul>
    `,
    starter: `~~ Import Random & Json from StdE\n\n~~ Implement loadOrGenerateLoot(rawJson, seedVal)\n`,
    hint: 'Test !(rawJson is NULL) && Json.isValid(rawJson) first; otherwise seed, shuffle the 4-gem list, roll gold, and stringify.',
    solution: `import StdE ~(Random, Json) alias ~;

function loadOrGenerateLoot(ivar rawJson, ivar seedVal) then
    if (!(rawJson is NULL) && Json.isValid(rawJson)) then
        return Json.parse(rawJson);
    end
    Random.seed(seedVal);
    ivar deck = ["Ruby", "Sapphire", "Emerald", "Topaz"];
    Random.shuffle(deck);
    ivar gold = Random.int(50, 150);
    return Json.stringify({ gold: gold, firstGem: deck[0] });
end
`,
    checks: [
      { label: 'Parses valid JSON into a Table and falls back on invalid/NULL JSON', type: 'krb', script: 'ivar validRaw = Json.stringify({ gold: 999, firstGem: "Diamond" });\nivar parsed = loadOrGenerateLoot(validRaw, 1);\nivar genA = loadOrGenerateLoot("{broken_json", 77);\nivar genB = loadOrGenerateLoot(NULL, 77);\nivar back = Json.parse(genA);\nif ((parsed is Table) && parsed.gold == 999 && (genA is String) && genA == genB && back.gold >= 50 && back.gold <= 150) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 50,
    chapter: 8,
    isBoss: true,
    title: 'Grand Finale: The Raven\'s Dungeon Engine',
    summary: 'Final Boss (50/50): Architect a complete saveable RPG inventory engine from specification!',
    body: `
      <p><strong>Final Boss Specification:</strong> Combine OOP, operator overloading, sealed security, exceptions, and standard libraries into a working save engine:</p>
      <ol>
        <li>Declare sealed global <code>lastVaultDigest = "NONE"</code> and import <code>Path</code> and <code>Json</code> from <code>StdE</code>.</li>
        <li><strong>Value Class <code>Shard(element, power)</code></strong>:
          <ul>
            <li>Typed fields <code>element</code> (<code>String</code>) and <code>power</code> (<code>Int</code>).</li>
            <li><code>operator +</code>: same-element fusion adds a <strong>+10 synergy bonus</strong> (<code>Shard(this.element, this.power + other.power + 10)</code>); distinct elements combine as <code>Shard(~"{this.element}/{other.element}", this.power + other.power)</code>.</li>
            <li><code>operator ==</code> comparing both fields, and <code>toString()</code> returning <code>~"{this.element}:{this.power}"</code>.</li>
          </ul>
        </li>
        <li><strong>Vault Export <code>exportVault(rawPath, shards, bonusFn = 0)</code></strong>:
          <ul>
            <li>If <code>shards</code> is empty, throw <code>"Empty vault"</code>.</li>
            <li>Fuse all shards left-to-right with <code>+</code>, then add <code>bonusFn()</code> (accepting either a number or a 0-arg function via <code>~Function</code>!) to <code>fused.power</code>.</li>
            <li>Extract the filename via <code>Path.basename(rawPath)</code>, store <code>[String]fused</code> into <code>lastVaultDigest</code> (re-sealed!), persist <code>{ core: lastVaultDigest, power: fused.power }</code> with <code>Json.write</code>, and return <code>Json.read(fileName)</code>.</li>
          </ul>
        </li>
      </ol>
    `,
    starter: `~~ Imports & sealed lastVaultDigest\n\n~~ Shard value class\n\n~~ exportVault(rawPath, shards, bonusFn = 0)\n`,
    hint: 'Start fused = shards[0] and loop 1..shards.count()-1 doing fused = fused + shards[i]. Annotate bonusFn as ivar~Function bonusFn = 0 so bonusFn() works uniformly, and unlock lastVaultDigest before writing.',
    solution: `import StdE ~(Path, Json) alias ~;

isealed lastVaultDigest = "NONE";

class Shard then
    public ivar~String element = "";
    public ivar~Int power = 0;

    function Shard(ivar~String element, ivar~Int power) then
        this.element = element;
        this.power = power;
    end

    operator +(ivar other) then
        if (this.element == other.element) then
            return Shard(this.element, this.power + other.power + 10);
        end
        return Shard(~"{this.element}/{other.element}", this.power + other.power);
    end

    operator ==(ivar other) then
        return this.element == other.element && this.power == other.power;
    end

    function toString() then
        return ~"{this.element}:{this.power}";
    end
end

function exportVault(ivar rawPath, ivar shards, ivar~Function bonusFn = 0) then
    if (shards.count() == 0) then
        throw "Empty vault";
    end
    ivar fused = shards[0];
    for (ivar i = 1; i < shards.count(); i++) then
        fused = fused + shards[i];
    end
    fused.power += bonusFn();

    ivar fileName = Path.basename(rawPath);
    unlock lastVaultDigest;
    lastVaultDigest = [String]fused;
    Json.write(fileName, { core: lastVaultDigest, power: fused.power }, 2);
    return Json.read(fileName);
end
`,
    checks: [
      { label: 'Shard operator+ grants +10 same-element synergy and combines distinct elements', type: 'krb', expr: '(Shard("Fire", 20) + Shard("Fire", 15)) == Shard("Fire", 45) && (Shard("Fire", 45) + Shard("Ice", 10)) == Shard("Fire/Ice", 55)' },
      { label: 'exportVault throws "Empty vault" when given an empty list', type: 'krb', script: 'ivar msg = "";\ntry exportVault("/saves/a.json", []); catch (ivar e) then msg = e.eContext; end\nif (msg == "Empty vault") then pasteLn("__KRB_OK__"); end' },
      { label: 'Persists JSON, coerces bonusFn, and re-seals lastVaultDigest', type: 'krb', script: 'ivar saved = exportVault("/var/tmp/vault_final.json", [Shard("Void", 20), Shard("Void", 30), Shard("Star", 15)], 5);\nStd.IO.fileKill("vault_final.json");\nif ((saved is Table) && saved.power == 80 && saved.core == "Void/Star:80" && lastVaultDigest == "Void/Star:80" && (lastVaultDigest is lock)) then pasteLn("__KRB_OK__"); end' }
    ]
  }
];
