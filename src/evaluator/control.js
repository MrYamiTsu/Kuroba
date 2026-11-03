const { isTruthy } = require('./types');
const { createScope } = require('./scope');
const { evaluate } = require('./index');

function executeBlock(statements, parentEnv) {
    let blockEnv = createScope(parentEnv);
    for (let stmt of statements) {
        let res = evaluate(stmt, blockEnv);
        if (res && (res.isBreak || res.isSkip)) return res;
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
    }
}

function evalWhile(node, env) {
    while (isTruthy(evaluate(node.condition, env))) {
        let res = executeBlock(node.body, env);
        if (res && res.isBreak) break;
    }
}

function evalDoWhile(node, env) {
    do {
        let res = executeBlock(node.body, env);
        if (res && res.isBreak) break;
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

module.exports = { evalIf, evalFor, evalWhile, evalDoWhile, evalGiven };

