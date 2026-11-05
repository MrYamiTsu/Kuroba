const fs = require('fs');
const path = require('path');
const { printErr } = require('../errors');
const { createScope } = require('./scope');
const { tokenize } = require('../lexer');
const { parse } = require('../parser');
const { evaluate } = require('./index');
const { natives } = require('../runtime/natives');

const moduleCache = {};

function evaluateNamespaceBody(statements) {
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

function discoverNamespaceModules(pkgName, dirPath) {
    if (!fs.existsSync(dirPath)) {
        printErr(`[ImportError] Package directory not found: '${dirPath}'.`);
    }

    const discovered = {};
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        if (!file.endsWith('.krb')) continue;

        const filePath = path.join(dirPath, file);
        const source = fs.readFileSync(filePath, 'utf-8');
        const ast = parse(tokenize(source));

        for (const stmt of ast.body) {
            if (stmt.type === 'NamespaceStatement' && stmt.namespace === pkgName) {
                const modName = stmt.module || pkgName;
                const cacheKey = `${pkgName}:${modName}`;

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
        printErr(`[ImportError] Unknown package '${node.package}'. Available packages: 'Std'.`);
    }

    const stdLibDir = path.join(__dirname, '../../lib/std');
    
    const availableModules = discoverNamespaceModules(node.package, stdLibDir);

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
        for (const [modName, modTable] of Object.entries(modulesToBind)) {
            env.values[modName] = {
                value: modTable,
                type: 'Table',
                isConst: true,
                isNullable: false
            };
        }
    } else {
        const targetNamespace = node.alias || node.package;
        if (!env.values[targetNamespace]) {
            env.values[targetNamespace] = {
                value: { kind: 'Table', fields: {} },
                type: 'Table',
                isConst: true,
                isNullable: false
            };
        }

        for (const [modName, modTable] of Object.entries(modulesToBind)) {
            env.values[targetNamespace].value.fields[modName] = {
                value: modTable,
                type: 'Table',
                isNullable: false
            };
        }
    }
}

module.exports = { evalImport };