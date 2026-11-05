const fs = require('fs');
const path = require('path');
const { printErr } = require('../errors');
const { createScope } = require('./scope');
const { tokenize } = require('../lexer');
const { parse } = require('../parser');
const { evaluate } = require('./index');
const { natives } = require('../runtime/natives');

const moduleCache = {};

function loadKurobaModule(modulePath) {
    if (moduleCache[modulePath]) {
        return moduleCache[modulePath];
    }

    if (!fs.existsSync(modulePath)) {
        printErr(`[ImportError] Module file not found: '${modulePath}'.`);
    }

    const source = fs.readFileSync(modulePath, 'utf-8');
    const tokens = tokenize(source);
    const ast = parse(tokens);

    const moduleScope = createScope();

    for (const [name, fn] of Object.entries(natives)) {
        moduleScope.values[`__native_${name}`] = {
            value: { kind: 'Function', isNative: true, fn },
            type: 'Function',
            isConst: true,
            isNullable: false
        };
    }

    evaluate(ast, moduleScope);

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

    const exportedTable = {
        kind: 'Table',
        fields: tableFields
    };

    moduleCache[modulePath] = exportedTable;
    return exportedTable;
}

function evalImport(node, env) {
    if (node.package !== 'Std') {
        printErr(`[ImportError] Unknown package '${node.package}'. Available packages: 'Std'.`);
    }

    const stdLibDir = path.join(__dirname, '../../lib/std');
    if (!fs.existsSync(stdLibDir)) {
        printErr(`[ImportError] Package directory not found: '${stdLibDir}'.`);
    }

    const isFullPackage = !node.modules || node.modules.length === 0;
    const modulesToLoad = [];

    if (isFullPackage) {
        const files = fs.readdirSync(stdLibDir);
        for (const file of files) {
            if (file.endsWith('.krb')) {
                const base = path.basename(file, '.krb');
                const modName = base.charAt(0).toUpperCase() + base.slice(1);
                modulesToLoad.push({ name: modName, filePath: path.join(stdLibDir, file) });
            }
        }
    } else {
        for (const modName of node.modules) {
            const fileName = modName.toLowerCase() + '.krb';
            const filePath = path.join(stdLibDir, fileName);
            modulesToLoad.push({ name: modName, filePath });
        }
    }

    
    if (node.alias === '~') {
        for (const mod of modulesToLoad) {
            const modTable = loadKurobaModule(mod.filePath);

            env.values[mod.name] = {
                value: modTable,
                type: 'Table',
                isConst: true,
                isNullable: false
            };
        }
    } else {
        const pkgName = node.alias || node.package;
        if (!env.values[pkgName]) {
            env.values[pkgName] = {
                value: { kind: 'Table', fields: {} },
                type: 'Table',
                isConst: true,
                isNullable: false
            };
        }

        for (const mod of modulesToLoad) {
            const modTable = loadKurobaModule(mod.filePath);
            env.values[pkgName].value.fields[mod.name] = {
                value: modTable,
                type: 'Table',
                isNullable: false
            };
        }
    }
}

module.exports = { evalImport };
