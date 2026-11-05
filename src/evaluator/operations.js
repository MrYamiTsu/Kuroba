const { printErr } = require('../errors');
const { isKurobaEqual, isTruthy } = require('./types');
const { evaluate } = require('./index');

function evalMath(node, env) {
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

function evalUnary(node, env) {
    let right = evaluate(node.right, env);
    if (node.operator === '!') return !isTruthy(right);
    if (node.operator === '-') return -right;
    printErr(`[RuntimeError] Unsupported unary operator '${node.operator}'.`);
}

function evalLogical(node, env) {
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

module.exports = { evalMath, evalUnary, evalLogical };

