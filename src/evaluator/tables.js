const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { findScope } = require('./scope');

function evalTableLiteral(node, env, evaluate) {
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

function evalPropertyAssign(node, env, evaluate) {
    let scope = findScope(node.name, env);
    if (!scope) printErr(`[ReferenceError] Variable '${node.name}' is not defined.`);

    let targetVar = scope.values[node.name];
    if (targetVar.isConst) {
        printErr(`[TypeError] Cannot modify properties of constant Table '${node.name}'.`);
    }

    if (!targetVar.value || targetVar.value.kind !== 'Table') {
        printErr(`[TypeError] Cannot set property '${node.property}' on non-Table value of type '${getType(targetVar.value)}'.`);
    }

    let table = targetVar.value;
    let path = node.path || [node.property];

    for (let i = 0; i < path.length - 1; i++) {
        let seg = path[i];
        if (!table.fields || !(seg in table.fields)) {
            printErr(`[ReferenceError] Property '${seg}' does not exist on Table.`);
        }
        let child = table.fields[seg].value;
        if (!child || child.kind !== 'Table') {
            printErr(`[TypeError] Cannot access property through non-Table field '${seg}'.`);
        }
        table = child;
    }
    
    let key = path[path.length - 1];
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

module.exports = { evalTableLiteral, evalPropertyAssign };
