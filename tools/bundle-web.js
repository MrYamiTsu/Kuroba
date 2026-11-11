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

function readSource(relPath) {
    return fs.readFileSync(path.join(__dirname, relPath), 'utf-8')
        .replace(/const\s*\{[^}]*\}\s*=\s*require\([^)]+\);?/g, '')
        .replace(/module\.exports\s*=\s*\{[^}]*\};?/g, '');
}

function readErrorFormatters() {
    const src = fs.readFileSync(path.join(__dirname, '../src/errors.js'), 'utf-8');
    const idx = src.indexOf('function formatTimestamp()');
    if (idx === -1) throw new Error('formatTimestamp not found in src/errors.js');
    return src.slice(idx).replace(/module\.exports\s*=\s*\{[^}]*\};?/g, '').trim();
}

function readAsyncEvaluator(relPath) {
    let code = readSource(relPath);

    code = code.replace(
        /(\w+(?:\.\w+)*)\.map\((\w+)\s*=>\s*evaluate\(([^)]+)\)\)/g,
        'await mapAsync($1, async ($2) => await evaluate($3))'
    );

    code = code.replace(
        /\bfunction (evaluate|executeBlock|eval(?:VarDeclar|VarAssign|VarRetype|ListLiteral|IndexAccess|IndexAssign|MemberAssign|MethodCall|TableLiteral|PropertyAssign|If|For|While|DoWhile|Given|ForIn|Throw|Try|Return|Call|Hook|Math|Unary|Logical|Is))\(/g,
        'async function $1('
    );

    code = code.replace(/(?<!async\s+function\s)\b(evaluate|executeBlock|evalCall)\(/g, 'await $1(');
    code = code.replace(/\b(caller\.fn|fnObj\.fn)\(/g, 'await $1(');

    if (relPath.endsWith('evaluator/index.js')) {
        code = code.replace(/return (eval[A-Z]\w*)\(/g, 'return await $1(');
        code = code.replace(
            /if \(!node \|\| !node\.type\) return node;/,
            `if (!node || !node.type) return node;
    if (activeRunAborted) throw new KurobaAbortError();
    if (++evalOpCount % 2000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (activeRunAborted) throw new KurobaAbortError();
    }`
        );
    }

    return code;
}

// Generate self-contained bundle for browser
const bundleCode = `/**
 * Kuroba — In-Browser Runtime Engine v1.0.6
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
    let activeInputHandler = null;
    let activeAbortHandler = null;
    let activeRunAborted = false;
    let evalOpCount = 0;

    async function mapAsync(arr, fn) {
        const out = [];
        for (let i = 0; i < arr.length; i++) {
            out.push(await fn(arr[i], i));
        }
        return out;
    }

    class KurobaAbortError extends Error {
        constructor() {
            super('[Stopped] Execution stopped by user.');
            this.isKurobaAbort = true;
        }
    }

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

    ${readErrorFormatters()}

    // =========================================================================
    // 1. LEXER
    // =========================================================================
    ${readSource('../src/lexer/tokens.js')}
    ${readSource('../src/lexer/index.js')}

    // =========================================================================
    // 2. PARSER
    // =========================================================================
    ${readSource('../src/parser/cursor.js')}
    ${readSource('../src/parser/types.js')}
    ${readSource('../src/parser/expressions.js')}
    ${readSource('../src/parser/control.js')}
    ${readSource('../src/parser/statements.js')}
    ${readSource('../src/parser/index.js')}

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
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, Math.max(0, ms))),
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

    ${readAsyncEvaluator('../src/evaluator/operations.js')}

    ${readAsyncEvaluator('../src/evaluator/variables.js')}

    ${readAsyncEvaluator('../src/evaluator/collections.js')}

    ${readAsyncEvaluator('../src/evaluator/tables.js')}

    ${readAsyncEvaluator('../src/evaluator/control.js')}

    ${readAsyncEvaluator('../src/evaluator/functions.js')}

    // Web IO functions (async for integrated terminal input)
    async function evalPaste(node, env) {
        if (node.isEmpty) {
            if (node.newLine && activePrintHandler) activePrintHandler('', true);
            return null;
        }
        let val = await evaluate(node.expr, env);
        let txt = formatKurobaValue(val);
        if (activePrintHandler) activePrintHandler(txt, node.newLine);
        return val;
    }

    async function evalCopy(node, env) {
        let promptText = "";
        if (node.prompt !== null) {
            let val = await evaluate(node.prompt, env);
            promptText = formatKurobaValue(val);
        }

        if (activeInputHandler) {
            return await activeInputHandler(promptText, !!node.oneKey);
        }

        let fallbackPrompt = promptText || "Entrée Kuroba :";
        let result = (typeof prompt === 'function' ? prompt(fallbackPrompt) : "") || "";
        if (node.oneKey) return result.charAt(0);
        return result;
    }

    async function evalClear(node, env) {
        if (node.condition !== null) {
            let condVal = await evaluate(node.condition, env);
            if (!isTruthy(condVal)) return null;
        }
        if (activeClearHandler) activeClearHandler();
        return null;
    }

    async function evalExit(node, env) {
        if (node.condition !== null) {
            let condVal = await evaluate(node.condition, env);
            if (!isTruthy(condVal)) return null;
        }
        if (activePrintHandler) activePrintHandler("[Exit] Exécution interrompue par instruction exit.", true);
        throw new Error("[Exit] Programme arrêté (exit).");
    }

    // Web Packages functions (using virtual stdlib + user workspace files)
    const moduleCache = {};
    let activeWorkspaceFiles = {};
    let workspaceModuleCache = {};
    let activeWorkspaceImports = new Set();

    async function evaluateNamespaceBody(statements, topImports = []) {
        const fileScope = createScope();
        for (const [name, fn] of Object.entries(natives)) {
            fileScope.values['__native_' + name] = {
                value: { kind: 'Function', isNative: true, fn },
                type: 'Function',
                isConst: true,
                isNullable: false
            };
        }
        for (const imp of topImports) {
            await evaluate(imp, fileScope);
        }
        const moduleScope = createScope(fileScope);
        for (const stmt of statements) {
            await evaluate(stmt, moduleScope);
        }
        const tableFields = {};
        for (const [varName, varEntry] of Object.entries(moduleScope.values)) {
            tableFields[varName] = {
                value: varEntry.value,
                type: varEntry.type,
                isNullable: varEntry.isNullable
            };
        }
        return { kind: 'Table', fields: tableFields };
    }

    async function discoverNamespaceModules(pkgName) {
        const discovered = {};

        if (pkgName === 'Std') {
            for (const [fileName, source] of Object.entries(VIRTUAL_STD_FILES)) {
                const ast = parse(tokenize(source));
                const topImports = ast.body.filter(s => s.type === 'ImportStatement');
                for (const stmt of ast.body) {
                    if (stmt.type === 'NamespaceStatement' && stmt.namespace === pkgName) {
                        const modName = stmt.module || pkgName;
                        const cacheKey = pkgName + ':' + modName;
                        if (!moduleCache[cacheKey]) {
                            moduleCache[cacheKey] = {
                                isRoot: !stmt.module,
                                table: await evaluateNamespaceBody(stmt.body, topImports)
                            };
                        }
                        discovered[modName] = moduleCache[cacheKey];
                    }
                }
            }
        }

        for (const [fileName, source] of Object.entries(activeWorkspaceFiles)) {
            if (fileName === 'main.krb' || !source || !source.trim()) continue;
            const ast = parse(tokenize(source));
            const topImports = ast.body.filter(s => s.type === 'ImportStatement');
            for (const stmt of ast.body) {
                if (stmt.type === 'NamespaceStatement' && stmt.namespace === pkgName) {
                    const modName = stmt.module || pkgName;
                    const cacheKey = pkgName + ':' + modName + ':' + (stmt.module ? 'sub' : 'root');
                    if (!workspaceModuleCache[cacheKey]) {
                        if (activeWorkspaceImports.has(cacheKey)) {
                            const modLabel = stmt.module ? (pkgName + '~' + stmt.module) : pkgName;
                            printErr("[ImportError] Circular import detected for namespace '" + modLabel + "'.");
                        }
                        activeWorkspaceImports.add(cacheKey);
                        try {
                            workspaceModuleCache[cacheKey] = {
                                isRoot: !stmt.module,
                                table: await evaluateNamespaceBody(stmt.body, topImports)
                            };
                        } finally {
                            activeWorkspaceImports.delete(cacheKey);
                        }
                    }
                    discovered[modName] = workspaceModuleCache[cacheKey];
                }
            }
        }

        return discovered;
    }

    async function evalImport(node, env) {
        if (node.package === 'Main') {
            printErr("[ImportError] Cannot import namespace 'Main'. 'Main' is the execution root.");
        }

        const availableModules = await discoverNamespaceModules(node.package);
        if (Object.keys(availableModules).length === 0) {
            printErr("[ImportError] Unknown package or namespace '" + node.package + "'. Create a file with 'namespace " + node.package + " then ... end' or import 'Std'.");
        }

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
            for (const [modName, entry] of Object.entries(modulesToBind)) {
                if (entry.isRoot) {
                    for (const [fieldName, fieldDef] of Object.entries(entry.table.fields)) {
                        if (fieldName !== 'args' && fieldName !== 'Std') {
                            env.values[fieldName] = {
                                value: fieldDef.value,
                                type: fieldDef.type,
                                isConst: true,
                                isNullable: fieldDef.isNullable
                            };
                        }
                    }
                } else {
                    env.values[modName] = {
                        value: entry.table,
                        type: 'Table',
                        isConst: true,
                        isNullable: false
                    };
                }
            }
            return null;
        }

        const targetName = node.alias || node.package;
        if (!env.values[targetName]) {
            env.values[targetName] = {
                value: { kind: 'Table', fields: {} },
                type: 'Table',
                isConst: true,
                isNullable: false
            };
        }
        const pkgTable = env.values[targetName].value;
        for (const [modName, entry] of Object.entries(modulesToBind)) {
            if (entry.isRoot) {
                for (const [fieldName, fieldDef] of Object.entries(entry.table.fields)) {
                    if (fieldName !== 'args' && fieldName !== 'Std') {
                        pkgTable.fields[fieldName] = fieldDef;
                    }
                }
            } else {
                pkgTable.fields[modName] = {
                    value: entry.table,
                    type: 'Table',
                    isNullable: false
                };
            }
        }
        return null;
    }

    async function evalNamespace(node, env) {
        let result = null;
        for (let stmt of node.body) {
            result = await evaluate(stmt, env);
            if (result && (result.isReturn || result.isBreak || result.isSkip)) return result;
        }
        return result;
    }

    // Evaluator main loop
    ${readAsyncEvaluator('../src/evaluator/index.js')}

    // Expose Kuroba API on global window
    global.Kuroba = {
        version: '1.0.6',
        run: async function(sourceCode, options = {}) {
            activePrintHandler = options.onPrint || ((t, nl) => console.log(t));
            activeErrorHandler = options.onError || ((err) => { throw new Error(err); });
            activeClearHandler = options.onClear || (() => {});
            activeInputHandler = options.onInput || null;
            activeAbortHandler = options.onAbort || null;
            activeWorkspaceFiles = options.files || {};
            workspaceModuleCache = {};
            activeWorkspaceImports.clear();
            activeRunAborted = false;
            evalOpCount = 0;
            tryDepth = 0;

            const tokens = tokenize(sourceCode);
            const ast = parse(tokens);
            const globalScope = createScope();
            return await evaluate(ast, globalScope);
        },
        abort: function() {
            activeRunAborted = true;
            if (activeAbortHandler) activeAbortHandler();
        },
        tokenize: tokenize,
        parse: parse
    };

})(typeof window !== 'undefined' ? window : global);
`;

fs.writeFileSync(path.join(__dirname, '../web/js/kuroba-web.js'), bundleCode, 'utf-8');
console.log('Successfully bundled web/js/kuroba-web.js (' + bundleCode.length + ' bytes)');
