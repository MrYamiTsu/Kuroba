/* ============================================================================
   Kuroba — Interactive Playground Controller
   ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('ide-editor');
  const gutter = document.getElementById('ide-gutter');
  const terminalScreen = document.getElementById('terminal-screen');
  const btnRun = document.getElementById('btn-execute');
  const btnClearEditor = document.getElementById('btn-clear-editor');
  const btnClearTerm = document.getElementById('btn-clear-term');
  const timingBadge = document.getElementById('timing-badge');
  const statusCursor = document.getElementById('status-cursor');
  const tabsList = document.getElementById('ide-file-tabs-list');
  const btnAddFile = document.getElementById('btn-add-file');
  const statusActiveFile = document.getElementById('status-active-file');

  const ENTRY_FILE = 'main.krb';
  const STORAGE_KEY = 'kuroba_playground_workspace_v1';

  // ==========================================================================
  // Multi-File Workspace State & Persistence
  // ==========================================================================
  let workspaceFiles = { [ENTRY_FILE]: '' };
  let fileOrder = [ENTRY_FILE];
  let activeFile = ENTRY_FILE;

  function loadWorkspace() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.files && typeof parsed.files[ENTRY_FILE] === 'string') {
          workspaceFiles = parsed.files;
          fileOrder = Array.isArray(parsed.order)
            ? parsed.order.filter(f => f in workspaceFiles)
            : Object.keys(workspaceFiles);
          if (!fileOrder.includes(ENTRY_FILE)) fileOrder.unshift(ENTRY_FILE);
          activeFile = (parsed.active && parsed.active in workspaceFiles) ? parsed.active : ENTRY_FILE;
        }
      }
    } catch (e) {}
  }

  function saveWorkspace() {
    try {
      workspaceFiles[activeFile] = editor.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        files: workspaceFiles,
        order: fileOrder,
        active: activeFile
      }));
    } catch (e) {}
  }

  function updateActiveFileStatus() {
    if (!statusActiveFile) return;
    if (activeFile === ENTRY_FILE) {
      statusActiveFile.innerHTML = `<span class="status-indicator">●</span> Entry: ${ENTRY_FILE}`;
    } else {
      statusActiveFile.innerHTML = `<span class="status-indicator">●</span> Editing: ${activeFile} (Run executes ${ENTRY_FILE})`;
    }
  }

  function switchToFile(fileName) {
    if (!(fileName in workspaceFiles)) return;
    workspaceFiles[activeFile] = editor.value;
    activeFile = fileName;
    editor.value = workspaceFiles[activeFile];
    editor.scrollTop = 0;
    if (gutter) gutter.scrollTop = 0;
    updateGutter();
    updateCursorPosition();
    updateActiveFileStatus();
    renderFileTabs();
    saveWorkspace();
  }

  function normalizeFilename(rawName) {
    let clean = rawName.trim().replace(/[^a-zA-Z0-9_.-]/g, '');
    if (!clean) return null;
    if (!clean.endsWith('.krb')) clean += '.krb';
    return clean;
  }

  function startRenameTab(fileName, tabEl, labelEl) {
    if (fileName === ENTRY_FILE) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ide-tab-rename-input';
    input.value = fileName;

    let committed = false;
    function finishRename(apply) {
      if (committed) return;
      committed = true;

      if (apply) {
        const nextName = normalizeFilename(input.value);
        if (nextName && nextName !== fileName && nextName !== ENTRY_FILE && !(nextName in workspaceFiles)) {
          workspaceFiles[activeFile] = editor.value;
          workspaceFiles[nextName] = workspaceFiles[fileName];
          delete workspaceFiles[fileName];
          const idx = fileOrder.indexOf(fileName);
          if (idx !== -1) fileOrder[idx] = nextName;
          if (activeFile === fileName) activeFile = nextName;
          saveWorkspace();
        }
      }
      renderFileTabs();
      updateActiveFileStatus();
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishRename(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishRename(false);
      }
    });
    input.addEventListener('blur', () => finishRename(true));
    input.addEventListener('click', (e) => e.stopPropagation());

    labelEl.replaceWith(input);
    input.focus();
    const dotIdx = input.value.lastIndexOf('.');
    input.setSelectionRange(0, dotIdx > 0 ? dotIdx : input.value.length);
  }

  function deleteFile(fileName) {
    if (fileName === ENTRY_FILE || !(fileName in workspaceFiles)) return;
    const idx = fileOrder.indexOf(fileName);
    delete workspaceFiles[fileName];
    if (idx !== -1) fileOrder.splice(idx, 1);
    if (activeFile === fileName) {
      activeFile = fileOrder[Math.max(0, idx - 1)] || ENTRY_FILE;
      editor.value = workspaceFiles[activeFile];
      updateGutter();
      updateCursorPosition();
    }
    updateActiveFileStatus();
    renderFileTabs();
    saveWorkspace();
  }

  function createNewFile() {
    workspaceFiles[activeFile] = editor.value;
    let counter = 1;
    let candidate = `file${counter}.krb`;
    while (candidate in workspaceFiles) {
      counter++;
      candidate = `file${counter}.krb`;
    }

    workspaceFiles[candidate] = '';
    fileOrder.push(candidate);
    activeFile = candidate;
    editor.value = '';
    updateGutter();
    updateCursorPosition();
    updateActiveFileStatus();
    renderFileTabs();
    saveWorkspace();
    editor.focus();
  }

  function renderFileTabs(autoRenameTarget = null) {
    if (!tabsList) return;
    tabsList.innerHTML = '';

    for (const fileName of fileOrder) {
      const isEntry = (fileName === ENTRY_FILE);
      const tab = document.createElement('div');
      tab.className = `ide-file-tab${fileName === activeFile ? ' active' : ''}${isEntry ? ' locked' : ''}`;
      tab.title = isEntry
        ? 'Entry point executed by Run ▶ (locked)'
        : 'Click to edit • Double-click name to rename';

      const label = document.createElement('span');
      label.className = 'ide-tab-label';
      label.textContent = fileName;
      tab.appendChild(label);

      if (isEntry) {
        const tag = document.createElement('span');
        tag.className = 'ide-tab-entry-tag';
        tag.textContent = 'entry';
        tab.appendChild(tag);
      } else {
        label.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          startRenameTab(fileName, tab, label);
        });

        const renameBtn = document.createElement('button');
        renameBtn.className = 'ide-tab-rename';
        renameBtn.title = `Rename ${fileName}`;
        renameBtn.innerHTML = '&#9998;';
        renameBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          startRenameTab(fileName, tab, label);
        });
        tab.appendChild(renameBtn);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'ide-tab-close';
        closeBtn.title = `Delete ${fileName}`;
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteFile(fileName);
        });
        tab.appendChild(closeBtn);
      }

      tab.addEventListener('click', () => {
        if (activeFile !== fileName) {
          switchToFile(fileName);
        }
      });

      tabsList.appendChild(tab);

      if (autoRenameTarget === fileName) {
        startRenameTab(fileName, tab, label);
      }
    }
  }

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
    saveWorkspace();
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
      <div class="term-line sys">Kuroba (KRB) Web Runtime Engine v1.0.6</div>
      <div class="term-line sys">Terminal output cleared. Ready for execution.</div>
      <div class="term-line sys">--------------------------------------------------------------------------------</div>
    `;
    timingBadge.style.display = 'none';
  }

  // ==========================================================================
  // Execution Engine Call (Always executes main.krb with workspace files)
  // ==========================================================================
  function executeScript() {
    workspaceFiles[activeFile] = editor.value;
    saveWorkspace();

    const code = workspaceFiles[ENTRY_FILE] || '';
    if (!code.trim()) {
      printTerminal(`Notice: '${ENTRY_FILE}' is empty. Write entry code in ${ENTRY_FILE} first.`, "sys");
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    printTerminal(`[${timeStr}] kuroba@runtime:~$ run ${ENTRY_FILE}`, "sys");
    const t0 = performance.now();
    let hasEncounteredError = false;

    try {
      if (typeof window.Kuroba === 'undefined' || typeof window.Kuroba.run !== 'function') {
        throw new Error("Kuroba Web Engine is not loaded or initializing...");
      }

      window.Kuroba.run(code, {
        files: workspaceFiles,
        onPrint: (txt, newLine) => {
          printTerminal(txt, 'out');
        },
        onError: (err, isException) => {
          hasEncounteredError = true;
          printTerminal(err, isException ? 'exc' : 'err');
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
      if (!hasEncounteredError) {
        printTerminal(e.message || String(e), 'err');
      }
    }
  }

  // ==========================================================================
  // Event Listeners & Keyboard Shortcuts
  // ==========================================================================
  if (btnAddFile) {
    btnAddFile.addEventListener('click', createNewFile);
  }

  btnClearEditor.addEventListener('click', () => {
    editor.value = '';
    workspaceFiles[activeFile] = '';
    updateGutter();
    updateCursorPosition();
    saveWorkspace();
    editor.focus();
  });

  btnClearTerm.addEventListener('click', clearTerminal);
  btnRun.addEventListener('click', executeScript);

  editor.addEventListener('keydown', (e) => {
    // Ctrl + Enter to Run main.krb
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
      saveWorkspace();
    }
  });

  // ==========================================================================
  // Workspace Initialization & URL Parameter (?code=...)
  // ==========================================================================
  loadWorkspace();

  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');

  if (codeParam) {
    try {
      workspaceFiles[ENTRY_FILE] = decodeURIComponent(codeParam);
    } catch (e) {
      workspaceFiles[ENTRY_FILE] = codeParam;
    }
    activeFile = ENTRY_FILE;
  }

  editor.value = workspaceFiles[activeFile] || '';
  updateGutter();
  updateCursorPosition();
  updateActiveFileStatus();
  renderFileTabs();
});
