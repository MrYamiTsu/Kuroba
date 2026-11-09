const { isTruthy, getType, formatKurobaValue } = require('./types');
const { printErr, printException, pushTryContext, popTryContext, isInsideTry, KurobaUserException, KurobaRuntimeError } = require('../errors');
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

function evalThrow(node, env) {
    let rawVal = evaluate(node.value, env);

    let name = "Exception";
    let showLines = true;
    let code = null;
    let context = null;

    if (rawVal && rawVal.kind === 'Table' && rawVal.fields) {
        if ('exName' in rawVal.fields && rawVal.fields.exName.value !== null) {
            name = String(rawVal.fields.exName.value);
        }
        if ('exLines' in rawVal.fields) {
            let lVal = rawVal.fields.exLines.value;
            showLines = (lVal !== false && lVal !== 0);
        }
        if ('exCode' in rawVal.fields && rawVal.fields.exCode.value !== null) {
            code = rawVal.fields.exCode.value;
        }
        if ('exContext' in rawVal.fields && rawVal.fields.exContext.value !== null) {
            context = String(rawVal.fields.exContext.value);
        }
    }

    let loc = (node.line !== undefined) ? `Line ${node.line}, Col ${node.col}` : null;
    let header = `[${name}${showLines && loc ? ': ' + loc : ''}]`;

    let desc = (context !== null) ? context : formatKurobaValue(rawVal);
    if (code !== null) {
        desc = `Error ${code}: ${desc}`;
    }

    let formattedMsg = `${header} ${desc}`;
    if (isInsideTry()) {
        throw new KurobaUserException(rawVal, formattedMsg);
    }
    printException(formattedMsg);
}

function evalTry(node, env) {
    let tryEnv = createScope(env);
    let caughtValue = null;
    let hasError = false;
    let blockResult = null;
    let unhandledError = null;

    pushTryContext();
    try {
        blockResult = executeBlock(node.tryBlock, tryEnv);
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
        blockResult = executeBlock(node.catchBlock, catchEnv);
    }

    if (node.finallyBlock) {
        let finallyEnv = createScope(env);
        let finRes = executeBlock(node.finallyBlock, finallyEnv);
        if (finRes && (finRes.isReturn || finRes.isBreak || finRes.isSkip)) {
            blockResult = finRes;
        }
    }

    return blockResult;
}

function parseRuntimeErrorToTable(message) {
    let match = message.match(/^\[([a-zA-Z]+)(?::\s*Line\s*(\d+),\s*Col\s*(\d+))?\]\s*(.*)$/s);
    let name = match ? match[1] : "RuntimeError";
    let context = match ? match[4] : message;
    return {
        kind: 'Table',
        fields: {
            exName: { value: name, type: 'String', isNullable: false },
            exContext: { value: context, type: 'String', isNullable: false }
        }
    };
}

module.exports = { evalIf, evalFor, evalWhile, evalDoWhile, evalGiven, evalForIn, evalThrow, evalTry };