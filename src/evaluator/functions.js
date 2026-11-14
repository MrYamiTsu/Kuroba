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
        printErr(`[RecursionError] Maximum recursion depth (${MAX_CALL_DEPTH}) exceeded.`);
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
        printErr(`[TypeError] Cannot call non-function value of type '${typeName}'.`);
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
            printErr(`[TypeError] Function '${funcName}' expects ${maxArgs} arguments, got ${node.args.length}.`);
        } else {
            printErr(`[TypeError] Function '${funcName}' expects between ${minArgs} and ${maxArgs} arguments, got ${node.args.length}.`);
        }
    }

    if (callDepth >= MAX_CALL_DEPTH) {
        let funcName = caller.name || '~';
        printErr(`[RecursionError] Maximum recursion depth (${MAX_CALL_DEPTH}) exceeded in function '${funcName}'.`);
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
                    printErr(`[TypeError] Cannot pass NULL to non-nullable parameter '${param.name}' of type '(${baseType})'.`);
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
    let origFunc = evaluate(node.target, env);

    if (!origFunc || origFunc.kind !== 'Function') {
        let typeName = getType(origFunc);
        printErr(`[TypeError: Line ${node.line}] Cannot hook non-function target of type '${typeName}'.`);
    }

    let hookClosure = createScope(env);
    
    hookClosure.values['this'] = {
        value: origFunc,
        type: 'Function',
        isConst: true,
        isNullable: false
    };
    let hookParams = node.params.map((p, i) => {
        let origParam = origFunc.params && origFunc.params[i];
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

    let hookFunc = {
        kind: 'Function',
        name: origFunc.name,
        params: hookParams,
        body: node.body,
        closure: hookClosure
    };

    if (node.target.type === 'Variable') {
        let scope = findScope(node.target.name, env);
        if (!scope) {
            printErr(`[ReferenceError: Line ${node.line}] Variable '${node.target.name}' not found.`);
        }

        scope.values[node.target.name].value = hookFunc;
    } else if (node.target.type === 'IndexAccess') {
        let table = evaluate(node.target.target, env);
        let key = String(evaluate(node.target.index, env));

        if (!table || table.kind !== 'Table') {
            printErr(`[TypeError: Line ${node.line}] Cannot hook into non-Table target.`);
        }

        if (key in table.fields) {
            table.fields[key].value = hookFunc;
        } else {
            table.fields[key] = { value: hookFunc, type: 'Function', isNullable: true };
        }
    }

    return hookFunc;
}

module.exports = { evalFunctionDeclaration, evalReturn, evalCall, evalHook };