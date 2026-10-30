const { printErr } = require('./errors');

function getType(val) {
    if (typeof val === 'number') return 'Number';
    if (typeof val === 'string') return 'String';
    if (typeof val === 'boolean') return 'Bool';
    return 'Unknown';
}

function isTulgEqual(a, b) {
    if ((a === 0 && b === false) || (a === false && b === 0)) return true;
    if ((a === 1 && b === true) || (a === true && b === 1)) return true;
    return a === b;
}

function evaluate(node, env = {}) {
    if (!node || !node.type) return node;

    switch (node.type) {
        case 'Program':
            for (let stmt of node.body) {
                evaluate(stmt, env);
            }
            return;
        case 'VarDeclar':   return evalVarDeclar(node, env);
        case 'VarAssign':   return evalVarAssign(node, env);
        case 'Variable':    return evalVariable(node, env);
        case 'IfStatement':    return evalIf(node, env);
        case 'GivenStatement': return evalGiven(node, env);
        case 'BreakStatement': return { isBreak: true };
        case 'PasteStatement': return evalPaste(node, env);
        case 'MathExpression':    return evalMath(node, env);
        case 'UnaryExpression':   return evalUnary(node, env);
        case 'LogicalExpression': return evalLogical(node, env);
        default:
            printErr(`[RuntimeError] Unknown AST node type '${node.type}'.`);
    }
}

// ============================================================================
// 1. VARIABLES & CONSTANTS
// ============================================================================

function evalVarDeclar(node, env) {
    let val = evaluate(node.value, env);

    if (node.explType) {
        if (node.explType === 'String') {
            val = String(val);
        } else if (node.explType === 'Number') {
            let numb = Number(val);
            if (isNaN(numb)) {
                printErr(`[TypeError] Cannot cast value '${val}' to type 'Number'.`);
            }
            val = numb;
        } else if (node.explType === 'Bool' || node.explType === 'Boolean') {
            if (val === 0 || val === 'FALSE' || val === false) val = false;
            else if (val === 1 || val === 'TRUE' || val === true) val = true;
            else val = Boolean(val);
        } else {
            printErr(`[TypeError] Unknown explicit type '${node.explType}'. Supported types are 'String', 'Number' and 'Bool'.`);
        }
    }

    env[node.name] = {
        value: val,
        type: node.explType || getType(val),
        isConst: !!node.isConst
    };
    return val;
}

function evalVarAssign(node, env) {
    if (!(node.name in env)) {
        printErr(`[ReferenceError] Cannot reassign undeclared variable '${node.name}'.`);
    }

    if (env[node.name].isConst) {
        printErr(`[TypeError] Cannot reassign constant '${node.name}'.`);
    }

    let newVal = evaluate(node.value, env);
    let newType = getType(newVal);

    if (env[node.name].type !== newType) {
        printErr(`[TypeError] Cannot assign type '${newType}' to variable '${node.name}' of type '${env[node.name].type}'.`);
    }

    env[node.name].value = newVal;
    return newVal;
}

function evalVariable(node, env) {
    if (node.name in env) {
        return env[node.name].value;
    }
    printErr(`[ReferenceError] Variable '${node.name}' is not defined.`);
}

// ============================================================================
// 2. CONTROL FLOW (IF / GIVEN)
// ============================================================================

function evalIf(node, env) {
    let cond = evaluate(node.condition, env);
    let isTrue = cond === true || cond === 1;

    if (isTrue) {
        for (let stmt of node.thenBranch) {
            let res = evaluate(stmt, env);
            if (res && res.isBreak) return res;
        }
        return;
    }

    if (node.elifBranches && node.elifBranches.length > 0) {
        for (let elif of node.elifBranches) {
            let cond2 = evaluate(elif.condition, env);
            let isTrue2 = cond2 === true || cond2 === 1;
            if (isTrue2) {
                for (let stmt of elif.body) {
                    let res = evaluate(stmt, env);
                    if (res && res.isBreak) return res;
                }
                return;
            }
        }
    }

    if (node.elseBranch) {
        for (let stmt of node.elseBranch) {
            let res = evaluate(stmt, env);
            if (res && res.isBreak) return res;
        }
    }
    return;
}

function evalGiven(node, env) {
    let targetVal = evaluate(node.target, env);
    let matchedIndex = -1;
    let defaultIndex = -1;

    for (let i = 0; i < node.cases.length; i++) {
        let c = node.cases[i];
        if (c.isDefault) {
            defaultIndex = i;
        } else {
            let val = evaluate(c.value, env);
            if (isTulgEqual(val, targetVal) && matchedIndex === -1) {
                matchedIndex = i;
            }
        }
    }

    function runCase(index) {
        if (index === -1) return true;
        for (let stmt of node.cases[index].body) {
            let res = evaluate(stmt, env);
            if (res && res.isBreak) return true;
        }
        return false;
    }

    if (matchedIndex !== -1) {
        let hitBreak = runCase(matchedIndex);
        if (!hitBreak && defaultIndex !== -1) {
            runCase(defaultIndex);
        }
    } else if (defaultIndex !== -1) {
        runCase(defaultIndex);
    }
    return;
}

// ============================================================================
// 3. STANDARD I/O
// ============================================================================

function evalPaste(node, env) {
    let val = evaluate(node.expr, env);
    if (val === true) console.log('TRUE');
    else if (val === false) console.log('FALSE');
    else console.log(val);
    return val;
}

// ============================================================================
// 4. MATH & LOGIC OPERATIONS
// ============================================================================

function evalMath(node, env) {
    let left = evaluate(node.left, env);
    let right = evaluate(node.right, env);

    switch (node.operator) {
        case '==':
            return isTulgEqual(left, right);
        case '!=':
            return !isTulgEqual(left, right);
        case '+':
            return left + right;
        case '-':
            return left - right;
        case '*':
            return left * right;
        case '/':
            if (right === 0) {
                printErr("[MathError] Division by zero is undefined.");
            }
            return left / right;
        default:
            printErr(`[RuntimeError] Unsupported operator '${node.operator}'.`);
    }
}

function evalUnary(node, env) {
    let right = evaluate(node.right, env);

    if (node.operator === '!') {
        let isTrue = (right === true || right === 1);
        return !isTrue;
    }

    printErr(`[RuntimeError] Unsupported unary operator '${node.operator}'.`);
}

function evalLogical(node, env) {
    let left = evaluate(node.left, env);
    let isTrue = (left === true || left === 1);

    if (node.operator === '&&') {
        if (!isTrue) return false;
        let right = evaluate(node.right, env);
        return (right === true || right === 1);
    }

    if (node.operator === '||') {
        if (isTrue) return true;
        let right = evaluate(node.right, env);
        return (right === true || right === 1);
    }

    printErr(`[RuntimeError] Unsupported logical operator '${node.operator}'.`);
}

module.exports = { evaluate };
