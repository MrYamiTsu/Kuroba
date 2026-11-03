const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { findScope } = require('./scope');
const { evaluate } = require('./index');

function validateAndCast(val, targetType, isNullable, typeInfo, varName) {
    if (val === null) {
        if (!isNullable) {
            printErr(`[TypeError] Cannot assign NULL to non-nullable variable '${varName}' of type '(${targetType})'.`);
        }
        return null;
    }

    if (targetType === 'List' || targetType === 'Stack' || targetType === 'Queue') {
        let rawItems = null;

        if (Array.isArray(val)) {
            rawItems = [...val];
        } else if (val && (val.kind === targetType || val.kind === 'Stack' || val.kind === 'Queue')) {
            rawItems = [...val.items];
        } else {
            printErr(`[TypeError] Cannot assign non-collection value of type '${getType(val)}' to variable '${varName}' of type '${targetType}'.`);
        }

        if (typeInfo && typeInfo.elemType) {
            for (let i = 0; i < rawItems.length; i++) {
                let elem = rawItems[i];
                if (elem === null) {
                    if (!typeInfo.isElemNullable) {
                        printErr(`[TypeError] Element at index ${i} in ${targetType} '${varName}' cannot be NULL.`);
                    }
                } else {
                    rawItems[i] = castToType(elem, typeInfo.elemType);
                }
            }
        }

        if (targetType === 'Stack') return { kind: 'Stack', items: rawItems };
        if (targetType === 'Queue') return { kind: 'Queue', items: rawItems };
        
        return rawItems;
    }

    if (targetType) {
        return castToType(val, targetType);
    }
    return val;
}

function evalVarDeclar(node, env) {
    let rawVal = evaluate(node.value, env);
    let val = validateAndCast(rawVal, node.explType, node.isNullable !== false, node.typeInfo, node.name);

    env.values[node.name] = {
        value: val,
        type: node.explType || getType(val),
        isConst: !!node.isConst,
        isNullable: node.isNullable !== false,
        typeInfo: node.typeInfo || null
    };
    return val;
}

function evalVarAssign(node, env) {
    let scope = findScope(node.name, env);
    if (!scope) printErr(`[ReferenceError] Cannot reassign undeclared variable '${node.name}'.`);
    let target = scope.values[node.name];
    if (target.isConst) printErr(`[TypeError] Cannot reassign constant '${node.name}'.`);

    let rawVal = evaluate(node.value, env);
    let val = validateAndCast(rawVal, target.type, target.isNullable, target.typeInfo, node.name);

    let newType = getType(val);
    if (val !== null && target.type !== newType) {
        printErr(`[TypeError] Cannot assign type '${newType}' to variable '${node.name}' of type '${target.type}'.`);
    }

    target.value = val;
    return val;
}

function evalVariable(node, env) {
    let scope = findScope(node.name, env);
    if (scope) return scope.values[node.name].value;
    printErr(`[ReferenceError] Variable '${node.name}' is not defined.`);
}

function evalVarRetype(node, env) {
    let scope = findScope(node.name, env);
    if (!scope) printErr(`[ReferenceError] Cannot retype undeclared variable '${node.name}'.`);
    let target = scope.values[node.name];
    if (target.isConst) printErr(`[TypeError] Cannot retype constant '${node.name}'.`);

    let rawVal = evaluate(node.value, env);
    let val = validateAndCast(rawVal, node.targetType, node.isNullable, node.typeInfo, node.name);

    target.value = val;
    target.type = node.targetType;
    target.isNullable = node.isNullable;
    target.typeInfo = node.typeInfo || null;
    return val;
}

function evalSwap(node, env) {
    let scopeLeft = findScope(node.left, env);
    let scopeRight = findScope(node.right, env);
    if (!scopeLeft) printErr(`[ReferenceError] Cannot swap undeclared variable '${node.left}'.`);
    if (!scopeRight) printErr(`[ReferenceError] Cannot swap undeclared variable '${node.right}'.`);

    let varA = scopeLeft.values[node.left];
    let varB = scopeRight.values[node.right];

    if (varA.isConst) printErr(`[TypeError] Cannot swap constant '${node.left}'.`);
    if (varB.isConst) printErr(`[TypeError] Cannot swap constant '${node.right}'.`);

    if (!varA.isNullable && varB.value === null) printErr(`[TypeError] Cannot swap NULL into non-nullable variable '${node.left}'.`);
    if (!varB.isNullable && varA.value === null) printErr(`[TypeError] Cannot swap NULL into non-nullable variable '${node.right}'.`);
    
    if (varA.type !== varB.type) printErr(`[TypeError] Cannot swap variable '${node.left}' of type '${varA.type}' with variable '${node.right}' of type '${varB.type}'.`);

    let temp = varA.value;
    varA.value = varB.value;
    varB.value = temp;
}

module.exports = { evalVarDeclar, evalVarAssign, evalVariable, evalVarRetype, evalSwap };

