const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { findScope } = require('./scope');

function validateAndCast(val, targetType, isNullable, typeInfo, varName) {
    if (val === null) {
        if (!isNullable) {
            printErr({
                eName: 'TypeError',
                eContext: `Cannot assign NULL to non-nullable variable '${varName}' of type '(${targetType})'.`
            });
        }
        return null;
    }

    if (targetType === 'Table') {
        if (val && val.kind === 'Table') return val;
        printErr({
            eName: 'TypeError',
            eContext: `Cannot assign non-Table value of type '${getType(val)}' to variable '${varName}' of type 'Table'.`
        });
    }

    if (targetType === 'List' || targetType === 'Stack' || targetType === 'Queue') {
        let rawItems = null;

        if (Array.isArray(val)) {
            rawItems = [...val];
        } else if (val && (val.kind === targetType || val.kind === 'Stack' || val.kind === 'Queue')) {
            rawItems = [...val.items];
        } else {
            printErr({
                eName: 'TypeError',
                eContext: `Cannot assign non-collection value of type '${getType(val)}' to variable '${varName}' of type '${targetType}'.`
            });
        }

        if (typeInfo && typeInfo.elemType) {
            for (let i = 0; i < rawItems.length; i++) {
                let elem = rawItems[i];
                if (elem === null) {
                    if (!typeInfo.isElemNullable) {
                        printErr({
                            eName: 'TypeError',
                            eContext: `Element at index ${i} in ${targetType} '${varName}' cannot be NULL.`
                        });
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

function evalVarDeclar(node, env, evaluate) {
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

function evalVarAssign(node, env, evaluate) {
    let scope = findScope(node.name, env);
    if (!scope) {
        printErr({
            eName: 'ReferenceError',
            eContext: `Cannot reassign undeclared variable '${node.name}'.`
        });
    }
    let target = scope.values[node.name];
    if (target.isConst) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot reassign constant '${node.name}'.`
        });
    }

    let rawVal = evaluate(node.value, env);
    let val = validateAndCast(rawVal, target.type, target.isNullable, target.typeInfo, node.name);

    let newType = getType(val);
    if (val !== null && target.type !== newType) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot assign type '${newType}' to variable '${node.name}' of type '${target.type}'.`
        });
    }

    target.value = val;
    return val;
}

function evalVariable(node, env) {
    let scope = findScope(node.name, env);
    if (scope) return scope.values[node.name].value;
    printErr({
        eName: 'ReferenceError',
        eContext: `Variable '${node.name}' is not defined.`
    });
}

function evalVarRetype(node, env, evaluate) {
    let scope = findScope(node.name, env);
    if (!scope) {
        printErr({
            eName: 'ReferenceError',
            eContext: `Cannot retype undeclared variable '${node.name}'.`
        });
    }
    let target = scope.values[node.name];
    if (target.isConst) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot retype constant '${node.name}'.`
        });
    }

    let rawVal = evaluate(node.value, env);
    let val = validateAndCast(rawVal, node.targetType, node.isNullable, node.typeInfo, node.name);

    target.value = val;
    target.type = node.targetType;
    target.isNullable = node.isNullable;
    target.typeInfo = node.typeInfo || null;
    return val;
}

function assignTarget(targetNode, val, env, evaluate) {
    if (targetNode.type === 'Variable') {
        evalVarAssign({
            type: 'VarAssign',
            name: targetNode.name,
            value: { type: 'Literal', value: val }
        }, env, evaluate);
    } else if (targetNode.type === 'IndexAccess') {
        const { evalMemberAssign } = require('./collections');
        evalMemberAssign({
            type: 'MemberAssign',
            target: targetNode.target,
            index: targetNode.index,
            isDotAccess: targetNode.isDotAccess,
            value: { type: 'Literal', value: val },
            operator: null,
            typeInfo: null
        }, env, evaluate);
    }
}

function evalSwap(node, env, evaluate) {
    let leftNode = (typeof node.left === 'string') ? { type: 'Variable', name: node.left } : node.left;
    let rightNode = (typeof node.right === 'string') ? { type: 'Variable', name: node.right } : node.right;

    let valA = evaluate(leftNode, env);
    let valB = evaluate(rightNode, env);

    assignTarget(leftNode, valB, env, evaluate);
    assignTarget(rightNode, valA, env, evaluate);
    return null;
}

function evalKill(node, env) {
    let scope = findScope(node.name, env);
    if (!scope) {
        printErr({
            eName: 'ReferenceError',
            eContext: `Cannot kill undefined variable '${node.name}'.`,
            eLine: node.line
        });
    }

    let targetVar = scope.values[node.name];
    if (targetVar.isConst) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot kill constant variable '${node.name}'.`,
            eLine: node.line
        });
    }

    delete scope.values[node.name];
}

module.exports = { evalVarDeclar, evalVarAssign, evalVariable, evalVarRetype, evalSwap, evalKill };

