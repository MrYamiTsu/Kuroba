/* ============================================================================
   Kuroba Interactive Learning Manual — Part 1 (Chapters 1–4, Lessons 1–26)
   Clean Comment-Only Starters + Problem-Solving Challenges
   ============================================================================ */

window.KUROBA_CHAPTERS = [
  { id: 1, title: 'Variables, Constants & Sealing', shortTitle: '01 • Variables & Sealing' },
  { id: 2, title: 'Type System & Runtime Contracts', shortTitle: '02 • Types & Contracts' },
  { id: 3, title: 'Operators & Control Flow', shortTitle: '03 • Control Flow' },
  { id: 4, title: 'Collections & Nested Mutations', shortTitle: '04 • Collections' },
  { id: 5, title: 'Exceptions & Fault Tolerance', shortTitle: '05 • Exceptions' },
  { id: 6, title: 'Functions, Closures & Hooks', shortTitle: '06 • Functions & Hooks' },
  { id: 7, title: 'Object-Oriented Programming', shortTitle: '07 • Classes & OOP' },
  { id: 8, title: 'Modules & Standard Libraries', shortTitle: '08 • Modules & Std/StdE' }
];

window.KUROBA_LESSONS_PART1 = [
  // ==========================================================================
  // CHAPTER 1: Variables, Constants & Sealing (Lessons 1–7)
  // ==========================================================================
  {
    id: 1,
    chapter: 1,
    isBoss: false,
    title: 'Console Output & Feather Comments',
    summary: 'Control line breaks between paste and pasteLn, and document code with ~~ comments.',
    body: `
      <p>Every statement in Kuroba ends with <code>;</code>. Two built-in statements write to standard output:</p>
      <ul>
        <li><code>paste(val)</code> outputs without adding a line break, so the next print continues on the same line.</li>
        <li><code>pasteLn(val)</code> outputs and finishes the line with a newline.</li>
      </ul>
      <p>Single-line comments start with <code>~~</code>, and multi-line block comments use <code>~~{{ ... }}</code>:</p>
      <pre><code class="language-kuroba">~~ Build one line from two calls:
paste("Mode: ");
pasteLn("Turbo"); ~~ Outputs "Mode: Turbo"</code></pre>
      <p><strong>Challenge:</strong> Write a script that outputs <strong>two exact lines</strong>:</p>
      <pre><code>Booting: OK
Core Online</code></pre>
      <p><em>Constraint:</em> Assemble the first line using both <code>paste(...)</code> and <code>pasteLn(...)</code>.</p>
    `,
    starter: `~~ Line 1: assemble "Booting: OK" using paste and pasteLn\n\n~~ Line 2: output "Core Online"\n`,
    hint: 'Print "Booting: " without a newline, then finish that line with "OK", then print "Core Online" on its own line.',
    solution: `~~ Line 1: assemble "Booting: OK" using paste and pasteLn
paste("Booting: ");
pasteLn("OK");

~~ Line 2: output "Core Online"
pasteLn("Core Online");
`,
    checks: [
      { label: 'Combines paste(...) and pasteLn(...) in your script', type: 'code', pattern: /\bpaste\s*\([\s\S]*\bpasteLn\s*\(|\bpasteLn\s*\([\s\S]*\bpaste\s*\(/ },
      { label: 'Console output matches the two-line boot banner', type: 'stdout', exact: 'Booting: OK\nCore Online' }
    ]
  },

  {
    id: 2,
    chapter: 1,
    isBoss: false,
    title: 'Feather String Interpolation',
    summary: 'Format computed expressions directly inside strings without manual concatenation.',
    body: `
      <p>Prefixing a string literal with <code>~</code> turns it into an interpolated template where any expression inside <code>{...}</code> is evaluated inline:</p>
      <pre><code class="language-kuroba">ivar item = "Potion";
ivar qty = 3;
ivar unitCost = 25;
pasteLn(~"{qty}x {item} = {qty * unitCost}g");
~~ 3x Potion = 75g</code></pre>
      <p><strong>Challenge:</strong> Declare <code>pilot = "Raven"</code>, <code>sector = 9</code>, <code>baseFuel = 90</code>, and <code>reserveFuel = 45</code>. Using string interpolation, build a variable named <code>beacon</code> displaying the pilot, sector, and combined fuel percentage:</p>
      <pre><code>[Sector 9] Raven - Fuel: 135%</code></pre>
      <p>Print <code>beacon</code> to the console.</p>
    `,
    starter: `~~ Mission data (pilot, sector, baseFuel, reserveFuel)\n\n~~ Format beacon with string interpolation and print it\n`,
    hint: 'You can evaluate arithmetic directly inside {...} inside a ~"..." string literal.',
    solution: `ivar pilot = "Raven";
ivar sector = 9;
ivar baseFuel = 90;
ivar reserveFuel = 45;

ivar beacon = ~"[Sector {sector}] {pilot} - Fuel: {baseFuel + reserveFuel}%";
pasteLn(beacon);
`,
    checks: [
      { label: 'Uses feather string interpolation', type: 'code', pattern: /~"/ },
      { label: 'Computes the fuel sum dynamically inside beacon', type: 'krb', expr: 'beacon == "[Sector 9] Raven - Fuel: 135%"' },
      { label: 'Outputs the formatted beacon line', type: 'stdout', exact: '[Sector 9] Raven - Fuel: 135%' }
    ]
  },

  {
    id: 3,
    chapter: 1,
    isBoss: false,
    title: 'Mutability vs. Immutability',
    summary: 'Choose the right binding keyword for values that evolve versus invariants that must never change.',
    body: `
      <p>Kuroba separates mutable state from fixed invariants:</p>
      <pre><code class="language-kuroba">ivar hp = 100;       ~~ Mutable: can be reassigned
iconst MAX_HP = 100; ~~ Constant: locked forever</code></pre>
      <p>Attempting to modify an <code>iconst</code> binding triggers an immediate runtime <code>[TypeError]</code>.</p>
      <p><strong>Challenge:</strong> Write a small physics snippet satisfying these rules:</p>
      <ul>
        <li><code>GRAVITY</code> must be an immutable constant equal to <code>10</code>.</li>
        <li><code>velocity</code> must be a mutable variable starting at <code>25</code>, then increased by <strong>twice</strong> <code>GRAVITY</code> (reaching <code>45</code>).</li>
      </ul>
    `,
    starter: `~~ Immutable constant\n\n~~ Mutable velocity & physics update\n`,
    hint: 'Declare GRAVITY with iconst and velocity with ivar, then update velocity by adding GRAVITY * 2.',
    solution: `iconst GRAVITY = 10;
ivar velocity = 25;

velocity = velocity + GRAVITY * 2;
pasteLn(velocity);
`,
    checks: [
      { label: 'GRAVITY is locked as a constant with value 10', type: 'krb', expr: '(GRAVITY is lock) && GRAVITY == 10' },
      { label: 'velocity is mutable and reaches 45', type: 'krb', expr: '(velocity is unlock) && velocity == 45' }
    ]
  },

  {
    id: 4,
    chapter: 1,
    isBoss: false,
    title: 'Parallel & Broadcast Declarations',
    summary: 'Condense verbose variable setups into multi-target declarations and value broadcasts.',
    body: `
      <p>Multiple identifiers on a single declaration can either receive matching comma-separated values, or share a single broadcast expression:</p>
      <pre><code class="language-kuroba">ivar min, max = 1, 99;       ~~ Distinct values
ivar north, south, east = 0; ~~ Broadcasts 0 to all three</code></pre>
      <p><strong>Challenge:</strong> Using <strong>at most 2 declaration statements total</strong> (one <code>ivar</code> and one <code>iconst</code>), declare:</p>
      <ul>
        <li>Mutable <code>cols</code> (<code>80</code>) and <code>rows</code> (<code>24</code>).</li>
        <li>Immutable constants <code>BORDER_TOP</code>, <code>BORDER_BOTTOM</code>, and <code>BORDER_SIDE</code> all equal to <code>1</code>.</li>
      </ul>
    `,
    starter: `~~ Mutable dimensions (single declaration)\n\n~~ Immutable border constants (single broadcast declaration)\n`,
    hint: 'Group the two mutable dimensions into one ivar statement, and broadcast 1 across the three iconst border constants in a second statement.',
    solution: `ivar cols, rows = 80, 24;
iconst BORDER_TOP, BORDER_BOTTOM, BORDER_SIDE = 1;
`,
    checks: [
      { label: 'Uses at most one ivar keyword and one iconst keyword', type: 'code', negate: true, pattern: /\bivar\b[\s\S]*\bivar\b|\biconst\b[\s\S]*\biconst\b/, failMsg: 'Use a single ivar line and a single iconst line.' },
      { label: 'cols == 80 and rows == 24 remain mutable', type: 'krb', expr: 'cols == 80 && rows == 24 && (cols is unlock) && (rows is unlock)' },
      { label: 'All three border constants equal 1 and are locked', type: 'krb', expr: 'BORDER_TOP == 1 && BORDER_BOTTOM == 1 && BORDER_SIDE == 1 && (BORDER_TOP is lock) && (BORDER_SIDE is lock)' }
    ]
  },

  {
    id: 5,
    chapter: 1,
    isBoss: false,
    title: 'Sealed State & One-Shot Unlocking',
    summary: 'Mutate guarded state safely through explicit unlock windows and manual re-locking.',
    body: `
      <p>An <code>isealed</code> variable rejects writes until you authorize a single mutation with <code>unlock</code>. As soon as one assignment happens, it <strong>automatically re-seals</strong>:</p>
      <pre><code class="language-kuroba">isealed stage = 1;
unlock stage;
stage = 2;    ~~ Succeeds, and 'stage' is immediately sealed again!

unlock stage;
lock stage;   ~~ Cancels an unlock manually without writing</code></pre>
      <p><strong>Challenge:</strong> Implement a key rotation sequence:</p>
      <ul>
        <li>Declare sealed <code>accessCode = 100</code> and sealed <code>backupCode = 777</code>.</li>
        <li>Rotate <code>accessCode</code> twice: first to <code>200</code>, then to <code>950</code>, ensuring it ends sealed.</li>
        <li>Unlock <code>backupCode</code>, then cancel the unlock manually without modifying its value so it stays <code>777</code> and locked.</li>
      </ul>
    `,
    starter: `~~ Sealed declarations (accessCode, backupCode)\n\n~~ Two-step rotation of accessCode\n\n~~ Unlock then manually re-lock backupCode\n`,
    hint: 'Remember that auto-reseal triggers after the first assignment to accessCode, so a second write needs its own unlock. Use lock to cancel an unused unlock.',
    solution: `isealed accessCode = 100;
isealed backupCode = 777;

unlock accessCode;
accessCode = 200;
unlock accessCode;
accessCode = 950;

unlock backupCode;
lock backupCode;
`,
    checks: [
      { label: 'Uses unlock and manual lock', type: 'code', pattern: /\bunlock\b[\s\S]*\block\b/ },
      { label: 'accessCode reaches 950 and ends sealed', type: 'krb', expr: 'accessCode == 950 && (accessCode is lock)' },
      { label: 'backupCode is still 777 and ends sealed', type: 'krb', expr: 'backupCode == 777 && (backupCode is lock)' }
    ]
  },

  {
    id: 6,
    chapter: 1,
    isBoss: false,
    title: 'Atomic Swaps & Scope Hygiene',
    summary: 'Rotate three variables using in-place swaps and purge sensitive temporary credentials from memory.',
    body: `
      <p>The native swap operator <code>&lt;-&gt;</code> exchanges two targets atomically without allocating a temporary variable, while <code>kill</code> removes a mutable variable from scope completely:</p>
      <pre><code class="language-kuroba">ivar x = 1;
ivar y = 2;
x &lt;-&gt; y;

ivar otp = "9912";
kill otp; ~~ Referencing 'otp' afterwards raises ReferenceError</code></pre>
      <p><strong>Challenge:</strong> Start by declaring <code>gold = "BronzeRunner"</code>, <code>silver = "GoldRunner"</code>, <code>bronze = "SilverRunner"</code>, and <code>leakedSession = "SESSION_SECRET_99"</code>. Then, using <strong>only <code>&lt;-&gt;</code> swaps</strong> (no <code>=</code> reassignments after declaration!), put each runner into their matching variable and destroy <code>leakedSession</code> from scope.</p>
    `,
    starter: `~~ Initial podium declarations & leakedSession\n\n~~ Rotate podium using only <-> swaps\n\n~~ Purge leakedSession from scope\n`,
    hint: 'Two swaps are enough to rotate a 3-cycle! Try swapping gold with silver first, then look at what silver and bronze hold.',
    solution: `ivar gold = "BronzeRunner";
ivar silver = "GoldRunner";
ivar bronze = "SilverRunner";
ivar leakedSession = "SESSION_SECRET_99";

gold <-> silver;
silver <-> bronze;
kill leakedSession;
`,
    checks: [
      { label: 'Uses <-> swaps to rotate the podium', type: 'code', pattern: /<->[\s\S]*<->/ },
      { label: 'No = reassignments after the initial ivar declarations', type: 'code', negate: true, pattern: /(?:^|;|\n)\s*(?:gold|silver|bronze)\s*=/m, failMsg: 'Use <-> swaps instead of = reassignments.' },
      { label: 'gold, silver, and bronze hold their matching runners', type: 'krb', expr: 'gold == "GoldRunner" && silver == "SilverRunner" && bronze == "BronzeRunner"' },
      { label: 'leakedSession has been purged from memory', type: 'krb', script: 'ivar alive = TRUE;\ntry ivar v = leakedSession; catch (ivar e) then alive = FALSE; end\nif (!alive) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 7,
    chapter: 1,
    isBoss: true,
    title: 'Airlock Handshake Protocol',
    summary: 'Boss Challenge: Orchestrate constants, sealed airlock state, credential destruction, and telemetry formatting.',
    body: `
      <p><strong>Boss Scenario:</strong> Write the docking sequence for orbital station <code>STATION_ID</code> (an immutable constant equal to <code>"ORB-4"</code>):</p>
      <ul>
        <li>Declare two inverted clamps: <code>innerClamp = "DEPRESSURIZED"</code> and <code>outerClamp = "PRESSURIZED"</code>, then swap their states in place.</li>
        <li>Declare sealed <code>airlockLog = "IDLE"</code>.</li>
        <li>Compute a temporary mutable variable <code>handshakeKey = 320 + 84</code>, use it to update <code>airlockLog</code> to <code>"ORB-4|PRESSURIZED|404"</code> via interpolation, and <strong>destroy</strong> <code>handshakeKey</code> from memory afterward.</li>
        <li>Print <code>airlockLog</code> to the console.</li>
      </ul>
    `,
    starter: `~~ Station constant & initial airlock variables\n\n~~ Swap clamps & compute temporary handshakeKey\n\n~~ Update sealed airlockLog, purge key, and print log\n`,
    hint: 'Declare STATION_ID as iconst, swap the clamps with <->, unlock airlockLog before writing the interpolated string, kill handshakeKey, and pasteLn(airlockLog).',
    solution: `iconst STATION_ID = "ORB-4";
ivar innerClamp = "DEPRESSURIZED";
ivar outerClamp = "PRESSURIZED";
isealed airlockLog = "IDLE";

innerClamp <-> outerClamp;
ivar handshakeKey = 320 + 84;
unlock airlockLog;
airlockLog = ~"{STATION_ID}|{innerClamp}|{handshakeKey}";
kill handshakeKey;
pasteLn(airlockLog);
`,
    checks: [
      { label: 'STATION_ID is an immutable constant equal to "ORB-4"', type: 'krb', expr: '(STATION_ID is lock) && STATION_ID == "ORB-4"' },
      { label: 'Clamps were swapped in place', type: 'krb', expr: 'innerClamp == "PRESSURIZED" && outerClamp == "DEPRESSURIZED"' },
      { label: 'airlockLog is re-sealed with the formatted handshake string', type: 'krb', expr: 'airlockLog == "ORB-4|PRESSURIZED|404" && (airlockLog is lock)' },
      { label: 'Temporary handshakeKey was destroyed', type: 'krb', script: 'ivar gone = FALSE;\ntry ivar x = handshakeKey; catch (ivar e) then gone = TRUE; end\nif (gone) then pasteLn("__KRB_OK__"); end' },
      { label: 'Console prints "ORB-4|PRESSURIZED|404"', type: 'stdout', exact: 'ORB-4|PRESSURIZED|404' }
    ]
  },

  // ==========================================================================
  // CHAPTER 2: Type System & Runtime Contracts (Lessons 8–13)
  // ==========================================================================
  {
    id: 8,
    chapter: 2,
    isBoss: false,
    title: 'Contract Typing & Automatic Coercion',
    summary: 'Turn messy string/number inputs into strongly-typed variables that enforce their type across reassignments.',
    body: `
      <p>Attaching <code>~Type</code> (<code>Int</code>, <code>Float</code>, <code>String</code>, <code>Bool</code>) to a variable converts incoming values automatically and keeps that contract active on every future assignment:</p>
      <pre><code class="language-kuroba">ivar~Int retries = "3";    ~~ Stored as Int 3
retries = 4.9;             ~~ Truncated to Int 4
ivar~Bool online = "TRUE"; ~~ Stored as Bool TRUE</code></pre>
      <p><strong>Challenge:</strong> Start with raw config values <code>rawPlayers = "12"</code>, <code>rawTick = "62.5"</code>, and <code>rawRanked = 1</code>. Declare typed contract variables <code>maxPlayers</code> (<code>Int</code>), <code>tickRate</code> (<code>Float</code>), and <code>rankedMode</code> (<code>Bool</code>) initialized from those raw inputs, then increase <code>maxPlayers</code> by <code>4</code>.</p>
    `,
    starter: `~~ Raw config inputs\n\n~~ Coerced contract variables & update\n`,
    hint: 'Attach ~Int, ~Float, and ~Bool when declaring maxPlayers, tickRate, and rankedMode from the raw variables.',
    solution: `ivar rawPlayers = "12";
ivar rawTick = "62.5";
ivar rawRanked = 1;

ivar~Int maxPlayers = rawPlayers;
ivar~Float tickRate = rawTick;
ivar~Bool rankedMode = rawRanked;
maxPlayers += 4;
`,
    checks: [
      { label: 'maxPlayers enforces an Int contract on future reassignments', type: 'krb', script: 'maxPlayers = "20";\nif ((maxPlayers is Int) && maxPlayers == 20) then maxPlayers = 16; pasteLn("__KRB_OK__"); end', failMsg: 'maxPlayers must enforce ~Int.' },
      { label: 'maxPlayers equals 16', type: 'krb', expr: '(maxPlayers is Int) && maxPlayers == 16' },
      { label: 'tickRate is Float 62.5 and rankedMode is Bool TRUE', type: 'krb', expr: '(tickRate is Float) && tickRate == 62.5 && (rankedMode is Bool) && rankedMode == TRUE' }
    ]
  },

  {
    id: 9,
    chapter: 2,
    isBoss: false,
    title: 'Strict Non-Nullable Contracts',
    summary: 'Harden critical variables so NULL is rejected at runtime instead of propagating silently.',
    body: `
      <p>A normal typed variable like <code>ivar~String host</code> still permits <code>NULL</code>. Wrapping the type in parentheses <code>~(Type)</code> enforces a <strong>strict non-nullable contract</strong>:</p>
      <pre><code class="language-kuroba">ivar~String optionalTag = NULL;  ~~ OK (nullable)
ivar~(String) primaryHost = "db.local";
~~ primaryHost = NULL;           ~~ [TypeError]!</code></pre>
      <p><strong>Challenge:</strong> Declare a database configuration with:</p>
      <ul>
        <li>Non-nullable <code>dbHost</code> equal to <code>"127.0.0.1"</code>.</li>
        <li>Non-nullable <code>dbPort</code> coerced from <code>"5432"</code> into an <code>Int</code>.</li>
        <li>Nullable <code>String</code> variable <code>dbPassword</code> initialized to <code>NULL</code>.</li>
      </ul>
    `,
    starter: `~~ Non-nullable dbHost & dbPort\n\n~~ Nullable dbPassword\n`,
    hint: 'Use ~(String) and ~(Int) for the two required parameters, and nullable ~String for dbPassword.',
    solution: `ivar~(String) dbHost = "127.0.0.1";
ivar~(Int) dbPort = "5432";
ivar~String dbPassword = NULL;
`,
    checks: [
      { label: 'dbHost == "127.0.0.1", dbPort == 5432 (Int), and dbPassword is NULL', type: 'krb', expr: 'dbHost == "127.0.0.1" && (dbPort is Int) && dbPort == 5432 && (dbPassword is NULL)' },
      { label: 'Both dbHost and dbPort reject NULL assignments at runtime', type: 'krb', script: 'ivar b1 = FALSE;\nivar b2 = FALSE;\ntry dbHost = NULL; catch (ivar e) then b1 = TRUE; end\ntry dbPort = NULL; catch (ivar e) then b2 = TRUE; end\nif (b1 && b2) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 10,
    chapter: 2,
    isBoss: false,
    title: 'On-the-Fly Prefix Casting',
    summary: 'Convert operands inside arithmetic expressions without altering the original variables.',
    body: `
      <p>In Kuroba, if either side of <code>+</code> is a <code>String</code>, <code>+</code> performs string concatenation (<code>"10" + 5</code> &rarr; <code>"105"</code>). To compute numerically without mutating the source variables, cast individual expressions with <code>[Type]</code>:</p>
      <pre><code class="language-kuroba">ivar a = "8";
ivar b = "2.5";
ivar prod = [Int]a * [Float]b; ~~ 20.0 (a is still "8")</code></pre>
      <p><strong>Challenge:</strong> Declare three <code>String</code> variables: <code>subtotal = "250"</code>, <code>shipping = "50"</code>, and <code>discount = "12.5"</code>. Using prefix casts inside the expression, compute <code>grandTotal</code> as <code>subtotal + shipping - discount</code> (<code>Float</code> <code>287.5</code>) while keeping all three source variables as <code>String</code>s.</p>
    `,
    starter: `~~ Raw string amounts (subtotal, shipping, discount)\n\n~~ Compute numeric grandTotal with prefix casts\n`,
    hint: 'Cast each String variable inside the expression to Float before adding and subtracting.',
    solution: `ivar subtotal = "250";
ivar shipping = "50";
ivar discount = "12.5";

ivar grandTotal = [Float]subtotal + [Float]shipping - [Float]discount;
pasteLn(grandTotal);
`,
    checks: [
      { label: 'subtotal, shipping, and discount remain untouched Strings', type: 'krb', expr: '(subtotal is String) && (shipping is String) && (discount is String)' },
      { label: 'grandTotal is Float 287.5', type: 'krb', expr: '(grandTotal is Float) && grandTotal == 287.5' }
    ]
  },

  {
    id: 11,
    chapter: 2,
    isBoss: false,
    title: 'In-Place Dynamic Retyping',
    summary: 'Migrate a live variable from one enforced type contract to another mid-flight.',
    body: `
      <p>What if a variable starts life as a numeric code, and later needs to become a formatted label? Prefixing the assignment target itself changes the variable's contract in place:</p>
      <pre><code class="language-kuroba">ivar~Int slot = 1;
[String]slot = "ARCHIVED"; ~~ 'slot' now enforces ~String!</code></pre>
      <p><strong>Challenge:</strong> Declare <code>signal</code> with an <code>Int</code> contract initialized to <code>404</code>. Double its numeric value (<code>808</code>), then transition <code>signal</code> in place so its contract becomes <code>String</code> holding <code>"ERR-808"</code>.</p>
    `,
    starter: `~~ Initial numeric signal\n\n~~ Double signal, then retype in place to String\n`,
    hint: 'Double signal first, then prefix the assignment target with [String] so signal switches from ~Int to ~String.',
    solution: `ivar~Int signal = 404;
signal *= 2;
[String]signal = ~"ERR-{signal}";
`,
    checks: [
      { label: 'signal is now String "ERR-808"', type: 'krb', expr: '(signal is String) && signal == "ERR-808"' },
      { label: 'signal now enforces a String contract on subsequent assignments', type: 'krb', script: 'signal = 123;\nif ((signal is String) && signal == "123") then signal = "ERR-808"; pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 12,
    chapter: 2,
    isBoss: false,
    title: 'Runtime Introspection with is',
    summary: 'Inspect runtime types, nullity, and variable lock states without crashing.',
    body: `
      <p>The <code>is</code> operator tests a value's runtime type or a variable's lock state, returning <code>TRUE</code> or <code>FALSE</code>:</p>
      <pre><code class="language-kuroba">pasteLn(3.14 is Float);    ~~ TRUE
pasteLn(NULL is NULL);     ~~ TRUE
pasteLn(MY_CONST is lock); ~~ TRUE</code></pre>
      <p><strong>Challenge:</strong> Declare <code>latency = 14.2</code>, <code>fallbackIp = NULL</code>, sealed <code>API_SECRET = "k9-secret"</code>, and mutable <code>tempBuffer = 0</code>. Then compute a boolean <code>auditPassed</code> using <code>is</code> checks verifying all four conditions at once: <code>latency</code> is a <code>Float</code>, <code>fallbackIp</code> is <code>NULL</code>, <code>API_SECRET</code> is locked, and <code>tempBuffer</code> is unlocked.</p>
    `,
    starter: `~~ Bindings to audit (latency, fallbackIp, API_SECRET, tempBuffer)\n\n~~ Compute auditPassed using runtime 'is' checks\n`,
    hint: 'Combine the four is expressions (is Float, is NULL, is lock, is unlock) with &&.',
    solution: `ivar latency = 14.2;
ivar fallbackIp = NULL;
isealed API_SECRET = "k9-secret";
ivar tempBuffer = 0;

ivar auditPassed = (latency is Float) && (fallbackIp is NULL) && (API_SECRET is lock) && (tempBuffer is unlock);
`,
    checks: [
      { label: 'Uses is Float, is NULL, is lock, and is unlock', type: 'code', pattern: /\bis\s+Float\b[\s\S]*\bis\s+NULL\b[\s\S]*\bis\s+lock\b[\s\S]*\bis\s+unlock\b/ },
      { label: 'API_SECRET is locked and auditPassed is TRUE', type: 'krb', expr: '(API_SECRET is lock) && auditPassed == TRUE' }
    ]
  },

  {
    id: 13,
    chapter: 2,
    isBoss: true,
    title: 'Flight Blackbox Validator',
    summary: 'Boss Challenge: Coerce raw telemetry, enforce non-null safety, retype status codes, and seal the blackbox.',
    body: `
      <p><strong>Boss Scenario:</strong> Process raw aircraft telemetry from scratch:</p>
      <ul>
        <li>Start from raw strings <code>rawFlight = "KR-77"</code>, <code>rawAlt = "10400"</code>, <code>rawClimb = "250.5"</code>.</li>
        <li>Create a strict <strong>non-nullable</strong> string <code>flightCode</code> from <code>rawFlight</code>.</li>
        <li>Compute a typed <code>Float</code> variable <code>targetAltitude</code> equal to the numeric sum of <code>rawAlt</code> and <code>rawClimb</code> (<code>10650.5</code>).</li>
        <li>Start <code>statusReg</code> as a typed <code>Int</code> equal to <code>1</code>; when <code>targetAltitude &gt; 10000</code>, retype <code>statusReg</code> in place into a <code>String</code> holding <code>"CRUISE"</code>.</li>
        <li>Declare sealed <code>blackboxSeal = "EMPTY"</code>, update it to <code>"KR-77@10650.5:CRUISE"</code> (ending sealed), and print it.</li>
      </ul>
    `,
    starter: `~~ Raw telemetry inputs\n\n~~ Non-nullable flightCode & Float targetAltitude\n\n~~ Retype statusReg & update sealed blackboxSeal\n`,
    hint: 'Enforce ~(String) on flightCode, cast rawAlt and rawClimb to Float, retype statusReg with [String], and unlock blackboxSeal before writing.',
    solution: `ivar rawFlight = "KR-77";
ivar rawAlt = "10400";
ivar rawClimb = "250.5";
ivar~Int statusReg = 1;
isealed blackboxSeal = "EMPTY";

ivar~(String) flightCode = rawFlight;
ivar~Float targetAltitude = [Float]rawAlt + [Float]rawClimb;
if (targetAltitude > 10000) then
    [String]statusReg = "CRUISE";
end

unlock blackboxSeal;
blackboxSeal = ~"{flightCode}@{targetAltitude}:{statusReg}";
pasteLn(blackboxSeal);
`,
    checks: [
      { label: 'flightCode is non-nullable and equals "KR-77"', type: 'krb', script: 'ivar ok = (flightCode == "KR-77");\ntry flightCode = NULL; ok = FALSE; catch (ivar e) then end\nif (ok) then pasteLn("__KRB_OK__"); end' },
      { label: 'targetAltitude is Float 10650.5 and statusReg was retyped to String "CRUISE"', type: 'krb', expr: '(targetAltitude is Float) && targetAltitude == 10650.5 && (statusReg is String) && statusReg == "CRUISE"' },
      { label: 'blackboxSeal equals "KR-77@10650.5:CRUISE" and is locked', type: 'krb', expr: 'blackboxSeal == "KR-77@10650.5:CRUISE" && (blackboxSeal is lock)' },
      { label: 'Prints the sealed blackbox summary', type: 'stdout', exact: 'KR-77@10650.5:CRUISE' }
    ]
  },

  // ==========================================================================
  // CHAPTER 3: Operators & Control Flow (Lessons 14–20)
  // ==========================================================================
  {
    id: 14,
    chapter: 3,
    isBoss: false,
    title: 'Clock Arithmetic & Compound Operators',
    summary: 'Use integer division, modulo %, and compound updates to convert raw seconds into clock parts.',
    body: `
      <p>Integer division <code>/</code> between two <code>Int</code>s truncates toward zero, and <code>%</code> yields the remainder. Compound operators (<code>+=</code>, <code>-=</code>, <code>*=</code>, <code>/=</code>, <code>%=</code>) and <code>++</code> / <code>--</code> mutate variables concisely:</p>
      <pre><code class="language-kuroba">ivar total = 130;
ivar dozens = total / 12;   ~~ 10
ivar leftover = total % 12; ~~ 10</code></pre>
      <p><strong>Challenge:</strong> Initialize <code>totalSeconds = 3665</code>, add a <code>62</code>-second penalty, subtract <code>1</code> bonus second (reaching <code>3726</code>), then decompose <code>totalSeconds</code> into integer variables <code>hours</code>, <code>minutes</code> (<code>0..59</code>), and <code>seconds</code> (<code>0..59</code>).</p>
    `,
    starter: `~~ Initial totalSeconds & compound adjustments\n\n~~ Decompose into hours, minutes, and seconds\n`,
    hint: '1 hour is 3600 seconds. Extract hours with / 3600, then split the remainder % 3600 into minutes and seconds.',
    solution: `ivar totalSeconds = 3665;
totalSeconds += 62;
totalSeconds--;

ivar hours = totalSeconds / 3600;
ivar minutes = (totalSeconds % 3600) / 60;
ivar seconds = totalSeconds % 60;
pasteLn(~"{hours}h {minutes}m {seconds}s");
`,
    checks: [
      { label: 'totalSeconds updated to 3726', type: 'krb', expr: 'totalSeconds == 3726' },
      { label: 'Decomposed accurately: hours == 1, minutes == 2, seconds == 6', type: 'krb', expr: 'hours == 1 && minutes == 2 && seconds == 6' }
    ]
  },

  {
    id: 15,
    chapter: 3,
    isBoss: false,
    title: 'Boolean Precedence & Access Rules',
    summary: 'Translate real-world authorization rules into precise boolean logic.',
    body: `
      <p>Logical NOT <code>!</code> binds tightest, followed by <code>&amp;&amp;</code> (AND), and then <code>||</code> (OR). Use parentheses whenever grouping an OR condition inside an AND rule:</p>
      <pre><code class="language-kuroba">~~ Wrong: a && b || c  means (a && b) || c
~~ Right: a && (b || c)</code></pre>
      <p><strong>Challenge:</strong> Implement <code>canDeploy(ivar testsGreen, ivar isHotfix, ivar hasApproval, ivar freezeActive)</code> returning a <code>Bool</code>:</p>
      <ul>
        <li>When <code>freezeActive</code> is true, deployment is allowed <strong>only</strong> if both <code>isHotfix</code> and <code>hasApproval</code> are true.</li>
        <li>Otherwise, deployment requires <code>testsGreen</code> to be true AND at least one of <code>hasApproval</code> or <code>isHotfix</code>.</li>
      </ul>
    `,
    starter: `~~ Implement canDeploy(testsGreen, isHotfix, hasApproval, freezeActive)\n`,
    hint: 'Handle freezeActive first (returning isHotfix && hasApproval), otherwise return testsGreen && (hasApproval || isHotfix).',
    solution: `function canDeploy(ivar testsGreen, ivar isHotfix, ivar hasApproval, ivar freezeActive) then
    if (freezeActive) then
        return isHotfix && hasApproval;
    end
    return testsGreen && (hasApproval || isHotfix);
end
`,
    checks: [
      { label: 'Normal window: requires testsGreen and (hasApproval or isHotfix)', type: 'krb', expr: 'canDeploy(TRUE, FALSE, TRUE, FALSE) == TRUE && canDeploy(TRUE, TRUE, FALSE, FALSE) == TRUE && canDeploy(FALSE, TRUE, TRUE, FALSE) == FALSE && canDeploy(TRUE, FALSE, FALSE, FALSE) == FALSE' },
      { label: 'Freeze window: blocks normal deploys, allows approved hotfixes', type: 'krb', expr: 'canDeploy(TRUE, FALSE, TRUE, TRUE) == FALSE && canDeploy(TRUE, TRUE, FALSE, TRUE) == FALSE && canDeploy(FALSE, TRUE, TRUE, TRUE) == TRUE' }
    ]
  },

  {
    id: 16,
    chapter: 3,
    isBoss: false,
    title: 'Multi-Branch Conditionals (if / elif / else)',
    summary: 'Order threshold checks carefully in cascading if / elif / else chains.',
    body: `
      <p>In an <code>if ... elif ... else ... end</code> chain, Kuroba executes the <strong>first</strong> branch whose condition is truthy and skips the rest:</p>
      <pre><code class="language-kuroba">if (ms &lt; 20) then
    tier = "Ultra";
elif (ms &lt; 60) then
    tier = "Good";
else
    tier = "Lag";
end</code></pre>
      <p><strong>Challenge:</strong> Implement <code>shippingFee(ivar weightKg)</code> matching this progressive rate table:</p>
      <ul>
        <li><code>weightKg &lt;= 0</code> &rarr; <code>0</code></li>
        <li><code>0 &lt; weightKg &lt;= 2</code> &rarr; <code>5</code></li>
        <li><code>2 &lt; weightKg &lt;= 10</code> &rarr; <code>12</code></li>
        <li>Above <code>10</code> kg &rarr; <code>25</code></li>
      </ul>
    `,
    starter: `~~ Implement shippingFee(weightKg) with if / elif / else\n`,
    hint: 'Check the smallest upper bounds first (<= 0, then <= 2, then <= 10, then else).',
    solution: `function shippingFee(ivar weightKg) then
    if (weightKg <= 0) then
        return 0;
    elif (weightKg <= 2) then
        return 5;
    elif (weightKg <= 10) then
        return 12;
    else
        return 25;
    end
end
`,
    checks: [
      { label: 'Handles zero/negative weights -> 0', type: 'krb', expr: 'shippingFee(0) == 0 && shippingFee(-3) == 0' },
      { label: 'Returns 5 for (0..2], 12 for (2..10], and 25 above 10', type: 'krb', expr: 'shippingFee(1) == 5 && shippingFee(2) == 5 && shippingFee(7) == 12 && shippingFee(10) == 12 && shippingFee(11) == 25' }
    ]
  },

  {
    id: 17,
    chapter: 3,
    isBoss: false,
    title: 'Pattern Matching with given / case',
    summary: 'Dispatch opcodes cleanly with given and catch unknown inputs with the ~ fallback.',
    body: `
      <p><code>given</code> evaluates an expression once and matches it against <code>case</code> blocks, falling back to <code>case ~ then</code> when nothing else matches:</p>
      <pre><code class="language-kuroba">given grade then
    case "A" then bonus = 100; break; end
    case "B" then bonus = 50; break; end
    case ~ then bonus = 0; end
end</code></pre>
      <p><strong>Challenge:</strong> Write a function <code>execOpcode(ivar op, ivar a, ivar b)</code> using a <code>given</code> block on <code>op</code>:</p>
      <ul>
        <li><code>"ADD"</code> &rarr; <code>a + b</code></li>
        <li><code>"SUB"</code> &rarr; <code>a - b</code></li>
        <li><code>"MUL"</code> &rarr; <code>a * b</code></li>
        <li>Any other opcode &rarr; <code>-1</code></li>
      </ul>
    `,
    starter: `~~ Implement execOpcode(op, a, b) using given / case / ~\n`,
    hint: 'Match each opcode string inside given op then, and use case ~ then for unknown opcodes.',
    solution: `function execOpcode(ivar op, ivar a, ivar b) then
    ivar out = 0;
    given op then
        case "ADD" then out = a + b; break; end
        case "SUB" then out = a - b; break; end
        case "MUL" then out = a * b; break; end
        case ~ then out = -1; end
    end
    return out;
end
`,
    checks: [
      { label: 'Uses given and fallback case ~', type: 'code', pattern: /\bgiven\b[\s\S]*\bcase\s+~/ },
      { label: 'Evaluates ADD, SUB, MUL, and unknown opcodes accurately', type: 'krb', expr: 'execOpcode("ADD", 7, 5) == 12 && execOpcode("SUB", 7, 5) == 2 && execOpcode("MUL", 7, 5) == 35 && execOpcode("NOP", 7, 5) == -1' }
    ]
  },

  {
    id: 18,
    chapter: 3,
    isBoss: false,
    title: 'Iterative Convergence (while & do ... while)',
    summary: 'Simulate step-by-step processes whose iteration count is unknown ahead of time.',
    body: `
      <p>Use <code>while (cond) then ... end</code> when a loop might run zero or more times, and <code>do then ... while (cond);</code> when the body must execute at least once:</p>
      <pre><code class="language-kuroba">ivar n = 100;
while (n &gt; 1) then
    n /= 2;
end</code></pre>
      <p><strong>Challenge:</strong> Implement the Collatz step counter <code>collatzSteps(ivar n)</code>: while <code>n &gt; 1</code>, divide even <code>n</code> by <code>2</code>, or replace odd <code>n</code> with <code>n * 3 + 1</code>. Return how many steps it took to reach <code>1</code> (<code>1</code> takes <code>0</code> steps; <code>6</code> takes <code>8</code> steps).</p>
    `,
    starter: `~~ Implement collatzSteps(n)\n`,
    hint: 'Test parity with n % 2 == 0 inside a while (n > 1) loop and increment a step counter each iteration.',
    solution: `function collatzSteps(ivar n) then
    ivar steps = 0;
    while (n > 1) then
        if (n % 2 == 0) then
            n = n / 2;
        else
            n = n * 3 + 1;
        end
        steps++;
    end
    return steps;
end
`,
    checks: [
      { label: 'collatzSteps(1) == 0, collatzSteps(6) == 8, collatzSteps(27) == 111', type: 'krb', expr: 'collatzSteps(1) == 0 && collatzSteps(6) == 8 && collatzSteps(27) == 111' }
    ]
  },

  {
    id: 19,
    chapter: 3,
    isBoss: false,
    title: 'Loop Control with for, skip & break',
    summary: 'Filter noisy sequences cleanly with skip; and halt on emergency thresholds with break;.',
    body: `
      <p>Inside <code>for</code> and <code>while</code> loops, <code>skip;</code> immediately advances to the next iteration, while <code>break;</code> exits the loop completely:</p>
      <pre><code class="language-kuroba">for (ivar i = 0; i &lt; 10; i++) then
    if (i == 4) then skip; end
    if (i == 8) then break; end
end</code></pre>
      <p><strong>Challenge:</strong> Write <code>scanReactor(ivar limit)</code> scanning integers <code>tick</code> from <code>1</code> up to <code>limit</code> (inclusive) into <code>energy = 0</code>:</p>
      <ul>
        <li>Skip calibration ticks divisible by <code>4</code> via <code>skip;</code>.</li>
        <li>Add <code>tick * 5</code> to <code>energy</code> on valid ticks.</li>
        <li>As soon as <code>energy</code> strictly exceeds <code>100</code>, stop immediately with <code>break;</code> and return <code>energy</code>.</li>
      </ul>
    `,
    starter: `~~ Implement scanReactor(limit) using for, skip, and break\n`,
    hint: 'Check divisibility by 4 first (skip;), then add tick * 5 to energy, and check if energy > 100 to break;.',
    solution: `function scanReactor(ivar limit) then
    ivar energy = 0;
    for (ivar tick = 1; tick <= limit; tick++) then
        if (tick % 4 == 0) then skip; end
        energy += tick * 5;
        if (energy > 100) then break; end
    end
    return energy;
end
`,
    checks: [
      { label: 'Uses for, skip;, and break;', type: 'code', pattern: /\bfor\b[\s\S]*\bskip\s*;[\s\S]*\bbreak\s*;/ },
      { label: 'scanReactor(5) == 55 and scanReactor(20) halts early at 120', type: 'krb', expr: 'scanReactor(5) == 55 && scanReactor(20) == 120' }
    ]
  },

  {
    id: 20,
    chapter: 3,
    isBoss: true,
    title: 'Dungeon Wave Scorer',
    summary: 'Boss Challenge: Combine loops, pattern matching, skip, and early termination.',
    body: `
      <p><strong>Boss Scenario:</strong> Implement <code>scoreDungeon(ivar waves, ivar cursedWave)</code> simulating waves <code>1</code> through <code>waves</code>:</p>
      <ul>
        <li>Start with <code>hp = 100</code> and <code>gold = 0</code>.</li>
        <li>If the current wave number equals <code>cursedWave</code>, skip that wave completely!</li>
        <li>Classify the wave by <code>w % 4</code> using <code>given</code>:
          <ul>
            <li><code>0</code> (Boss wave): costs <code>35</code> HP and awards <code>50</code> gold.</li>
            <li><code>2</code> (Trap wave): costs <code>20</code> HP and awards <code>10</code> gold.</li>
            <li>All other waves: cost <code>5</code> HP and award <code>15</code> gold.</li>
          </ul>
        </li>
        <li>If <code>hp &lt;= 0</code> after taking wave damage, exit the loop immediately without awarding that wave's gold and return <code>gold</code> earned so far.</li>
      </ul>
    `,
    starter: `~~ Implement scoreDungeon(waves, cursedWave)\n`,
    hint: 'Subtract wave damage from hp and check hp <= 0 to break BEFORE adding that wave\'s gold reward.',
    solution: `function scoreDungeon(ivar waves, ivar cursedWave) then
    ivar hp = 100;
    ivar gold = 0;
    for (ivar w = 1; w <= waves; w++) then
        if (w == cursedWave) then skip; end
        ivar cost = 0;
        ivar reward = 0;
        given (w % 4) then
            case 0 then cost = 35; reward = 50; break; end
            case 2 then cost = 20; reward = 10; break; end
            case ~ then cost = 5; reward = 15; end
        end
        hp -= cost;
        if (hp <= 0) then break; end
        gold += reward;
    end
    return gold;
end
`,
    checks: [
      { label: 'Uses given / case ~ and skip', type: 'code', pattern: /\bskip\b[\s\S]*\bgiven\b|\bgiven\b[\s\S]*\bskip\b/ },
      { label: 'Survives 8 waves when wave 4 is skipped -> 130 gold', type: 'krb', expr: 'scoreDungeon(8, 4) == 130' },
      { label: 'Halts before awarding gold on fatal wave (12 waves, no skip -> 130 gold)', type: 'krb', expr: 'scoreDungeon(12, 99) == 130' }
    ]
  },

  // ==========================================================================
  // CHAPTER 4: Collections & Nested Mutations (Lessons 21–26)
  // ==========================================================================
  {
    id: 21,
    chapter: 4,
    isBoss: false,
    title: 'Dynamic Lists',
    summary: 'Manipulate 0-indexed arrays with .push(), .pop(), .peek(), and .count().',
    body: `
      <p>Lists grow and shrink dynamically:</p>
      <pre><code class="language-kuroba">ivar bag = ["Torch", "Rope"];
bag.push("Key");       ~~ Appends at end
ivar top = bag.peek(); ~~ Reads "Key" without removing
ivar out = bag.pop();  ~~ Removes and returns "Key"</code></pre>
      <p><strong>Challenge:</strong> Write <code>rotateLeft(ivar items)</code>: if <code>items</code> has 2 or more elements, remove the first element (<code>items.pop(0)</code>) and append it to the back, returning <code>items</code>. Then create <code>belt = ["Sword", "Potion", "Bomb", "Map"]</code> and call <code>rotateLeft(belt)</code>.</p>
    `,
    starter: `~~ Implement rotateLeft(items)\n\n~~ Create belt and rotate it left once\n`,
    hint: 'Check items.count() >= 2, then extract index 0 with items.pop(0) and append it with items.push(...).',
    solution: `function rotateLeft(ivar items) then
    if (items.count() >= 2) then
        ivar first = items.pop(0);
        items.push(first);
    end
    return items;
end

ivar belt = ["Sword", "Potion", "Bomb", "Map"];
rotateLeft(belt);
`,
    checks: [
      { label: 'Rotates belt -> ["Potion", "Bomb", "Map", "Sword"]', type: 'krb', expr: 'belt.count() == 4 && belt[0] == "Potion" && belt[3] == "Sword"' },
      { label: 'Safely handles empty and single-item lists without crashing', type: 'krb', script: 'ivar e = rotateLeft([]);\nivar s = rotateLeft(["Solo"]);\nif (e.count() == 0 && s.count() == 1 && s[0] == "Solo") then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 22,
    chapter: 4,
    isBoss: false,
    title: 'LIFO Stacks vs. FIFO Queues',
    summary: 'Choose ~Stack vs ~Queue contracts to control removal order on .pop() and .peek().',
    body: `
      <p>Declaring a collection as <code>ivar~Stack</code> pops from the <strong>back</strong> (Last-In, First-Out), whereas <code>ivar~Queue</code> pops from the <strong>front</strong> (First-In, First-Out):</p>
      <pre><code class="language-kuroba">ivar~Stack s = [1, 2, 3];
s.pop(); ~~ 3

ivar~Queue q = [1, 2, 3];
q.pop(); ~~ 1</code></pre>
      <p><strong>Challenge:</strong> Build a print spooler &amp; undo history:</p>
      <ul>
        <li>Declare a FIFO <code>spooler</code> holding <code>["Spec.pdf", "Diagram.png", "Invoice.txt"]</code> and an empty LIFO <code>undoStack</code>.</li>
        <li>Pop the first job from <code>spooler</code> into <code>firstPrinted</code> and push it onto <code>undoStack</code>.</li>
        <li>Pop the second job from <code>spooler</code> and push it onto <code>undoStack</code>.</li>
        <li>Undo the most recent completed job by popping from <code>undoStack</code> into <code>lastUndone</code>.</li>
      </ul>
    `,
    starter: `~~ Declare FIFO spooler & LIFO undoStack\n\n~~ Process 2 jobs into undoStack, then undo 1 into lastUndone\n`,
    hint: 'Use ~Queue for spooler (FIFO) and ~Stack for undoStack (LIFO).',
    solution: `ivar~Queue spooler = ["Spec.pdf", "Diagram.png", "Invoice.txt"];
ivar~Stack undoStack = [];

ivar firstPrinted = spooler.pop();
undoStack.push(firstPrinted);
undoStack.push(spooler.pop());
ivar lastUndone = undoStack.pop();
`,
    checks: [
      { label: 'firstPrinted == "Spec.pdf" and spooler.peek() == "Invoice.txt"', type: 'krb', expr: 'firstPrinted == "Spec.pdf" && spooler.count() == 1 && spooler.peek() == "Invoice.txt"' },
      { label: 'lastUndone == "Diagram.png" and undoStack still holds "Spec.pdf"', type: 'krb', expr: 'lastUndone == "Diagram.png" && undoStack.count() == 1 && undoStack.peek() == "Spec.pdf"' }
    ]
  },

  {
    id: 23,
    chapter: 4,
    isBoss: false,
    title: 'Associative Tables & Dynamic Keys',
    summary: 'Count frequencies and build lookup maps using Table literals and bracket [key] indexing.',
    body: `
      <p>Tables store key-value pairs. Use <code>tbl.field</code> when the key is a known identifier, and <code>tbl[keyExpr]</code> when the key comes from a variable! Reading a missing key returns <code>NULL</code>:</p>
      <pre><code class="language-kuroba">ivar counts = {};
ivar word = "oak";
if (counts[word] is NULL) then
    counts[word] = 1;
else
    counts[word] += 1;
end</code></pre>
      <p><strong>Challenge:</strong> Write <code>tallyVotes(ivar ballots)</code> returning a frequency <code>Table</code> mapping each candidate name to its vote count. Then store <code>tallyVotes(["Aoi", "Kenji", "Aoi", "Ren", "Aoi", "Kenji"])</code> in <code>tally</code>.</p>
    `,
    starter: `~~ Implement tallyVotes(ballots)\n\n~~ Run tallyVotes on the sample ballots into 'tally'\n`,
    hint: 'Loop over ballots; if res[name] is NULL initialize it to 1, otherwise increment res[name] += 1.',
    solution: `function tallyVotes(ivar ballots) then
    ivar res = {};
    for (ivar i = 0; i < ballots.count(); i++) then
        ivar candidate = ballots[i];
        if (res[candidate] is NULL) then
            res[candidate] = 1;
        else
            res[candidate] += 1;
        end
    end
    return res;
end

ivar tally = tallyVotes(["Aoi", "Kenji", "Aoi", "Ren", "Aoi", "Kenji"]);
`,
    checks: [
      { label: 'Returns an accurate frequency Table across candidates', type: 'krb', expr: '(tally is Table) && tally.count() == 3 && tally.Aoi == 3 && tally.Kenji == 2 && tally.Ren == 1' },
      { label: 'Works on arbitrary input lists', type: 'krb', script: 'ivar t2 = tallyVotes(["X", "X"]);\nif (t2.count() == 1 && t2.X == 2) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 24,
    chapter: 4,
    isBoss: false,
    title: 'Unified Iteration (for ... in)',
    summary: 'Traverse indexed lists and key-value tables cleanly with 1-variable and 2-variable for-in loops.',
    body: `
      <p><code>for (... in ...)</code> works uniformly across lists and tables:</p>
      <pre><code class="language-kuroba">for (ivar idx, val in myList) then ... end
for (ivar key, val in myTable) then ... end</code></pre>
      <p><strong>Challenge:</strong> Declare <code>stock = { potion: 4, elixir: 0, arrow: 20, brokenShard: 3, map: 0 }</code> and <code>unitPrices = { potion: 25, elixir: 100, arrow: 2, map: 15 }</code>. Iterate over <code>stock</code> using a key-value <code>for ... in</code> loop to compute:</p>
      <ul>
        <li><code>inventoryValue</code>: total gold value (<code>qty * price</code>, treating missing price entries as <code>0</code>).</li>
        <li><code>outOfStockCount</code>: how many entries in <code>stock</code> have quantity <code>0</code>.</li>
      </ul>
    `,
    starter: `~~ Declare stock and unitPrices tables\n\n~~ Iterate stock to compute inventoryValue and outOfStockCount\n`,
    hint: 'Loop for (ivar item, qty in stock) then: count qty == 0, and check !(unitPrices[item] is NULL) before multiplying qty * unitPrices[item].',
    solution: `ivar stock = { potion: 4, elixir: 0, arrow: 20, brokenShard: 3, map: 0 };
ivar unitPrices = { potion: 25, elixir: 100, arrow: 2, map: 15 };

ivar inventoryValue = 0;
ivar outOfStockCount = 0;

for (ivar item, qty in stock) then
    if (qty == 0) then
        outOfStockCount++;
    end
    if (!(unitPrices[item] is NULL)) then
        inventoryValue += qty * unitPrices[item];
    end
end
`,
    checks: [
      { label: 'Uses a key-value for (... in ...) loop', type: 'code', pattern: /\bfor\s*\([^)]*,[^)]*\bin\b/ },
      { label: 'inventoryValue == 140 and outOfStockCount == 2', type: 'krb', expr: 'inventoryValue == 140 && outOfStockCount == 2' }
    ]
  },

  {
    id: 25,
    chapter: 4,
    isBoss: false,
    title: 'Nested Structures & In-Place Reversal',
    summary: 'Reverse a list in place with <-> and update deeply nested matrix/table cells.',
    body: `
      <p>Chained subscripts like <code>grid[r][c]</code> or <code>squad[i].stats.atk</code> can be read and mutated directly. When swapping indexed slots with <code>&lt;-&gt;</code>, use simple index variables like <code>arr[left] &lt;-&gt; arr[right];</code>:</p>
      <pre><code class="language-kuroba">ivar i = 0;
ivar j = 2;
row[i] &lt;-&gt; row[j];</code></pre>
      <p><strong>Challenge:</strong></p>
      <ul>
        <li>Create a 3x3 matrix <code>board = [[1, 0, 1], [0, 0, 0], [1, 0, 1]]</code> and mutate its center cell to <code>9</code>.</li>
        <li>Write <code>reverseInPlace(ivar list)</code> reversing any <code>List</code> in place using <code>&lt;-&gt;</code> (returning the same list instance).</li>
      </ul>
    `,
    starter: `~~ Declare 3x3 board & update center cell\n\n~~ Implement reverseInPlace(list) using <-> swaps\n`,
    hint: 'Use two pointers left = 0 and right = list.count() - 1; while left < right, swap list[left] <-> list[right], then advance both pointers.',
    solution: `ivar board = [
    [1, 0, 1],
    [0, 0, 0],
    [1, 0, 1]
];
board[1][1] = 9;

function reverseInPlace(ivar list) then
    ivar left = 0;
    ivar right = list.count() - 1;
    while (left < right) then
        list[left] <-> list[right];
        left++;
        right--;
    end
    return list;
end
`,
    checks: [
      { label: 'Uses <-> to swap list elements in place', type: 'code', pattern: /<->/ },
      { label: 'board center cell is 9', type: 'krb', expr: 'board[1][1] == 9 && board[0][0] == 1' },
      { label: 'reverseInPlace mutates the same List instance accurately', type: 'krb', script: 'ivar origList = [10, 20, 30, 40, 50];\nivar ret = reverseInPlace(origList);\nif (ret == origList && origList[0] == 50 && origList[1] == 40 && origList[4] == 10) then pasteLn("__KRB_OK__"); end' }
    ]
  },

  {
    id: 26,
    chapter: 4,
    isBoss: true,
    title: 'Matchmaking Queue & Squad Ranking',
    summary: 'Boss Challenge: Pull players from a FIFO queue, compute squad scores, and rank squads descending.',
    body: `
      <p><strong>Boss Scenario:</strong> Six players wait in a FIFO matchmaking queue <code>lobby</code>: <code>Kenji (1200)</code>, <code>Aoi (1350)</code>, <code>Ren (1600)</code>, <code>Sora (1500)</code>, <code>Mika (1100)</code>, <code>Taro (1750)</code> (each entry as <code>{ name, mmr }</code>):</p>
      <ol>
        <li>Drain <code>lobby</code> two players at a time into <code>teams</code>, pushing <code>{ label: ~"{p1.name}&amp;{p2.name}", rating: p1.mmr + p2.mmr }</code>.</li>
        <li>Sort <code>teams</code> in <strong>descending</strong> order of <code>rating</code> in place using <code>&lt;-&gt;</code> (remember to store index variables like <code>ivar next = j + 1;</code> before indexing inside <code>&lt;-&gt;</code>).</li>
        <li>Print the #1 ranked duo's <code>label</code>.</li>
      </ol>
    `,
    starter: `~~ Declare FIFO lobby queue with the 6 players\n\n~~ Pair players into teams\n\n~~ Sort teams descending by rating using <-> & print leader\n`,
    hint: 'While lobby.count() >= 2, pop two players and push their duo table into teams. Then sort teams descending with nested loops and teams[j] <-> teams[next].',
    solution: `ivar~Queue lobby = [
    { name: "Kenji", mmr: 1200 },
    { name: "Aoi",   mmr: 1350 },
    { name: "Ren",   mmr: 1600 },
    { name: "Sora",  mmr: 1500 },
    { name: "Mika",  mmr: 1100 },
    { name: "Taro",  mmr: 1750 }
];

ivar teams = [];
while (lobby.count() >= 2) then
    ivar p1 = lobby.pop();
    ivar p2 = lobby.pop();
    teams.push({
        label: ~"{p1.name}&{p2.name}",
        rating: p1.mmr + p2.mmr
    });
end

for (ivar i = 0; i < teams.count(); i++) then
    for (ivar j = 0; j < teams.count() - 1; j++) then
        ivar next = j + 1;
        if (teams[j].rating < teams[next].rating) then
            teams[j] <-> teams[next];
        end
    end
end

pasteLn(teams[0].label);
`,
    checks: [
      { label: 'lobby was drained completely and 3 teams were formed', type: 'krb', expr: 'lobby.count() == 0 && teams.count() == 3' },
      { label: 'teams are sorted descending: Ren&Sora (3100), Mika&Taro (2850), Kenji&Aoi (2550)', type: 'krb', expr: 'teams[0].rating == 3100 && teams[1].rating == 2850 && teams[2].rating == 2550' },
      { label: 'Prints the #1 ranked duo "Ren&Sora"', type: 'stdout', exact: 'Ren&Sora' }
    ]
  }
];
