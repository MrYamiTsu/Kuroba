const { isTruthy, getType, formatKurobaValue } = require('./types');
const { printErr, printException, pushTryContext, popTryContext, isInsideTry, KurobaUserException, KurobaRuntimeError, formatExceptionMessage, parseRuntimeErrorToTable } = require('../errors');
const { createScope } = require('./scope');

function executeBlock(statements, parentEnv, evaluate) {
    let blockEnv = createScope(parentEnv);
    for (let stmt of statements) {
        let res = evaluate(stmt, blockEnv);
        if (res && (res.isBreak || res.isSkip || res.isReturn)) return res;
    }
    return null;
}

function evalIf(node, env, evaluate) {
    if (isTruthy(evaluate(node.condition, env))) {
        return executeBlock(node.thenBranch, env, evaluate);
    }
    if (node.elifBranches && node.elifBranches.length > 0) {
        for (let elif of node.elifBranches) {
            if (isTruthy(evaluate(elif.condition, env))) {
                return executeBlock(elif.body, env, evaluate);
            }
        }
    }
    if (node.elseBranch) {
        return executeBlock(node.elseBranch, env, evaluate);
    }
}

function evalFor(node, env, evaluate) {
    let forEnv = createScope(env);
    if (node.init) evaluate(node.init, forEnv);

    while (true) {
        if (node.condition && !isTruthy(evaluate(node.condition, forEnv))) break;
        let res = executeBlock(node.body, forEnv, evaluate);
        
        if (res && res.isBreak) break;

        if (node.update) evaluate(node.update, forEnv);

        if (res && res.isReturn) return res;
    }
}

function evalWhile(node, env, evaluate) {
    while (isTruthy(evaluate(node.condition, env))) {
        let res = executeBlock(node.body, env, evaluate);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    }
}

function evalDoWhile(node, env, evaluate) {
    do {
        let res = executeBlock(node.body, env, evaluate);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    } while (isTruthy(evaluate(node.condition, env)));
}

function evalGiven(node, env, evaluate) {
    let val = evaluate(node.target || node.expr, env);
    let matchedIndex = -1;
    let defaultIndex = -1;

    for (let i = 0; i < node.cases.length; i++) {
        let c = node.cases[i];
        
        if (c.isDefault) {
            defaultIndex = i;
        } else if (matchedIndex === -1) {
            let caseVal = evaluate(c.value !== undefined ? c.value : c.condition, env);
            if (caseVal === val) matchedIndex = i;
        }
    }

    if (matchedIndex !== -1) {
        let res = executeBlock(node.cases[matchedIndex].body, env, evaluate);
        if ((!res || !res.isBreak) && defaultIndex !== -1) {
            executeBlock(node.cases[defaultIndex].body, env, evaluate);
        }
    } else if (defaultIndex !== -1) {
        executeBlock(node.cases[defaultIndex].body, env, evaluate);
    }
}

function evalForIn(node, env, evaluate) {
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

        let res = executeBlock(node.body, forEnv, evaluate);

        if (res && res.isBreak) break;

        if (res && res.isReturn) return res;
    }
}

function evalThrow(node, env, evaluate) {
    let rawVal = evaluate(node.value, env);
    let formattedMsg = formatExceptionMessage(rawVal, node.line, node.col, formatKurobaValue(rawVal));
    if (isInsideTry()) {
        throw new KurobaUserException(rawVal, formattedMsg);
    }
    printException(formattedMsg);
}

function evalTry(node, env, evaluate) {
    let tryEnv = createScope(env);
    let caughtValue = null;
    let hasError = false;
    let blockResult = null;
    let unhandledError = null;

    pushTryContext();
    try {
        blockResult = executeBlock(node.tryBlock, tryEnv, evaluate);
    } catch (err) {
        hasError = true;
        if (err && err.isKurobaUserException) {
            caughtValue = err.value;
        } else if (err && err.isKurobaRuntimeError) {
            caughtValue = parseRuntimeErrorToTable(err.message);
        } else {
            unhandledError = err;
        }
    } finally {
        popTryContext();
    }

    if (unhandledError) throw unhandledError;

    if (hasError && node.catchBlock) {
        let catchEnv = createScope(env);
        if (node.catchVar) {
            catchEnv.values[node.catchVar] = {
                value: caughtValue,
                type: getType(caughtValue),
                isConst: false,
                isNullable: true
            };
        }
        blockResult = executeBlock(node.catchBlock, catchEnv, evaluate);
    }

    if (node.finallyBlock) {
        let finallyEnv = createScope(env);
        let finRes = executeBlock(node.finallyBlock, finallyEnv, evaluate);
        if (finRes && (finRes.isReturn || finRes.isBreak || finRes.isSkip)) {
            blockResult = finRes;
        }
    }

    return blockResult;
}

module.exports = { evalIf, evalFor, evalWhile, evalDoWhile, evalGiven, evalForIn, evalThrow, evalTry };