const getCwd = () => (typeof process !== 'undefined' && typeof process.cwd === 'function') ? process.cwd() : '/';

let currentCliArgs = [];
let currentProjectContext = {
    baseDir: getCwd(),
    entryFilePath: null
};

function setCliArgs(cliArgs) {
    currentCliArgs = Array.isArray(cliArgs) ? [...cliArgs] : [];
}

function setProjectContext(baseDir, entryFilePath = null) {
    currentProjectContext = {
        baseDir: baseDir || getCwd(),
        entryFilePath: entryFilePath || null
    };
}

function getProjectContext() {
    return currentProjectContext;
}

function initGlobalScope(env, cliArgs = currentCliArgs) {
    const argsList = Array.isArray(cliArgs) ? [...cliArgs] : [];

    env.values['args'] = {
        value: argsList,
        type: 'List',
        isConst: true,
        isNullable: false,
        typeInfo: { baseType: 'List', elemType: 'String', isElemNullable: false }
    };

    const sysTable = {
        kind: 'Table',
        fields: {
            args: {
                value: argsList,
                type: 'List',
                isNullable: false
            }
        }
    };

    const stdTable = {
        kind: 'Table',
        fields: {
            Sys: {
                value: sysTable,
                type: 'Table',
                isNullable: false
            }
        }
    };

    env.values['Std'] = {
        value: stdTable,
        type: 'Table',
        isConst: true,
        isNullable: false
    };
}

function createScope(parent = null, cliArgs = null) {
    const scope = { values: {}, parent };
    if (!parent) {
        initGlobalScope(scope, cliArgs !== null ? cliArgs : currentCliArgs);
    }
    return scope;
}

function findScope(name, env) {
    let curr = env;
    while (curr) {
        if (name in curr.values) return curr;
        curr = curr.parent;
    }
    return null;
}

function resolveQualifiedValue(pathStr, env) {
    if (!pathStr || typeof pathStr !== 'string') return null;
    const parts = pathStr.split('.');
    const first = parts[0];
    const scope = findScope(first, env);
    if (!scope) return null;
    let curr = scope.values[first] ? scope.values[first].value : null;
    for (let i = 1; i < parts.length; i++) {
        if (!curr) return null;
        if (curr.kind === 'Table' && curr.fields && parts[i] in curr.fields) {
            curr = curr.fields[parts[i]].value;
        } else if (curr.kind === 'Class') {
            if (curr.sharedFields && parts[i] in curr.sharedFields) {
                curr = curr.sharedFields[parts[i]].value;
            } else if (curr.sharedMethods && parts[i] in curr.sharedMethods) {
                curr = curr.sharedMethods[parts[i]];
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
    return curr;
}

module.exports = { createScope, findScope, resolveQualifiedValue, setCliArgs, setProjectContext, getProjectContext, initGlobalScope };