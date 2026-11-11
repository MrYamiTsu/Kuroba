const fs = require('fs');
const path = require('path');
const { printErr } = require('../errors');
const { createScope, getProjectContext } = require('./scope');
const { tokenize } = require('../lexer');
const { parse } = require('../parser');
const { natives } = require('../runtime/natives');

const moduleCache = {};
const activeImports = new Set();

function evaluateNamespaceBody(statements, evaluate) {
    const moduleScope = createScope();

    for (const [name, fn] of Object.entries(natives)) {
        moduleScope.values[`__native_${name}`] = {
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

    return {
        kind: 'Table',
        fields: tableFields
    };
}

function collectKrbFiles(dirPath, entryFilePath = null, result = []) {
    if (!dirPath || !fs.existsSync(dirPath)) return result;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;

        const fullPath = path.resolve(dirPath, entry.name);
        if (entry.isDirectory()) {
            collectKrbFiles(fullPath, entryFilePath, result);
        } else if (entry.isFile() && entry.name.endsWith('.krb')) {
            if (entryFilePath && fullPath === path.resolve(entryFilePath)) continue;
            result.push(fullPath);
        }
    }
    return result;
}

function discoverNamespaceModules(pkgName, dirPath, evaluate, entryFilePath = null) {
    const discovered = {};
    const files = collectKrbFiles(dirPath, entryFilePath);
    const resolvedDir = path.resolve(dirPath);

    for (const filePath of files) {
        const source = fs.readFileSync(filePath, 'utf-8');
        if (!source.trim()) continue;

        const ast = parse(tokenize(source));
        for (const stmt of ast.body) {
            if (stmt.type === 'NamespaceStatement' && stmt.namespace === pkgName) {
                const modName = stmt.module || pkgName;
                const cacheKey = `${resolvedDir}:${pkgName}:${modName}:${stmt.module ? 'sub' : 'root'}`;

                if (!moduleCache[cacheKey]) {
                    if (activeImports.has(cacheKey)) {
                        const modLabel = stmt.module ? `${pkgName}~${stmt.module}` : pkgName;
                        printErr(`[ImportError] Circular import detected for namespace '${modLabel}'.`);
                    }

                    activeImports.add(cacheKey);
                    try {
                        moduleCache[cacheKey] = {
                            isRoot: !stmt.module,
                            table: evaluateNamespaceBody(stmt.body, evaluate)
                        };
                    } finally {
                        activeImports.delete(cacheKey);
                    }
                }

                discovered[modName] = moduleCache[cacheKey];
            }
        }
    }

    return discovered;
}

function evalImport(node, env, evaluate) {
    if (node.package === 'Main') {
        printErr("[ImportError] Cannot import namespace 'Main'. 'Main' is the execution root.");
    }

    const availableModules = {};
    if (node.package === 'Std') {
        const stdLibDir = path.join(__dirname, '../../lib/std');
        Object.assign(availableModules, discoverNamespaceModules('Std', stdLibDir, evaluate));
    }

    const { baseDir, entryFilePath } = getProjectContext();
    if (baseDir) {
        Object.assign(availableModules, discoverNamespaceModules(node.package, baseDir, evaluate, entryFilePath));
    }

    if (Object.keys(availableModules).length === 0) {
        printErr(`[ImportError] Unknown package or namespace '${node.package}'. Create a '.krb' file with 'namespace ${node.package} then ... end' or import 'Std'.`);
    }

    const isFullPackage = !node.modules || node.modules.length === 0;
    const modulesToBind = {};
    if (isFullPackage) {
        Object.assign(modulesToBind, availableModules);
    } else {
        for (const modName of node.modules) {
            if (!(modName in availableModules)) {
                printErr(`[ImportError] Module '${modName}' not found in namespace '${node.package}'.`);
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

    const targetNamespace = node.alias || node.package;
    if (!env.values[targetNamespace]) {
        env.values[targetNamespace] = {
            value: { kind: 'Table', fields: {} },
            type: 'Table',
            isConst: true,
            isNullable: false
        };
    }

    for (const [modName, entry] of Object.entries(modulesToBind)) {
        if (entry.isRoot) {
            for (const [fieldName, fieldDef] of Object.entries(entry.table.fields)) {
                if (fieldName !== 'args' && fieldName !== 'Std') {
                    env.values[targetNamespace].value.fields[fieldName] = fieldDef;
                }
            }
        } else {
            env.values[targetNamespace].value.fields[modName] = {
                value: entry.table,
                type: 'Table',
                isNullable: false
            };
        }
    }

    return null;
}

module.exports = { evalImport };