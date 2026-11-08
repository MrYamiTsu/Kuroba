/* ============================================================================
   Kuroba (黒羽) — Interactive Playground Controller
   ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('ide-editor');
  const gutter = document.getElementById('ide-gutter');
  const terminalScreen = document.getElementById('terminal-screen');
  const btnRun = document.getElementById('btn-execute');
  const btnClearEditor = document.getElementById('btn-clear-editor');
  const btnClearTerm = document.getElementById('btn-clear-term');
  const selectSample = document.getElementById('select-sample');
  const timingBadge = document.getElementById('timing-badge');
  const statusCursor = document.getElementById('status-cursor');

  // ==========================================================================
  // Sample Programs in Idiomatic English
  // ==========================================================================
  const SAMPLES = {
    hello: `~~ Welcome to Kuroba (KRB) v1.0.5 !
ivar player = "Shinobi";
ivar level = 12;
ivar healthPoints = 100;

pasteLn(~"Greetings, {player}!");
pasteLn(~"Status: Level {level} | HP: {healthPoints}/100");
pasteLn("Executed client-side by Kuroba's pure JavaScript AST engine.");`,

    strings: `import Std ~(String) alias ~;

namespace Main then
    ivar text = "  sanctuary of kuroba  ";
    ivar clean = String.trim(text);
    
    pasteLn("Original: '" + text + "'");
    pasteLn(~"Uppercase: {String.upper(clean)}");
    pasteLn(~"Length:    {String.count(clean)} characters");
    pasteLn(~"Reversed:  {String.reverse(clean)}");
    
    ivar tokens = String.split(clean, " ");
    pasteLn(~"Words found: {tokens.count()}");
    for (i, word in tokens) then
        pasteLn(~"  [{i}] -> {word}");
    end
end`,

    math_time: `import Std ~(Math, Time) alias ~;

namespace Main then
    pasteLn("Geometric calculation and timing metrics:");
    ivar radius = 8.0;
    ivar area = Math.PI * Math.pow(radius, 2);
    pasteLn(~"Circle with radius {radius} -> Area: {area}");

    ivar roll = Math.random(1, 100);
    pasteLn(~"Random number rolled: {roll}");

    ivar chrono = Time.stopwatch();
    Time.sleep(40); ~~ Synchronous CPU-friendly pause
    ivar elapsed = chrono.elapsed();
    pasteLn(~"Stopwatch duration: {elapsed} ms ({Time.format(elapsed)})");
end`,

    io: `import Std ~(IO) alias ~;

namespace Main then
    ivar filename = "session.dat";
    
    pasteLn("1. Writing save state to virtual filesystem...");
    IO.filePaste(filename, "=== KUROBA BACKUP STATE ===\\n");
    IO.filePasteLn(filename, "Hero: Kenji | Level: 25");
    IO.filePasteLn(filename, "Inventory: [Katana, Elixir, Smoke Bomb]");

    if (IO.fileExists(filename)) then
        pasteLn("\\n2. File detected in virtual memory! Reading contents:");
        pasteLn("------------------------------------------------------");
        paste(IO.fileCopy(filename));
        pasteLn("------------------------------------------------------");
        
        IO.fileKill(filename);
        pasteLn("\\n3. File cleaned up. Still exists? " + IO.fileExists(filename));
    end
end`,

    collections: `~~ Typed collections & associative tables
ivar~List<Int> dice = [4, 6, 8, 12, 20];
dice.push(100);
pasteLn(~"Dice pool ({dice.count()}) : " + dice);

ivar~Table character = {
    name: "Kenji",
    role: "Shadow Ninja",
    stats: { strength: 28, agility: 35 },
    inventory: ["Shuriken", "Smoke Bomb", "Elixir"]
};

character.stats.strength += 10;
pasteLn(~"Hero: {character.name} ({character.role})");
pasteLn(~"Boosted Strength: {character.stats.strength}");
pasteLn(~"Inventory items: " + character.inventory);`,

    hooks: `~~ First-class functions and lexical hooks
function computeInvoice(ivar base, ivar tax) then
    return base + (base * tax);
end

~~ Interception hook delegating to original with this(...)
hook computeInvoice(ivar base, ivar tax) then
    pasteLn(~"[Audit Hook] Invoice calculation for base amount: {base}$");
    ivar rawTotal = this(base, tax);
    return rawTotal - 15; ~~ Member discount
end

ivar total = computeInvoice(150, 0.15);
pasteLn(~"Final invoice total: {total}$");`,

    game: `import Std ~(Math) alias ~;

namespace Main then
    pasteLn("=== TACTICAL COMBAT SIMULATION ===");
    ivar playerHp = 50;
    ivar bossHp = 45;
    ivar round = 1;

    while (playerHp > 0 && bossHp > 0) then
        pasteLn(~"\\n--- Round {round} ---");
        ivar playerDamage = Math.random(10, 18);
        bossHp -= playerDamage;
        pasteLn(~"You strike the boss: -{playerDamage} HP (Remaining: {Math.max(0, bossHp)})");

        if (bossHp <= 0) then
            pasteLn("\\n>> VICTORY! The dungeon boss has fallen! ⚔️✨");
            break;
        end

        ivar bossDamage = Math.random(8, 15);
        playerHp -= bossDamage;
        pasteLn(~"The boss retaliates: -{bossDamage} HP (Remaining: {Math.max(0, playerHp)})");

        if (playerHp <= 0) then
            pasteLn("\\n>> DEFEAT! You were defeated in battle... 💀");
            break;
        end

        round++;
    end
end`
  };

  // ==========================================================================
  // Line Number Gutter Synchronization
  // ==========================================================================
  function updateGutter() {
    if (!gutter || !editor) return;
    const lines = editor.value.split('\n').length;
    let gutterHTML = '';
    for (let i = 1; i <= lines; i++) {
      gutterHTML += `<div>${i}</div>`;
    }
    gutter.innerHTML = gutterHTML;
    gutter.scrollTop = editor.scrollTop;
  }

  function updateCursorPosition() {
    if (!statusCursor || !editor) return;
    const text = editor.value.substring(0, editor.selectionStart);
    const lines = text.split('\n');
    const lineNum = lines.length;
    const colNum = lines[lines.length - 1].length + 1;
    statusCursor.textContent = `Ln ${lineNum}, Col ${colNum}`;
  }

  editor.addEventListener('input', () => {
    updateGutter();
    updateCursorPosition();
  });

  editor.addEventListener('scroll', () => {
    if (gutter) gutter.scrollTop = editor.scrollTop;
  });

  editor.addEventListener('click', updateCursorPosition);
  editor.addEventListener('keyup', updateCursorPosition);

  // ==========================================================================
  // Virtual Terminal Output
  // ==========================================================================
  function printTerminal(text, type = 'out') {
    const line = document.createElement('div');
    line.className = `term-line ${type}`;
    line.textContent = text;
    terminalScreen.appendChild(line);
    terminalScreen.scrollTop = terminalScreen.scrollHeight;
  }

  function clearTerminal() {
    terminalScreen.innerHTML = `
      <div class="term-line sys">Kuroba (KRB) Web Runtime Engine v1.0.5</div>
      <div class="term-line sys">Terminal output cleared. Ready for execution.</div>
      <div class="term-line sys">--------------------------------------------------------------------------------</div>
    `;
    timingBadge.style.display = 'none';
  }

  // ==========================================================================
  // Execution Engine Call
  // ==========================================================================
  function executeScript() {
    const code = editor.value;
    if (!code.trim()) {
      printTerminal("Notice: Editor is empty. Write or select a sample first.", "sys");
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    printTerminal(`[${timeStr}] kuroba@runtime:~$ run main.krb`, "sys");
    const t0 = performance.now();

    try {
      if (typeof window.Kuroba === 'undefined' || typeof window.Kuroba.run !== 'function') {
        throw new Error("Kuroba Web Engine is not loaded or initializing...");
      }

      window.Kuroba.run(code, {
        onPrint: (txt, newLine) => {
          printTerminal(txt, 'out');
        },
        onError: (err) => {
          printTerminal(err, 'err');
        },
        onClear: () => {
          clearTerminal();
        }
      });

      const t1 = performance.now();
      const elapsed = (t1 - t0).toFixed(1);
      timingBadge.textContent = `• ${elapsed} ms`;
      timingBadge.style.display = 'inline';
      printTerminal(`[Process exited successfully in ${elapsed} ms]`, "ok");

    } catch (e) {
      const t1 = performance.now();
      const elapsed = (t1 - t0).toFixed(1);
      timingBadge.textContent = `• ${elapsed} ms`;
      timingBadge.style.display = 'inline';
      printTerminal(e.message || String(e), 'err');
    }
  }

  // ==========================================================================
  // Event Listeners & Keyboard Shortcuts
  // ==========================================================================
  selectSample.addEventListener('change', (e) => {
    const key = e.target.value;
    if (SAMPLES[key]) {
      editor.value = SAMPLES[key];
      updateGutter();
      updateCursorPosition();
      editor.scrollTop = 0;
      if (gutter) gutter.scrollTop = 0;
    }
  });

  btnClearEditor.addEventListener('click', () => {
    editor.value = '';
    updateGutter();
    updateCursorPosition();
    editor.focus();
  });

  btnClearTerm.addEventListener('click', clearTerminal);
  btnRun.addEventListener('click', executeScript);

  editor.addEventListener('keydown', (e) => {
    // Ctrl + Enter to Run
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      executeScript();
    }
    // Ctrl + L to Clear Terminal
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      clearTerminal();
    }
    // Tab key inserts 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + "    " + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 4;
      updateGutter();
      updateCursorPosition();
    }
  });

  // ==========================================================================
  // URL Parameter Detection: ?code=...
  // ==========================================================================
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');

  if (codeParam) {
    try {
      editor.value = decodeURIComponent(codeParam);
    } catch (e) {
      editor.value = codeParam;
    }
  } else {
    editor.value = SAMPLES.hello;
  }

  updateGutter();
  updateCursorPosition();
});
