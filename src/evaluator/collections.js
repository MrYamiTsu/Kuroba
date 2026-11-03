const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { findScope } = require('./scope');
const { evaluate } = require('./index');

function evalListLiteral(node, env) {
    return node.elements.map(el => evaluate(el, env));
}

function evalIndexAccess(node, env) {
    let target = evaluate(node.target, env);
    if (!Array.isArray(target)) printErr(`[TypeError] Cannot index non-list value of type '${getType(target)}'.`);
    let idx = evaluate(node.index, env);
    if (!Number.isInteger(idx)) printErr(`[IndexError] List index must be an integer, got '${idx}'.`);
    if (idx < 0 || idx >= target.length) printErr(`[IndexError] Index ${idx} out of bounds for list of length ${target.length}.`);
    return target[idx];
}

function evalIndexAssign(node, env) {
    let scope = findScope(node.name, env);
    if (!scope) printErr(`[ReferenceError] Variable '${node.name}' is not defined.`);
    let targetVar = scope.values[node.name];
    if (targetVar.isConst) printErr(`[TypeError] Cannot modify elements of constant list '${node.name}'.`);
    let list = targetVar.value;
    if (!Array.isArray(list)) printErr(`[TypeError] Variable '${node.name}' is not a List.`);

    let idx = evaluate(node.index, env);
    if (!Number.isInteger(idx)) printErr(`[IndexError] List index must be an integer, got '${idx}'.`);
    if (idx < 0 || idx >= list.length) printErr(`[IndexError] Index ${idx} out of bounds for list '${node.name}' of length ${list.length}.`);

    let newVal = evaluate(node.value, env);
    if (node.operator) {
        switch (node.operator) {
            case '+': newVal = list[idx] + newVal; break;
            case '-': newVal = list[idx] - newVal; break;
            case '*': newVal = list[idx] * newVal; break;
            case '/':
                if (newVal === 0) printErr("[MathError] Division by zero is undefined.");
                newVal = list[idx] / newVal;
                break;
            case '%':
                if (newVal === 0) printErr("[MathError] Division or modulo by zero is undefined.");
                newVal = list[idx] % newVal;
                break;
        }
    }

    let tInfo = targetVar.typeInfo;
    if (tInfo && tInfo.elemType) {
        if (newVal === null) {
            if (!tInfo.isElemNullable) printErr(`[TypeError] Cannot assign NULL to non-nullable element of list '${node.name}'.`);
        } else {
            newVal = castToType(newVal, tInfo.elemType);
        }
    }

    list[idx] = newVal;
    return newVal;
}

module.exports = { evalListLiteral, evalIndexAccess, evalIndexAssign };

