const { isTruthy, getType } = require('./types');
const { printErr } = require('../errors');
const { createScope } = require('./scope');
const { evaluate } = require('./index');

function executeBlock(statements, parentEnv) {
    let blockEnv = createScope(parentEnv);
    for (let stmt of statements) {
        let res = evaluate(stmt, blockEnv);
        if (res && (res.isBreak || res.isSkip || res.isReturn)) return res;
    }
    return null;
}

function evalIf(node, env) {
    if (isTruthy(evaluate(node.condition, env))) {
        return executeBlock(node.thenBranch, env);
    }
    if (node.elifBranches && node.elifBranches.length > 0) {
        for (let elif of node.elifBranches) {
            if (isTruthy(evaluate(elif.condition, env))) {
                return executeBlock(elif.body, env);
            }
        }
    }
    if (node.elseBranch) {
        return executeBlock(node.elseBranch, env);
    }
}

function evalFor(node, env) {
    let forEnv = createScope(env);
    if (node.init) evaluate(node.init, forEnv);

    while (true) {
        if (node.condition && !isTruthy(evaluate(node.condition, forEnv))) break;
        let res = executeBlock(node.body, forEnv);
        
        if (res && res.isBreak) break;

        if (node.update) evaluate(node.update, forEnv);

        if (res && res.isReturn) return res;
    }
}

function evalWhile(node, env) {
    while (isTruthy(evaluate(node.condition, env))) {
        let res = executeBlock(node.body, env);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    }
}

function evalDoWhile(node, env) {
    do {
        let res = executeBlock(node.body, env);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    } while (isTruthy(evaluate(node.condition, env)));
}

function evalGiven(node, env) {
    let val = evaluate(node.expr, env);
    let matchedIndex = -1;
    let defaultIndex = -1;

    for (let i = 0; i < node.cases.length; i++) {
        let c = node.cases[i];
        if (c.isDefault) {
            defaultIndex = i;
        } else if (matchedIndex === -1) {
            let caseVal = evaluate(c.condition, env);
            if (caseVal === val) matchedIndex = i;
        }
    }

    if (matchedIndex !== -1) {
        let res = executeBlock(node.cases[matchedIndex].body, env);
        if ((!res || !res.isBreak) && defaultIndex !== -1) {
            executeBlock(node.cases[defaultIndex].body, env);
        }
    } else if (defaultIndex !== -1) {
        executeBlock(node.cases[defaultIndex].body, env);
    }
}

function evalForIn(node, env) {
    let collection = evaluate(node.iterable, env);
    if (collection === null || collection === undefined) {
        printErr(`[TypeError: Line ${node.line}] Cannot iterate over '${collection}'.`);
    }

    let pairs = [];
    if (Array.isArray(collection)) {
        for (let i = 0; i < collection.length; i++) {
            pairs.push([i, collection[i]]);
        }
    } else if (collection && (collection.kind === 'Stack' || collection.kind === 'Queue')) {
        let items = collection.items;
        for (let i = 0; i < items.length; i++) {
            pairs.push([i, items[i]]);
        }
    } else if (collection && collection.kind === 'Table') {
        for (let key of Object.keys(collection.fields)) {
            pairs.push([key, collection.fields[key].value]);
        }
    } else {
        let typeName = getType(collection);
        printErr(`[TypeError: Line ${node.line}] Cannot iterate over value of type '${typeName}'. Expected List, Stack, Queue, or Table.`);
    }

    let forEnv = createScope(env);
    for (let [idxOrKey, val] of pairs) {
        if (node.indexVar) {
            forEnv.values[node.indexVar] = {
                value: idxOrKey,
                isConst: false,
                isNullable: true,
                type: typeof idxOrKey === 'number' ? 'Int' : 'String'
            };
        }

        forEnv.values[node.itemVar] = {
            value: val,
            isConst: false,
            isNullable: true,
            type: getType(val)
        };

        let res = executeBlock(node.body, forEnv);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    }
}

module.exports = { evalIf, evalFor, evalWhile, evalDoWhile, evalGiven, evalForIn };

