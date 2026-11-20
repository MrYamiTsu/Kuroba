const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { createScope, findScope } = require('./scope');

const MAX_CALL_DEPTH = 512;
let callDepth = 0;

function evalFunctionDeclaration(node, env) {
    let funcObj = {
        kind: 'Function',
        name: node.name,
        params: node.params,
        body: node.body,
        closure: env
    };

    if (!node.isAnonymous && node.name) {
        env.values[node.name] = {
            value: funcObj,
            type: 'Function',
            isConst: false,
            isNullable: false
        };
    }

    return funcObj;
}

function evalReturn(node, env, evaluate) {
    let value = null;
    if (node.value !== null && node.value !== undefined) {
        value = evaluate(node.value, env);
    }
    return { isReturn: true, value };
}

function evalCall(node, env, evaluate) {
    if (callDepth >= MAX_CALL_DEPTH) {
        printErr({
            eName: 'RecursionError',
            eContext: `Maximum recursion depth (${MAX_CALL_DEPTH}) exceeded.`,
            eLine: node.line
        });
    }

    let caller = evaluate(node.caller, env);
    
    if (caller && caller.kind === 'Class') {
        const { instantiateClass } = require('./classes');
        return instantiateClass(caller, node.args, env, evaluate);
    }

    if (caller && caller.isBase) {
        return caller.fn(node.args, env, evaluate);
    }
    
    if (!caller || caller.kind !== 'Function') {
        let typeName = getType(caller);
        printErr({
            eName: 'TypeError',
            eContext: `Cannot call non-function value of type '${typeName}'.`,
            eLine: node.line
        });
    }

    if (caller.isNative) {
        let evaluatedArgs = node.args.map(a => evaluate(a, env));
        return caller.fn(...evaluatedArgs);
    }

    let minArgs = 0;
    for (let i = 0; i < caller.params.length; i++) {
        if (!caller.params[i].hasDefault) {
            minArgs = i + 1;
        }
    }
    let maxArgs = caller.params.length;

    if (node.args.length < minArgs || node.args.length > maxArgs) {
        let funcName = caller.name || '~';
        if (minArgs === maxArgs) {
            printErr({
                eName: 'TypeError',
                eContext: `Function '${funcName}' expects ${maxArgs} arguments, got ${node.args.length}.`,
                eLine: node.line
            });
        } else {
            printErr({
                eName: 'TypeError',
                eContext: `Function '${funcName}' expects between ${minArgs} and ${maxArgs} arguments, got ${node.args.length}.`,
                eLine: node.line
            });
        }
    }

    if (callDepth >= MAX_CALL_DEPTH) {
        let funcName = caller.name || '~';
        printErr({
            eName: 'RecursionError',
            eContext: `Maximum recursion depth (${MAX_CALL_DEPTH}) exceeded in function '${funcName}'.`,
            eLine: node.line
        });
    }

    callDepth++;
    try {
        let fnEnv = createScope(caller.closure);

        for (let i = 0; i < caller.params.length; i++) {
            let param = caller.params[i];
            let argVal;
            if (i < node.args.length) {
                argVal = evaluate(node.args[i], env);
            } else if (param.defaultClosure) {
                let defaultEnv = { values: fnEnv.values, parent: param.defaultClosure };
                argVal = evaluate(param.defaultValue, defaultEnv);
            } else {
                argVal = evaluate(param.defaultValue, fnEnv);
            }

            if (param.typeInfo) {
                let baseType = param.typeInfo.baseType;
                let isNullable = param.typeInfo.isNullable;

                if (!isNullable && argVal === null) {
                    printErr({
                        eName: 'TypeError',
                        eContext: `Cannot pass NULL to non-nullable parameter '${param.name}' of type '(${baseType})'.`,
                        eLine: node.line
                    });
                }
                if (argVal !== null) {
                    argVal = castToType(argVal, baseType);
                }
            }

            fnEnv.values[param.name] = {
                value: argVal,
                type: getType(argVal),
                isNullable: true,
                isConst: false
            };
        }

        for (let stmt of caller.body) {
            let res = evaluate(stmt, fnEnv);
            if (res && res.isReturn) {
                return res.value;
            }
        }

        return null;
    } finally {
        callDepth--;
    }
}

function evalHook(node, env, evaluate) {
    let hookParamsBuilder = (origFunc) => {
        return node.params.map((p, i) => {
            let origParam = origFunc && origFunc.params && origFunc.params[i];
            if (!p.hasDefault && origParam && origParam.hasDefault) {
                return {
                    ...p,
                    hasDefault: true,
                    defaultValue: origParam.defaultValue,
                    defaultClosure: origParam.defaultClosure || origFunc.closure
                };
            }
            return p;
        });
    };

    if (node.target.type === 'Variable') {
        let origFunc = evaluate(node.target, env);
        if (!origFunc || origFunc.kind !== 'Function') {
            let typeName = getType(origFunc);
            printErr({
                eName: 'TypeError',
                eContext: `Cannot hook non-function target of type '${typeName}'.`,
                eLine: node.line
            });
        }

        let hookClosure = createScope(env);
        hookClosure.values['orig'] = {
            value: origFunc,
            type: 'Function',
            isConst: true,
            isNullable: false
        };

        let hookFunc = {
            kind: 'Function',
            name: origFunc.name,
            params: hookParamsBuilder(origFunc),
            body: node.body,
            closure: hookClosure
        };

        let scope = findScope(node.target.name, env);
        if (!scope) {
            printErr({
                eName: 'ReferenceError',
                eContext: `Variable '${node.target.name}' not found.`,
                eLine: node.line
            });
        }
        scope.values[node.target.name].value = hookFunc;
        return hookFunc;
    }

    if (node.target.type === 'IndexAccess') {
        let container = evaluate(node.target.target, env);
        let key = (typeof node.target.index === 'string' && node.target.isDotAccess)
            ? node.target.index
            : String(evaluate(node.target.index, env));

        if (container && container.kind === 'Class') {
            const { hookClassMethod } = require('./classes');
            hookClassMethod(container, key, node, env, evaluate);
            return null;
        }

        if (container && container.kind === 'Table') {
            if (container.isInstance && container.memberAccess) {
                const acc = container.memberAccess.get(key);
                if (acc === 'private' || acc === 'isolated') {
                    printErr({
                        eName: 'TypeError',
                        eContext: `Cannot hook ${acc} method '${key}' of class '${container.className}'.`,
                        eLine: node.line
                    });
                }
            } else if (container.isInstance && container.privateMembers && container.privateMembers.has(key)) {
                printErr({
                    eName: 'TypeError',
                    eContext: `Cannot hook private method '${key}' of class '${container.className}'.`,
                    eLine: node.line
                });
            }

            let origFunc = container.fields[key] ? container.fields[key].value : null;
            if (!origFunc || origFunc.kind !== 'Function') {
                printErr({
                    eName: 'TypeError',
                    eContext: `Cannot hook non-function member '${key}' on Table.`,
                    eLine: node.line
                });
            }

            let hookClosure = createScope(env);
            hookClosure.values['this'] = {
                value: container,
                type: 'Table',
                isConst: true,
                isNullable: false
            };
            hookClosure.values['orig'] = {
                value: origFunc,
                type: 'Function',
                isConst: true,
                isNullable: false
            };

            let hookFunc = {
                kind: 'Function',
                name: origFunc.name,
                params: hookParamsBuilder(origFunc),
                body: node.body,
                closure: hookClosure,
                boundInstance: container
            };

            container.fields[key].value = hookFunc;
            return hookFunc;
        }

        printErr({
            eName: 'TypeError',
            eContext: `Target for hook must be a function, Table method, or Class method.`,
            eLine: node.line
        });
    }

    printErr({
        eName: 'SyntaxError',
        eContext: `Invalid target expression for hook.`,
        eLine: node.line
    });
}

module.exports = { evalFunctionDeclaration, evalReturn, evalCall, evalHook };