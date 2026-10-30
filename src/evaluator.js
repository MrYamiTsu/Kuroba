const { printErr } = require('./errors');

function getType(val) {
    if (typeof val === 'number') return 'Number';
    if (typeof val === 'string') return 'String';
    if (typeof val === 'boolean') return 'Bool';
    return 'Unknown';
}

function evaluate(node, env = {}) {
    if (!node) return node;
    if (!node.type) return node;

    switch (node.type) {
        case 'Program': {
            for (let stmt of node.body) {
                evaluate(stmt, env);
            }
            return;
        }

        case 'VarDeclar': {
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

        case 'VarAssign': {
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

        case 'Variable': {
            if (node.name in env) {
                return env[node.name].value;
            }
            printErr(`[ReferenceError] Variable '${node.name}' is not defined.`);
            break;
        }

        case 'BreakStatement': {
            return { isBreak: true };
        }

        case 'GivenStatement': {
            let targetVal = evaluate(node.target, env);
            let matchedIndex = -1;
            let defaultIndex = -1;

            for (let i = 0; i < node.cases.length; i++) {
                let c = node.cases[i];
                if (c.isDefault) {
                    defaultIndex = i;
                } else {
                    let val = evaluate(c.value, env);
                    let isEqual = (val === targetVal) ||
                                  ((val === 0 && targetVal === false) || (val === false && targetVal === 0)) ||
                                  ((val === 1 && targetVal === true) || (val === true && targetVal === 1));
                    if (isEqual && matchedIndex === -1) {
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

        case 'PasteStatement': {
            let val = evaluate(node.expr, env);
            if (val === true) console.log('TRUE');
            else if (val === false) console.log('FALSE');
            else console.log(val);
            return val;
        }

        case 'IfStatement': {
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
                    let isTrue2 = cond2 === true || cond2 === 1
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

        case 'MathExpression': {
            let left = evaluate(node.left, env);
            let right = evaluate(node.right, env);

            switch (node.operator) {
                case '==':
                    if ((left === 0 && right === false) || (left === false && right === 0)) return true;
                    if ((left === 1 && right === true) || (left === true && right === 1)) return true;
                    return left === right;
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
                case '!=':
                    if ((left === 0 && right === false) || (left === false && right === 0)) return false;
                    if ((left === 1 && right === true) || (left === true && right === 1)) return false;
                    return left !== right;
                default:
                    printErr(`[RuntimeError] Unsupported operator '${node.operator}'.`);
            }
            break;
        }

        case 'UnaryExpression': {
            let right = evaluate(node.right, env);

            if (node.operator === '!') {
                let isTrue = (right === true || right === 1);
                return !isTrue;
            }

            printErr(`[RuntimeError] Unsupported unary operator '${node.operator}'.`);
            break;
        }

        case 'LogicalExpression': {
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
            break;
        }

        default:
            printErr(`[RuntimeError] Unknown AST node type '${node.type}'.`);
    }
}

module.exports = { evaluate };
