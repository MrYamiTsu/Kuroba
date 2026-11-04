const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { findScope } = require('./scope');
const { evaluate } = require('./index');

function evalListLiteral(node, env) {
    return node.elements.map(el => evaluate(el, env));
}

function evalIndexAccess(node, env) {
    let target = evaluate(node.target, env);

    if (target && target.kind === 'Table') {
        let key = node.isDotAccess ? node.index : String(evaluate(node.index, env));
        if (key in target.fields) {
            return target.fields[key].value;
        }
        return null;
    }

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
    if (targetVar.isConst) {
        let typeName = targetVar.type || 'collection';
        printErr(`[TypeError] Cannot modify elements of constant ${typeName} '${node.name}'.`);
    }

    if (targetVar.value && targetVar.value.kind === 'Table') {
        let table = targetVar.value;
        let key = String(evaluate(node.index, env));
        let newVal = evaluate(node.value, env);

        if (node.operator) {
            let currVal = (key in table.fields) ? table.fields[key].value : 0;
            switch (node.operator) {
                case '+': newVal = currVal + newVal; break;
                case '-': newVal = currVal - newVal; break;
                case '*': newVal = currVal * newVal; break;
                case '/':
                    if (newVal === 0) printErr("[MathError] Division by zero is undefined.");
                    newVal = currVal / newVal;
                    break;
                case '%':
                    if (newVal === 0) printErr("[MathError] Division or modulo by zero is undefined.");
                    newVal = currVal % newVal;
                    break;
            }
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
            table.fields[key] = { value: newVal, type: targetType, isNullable: isNullable };
            return newVal;
        }

        if (key in table.fields) {
            let field = table.fields[key];
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

        table.fields[key] = {
            value: newVal,
            type: getType(newVal),
            isNullable: true
        };

        return newVal;
    }

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

function evalMethodCall(node, env) {
    let target = evaluate(node.target, env);
    let targetType = getType(target);

    let isList = Array.isArray(target);
    let isStack = target && target.kind === 'Stack';
    let isQueue = target && target.kind === 'Queue';

    if (!isList && !isStack && !isQueue) {
        printErr(`[TypeError] Cannot call method '.${node.method}()' on type '${targetType}'. Supported types are 'List', 'Stack' and 'Queue'.`);
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

function evalTableLiteral(node, env) {
    let fields = {};

    for (let entry of node.entries) {
        let rawVal = evaluate(entry.value, env);
        let val = rawVal;
        let type = getType(rawVal);
        let isNullable = true;

        if (entry.typeInfo) {
            type = entry.typeInfo.baseType;
            isNullable = entry.typeInfo.isNullable;
            if (!isNullable && rawVal === null) {
                printErr(`[TypeError] Cannot assign NULL to non-nullable field '${entry.key}' of type '(${type})'.`);
            }
            if (rawVal !== null) {
                val = castToType(rawVal, type);
            }
        }

        fields[entry.key] = {
            value: val,
            type: type,
            isNullable: isNullable
        };
    }

    return { kind: 'Table', fields };
}

module.exports = { evalListLiteral, evalIndexAccess, evalIndexAssign, evalMethodCall, evalTableLiteral };

