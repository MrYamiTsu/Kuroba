const { printErr } = require('../errors');
const { isKurobaEqual, isTruthy, getType } = require('./types');
const { findScope } = require('./scope');

const KNOWN_TYPES = new Set([
    'Int', 'Float', 'String', 'Bool', 'List', 'Stack', 'Queue', 'Table', 'Function', 'Null'
]);

function evalMath(node, env, evaluate) {
    let left = evaluate(node.left, env);
    let right = evaluate(node.right, env);

    switch (node.operator) {
        case '==': return isKurobaEqual(left, right);
        case '!=': return !isKurobaEqual(left, right);
        case '+':  return left + right;
        case '-':  return left - right;
        case '*':  return left * right;
        case '/':
            if (right === 0) printErr("[MathError] Division by zero is undefined.");
            return left / right;
        case '%':
            if (right === 0) printErr("[MathError] Division or modulo by zero is undefined.");
            return left % right;
        case '<':  return left < right;
        case '>':  return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        default:
            printErr(`[RuntimeError] Unsupported operator '${node.operator}'.`);
    }
}

function evalUnary(node, env, evaluate) {
    let right = evaluate(node.right, env);
    if (node.operator === '!') return !isTruthy(right);
    if (node.operator === '-') return -right;
    printErr(`[RuntimeError] Unsupported unary operator '${node.operator}'.`);
}

function evalLogical(node, env, evaluate) {
    let left = evaluate(node.left, env);
    if (node.operator === '&&') {
        if (!isTruthy(left)) return false;
        return isTruthy(evaluate(node.right, env));
    }
    if (node.operator === '||') {
        if (isTruthy(left)) return true;
        return isTruthy(evaluate(node.right, env));
    }
    printErr(`[RuntimeError] Unsupported logical operator '${node.operator}'.`);
}

function evalIs(node, env, evaluate) {
    let val = evaluate(node.left, env);
    let spec = node.targetSpec;

    if (spec.kind === 'literal') {
        return val === spec.value;
    }

    let { baseType, elemType, isElemNullable } = spec.typeInfo;

    if (!KNOWN_TYPES.has(baseType)) {
        let scope = findScope(baseType, env);
        let classEntry = scope && scope.values[baseType];
        if (classEntry && classEntry.value && classEntry.value.kind === 'Class') {
            if (!val || val.kind !== 'Table' || !val.isInstance) return false;

            let curr = val.classRef;

            while (curr) {
                if (curr.name === baseType) return true;
                curr = curr.superClass;
            }
            
            return false;
        }
        
        printErr(`[TypeError] Unknown type '${baseType}' in 'is' check.`);
    }

    if (val && val.isInstance && baseType === 'Table') {
        return true;
    }

    if (getType(val) !== baseType) {
        return false;
    }

    if (node.left.type === 'Variable') {
        let scope = findScope(node.left.name, env);
        let varEntry = scope && scope.values[node.left.name];
        if (varEntry && varEntry.typeInfo && varEntry.typeInfo.elemType) {
            if (varEntry.typeInfo.elemType !== elemType) {
                return false;
            }
            if (!isElemNullable && varEntry.typeInfo.isElemNullable) {
                let items = Array.isArray(val) ? val : val.items;
                return items.every(el => el !== null);
            }
            return true;
        }
    }

    let items = Array.isArray(val) ? val : val.items;
    return items.every(el => {
        if (el === null) return isElemNullable;
        return getType(el) === elemType;
    });
}

module.exports = { evalMath, evalUnary, evalLogical, evalIs };