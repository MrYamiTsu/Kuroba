const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { findScope } = require('./scope');
const { evalCall } = require('./functions');
const { checkPrivateAccess, checkPrivateSharedAccess, instantiateClass, resolveMemberKey, invokeGetter, invokeSetter } = require('./classes');

function evalListLiteral(node, env, evaluate) {
    return node.elements.map(el => evaluate(el, env));
}

function evalIndexAccess(node, env, evaluate) {
    let target = evaluate(node.target, env);

    if (target && target.kind === 'Interface') {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot access members directly on interface '${target.name}'.`
        });
    }

    if (target && target.kind === 'Enum') {
        let key = node.index;
        if (key in target.members) {
            return target.members[key];
        }
        printErr({
            eName: 'ReferenceError',
            eContext: `Member '${key}' does not exist on enum '${target.name}'.`
        });
    }

    if (target && target.kind === 'Class') {
        let key = node.index;
        checkPrivateSharedAccess(target, key, env, false);

        let curr = target;
        while (curr) {
            if (curr.sharedFields && key in curr.sharedFields) {
                if (curr !== target && (curr.sharedFields[key].access === 'isolated' || curr.sharedFields[key].access === 'exclusive')) {
                    curr = curr.superClass;
                    continue;
                }
                return curr.sharedFields[key].value;
            }
            if (curr.sharedMethods && key in curr.sharedMethods) {
                const m = curr.sharedMethods[key];
                if (curr !== target && (m.access === 'isolated' || m.access === 'exclusive')) {
                    curr = curr.superClass;
                    continue;
                }
                return curr.sharedMethods[key];
            }
            curr = curr.superClass;
        }

        printErr({
            eName: 'ReferenceError',
            eContext: `Shared member '${key}' does not exist on class '${target.name}'.`
        });
    }

    if (target && (target.kind === 'Table' || target.isBase)) {
        if (!node.isDotAccess) {
            printErr({
                eName: 'TypeError',
                eContext: "Tables do not support bracket indexing. Use dot notation 'table.property' instead."
            });
        }

        let key = (typeof resolveMemberKey === 'function') ? resolveMemberKey(target, node.index, env) : node.index;

        checkPrivateAccess(target, key, env, false);

        if (target.getters && (target.getters[key] || target.getters[node.index])) {
            const g = target.getters[key] || target.getters[node.index];
            const rawVal = (key in target.fields) ? target.fields[key].value : null;
            return invokeGetter(g.ast, target, rawVal, g.declaringClass, env, evaluate);
        }

        if (key in target.fields) {
            return target.fields[key].value;
        }
        
        return null;
    }

    if (node.isDotAccess) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot access '${getType(target)}' with dot notation. Use bracket indexing 'list[index]' instead.`
        });
    }

    if (typeof target === 'string') {
        let idx = evaluate(node.index, env);
        if (!Number.isInteger(idx)) {
            printErr({
                eName: 'IndexError',
                eContext: `String index must be an integer, got '${idx}'.`
            });
        }
        if (idx < 0 || idx >= target.length) {
            printErr({
                eName: 'IndexError',
                eContext: `Index ${idx} out of bounds for string of length ${target.length}.`
            });
        }
        return target[idx];
    }

    if (!Array.isArray(target)) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot index non-list value of type '${getType(target)}'.`
        });
    }
    let idx = evaluate(node.index, env);
    if (!Number.isInteger(idx)) {
        printErr({
            eName: 'IndexError',
            eContext: `List index must be an integer, got '${idx}'.`
        });
    }
    if (idx < 0 || idx >= target.length) {
        printErr({
            eName: 'IndexError',
            eContext: `Index ${idx} out of bounds for list of length ${target.length}.`
        });
    }
    return target[idx];
}

function applyCompoundOp(currVal, rhsVal, operator) {
    switch (operator) {
        case '+': return currVal + rhsVal;
        case '-': return currVal - rhsVal;
        case '*': return currVal * rhsVal;
        case '/':
            if (rhsVal === 0) {
                printErr({
                    eName: 'MathError',
                    eContext: "Division by zero is undefined."
                });
            }
            return currVal / rhsVal;
        case '%':
            if (rhsVal === 0) {
                printErr({
                    eName: 'MathError',
                    eContext: "Division or modulo by zero is undefined."
                });
            }
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
        if (!scope) {
            printErr({
                eName: 'ReferenceError',
                eContext: `Variable '${root.name}' is not defined.`
            });
        }
        
        rootVarEntry = scope.values[root.name];
        if (rootVarEntry.isConst && root.name !== 'this' && rootVarEntry.type !== 'Class') {
            printErr({
                eName: 'TypeError',
                eContext: `Cannot modify constant '${root.name}'.`
            });
        }
    }

    let container = evaluate(node.target, env);

    if (container && container.kind === 'Interface') {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot assign property '${node.index}' on interface '${container.name}'.`
        });
    }

    if (container && container.kind === 'Enum') {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot reassign member of immutable enum '${container.name}'.`
        });
    }

    if (container && container.kind === 'Class') {
        let key = node.index;
        checkPrivateSharedAccess(container, key, env, false);

        let curr = container;
        let fieldEntry = null;
        while (curr) {
            if (curr.sharedFields && key in curr.sharedFields) {
                if (curr !== container && (curr.sharedFields[key].access === 'isolated' || curr.sharedFields[key].access === 'exclusive')) {
                    curr = curr.superClass;
                    continue;
                }
                fieldEntry = curr.sharedFields[key];
                break;
            }
            curr = curr.superClass;
        }

        if (!fieldEntry) {
            printErr({
                eName: 'ReferenceError',
                eContext: `Shared variable '${key}' does not exist on class '${container.name}'.`
            });
        }

        if (fieldEntry.isConst) {
            printErr({
                eName: 'TypeError',
                eContext: `Cannot modify constant shared member '${key}' on class '${container.name}'.`
            });
        }

        let currVal = fieldEntry.value;
        let rhsVal = evaluate(node.value, env);
        let finalVal = applyCompoundOp(currVal, rhsVal, node.operator);
        if (fieldEntry.type && rhsVal !== null) {
            finalVal = castToType(finalVal, fieldEntry.type);
        }
        fieldEntry.value = finalVal;
        return finalVal;
    }

    if (node.isDotAccess) {
        if (!container || container.kind !== 'Table') {
            printErr({
                eName: 'TypeError',
                eContext: `Cannot set property '${node.index}' on non-Table value of type '${getType(container)}'.`
            });
        }

        let key = (typeof resolveMemberKey === 'function') ? resolveMemberKey(container, node.index, env) : node.index;

        checkPrivateAccess(container, key, env, false);

        let newVal = evaluate(node.value, env);

        if (node.operator) {
            let currVal = (key in container.fields) ? container.fields[key].value : 0;
            newVal = applyCompoundOp(currVal, newVal, node.operator);
        }

        if (container.setters && (key in container.setters || node.index in container.setters)) {
            const sKey = (key in container.setters) ? key : node.index;
            const s = container.setters[sKey];
            const currRaw = (key in container.fields) ? container.fields[key].value : null;
            
            const computedNewVal = invokeSetter(s.ast, container, currRaw, newVal, s.declaringClass, env, evaluate);
            
            if (key in container.fields) {
                container.fields[key].value = computedNewVal;
            }
            return computedNewVal;
        }

        if (node.typeInfo) {
            let targetType = node.typeInfo.baseType;
            let isNullable = node.typeInfo.isNullable;
            if (!isNullable && newVal === null) {
                printErr({
                    eName: 'TypeError',
                    eContext: `Cannot assign NULL to non-nullable field '${key}' of type '(${targetType})'.`
                });
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
                printErr({
                    eName: 'TypeError',
                    eContext: `Cannot assign NULL to non-nullable field '${key}' of type '(${field.type})'.`
                });
            }
            if (newVal !== null) {
                let actualType = getType(newVal);
                if (field.type !== actualType) {
                    printErr({
                        eName: 'TypeError',
                        eContext: `Cannot assign type '${actualType}' to field '${key}' of type '${field.type}'.`
                    });
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
        printErr({
            eName: 'TypeError',
            eContext: `Tables do not support bracket assignment. Use dot notation 'table.${evaluate(node.index, env)} = ...' instead.`
        });
    }

    if (!Array.isArray(container)) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot index non-list value of type '${getType(container)}'.`
        });
    }

    let idx = evaluate(node.index, env);
    if (!Number.isInteger(idx)) {
        printErr({
            eName: 'IndexError',
            eContext: `List index must be an integer, got '${idx}'.`
        });
    }
    if (idx < 0 || idx >= container.length) {
        printErr({
            eName: 'IndexError',
            eContext: `Index ${idx} out of bounds for list of length ${container.length}.`
        });
    }

    let newVal = evaluate(node.value, env);
    if (node.operator) {
        newVal = applyCompoundOp(container[idx], newVal, node.operator);
    }

    let listTypeInfo = (node.target.type === 'Variable') ? rootVarEntry?.typeInfo : null;
    if (listTypeInfo && listTypeInfo.elemType) {
        if (newVal === null) {
            if (!listTypeInfo.isElemNullable) {
                printErr({
                    eName: 'TypeError',
                    eContext: `Cannot assign NULL to non-nullable element of list '${node.target.name}'.`
                });
            }
        } else {
            newVal = castToType(newVal, listTypeInfo.elemType);
        }
    } else if (node.typeInfo) {
        let targetType = node.typeInfo.baseType;
        if (!node.typeInfo.isNullable && newVal === null) {
            printErr({
                eName: 'TypeError',
                eContext: `Cannot assign NULL to non-nullable element of type '(${targetType})'.`
            });
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

    if (target && target.kind === 'Interface') {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot call method '${node.method}' on interface '${target.name}'.`
        });
    }

    if (target && target.kind === 'Class') {
        let methodName = node.method;
        checkPrivateSharedAccess(target, methodName, env, true);

        let curr = target;
        while (curr) {
            if (curr.sharedMethods && methodName in curr.sharedMethods) {
                let fnObj = curr.sharedMethods[methodName];
                if (curr !== target && (fnObj.access === 'isolated' || fnObj.access === 'exclusive')) {
                    curr = curr.superClass;
                    continue;
                }
                return evalCall({ caller: { type: 'Literal', value: fnObj }, args: node.args }, env, evaluate);
            }
            curr = curr.superClass;
        }

        printErr({
            eName: 'ReferenceError',
            eContext: `Shared method '${methodName}' does not exist on class '${target.name}'.`
        });
    }

    if (target && (target.kind === 'Table' || target.isBase)) {
        let methodName = (typeof resolveMemberKey === 'function') ? resolveMemberKey(target, node.method, env) : node.method;

        checkPrivateAccess(target, methodName, env, true);

        if (methodName in target.fields) {
            let fnObj = target.fields[methodName].value;
            if (fnObj && fnObj.kind === 'Class') {
                return instantiateClass(fnObj, node.args, env, evaluate);
            }

            if (fnObj && fnObj.kind === 'Function') {
                if (fnObj.isNative) {
                    let evaluatedArgs = node.args.map(a => evaluate(a, env));
                    return fnObj.fn(...evaluatedArgs);
                }
                return evalCall({ caller: { type: 'Literal', value: fnObj }, args: node.args }, env, evaluate);
            }

            printErr({
                eName: 'TypeError',
                eContext: `Field '${methodName}' on Table is not a callable function.`
            });
        }

        let targetDesc = target.isInstance ? `class '${target.className}'` : 'Table';
        printErr({
            eName: 'ReferenceError',
            eContext: `Method or field '${methodName}' does not exist on ${targetDesc}.`
        });
    }

    let isList = Array.isArray(target);
    let isStack = target && target.kind === 'Stack';
    let isQueue = target && target.kind === 'Queue';

    if (!isList && !isStack && !isQueue) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot call method '.${node.method}()' on type '${targetType}'. Supported types are 'List', 'Stack', 'Queue' and 'Table'.`
        });
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
                printErr({
                    eName: 'TypeError',
                    eContext: `Method '.push()' expects at least 1 argument.`
                });
            }

            let val = evaluate(node.args[0], env);

            if (tInfo && tInfo.elemType) {
                if (val === null) {
                    if (!tInfo.isElemNullable) {
                        printErr({
                            eName: 'TypeError',
                            eContext: `Cannot push NULL into ${targetType} '${node.target.name}' with non-nullable elements.`
                        });
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
                    if (!Number.isInteger(pos)) {
                        printErr({
                            eName: 'IndexError',
                            eContext: `Position argument in '.push()' must be an integer, got '${pos}'.`
                        });
                    }
                    if (pos < 0 || pos > items.length) {
                        printErr({
                            eName: 'IndexError',
                            eContext: `Position ${pos} out of bounds for list of length ${items.length}.`
                        });
                    }
                    items.splice(pos, 0, val);
                } else {
                    items.push(val);
                }
            }

            return val;
        }
        case 'pop': {
            if (items.length === 0) {
                printErr({
                    eName: 'IndexError',
                    eContext: `Cannot pop from an empty ${targetType}.`
                });
            }

            if (isStack) {
                return items.pop();
            } else if (isQueue) {
                return items.shift();
            } else {
                if (node.args.length < 1) {
                    printErr({
                        eName: 'TypeError',
                        eContext: `Method '.pop()' on a List requires an index argument. (e.g. list.pop(0))`
                    });
                }

                let pos = evaluate(node.args[0], env);
                if (!Number.isInteger(pos)) {
                    printErr({
                        eName: 'IndexError',
                        eContext: `Index argument in '.pop()' must be an integer, got '${pos}'.`
                    });
                }
                if (pos < 0 || pos >= items.length) {
                    printErr({
                        eName: 'IndexError',
                        eContext: `Index ${pos} out of bounds for list of length ${items.length}.`
                    });
                }

                return items.splice(pos, 1)[0];
            }
        }
        case 'peek': {
            if (items.length === 0) {
                printErr({
                    eName: 'IndexError',
                    eContext: `Cannot peek into an empty ${targetType}.`
                });
            }

            if (isStack) {
                return items[items.length - 1];
            } else if (isQueue) {
                return items[0];
            } else {
                if (node.args.length < 1) {
                    printErr({
                        eName: 'TypeError',
                        eContext: `Method '.peek()' on a List requires an index argument. (e.g. list.peek(0))`
                    });
                }

                let pos = evaluate(node.args[0], env);
                if (!Number.isInteger(pos)) {
                    printErr({
                        eName: 'IndexError',
                        eContext: `Index argument in '.peek()' must be an integer, got '${pos}'.`
                    });
                }
                if (pos < 0 || pos >= items.length) {
                    printErr({
                        eName: 'IndexError',
                        eContext: `Index ${pos} out of bounds for list of length ${items.length}.`
                    });
                }
                
                return items[pos];
            }
        }
        case 'count': {
            return items.length;
        }
        default:
            printErr({
                eName: 'TypeError',
                eContext: `Unknown method '.${method}()' on type '${targetType}'. Supported methods are 'push', 'pop', 'peek' and 'count'.`
            });
    }
}

module.exports = { evalListLiteral, evalIndexAccess, evalMemberAssign, evalMethodCall };