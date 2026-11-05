const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { createScope, findScope } = require('./scope');
const { evaluate } = require('./index');

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

function evalReturn(node, env) {
    let value = null;
    if (node.value) {
        value = evaluate(node.value, env);
    }
    return { isReturn: true, value };
}

function evalCall(node, env) {
    let caller = evaluate(node.caller, env);

    if (!caller || caller.kind !== 'Function') {
        let typeName = getType(caller);
        printErr(`[TypeError] Cannot call non-function value of type '${typeName}'.`);
    }

    if (caller.isNative) {
        let evaluatedArgs = node.args.map(a => evaluate(a, env));
        return caller.fn(...evaluatedArgs);
    }

    if (node.args.length !== caller.params.length) {
        let funcName = caller.name || '~';
        printErr(`[TypeError] Function '${funcName}' expects ${caller.params.length} arguments, got ${node.args.length}.`);
    }

    let fnEnv = createScope(caller.closure);

    for (let i = 0; i < caller.params.length; i++) {
        let param = caller.params[i];
        let argVal = evaluate(node.args[i], env);

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
}

function evalHook(node, env) {
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
    let hookFunc = {
        kind: 'Function',
        name: origFunc.name,
        params: node.params,
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