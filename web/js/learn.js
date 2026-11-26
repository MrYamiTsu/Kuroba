/* ============================================================================
   Kuroba — Interactive Learning Manual Controller & WASM Grading Harness
   ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const CHAPTERS = window.KUROBA_CHAPTERS || [];
  const LESSONS = (window.KUROBA_LESSONS_PART1 || []).concat(window.KUROBA_LESSONS_PART2 || []);

  const STORAGE_KEY = 'kuroba_learn_state_v3';

  // DOM Elements
  const btnCurriculum = document.getElementById('btn-curriculum-toggle');
  const topbarTitle = document.getElementById('learn-topbar-title');
  const progressText = document.getElementById('learn-progress-text');
  const progressFill = document.getElementById('learn-progress-fill');
  const btnPrev = document.getElementById('btn-prev-lesson');
  const btnNext = document.getElementById('btn-next-lesson');

  const drawerBackdrop = document.getElementById('learn-drawer-backdrop');
  const drawerGrid = document.getElementById('learn-drawer-grid');
  const searchInput = document.getElementById('learn-search-input');
  const btnResetProgress = document.getElementById('btn-reset-progress');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');

  const guideScroll = document.getElementById('learn-guide-scroll');
  const chapterBadge = document.getElementById('learn-chapter-badge');
  const bossBadge = document.getElementById('learn-boss-badge');
  const statusPill = document.getElementById('learn-status-pill');
  const lessonTitle = document.getElementById('learn-lesson-title');
  const lessonSummary = document.getElementById('learn-lesson-summary');
  const lessonBody = document.getElementById('learn-lesson-body');
  const objectivesScore = document.getElementById('learn-objectives-score');
  const objectivesList = document.getElementById('learn-objectives-list');

  const successBanner = document.getElementById('learn-success-banner');
  const successHeading = document.getElementById('learn-success-heading');
  const successSub = document.getElementById('learn-success-sub');
  const btnBannerNext = document.getElementById('btn-banner-next');

  const btnToggleHint = document.getElementById('btn-toggle-hint');
  const btnShowSolution = document.getElementById('btn-show-solution');
  const hintBox = document.getElementById('learn-hint-box');

  const fileTabsEl = document.getElementById('learn-file-tabs');
  const editor = document.getElementById('learn-editor');
  const gutter = document.getElementById('learn-gutter');
  const btnResetCode = document.getElementById('btn-reset-code');
  const btnRunOnly = document.getElementById('btn-run-only');
  const btnVerify = document.getElementById('btn-verify');
  const engineStatus = document.getElementById('learn-engine-status');
  const cursorStatus = document.getElementById('learn-cursor');

  const terminal = document.getElementById('learn-terminal');
  const timingBadge = document.getElementById('learn-timing-badge');
  const btnClearConsole = document.getElementById('btn-clear-console');

  // Persistent State
  let state = {
    currentId: 1,
    completed: {}, // lessonId -> true
    drafts: {}     // lessonId -> { 'main.krb': '...', ... }
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.currentId = parsed.currentId || 1;
          state.completed = parsed.completed || {};
          state.drafts = parsed.drafts || {};
        }
      }
    } catch (e) {}
    const hashMatch = window.location.hash.match(/^#lesson-(\d+)$/);
    if (hashMatch) {
      const hid = parseInt(hashMatch[1], 10);
      if (LESSONS.some(l => l.id === hid)) state.currentId = hid;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // Active lesson multi-file buffer
  let currentLesson = null;
  let activeFile = 'main.krb';
  let currentFiles = { 'main.krb': '' };

  // ==========================================================================
  // Syntax Highlighting for Lesson Guide Code Blocks
  // ==========================================================================
  const FLOW_KEYWORDS = new Set([
    'if', 'elif', 'else', 'then', 'end', 'given', 'case', 'break', 'skip',
    'for', 'in', 'while', 'do', 'try', 'catch', 'finally', 'throw',
    'function', 'operator', 'return', 'hook', 'this', 'import', 'alias', 'namespace',
    'class', 'interface', 'enum', 'as', 'public', 'protected', 'private', 'isolated', 'exclusive',
    'from', 'base', 'orig', 'shared', 'get', 'set', 'is', 'TRUE', 'FALSE', 'NULL', 'unlock', 'lock', 'kill'
  ]);

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightKuroba(code) {
    let html = '';
    let i = 0;
    while (i < code.length) {
      if (code[i] === '~' && code[i + 1] === '~') {
        if (code[i + 2] === '{' && code[i + 3] === '{') {
          let end = code.indexOf('}}', i + 4);
          end = (end === -1) ? code.length : end + 2;
          html += `<span style="color:#A396B3;">${escHtml(code.slice(i, end))}</span>`;
          i = end;
          continue;
        }
        let end = code.indexOf('\n', i);
        if (end === -1) end = code.length;
        html += `<span style="color:#A396B3;">${escHtml(code.slice(i, end))}</span>`;
        i = end;
        continue;
      }
      if ((code[i] === '~' && code[i + 1] === '"') || code[i] === '"') {
        let start = i;
        i += (code[i] === '~') ? 2 : 1;
        while (i < code.length && code[i] !== '"') {
          if (code[i] === '\\' && i + 1 < code.length) i += 2;
          else i++;
        }
        if (i < code.length) i++;
        html += `<span style="color:#E6D3B3;">${escHtml(code.slice(start, i))}</span>`;
        continue;
      }
      if (code.slice(i, i + 3) === '<->') {
        html += `<span style="color:#C9B8A3;">&lt;-&gt;</span>`;
        i += 3;
        continue;
      }
      if (/[a-zA-Z_]/.test(code[i])) {
        let start = i;
        while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) i++;
        let word = code.slice(start, i);
        if (word === 'ivar' || word === 'iconst' || word === 'isealed') {
          if (code[i] === '~') {
            let tEnd = i + 1;
            if (code[tEnd] === '(') {
              while (tEnd < code.length && code[tEnd] !== ')') tEnd++;
              if (tEnd < code.length) tEnd++;
            } else {
              while (tEnd < code.length && /[a-zA-Z0-9_<>]/.test(code[tEnd])) tEnd++;
            }
            word = code.slice(start, tEnd);
            i = tEnd;
          }
          html += `<span style="color:#C9B8A3;">${escHtml(word)}</span>`;
          continue;
        }
        if (FLOW_KEYWORDS.has(word)) {
          html += `<span style="color:#68CD46; font-weight:600;">${escHtml(word)}</span>`;
          continue;
        }
        html += escHtml(word);
        continue;
      }
      html += escHtml(code[i]);
      i++;
    }
    return html;
  }

  // ==========================================================================
  // Editor Gutter & Tabs
  // ==========================================================================
  function updateGutter() {
    const count = editor.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= count; i++) html += `<div>${i}</div>`;
    gutter.innerHTML = html;
    gutter.scrollTop = editor.scrollTop;
  }

  function updateCursor() {
    const before = editor.value.substring(0, editor.selectionStart);
    const lines = before.split('\n');
    cursorStatus.textContent = `Ln ${lines.length}, Col ${lines[lines.length - 1].length + 1}`;
  }

  function renderFileTabs() {
    const names = Object.keys(currentFiles);
    if (names.length <= 1) {
      fileTabsEl.innerHTML = `<span class="ide-toolbar-title">main.krb</span>`;
      return;
    }
    fileTabsEl.innerHTML = '';
    names.forEach(fname => {
      const btn = document.createElement('button');
      btn.className = 'learn-file-tab' + (fname === activeFile ? ' active' : '');
      btn.textContent = fname;
      btn.addEventListener('click', () => {
        currentFiles[activeFile] = editor.value;
        activeFile = fname;
        editor.value = currentFiles[activeFile];
        updateGutter();
        updateCursor();
        renderFileTabs();
      });
      fileTabsEl.appendChild(btn);
    });
  }

  function persistDraft() {
    if (!currentLesson) return;
    currentFiles[activeFile] = editor.value;
    state.drafts[currentLesson.id] = Object.assign({}, currentFiles);
    saveState();
  }

  // ==========================================================================
  // Terminal Helpers
  // ==========================================================================
  function clearConsole() {
    terminal.innerHTML = '';
    timingBadge.style.display = 'none';
  }

  function appendTerm(text, cls = 'out') {
    const div = document.createElement('div');
    div.className = `term-line ${cls}`;
    div.textContent = text;
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
  }

  // ==========================================================================
  // Curriculum Progress & Drawer
  // ==========================================================================
  function updateProgressUI() {
    const total = LESSONS.length;
    const done = LESSONS.filter(l => state.completed[l.id]).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    progressText.textContent = `${done} / ${total} Completed (${pct}%)`;
    progressFill.style.width = `${pct}%`;

    if (currentLesson) {
      const isDone = !!state.completed[currentLesson.id];
      statusPill.textContent = isDone ? '✓ Completed' : 'In Progress';
      statusPill.className = 'learn-status-pill' + (isDone ? ' done' : '');
    }
  }

  function renderDrawer(filterQuery = '') {
    const q = filterQuery.trim().toLowerCase();
    drawerGrid.innerHTML = '';

    CHAPTERS.forEach(ch => {
      const chLessons = LESSONS.filter(l => l.chapter === ch.id && (
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        ch.title.toLowerCase().includes(q)
      ));
      if (chLessons.length === 0) return;

      const card = document.createElement('div');
      card.className = 'learn-chapter-card';

      const allChLessons = LESSONS.filter(l => l.chapter === ch.id);
      const chDone = allChLessons.filter(l => state.completed[l.id]).length;

      const head = document.createElement('div');
      head.className = 'learn-chapter-card-head';
      head.innerHTML = `
        <span class="learn-chapter-card-title">${escHtml(ch.shortTitle)}</span>
        <span class="learn-chapter-card-count">${chDone}/${allChLessons.length}</span>
      `;
      card.appendChild(head);

      const list = document.createElement('div');
      list.className = 'learn-chapter-lessons';

      chLessons.forEach(lesson => {
        const btn = document.createElement('button');
        const isCurr = currentLesson && lesson.id === currentLesson.id;
        const isDone = !!state.completed[lesson.id];
        btn.className = 'learn-drawer-item' + (isCurr ? ' current' : '') + (isDone ? ' done' : '') + (lesson.isBoss ? ' boss' : '');
        const padId = String(lesson.id).padStart(2, '0');
        btn.innerHTML = `
          <span class="learn-drawer-check">${isDone ? '✓' : padId}</span>
          <span class="learn-drawer-label">${lesson.isBoss ? '★ ' : ''}${escHtml(lesson.title)}</span>
        `;
        btn.addEventListener('click', () => {
          closeDrawer();
          loadLesson(lesson.id);
        });
        list.appendChild(btn);
      });

      card.appendChild(list);
      drawerGrid.appendChild(card);
    });
  }

  function openDrawer() {
    renderDrawer(searchInput.value);
    drawerBackdrop.style.display = 'flex';
    btnCurriculum.setAttribute('aria-expanded', 'true');
    searchInput.focus();
  }

  function closeDrawer() {
    drawerBackdrop.style.display = 'none';
    btnCurriculum.setAttribute('aria-expanded', 'false');
  }

  // ==========================================================================
  // Render Objectives List
  // ==========================================================================
  function renderObjectives(results = null) {
    if (!currentLesson) return;
    const checks = currentLesson.checks || [];
    objectivesList.innerHTML = '';

    let passedCount = 0;
    checks.forEach((chk, idx) => {
      const li = document.createElement('li');
      const res = results ? results[idx] : null;
      if (res && res.passed) passedCount++;

      li.className = 'learn-objective-item' + (res ? (res.passed ? ' pass' : ' fail') : '');
      const icon = res ? (res.passed ? '✓' : '✗') : '○';
      let detailHtml = '';
      if (res && !res.passed && res.reason) {
        detailHtml = `<div class="learn-objective-reason">${escHtml(res.reason)}</div>`;
      }
      li.innerHTML = `
        <span class="learn-objective-icon">${icon}</span>
        <div class="learn-objective-text">
          <span>${escHtml(chk.label)}</span>
          ${detailHtml}
        </div>
      `;
      objectivesList.appendChild(li);
    });

    objectivesScore.textContent = results
      ? `${passedCount} / ${checks.length} Passed`
      : `${checks.length} Objective${checks.length > 1 ? 's' : ''}`;
  }

  // ==========================================================================
  // Load a Lesson into the Workspace
  // ==========================================================================
  function buildFreshFiles(lesson, useSolution = false) {
    const files = {};
    files['main.krb'] = useSolution ? lesson.solution : lesson.starter;
    const extra = useSolution ? (lesson.solutionFiles || lesson.extraFiles) : lesson.extraFiles;
    if (extra) {
      Object.keys(extra).forEach(k => { files[k] = extra[k]; });
    }
    return files;
  }

  function loadLesson(id) {
    const lesson = LESSONS.find(l => l.id === id) || LESSONS[0];
    if (!lesson) return;
    currentLesson = lesson;
    state.currentId = lesson.id;
    saveState();

    if (window.location.hash !== `#lesson-${lesson.id}`) {
      history.replaceState(null, '', `#lesson-${lesson.id}`);
    }

    const padId = String(lesson.id).padStart(2, '0');
    const total = String(LESSONS.length).padStart(2, '0');
    topbarTitle.textContent = `${padId} / ${total} • ${lesson.title}`;

    const ch = CHAPTERS.find(c => c.id === lesson.chapter);
    chapterBadge.textContent = ch ? `Chapter ${ch.id}: ${ch.title}` : `Chapter ${lesson.chapter}`;
    bossBadge.style.display = lesson.isBoss ? 'inline-flex' : 'none';

    lessonTitle.textContent = `${lesson.id}. ${lesson.title}`;
    lessonSummary.textContent = lesson.summary;
    lessonBody.innerHTML = lesson.body;

    lessonBody.querySelectorAll('pre code.language-kuroba').forEach(block => {
      block.innerHTML = highlightKuroba(block.textContent.trim());
    });

    // Reset hint & banner
    hintBox.style.display = 'none';
    hintBox.innerHTML = `<strong>Hint:</strong> ${lesson.hint}`;
    btnToggleHint.textContent = 'Show Hint';
    successBanner.style.display = 'none';

    // Prev / Next state
    const idx = LESSONS.findIndex(l => l.id === lesson.id);
    btnPrev.disabled = idx <= 0;
    btnNext.disabled = idx >= LESSONS.length - 1;

    // Load saved draft or starter files
    if (state.drafts[lesson.id] && typeof state.drafts[lesson.id]['main.krb'] === 'string') {
      currentFiles = Object.assign({}, state.drafts[lesson.id]);
    } else {
      currentFiles = buildFreshFiles(lesson, false);
    }
    activeFile = 'main.krb';
    editor.value = currentFiles['main.krb'];
    renderFileTabs();
    updateGutter();
    updateCursor();

    renderObjectives(null);
    updateProgressUI();
    guideScroll.scrollTop = 0;

    clearConsole();
    appendTerm(`Lesson ${padId}/${total}: ${lesson.title}`, 'sys');
    appendTerm('Click [Verify ✓] or press [Ctrl + Enter] to run and validate your code.', 'sys');
  }

  // ==========================================================================
  // Strip Comments Helper (for Structural Code Checks)
  // ==========================================================================
  function stripComments(src) {
    let out = src.replace(/~~\{\{[\s\S]*?\}\}/g, '');
    out = out.replace(/~~.*$/gm, '');
    return out;
  }

  // ==========================================================================
  // Execute & Grade Engine (Double Validation: WASM State Probes + Stdout)
  // ==========================================================================
  function runUserCode(gradeMode) {
    if (!window.Kuroba || !window.Kuroba.isReady) {
      appendTerm('WebAssembly runtime is still loading, please wait a moment...', 'err');
      return;
    }

    persistDraft();
    clearConsole();

    const code = currentFiles['main.krb'] || '';
    const extraFiles = {};
    Object.keys(currentFiles).forEach(k => {
      if (k !== 'main.krb') extraFiles[k] = currentFiles[k];
    });

    const stdoutLines = [];
    const stderrLines = [];

    window.Kuroba.reset();
    const t0 = performance.now();

    const exitCode = window.Kuroba.run(code, {
      files: extraFiles,
      onPrint: (txt) => {
        stdoutLines.push(txt);
        appendTerm(txt, 'out');
      },
      onError: (err) => {
        stderrLines.push(err);
        appendTerm(err, 'err');
      }
    });

    const elapsed = (performance.now() - t0).toFixed(1);
    timingBadge.textContent = `• ${elapsed} ms`;
    timingBadge.style.display = 'inline';

    const hadRuntimeError = (exitCode !== 0 || stderrLines.length > 0);

    if (!gradeMode) {
      if (!hadRuntimeError) {
        appendTerm(`[Executed in ${elapsed} ms — click Verify ✓ to grade objectives]`, 'sys');
      }
      return;
    }

    // Grade all lesson checks
    const fullStdout = stdoutLines.join('\n').trim();
    const cleanSource = stripComments(Object.values(currentFiles).join('\n'));
    const results = [];

    for (const chk of (currentLesson.checks || [])) {
      if (hadRuntimeError && !chk.allowError) {
        results.push({ passed: false, reason: stderrLines[0] || 'Fix syntax/runtime error first.' });
        continue;
      }

      if (chk.type === 'code') {
        const re = chk.pattern instanceof RegExp ? chk.pattern : new RegExp(chk.pattern);
        const ok = chk.negate ? !re.test(cleanSource) : re.test(cleanSource);
        results.push({
          passed: ok,
          reason: ok ? '' : (chk.failMsg || 'Required syntax construct was not used in your code.')
        });
      } else if (chk.type === 'stdout') {
        let ok = false;
        if (chk.exact !== undefined) {
          ok = (fullStdout === String(chk.exact).trim());
        } else if (chk.includes !== undefined) {
          ok = fullStdout.includes(String(chk.includes));
        } else if (chk.regex !== undefined) {
          const re = chk.regex instanceof RegExp ? chk.regex : new RegExp(chk.regex);
          ok = re.test(fullStdout);
        } else if (chk.nonEmpty) {
          ok = fullStdout.length > 0;
        }
        results.push({
          passed: ok,
          reason: ok ? '' : (chk.failMsg || `Console output was "${fullStdout || '(empty)'}".`)
        });
      } else if (chk.type === 'krb') {
        const probeLines = [];
        const probeScript = chk.script
          ? `try\ndo\n${chk.script}\nend\ncatch (ivar __e) then\npasteLn("__KRB_ERR__:" + __e.eName + ": " + __e.eContext);\nend`
          : `try\ndo\nif (${chk.expr}) then pasteLn("__KRB_OK__"); else pasteLn("__KRB_FAIL__"); end\nend\ncatch (ivar __e) then\npasteLn("__KRB_ERR__:" + __e.eName + ": " + __e.eContext);\nend`;

        window.Kuroba.run(probeScript, {
          onPrint: (t) => probeLines.push(t),
          onError: (e) => probeLines.push('__KRB_ERR__:' + e)
        });

        const joined = probeLines.join('\n');
        if (joined.includes('__KRB_OK__')) {
          results.push({ passed: true });
        } else {
          const errLine = probeLines.find(l => l.startsWith('__KRB_ERR__:'));
          const detail = errLine ? errLine.replace('__KRB_ERR__:', '') : (chk.failMsg || 'Runtime state check did not match expected value.');
          results.push({ passed: false, reason: detail });
        }
      }
    }

    renderObjectives(results);

    const allPassed = results.length > 0 && results.every(r => r.passed);
    if (allPassed) {
      state.completed[currentLesson.id] = true;
      saveState();
      updateProgressUI();

      const idx = LESSONS.findIndex(l => l.id === currentLesson.id);
      const hasNext = idx < LESSONS.length - 1;
      successHeading.textContent = currentLesson.isBoss
        ? `★ Boss Challenge Conquered! (${currentLesson.id}/${LESSONS.length})`
        : `✓ Lesson ${currentLesson.id} Completed!`;
      successSub.textContent = hasNext
        ? `Next up: ${LESSONS[idx + 1].title}`
        : 'Congratulations — you have completed all 50 lessons of the Kuroba Manual!';
      btnBannerNext.style.display = hasNext ? 'inline-flex' : 'none';
      successBanner.style.display = 'flex';
      appendTerm(`✓ All ${results.length}/${results.length} objectives passed in ${elapsed} ms!`, 'ok');
    } else {
      successBanner.style.display = 'none';
      const failedCount = results.filter(r => !r.passed).length;
      appendTerm(`✗ ${failedCount} objective${failedCount > 1 ? 's' : ''} still failing — check the checklist on the left.`, 'exc');
    }
  }

  // ==========================================================================
  // Event Listeners & Shortcuts
  // ==========================================================================
  window.__onKurobaLearnReady = () => {
    engineStatus.innerHTML = `<span class="status-indicator" style="color: var(--text-moss);">●</span> WASM Engine Ready`;
    appendTerm('>> Kuroba Native C99 WebAssembly Engine ready.', 'ok');
  };
  if (window.Kuroba && window.Kuroba.isReady) {
    window.__onKurobaLearnReady();
  }

  btnCurriculum.addEventListener('click', () => {
    if (drawerBackdrop.style.display === 'none') openDrawer();
    else closeDrawer();
  });
  btnCloseDrawer.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', (e) => {
    if (e.target === drawerBackdrop) closeDrawer();
  });
  searchInput.addEventListener('input', () => renderDrawer(searchInput.value));

  btnResetProgress.addEventListener('click', () => {
    if (confirm('Clear all completed checkmarks across the 50 lessons? (Your code drafts will be kept.)')) {
      state.completed = {};
      saveState();
      updateProgressUI();
      renderDrawer(searchInput.value);
    }
  });

  btnPrev.addEventListener('click', () => {
    const idx = LESSONS.findIndex(l => l.id === currentLesson.id);
    if (idx > 0) loadLesson(LESSONS[idx - 1].id);
  });
  btnNext.addEventListener('click', () => {
    const idx = LESSONS.findIndex(l => l.id === currentLesson.id);
    if (idx >= 0 && idx < LESSONS.length - 1) loadLesson(LESSONS[idx + 1].id);
  });
  btnBannerNext.addEventListener('click', () => {
    const idx = LESSONS.findIndex(l => l.id === currentLesson.id);
    if (idx >= 0 && idx < LESSONS.length - 1) loadLesson(LESSONS[idx + 1].id);
  });

  btnToggleHint.addEventListener('click', () => {
    const open = hintBox.style.display === 'none';
    hintBox.style.display = open ? 'block' : 'none';
    btnToggleHint.textContent = open ? 'Hide Hint' : 'Show Hint';
  });

  btnShowSolution.addEventListener('click', () => {
    if (!currentLesson) return;
    if (confirm('Replace the editor contents with the reference solution for this lesson?')) {
      currentFiles = buildFreshFiles(currentLesson, true);
      activeFile = 'main.krb';
      editor.value = currentFiles['main.krb'];
      renderFileTabs();
      updateGutter();
      updateCursor();
      persistDraft();
    }
  });

  btnResetCode.addEventListener('click', () => {
    if (!currentLesson) return;
    currentFiles = buildFreshFiles(currentLesson, false);
    activeFile = 'main.krb';
    editor.value = currentFiles['main.krb'];
    delete state.drafts[currentLesson.id];
    saveState();
    renderFileTabs();
    updateGutter();
    updateCursor();
    renderObjectives(null);
    successBanner.style.display = 'none';
  });

  btnRunOnly.addEventListener('click', () => runUserCode(false));
  btnVerify.addEventListener('click', () => runUserCode(true));
  btnClearConsole.addEventListener('click', clearConsole);

  editor.addEventListener('input', () => {
    updateGutter();
    updateCursor();
    persistDraft();
  });
  editor.addEventListener('scroll', () => {
    gutter.scrollTop = editor.scrollTop;
  });
  editor.addEventListener('click', updateCursor);
  editor.addEventListener('keyup', updateCursor);

  editor.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      runUserCode(true);
      return;
    }
    if (e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      runUserCode(false);
      return;
    }
    if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      const val = editor.value;
      const start = editor.selectionStart;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = val.indexOf('\n', start);
      if (lineEnd === -1) lineEnd = val.length;
      const line = val.slice(lineStart, lineEnd);
      const m = line.match(/^(\s*)/);
      const indent = m ? m[1] : '';
      const rest = line.slice(indent.length);
      let nextLine;
      let delta;
      if (rest.startsWith('~~ ')) { nextLine = indent + rest.slice(3); delta = -3; }
      else if (rest.startsWith('~~')) { nextLine = indent + rest.slice(2); delta = -2; }
      else { nextLine = indent + '~~ ' + rest; delta = 3; }
      editor.value = val.slice(0, lineStart) + nextLine + val.slice(lineEnd);
      editor.selectionStart = editor.selectionEnd = Math.max(lineStart, start + delta);
      updateGutter();
      persistDraft();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = editor.value;
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.slice(lineStart, start);
      const m = currentLine.match(/^(\s*)/);
      let indent = m ? m[1] : '';
      const trimmed = currentLine.trim();
      if (trimmed.endsWith('then') || trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed === 'try') {
        indent += '    ';
      }
      const ins = '\n' + indent;
      editor.value = val.slice(0, start) + ins + val.slice(end);
      editor.selectionStart = editor.selectionEnd = start + ins.length;
      updateGutter();
      updateCursor();
      persistDraft();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 4;
      updateGutter();
      persistDraft();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerBackdrop.style.display !== 'none') {
      closeDrawer();
      return;
    }
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      btnPrev.click();
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      btnNext.click();
    }
  });

  // Initialize Manual
  loadState();
  loadLesson(state.currentId);
});
