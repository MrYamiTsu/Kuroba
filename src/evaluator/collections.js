const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { findScope } = require('./scope');
const { evalCall } = require('./functions');

function evalListLiteral(node, env, evaluate) {
    return node.elements.map(el => evaluate(el, env));
}

function evalIndexAccess(node, env, evaluate) {
    let target = evaluate(node.target, env);

    if (target && target.kind === 'Table') {
        if (!node.isDotAccess) {
            printErr("[TypeError] Tables do not support bracket indexing. Use dot notation 'table.property' instead.");
        }
        let key = node.index;
        if (key in target.fields) {
            return target.fields[key].value;
        }
        return null;
    }

    if (node.isDotAccess) {
        printErr(`[TypeError] Cannot access '${getType(target)}' with dot notation. Use bracket indexing 'list[index]' instead.`);
    }

    if (typeof target === 'string') {
        let idx = evaluate(node.index, env);
        if (!Number.isInteger(idx)) printErr(`[IndexError] String index must be an integer, got '${idx}'.`);
        if (idx < 0 || idx >= target.length) printErr(`[IndexError] Index ${idx} out of bounds for string of length ${target.length}.`);
        return target[idx];
    }

    if (!Array.isArray(target)) printErr(`[TypeError] Cannot index non-list value of type '${getType(target)}'.`);
    let idx = evaluate(node.index, env);
    if (!Number.isInteger(idx)) printErr(`[IndexError] List index must be an integer, got '${idx}'.`);
    if (idx < 0 || idx >= target.length) printErr(`[IndexError] Index ${idx} out of bounds for list of length ${target.length}.`);
    return target[idx];
}

function applyCompoundOp(currVal, rhsVal, operator) {
    switch (operator) {
        case '+': return currVal + rhsVal;
        case '-': return currVal - rhsVal;
        case '*': return currVal * rhsVal;
        case '/':
            if (rhsVal === 0) printErr("[MathError] Division by zero is undefined.");
            return currVal / rhsVal;
        case '%':
            if (rhsVal === 0) printErr("[MathError] Division or modulo by zero is undefined.");
            return currVal % rhsVal;
        default:
            return rhsVal;
    }
}

function evalMemberAssign(node, env, evaluate) {
    let root = node.target;
    while (root && root.type === 'IndexAccess') {
        root = root.target;
    }

    let rootVarEntry = null;
    if (root && root.type === 'Variable') {
        let scope = findScope(root.name, env);
        if (!scope) printErr(`[ReferenceError] Variable '${root.name}' is not defined.`);
        rootVarEntry = scope.values[root.name];
        if (rootVarEntry.isConst) {
            printErr(`[TypeError] Cannot modify constant '${root.name}'.`);
        }
    }

    let container = evaluate(node.target, env);

    if (node.isDotAccess) {
        if (!container || container.kind !== 'Table') {
            printErr(`[TypeError] Cannot set property '${node.index}' on non-Table value of type '${getType(container)}'.`);
        }

        let key = node.index;
        let newVal = evaluate(node.value, env);
        if (node.operator) {
            let currVal = (key in container.fields) ? container.fields[key].value : 0;
            newVal = applyCompoundOp(currVal, newVal, node.operator);
        }

        if (node.typeInfo) {
            let targetType = node.typeInfo.baseType;
            let isNullable = node.typeInfo.isNullable;
            if (!isNullable && newVal === null) {
                printErr(`[TypeError] Cannot assign NULL to non-nullable field '${key}' of type '(${targetType})'.`);
            }
            if (newVal !== null) {
                newVal = castToType(newVal, targetType);
            }
            container.fields[key] = { value: newVal, type: targetType, isNullable };
            return newVal;
        }

        if (key in container.fields) {
            let field = container.fields[key];
            if (!field.isNullable && newVal === null) {
                printErr(`[TypeError] Cannot assign NULL to non-nullable field '${key}' of type '(${field.type})'.`);
            }
            if (newVal !== null) {
                let actualType = getType(newVal);
                if (field.type !== actualType) {
                    printErr(`[TypeError] Cannot assign type '${actualType}' to field '${key}' of type '${field.type}'.`);
                }
            }
            field.value = newVal;
            return newVal;
        }

        container.fields[key] = {
            value: newVal,
            type: getType(newVal),
            isNullable: true
        };
        return newVal;
    }

    if (container && container.kind === 'Table') {
        printErr(`[TypeError] Tables do not support bracket assignment. Use dot notation 'table.${evaluate(node.index, env)} = ...' instead.`);
    }

    if (!Array.isArray(container)) {
        printErr(`[TypeError] Cannot index non-list value of type '${getType(container)}'.`);
    }

    let idx = evaluate(node.index, env);
    if (!Number.isInteger(idx)) printErr(`[IndexError] List index must be an integer, got '${idx}'.`);
    if (idx < 0 || idx >= container.length) {
        printErr(`[IndexError] Index ${idx} out of bounds for list of length ${container.length}.`);
    }

    let newVal = evaluate(node.value, env);
    if (node.operator) {
        newVal = applyCompoundOp(container[idx], newVal, node.operator);
    }

    let listTypeInfo = (node.target.type === 'Variable') ? rootVarEntry?.typeInfo : null;
    if (listTypeInfo && listTypeInfo.elemType) {
        if (newVal === null) {
            if (!listTypeInfo.isElemNullable) {
                printErr(`[TypeError] Cannot assign NULL to non-nullable element of list '${node.target.name}'.`);
            }
        } else {
            newVal = castToType(newVal, listTypeInfo.elemType);
        }
    } else if (node.typeInfo) {
        let targetType = node.typeInfo.baseType;
        if (!node.typeInfo.isNullable && newVal === null) {
            printErr(`[TypeError] Cannot assign NULL to non-nullable element of type '(${targetType})'.`);
        }
        if (newVal !== null) {
            newVal = castToType(newVal, targetType);
        }
    }

    container[idx] = newVal;
    return newVal;
}

function evalMethodCall(node, env, evaluate) {
    let target = evaluate(node.target, env);
    let targetType = getType(target);

    if (target && target.kind === 'Table') {
        let methodName = node.method;
        if (methodName in target.fields) {
            let fnObj = target.fields[methodName].value;
            if (fnObj && fnObj.kind === 'Function') {
                if (fnObj.isNative) {
                    let evaluatedArgs = node.args.map(a => evaluate(a, env));
                    return fnObj.fn(...evaluatedArgs);
                }
                return evalCall({ caller: { type: 'Literal', value: fnObj }, args: node.args }, env, evaluate);
            }
            printErr(`[TypeError] Field '${methodName}' on Table is not a callable function.`);
        }
        printErr(`[ReferenceError] Method or field '${methodName}' does not exist on Table.`);
    }

    let isList = Array.isArray(target);
    let isStack = target && target.kind === 'Stack';
    let isQueue = target && target.kind === 'Queue';

    if (!isList && !isStack && !isQueue) {
        printErr(`[TypeError] Cannot call method '.${node.method}()' on type '${targetType}'. Supported types are 'List', 'Stack', 'Queue' and 'Table'.`);
    }

    let items = isList ? target : target.items;
    let method = node.method;
    let tInfo = null;
    
    if (node.target.type === 'Variable') {
        let scope = findScope(node.target.name, env);
        if (scope) tInfo = scope.values[node.target.name].typeInfo;
    }

    switch (method) {
        case 'push': {
            if (node.args.length < 1) {
                printErr(`[TypeError] Method '.push()' expects at least 1 argument.`);
            }

            let val = evaluate(node.args[0], env);

            if (tInfo && tInfo.elemType) {
                if (val === null) {
                    if (!tInfo.isElemNullable) {
                        printErr(`[TypeError] Cannot push NULL into ${targetType} '${node.target.name}' with non-nullable elements.`);
                    }
                } else {
                    val = castToType(val, tInfo.elemType);
                }
            }

            if (isStack) {
                items.push(val);
            } else if (isQueue) {
                items.push(val);
            } else {
                if (node.args.length >= 2) {
                    let pos = evaluate(node.args[1], env);
                    if (!Number.isInteger(pos)) printErr(`[IndexError] Position argument in '.push()' must be an integer, got '${pos}'.`);
                    if (pos < 0 || pos > items.length) printErr(`[IndexError] Position ${pos} out of bounds for list of length ${items.length}.`);
                    items.splice(pos, 0, val);
                } else {
                    items.push(val);
                }
            }

            return val;
        }
        case 'pop': {
            if (items.length === 0) {
                printErr(`[IndexError] Cannot pop from an empty ${targetType}.`);
            }

            if (isStack) {
                return items.pop();
            } else if (isQueue) {
                return items.shift();
            } else {
                if (node.args.length < 1) {
                    printErr(`[TypeError] Method '.pop()' on a List requires an index argument. (e.g. list.pop(0))`);
                }

                let pos = evaluate(node.args[0], env);
                if (!Number.isInteger(pos)) printErr(`[IndexError] Index argument in '.pop()' must be an integer, got '${pos}'.`);
                if (pos < 0 || pos >= items.length) printErr(`[IndexError] Index ${pos} out of bounds for list of length ${items.length}.`);

                return items.splice(pos, 1)[0];
            }
        }
        case 'peek': {
            if (items.length === 0) {
                printErr(`[IndexError] Cannot peek into an empty ${targetType}.`);
            }

            if (isStack) {
                return items[items.length - 1];
            } else if (isQueue) {
                return items[0];
            } else {
                if (node.args.length < 1) {
                    printErr(`[TypeError] Method '.peek()' on a List requires an index argument. (e.g. list.peek(0))`);
                }

                let pos = evaluate(node.args[0], env);
                if (!Number.isInteger(pos)) printErr(`[IndexError] Index argument in '.peek()' must be an integer, got '${pos}'.`);
                if (pos < 0 || pos >= items.length) printErr(`[IndexError] Index ${pos} out of bounds for list of length ${items.length}.`);
                
                return items[pos];
            }
        }
        case 'count': {
            return items.length;
        }
        default:
            printErr(`[TypeError] Unknown method '.${method}()' on type '${targetType}'. Supported methods are 'push', 'pop', 'peek' and 'count'.`);
    }
}

module.exports = { evalListLiteral, evalIndexAccess, evalMemberAssign, evalMethodCall };