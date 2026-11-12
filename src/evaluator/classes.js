const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { createScope, findScope } = require('./scope');
const { evalCall } = require('./functions');

function evalClassDeclaration(node, env) {
    const classObj = {
        kind: 'Class',
        name: node.name,
        fields: node.fields,
        methods: {},
        constructor: null,
        privateMembers: new Set()
    };

    for (const f of node.fields) {
        if (f.access === 'private') {
            classObj.privateMembers.add(f.name);
        }
    }

    for (const m of node.methods) {
        if (m.access === 'private') {
            classObj.privateMembers.add(m.name);
        }
        if (m.name === node.name) {
            classObj.constructor = m;
        } else {
            classObj.methods[m.name] = m;
        }
    }

    env.values[node.name] = {
        value: classObj,
        type: 'Class',
        isConst: true,
        isNullable: false
    };

    return classObj;
}

function instantiateClass(classObj, rawArgs, env, evaluate) {
    const instance = {
        kind: 'Table',
        className: classObj.name,
        isInstance: true,
        classRef: classObj,
        fields: {},
        privateMembers: classObj.privateMembers
    };

    const initEnv = createScope(env);
    initEnv.values['this'] = {
        value: instance,
        type: 'Table',
        isConst: true,
        isNullable: false
    };

    for (const field of classObj.fields) {
        let val = null;
        if (field.value !== undefined && field.value !== null) {
            val = evaluate(field.value, initEnv);
        }

        let fieldType = field.explType || getType(val);
        if (field.typeInfo && field.typeInfo.baseType) {
            fieldType = field.typeInfo.baseType;
            if (!field.typeInfo.isNullable && val === null) {
                printErr(`[TypeError] Cannot assign NULL to non-nullable field '${field.name}' of type '(${fieldType})'.`);
            }
            if (val !== null) {
                val = castToType(val, fieldType);
            }
        } else if (!field.isNullable && val === null) {
            printErr(`[TypeError] Cannot assign NULL to non-nullable field '${field.name}'.`);
        }

        instance.fields[field.name] = {
            value: val,
            type: fieldType,
            isNullable: field.isNullable !== false,
            isConst: !!field.isConst
        };
    }

    for (const [methodName, methodAst] of Object.entries(classObj.methods)) {
        const methodClosure = createScope(env);
        methodClosure.values['this'] = {
            value: instance,
            type: 'Table',
            isConst: true,
            isNullable: false
        };

        const fnObj = {
            kind: 'Function',
            name: methodAst.name,
            params: methodAst.params,
            body: methodAst.body,
            closure: methodClosure,
            boundInstance: instance
        };

        instance.fields[methodName] = {
            value: fnObj,
            type: 'Function',
            isNullable: false,
            isConst: true
        };
    }

    if (classObj.constructor) {
        const ctorAst = classObj.constructor;
        const ctorClosure = createScope(env);
        ctorClosure.values['this'] = {
            value: instance,
            type: 'Table',
            isConst: true,
            isNullable: false
        };

        const ctorFn = {
            kind: 'Function',
            name: ctorAst.name,
            params: ctorAst.params,
            body: ctorAst.body,
            closure: ctorClosure,
            boundInstance: instance
        };

        evalCall({ caller: { type: 'Literal', value: ctorFn }, args: rawArgs }, env, evaluate);
    } else if (rawArgs.length > 0) {
        printErr(`[TypeError] Class '${classObj.name}' has no constructor that takes ${rawArgs.length} arguments.`);
    }

    return instance;
}

function checkPrivateAccess(target, memberName, env, isMethod = false) {
    if (!target || !target.isInstance || !target.privateMembers || !target.privateMembers.has(memberName)) {
        return;
    }

    const activeThis = findScope('this', env);
    const callerThis = activeThis ? activeThis.values['this'].value : null;

    if (callerThis === target || (callerThis && callerThis.className === target.className)) {
        return;
    }

    const kind = isMethod ? 'method' : 'member';
    printErr(`[TypeError] Cannot access private ${kind} '${memberName}' of class '${target.className}'.`);
}

module.exports = { evalClassDeclaration, instantiateClass, checkPrivateAccess };