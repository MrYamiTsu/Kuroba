let currentCliArgs = [];

function setCliArgs(cliArgs) {
    currentCliArgs = Array.isArray(cliArgs) ? [...cliArgs] : [];
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

module.exports = { createScope, findScope, setCliArgs, initGlobalScope };
