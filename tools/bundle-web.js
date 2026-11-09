const fs = require('fs');
const path = require('path');

// Read stdlib files to embed in virtual FS
const stdDir = path.join(__dirname, '../lib/std');
const stdFiles = {};
for (const file of fs.readdirSync(stdDir)) {
    if (file.endsWith('.krb')) {
        stdFiles[file] = fs.readFileSync(path.join(stdDir, file), 'utf-8');
    }
}

// Generate self-contained bundle for browser
const bundleCode = `/**
 * Kuroba (黒羽) — In-Browser Runtime Engine v1.0.5
 * Zero External Dependencies • Pure Vanilla JavaScript
 */
(function(global) {
    'use strict';

    // Embedded Standard Library Files
    const VIRTUAL_STD_FILES = ${JSON.stringify(stdFiles, null, 2)};
    
    // In-memory Virtual Filesystem for Std.IO in the browser
    const virtualFS = {
        'memo.txt': 'Bienvenue dans Kuroba Web Storage !\\n',
        'savegame.dat': 'Héros: Kenji\\nNiveau: 10\\n'
    };

    // Load from localStorage if available
    try {
        const saved = localStorage.getItem('kuroba_virtual_fs');
        if (saved) Object.assign(virtualFS, JSON.parse(saved));
    } catch(e) {}

    function persistVirtualFS() {
        try {
            localStorage.setItem('kuroba_virtual_fs', JSON.stringify(virtualFS));
        } catch(e) {}
    }

    let activePrintHandler = (txt, nl) => console.log(txt);
    let activeErrorHandler = (err) => { throw new Error(err); };
    let activeClearHandler = () => {};

    let tryDepth = 0;
    function pushTryContext() { tryDepth++; }
    function popTryContext() { tryDepth--; }
    function isInsideTry() { return tryDepth > 0; }

    class KurobaUserException extends Error {
        constructor(value, formattedMsg) {
            super(formattedMsg);
            this.isKurobaUserException = true;
            this.value = value;
            this.formattedMsg = formattedMsg;
        }
    }

    class KurobaRuntimeError extends Error {
        constructor(message) {
            super(message);
            this.isKurobaRuntimeError = true;
            this.message = message;
        }
    }

    function printErr(msg) {
        if (tryDepth > 0) {
            throw new KurobaRuntimeError(msg);
        }
        if (activeErrorHandler) {
            activeErrorHandler(msg);
        } else {
            console.error(msg);
        }
        throw new Error(msg);
    }

    function printException(msg) {
        if (activeErrorHandler) {
            activeErrorHandler(msg, true);
        } else {
            console.error(msg);
        }
        throw new Error(msg);
    }

    // =========================================================================
    // 1. LEXER
    // =========================================================================
    ${fs.readFileSync(path.join(__dirname, '../src/lexer.js'), 'utf-8')
        .replace(/const\s*{\s*printErr\s*}\s*=\s*require\([^)]+\);?/, '')
        .replace(/module\.exports\s*=\s*{[^}]+};?/, '')}

    // =========================================================================
    // 2. PARSER
    // =========================================================================
    ${fs.readFileSync(path.join(__dirname, '../src/parser.js'), 'utf-8')
        .replace(/const\s*{\s*printErr\s*}\s*=\s*require\([^)]+\);?/, '')
        .replace(/const\s*{\s*tokenize\s*}\s*=\s*require\([^)]+\);?/, '')
        .replace(/module\.exports\s*=\s*{[^}]+};?/, '')}

    // =========================================================================
    // 3. RUNTIME NATIVES
    // =========================================================================
    const natives = {
        random: (...args) => {
            if (args.length === 0) return Math.random();
            if (args.length === 1) return Math.floor(Math.random() * Math.floor(args[0])) + 1;
            const min = Math.ceil(args[0]), max = Math.floor(args[1]);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        sqrt: (x) => Math.sqrt(x),
        pow: (b, e) => Math.pow(b, e),
        sin: (x) => Math.sin(x),
        cos: (x) => Math.cos(x),
        tan: (x) => Math.tan(x),
        atan2: (y, x) => Math.atan2(y, x),
        asin: (x) => Math.asin(x),
        acos: (x) => Math.acos(x),
        atan: (x) => Math.atan(x),
        log: (x) => Math.log(x),
        log10: (x) => Math.log10(x),
        exp: (x) => Math.exp(x),
        sleep: (ms) => {
            const end = performance.now() + Math.max(0, ms);
            while (performance.now() < end) {}
        },
        now: () => Date.now(),
        unix: () => Math.floor(Date.now() / 1000),
        perf: () => performance.now(),
        iso: () => new Date().toISOString().slice(0, 19),
        clock: () => {
            const d = new Date();
            const makeField = (v) => ({ value: v, type: 'Int', isNullable: false });
            return {
                kind: 'Table',
                fields: {
                    year: makeField(d.getFullYear()),
                    month: makeField(d.getMonth() + 1),
                    day: makeField(d.getDate()),
                    hours: makeField(d.getHours()),
                    minutes: makeField(d.getMinutes()),
                    seconds: makeField(d.getSeconds()),
                    ms: makeField(d.getMilliseconds())
                }
            };
        },
        timeFormat: (ms) => {
            const totalSec = Math.floor(ms / 1000);
            const hours = Math.floor(totalSec / 3600);
            const minutes = Math.floor((totalSec % 3600) / 60);
            const seconds = totalSec % 60;
            const pad = (n) => (n < 10 ? '0' + n : '' + n);
            return hours > 0 ? \`\${pad(hours)}:\${pad(minutes)}:\${pad(seconds)}\` : \`\${pad(minutes)}:\${pad(seconds)}\`;
        },
        strUpper: (str) => String(str).toUpperCase(),
        strLower: (str) => String(str).toLowerCase(),
        strCount: (str) => String(str).length,
        strTrim: (str) => String(str).trim(),
        strSplit: (str, sep) => String(str).split(sep !== undefined ? String(sep) : ' '),
        strReplace: (str, target, repl) => String(str).replaceAll(String(target), String(repl)),
        strContains: (str, sub) => String(str).includes(String(sub)),
        strStartsWith: (str, prefix) => String(str).startsWith(String(prefix)),
        strEndsWith: (str, suffix) => String(str).endsWith(String(suffix)),
        strIndexOf: (str, sub) => String(str).indexOf(String(sub)),
        strSlice: (str, start, end) => String(str).slice(start, end !== undefined ? end : undefined),
        strRepeat: (str, n) => String(str).repeat(n),
        strReverse: (str) => String(str).split('').reverse().join(''),
        strJoin: (list, sep) => Array.isArray(list) ? list.join(sep !== undefined ? String(sep) : '') : '',
        ioCopy: (filePath) => {
            const p = String(filePath);
            if (!(p in virtualFS)) {
                printErr(\`[IOError] File not found: '\${p}'.\`);
            }
            return virtualFS[p];
        },
        ioPaste: (filePath, content) => {
            const p = String(filePath);
            virtualFS[p] = String(content);
            persistVirtualFS();
            return true;
        },
        ioPasteLn: (filePath, content) => {
            const p = String(filePath);
            virtualFS[p] = (virtualFS[p] || '') + String(content) + '\\n';
            persistVirtualFS();
            return true;
        },
        ioAppend: (filePath, content) => {
            const p = String(filePath);
            virtualFS[p] = (virtualFS[p] || '') + String(content);
            persistVirtualFS();
            return true;
        },
        ioExists: (filePath) => {
            return String(filePath) in virtualFS;
        },
        ioKill: (filePath) => {
            const p = String(filePath);
            if (p in virtualFS) {
                delete virtualFS[p];
                persistVirtualFS();
                return true;
            }
            return false;
        }
    };

    // =========================================================================
    // 4. EVALUATOR MODULES
    // =========================================================================
    ${fs.readFileSync(path.join(__dirname, '../src/evaluator/scope.js'), 'utf-8')
        .replace(/const\s*{\s*printErr\s*}\s*=\s*require\([^)]+\);?/, '')
        .replace(/module\.exports\s*=\s*{[^}]+};?/, '')}

    ${fs.readFileSync(path.join(__dirname, '../src/evaluator/types.js'), 'utf-8')
        .replace(/const\s*{\s*printErr\s*}\s*=\s*require\([^)]+\);?/, '')
        .replace(/module\.exports\s*=\s*{[^}]+};?/, '')}

    ${fs.readFileSync(path.join(__dirname, '../src/evaluator/operations.js'), 'utf-8')
        .replace(/const\s*[^;]+=\s*require\([^)]+\);?/g, '')
        .replace(/module\.exports\s*=\s*{[^}]+};?/, '')}

    ${fs.readFileSync(path.join(__dirname, '../src/evaluator/variables.js'), 'utf-8')
        .replace(/const\s*[^;]+=\s*require\([^)]+\);?/g, '')
        .replace(/module\.exports\s*=\s*{[^}]+};?/, '')}

    ${fs.readFileSync(path.join(__dirname, '../src/evaluator/collections.js'), 'utf-8')
        .replace(/const\s*[^;]+=\s*require\([^)]+\);?/g, '')
        .replace(/module\.exports\s*=\s*{[^}]+};?/, '')}

    ${fs.readFileSync(path.join(__dirname, '../src/evaluator/control.js'), 'utf-8')
        .replace(/const\s*[^;]+=\s*require\([^)]+\);?/g, '')
        .replace(/module\.exports\s*=\s*{[^}]+};?/, '')}

    ${fs.readFileSync(path.join(__dirname, '../src/evaluator/functions.js'), 'utf-8')
        .replace(/const\s*[^;]+=\s*require\([^)]+\);?/g, '')
        .replace(/module\.exports\s*=\s*{[^}]+};?/, '')}

    // Web IO functions
    function evalPaste(node, env) {
        if (node.isEmpty) {
            if (node.newLine && activePrintHandler) activePrintHandler('', true);
            return null;
        }
        let val = evaluate(node.expr, env);
        let txt = formatKurobaValue(val);
        if (activePrintHandler) activePrintHandler(txt, node.newLine);
        return val;
    }

    function evalCopy(node, env) {
        let promptText = "Entrée Kuroba :";
        if (node.prompt !== null) {
            let val = evaluate(node.prompt, env);
            promptText = formatKurobaValue(val);
        }
        let result = prompt(promptText) || "";
        if (node.oneKey) return result.charAt(0);
        return result;
    }

    function evalClear(node, env) {
        if (node.cond !== null) {
            let condVal = evaluate(node.cond, env);
            if (!isTruthy(condVal)) return null;
        }
        if (activeClearHandler) activeClearHandler();
        return null;
    }

    function evalExit(node, env) {
        if (node.cond !== null) {
            let condVal = evaluate(node.cond, env);
            if (!isTruthy(condVal)) return null;
        }
        if (activePrintHandler) activePrintHandler("[Exit] Exécution interrompue par instruction exit.", true);
        throw new Error("[Exit] Programme arrêté (exit).");
    }

    // Web Packages functions (using in-memory virtual standard library)
    const moduleCache = {};

    function evaluateNamespaceBody(statements) {
        const moduleScope = createScope();
        for (const [name, fn] of Object.entries(natives)) {
            moduleScope.values['__native_' + name] = {
                value: { kind: 'Function', isNative: true, fn },
                type: 'Function',
                isConst: true,
                isNullable: false
            };
        }
        for (const stmt of statements) {
            evaluate(stmt, moduleScope);
        }
        const tableFields = {};
        for (const [varName, varEntry] of Object.entries(moduleScope.values)) {
            if (!varName.startsWith('__native_')) {
                tableFields[varName] = {
                    value: varEntry.value,
                    type: varEntry.type,
                    isNullable: varEntry.isNullable
                };
            }
        }
        return { kind: 'Table', fields: tableFields };
    }

    function discoverNamespaceModules(pkgName) {
        const discovered = {};
        for (const [fileName, source] of Object.entries(VIRTUAL_STD_FILES)) {
            const ast = parse(tokenize(source));
            for (const stmt of ast.body) {
                if (stmt.type === 'NamespaceStatement' && stmt.namespace === pkgName) {
                    const modName = stmt.module || pkgName;
                    const cacheKey = pkgName + ':' + modName;
                    if (!moduleCache[cacheKey]) {
                        moduleCache[cacheKey] = evaluateNamespaceBody(stmt.body);
                    }
                    discovered[modName] = moduleCache[cacheKey];
                }
            }
        }
        return discovered;
    }

    function evalImport(node, env) {
        if (node.package === 'Main') {
            printErr("[ImportError] Cannot import namespace 'Main'. 'Main' is the execution root.");
        }
        if (node.package !== 'Std') {
            printErr("[ImportError] Unknown package '" + node.package + "'. Available packages: 'Std'.");
        }
        const availableModules = discoverNamespaceModules(node.package);
        const isFullPackage = !node.modules || node.modules.length === 0;
        const modulesToBind = {};
        if (isFullPackage) {
            Object.assign(modulesToBind, availableModules);
        } else {
            for (const modName of node.modules) {
                if (!(modName in availableModules)) {
                    printErr("[ImportError] Module '" + modName + "' not found in namespace '" + node.package + "'.");
                }
                modulesToBind[modName] = availableModules[modName];
            }
        }

        if (node.alias === '~') {
            for (const [modName, modTable] of Object.entries(modulesToBind)) {
                env.values[modName] = {
                    value: modTable,
                    type: 'Table',
                    isConst: true,
                    isNullable: false
                };
            }
            return null;
        }

        const targetName = node.alias || node.package;
        const pkgTable = {
            kind: 'Table',
            fields: {}
        };
        for (const [modName, modTable] of Object.entries(modulesToBind)) {
            pkgTable.fields[modName] = {
                value: modTable,
                type: 'Table',
                isNullable: false
            };
        }
        env.values[targetName] = {
            value: pkgTable,
            type: 'Table',
            isConst: true,
            isNullable: false
        };
        return null;
    }

    function evalNamespace(node, env) {
        let result = null;
        for (let stmt of node.body) {
            result = evaluate(stmt, env);
            if (result && (result.isReturn || result.isBreak || result.isSkip)) return result;
        }
        return result;
    }

    // Evaluator main loop
    ${fs.readFileSync(path.join(__dirname, '../src/evaluator/index.js'), 'utf-8')
        .replace(/const\s*[^;]+=\s*require\([^)]+\);?/g, '')
        .replace(/module\.exports\s*=\s*{[^}]+};?/, '')}

    // Expose Kuroba API on global window
    global.Kuroba = {
        version: '1.0.5',
        run: function(sourceCode, options = {}) {
            activePrintHandler = options.onPrint || ((t, nl) => console.log(t));
            activeErrorHandler = options.onError || ((err) => { throw new Error(err); });
            activeClearHandler = options.onClear || (() => {});

            const tokens = tokenize(sourceCode);
            const ast = parse(tokens);
            const globalScope = createScope();
            return evaluate(ast, globalScope);
        },
        tokenize: tokenize,
        parse: parse
    };

})(typeof window !== 'undefined' ? window : global);
`;

fs.writeFileSync(path.join(__dirname, '../web/js/kuroba-web.js'), bundleCode, 'utf-8');
console.log('Successfully bundled web/js/kuroba-web.js (' + bundleCode.length + ' bytes)');
