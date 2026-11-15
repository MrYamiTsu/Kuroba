const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { createScope, findScope } = require('./scope');
const { evalCall } = require('./functions');

function evalClassDeclaration(node, env) {
    let superClassObj = null;
    if (node.superClass) {
        const scope = findScope(node.superClass, env);
        const entry = scope && scope.values[node.superClass];
        if (!entry || !entry.value || entry.value.kind !== 'Class') {
            printErr(`[ReferenceError] Cannot inherit from undefined class '${node.superClass}'.`);
        }
        superClassObj = entry.value;
    }

    const classObj = {
        kind: 'Class',
        name: node.name,
        superClass: superClassObj,
        fields: node.fields,
        methods: {},
        constructor: null,
        privateMembers: new Set(),
        instances: new Set()
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

function getHierarchy(classObj) {
    const chain = [];
    let curr = classObj;
    while (curr) {
        chain.unshift(curr);
        curr = curr.superClass;
    }
    return chain;
}

function createBaseBinding(instance, currentClass, env, evaluate) {
    const superClass = currentClass.superClass;
    if (!superClass) return null;

    const baseFn = (rawArgs, callEnv, evalFn) => {
        const activeEval = evalFn || evaluate;
        const activeEnv = callEnv || env;
        if (superClass.constructor) {
            const ctorAst = superClass.constructor;
            const ctorClosure = createScope(env);
            ctorClosure.values['this'] = {
                value: instance,
                type: 'Table',
                isConst: true,
                isNullable: false
            };
            if (superClass.superClass) {
                ctorClosure.values['base'] = {
                    value: createBaseBinding(instance, superClass, env, activeEval),
                    type: 'Base',
                    isConst: true,
                    isNullable: false
                };
            }
            const ctorObj = {
                kind: 'Function',
                name: ctorAst.name,
                params: ctorAst.params,
                body: ctorAst.body,
                closure: ctorClosure,
                boundInstance: instance,
                declaringClass: superClass.name
            };
            return evalCall({ caller: { type: 'Literal', value: ctorObj }, args: rawArgs }, activeEnv, activeEval);
        } else if (rawArgs.length > 0) {
            printErr(`[TypeError] Superclass '${superClass.name}' has no constructor that takes ${rawArgs.length} arguments.`);
        }
    };

    const baseObj = {
        kind: 'Base',
        isBase: true,
        fn: baseFn,
        superClass,
        instance,
        fields: {}
    };

    const superChain = getHierarchy(superClass);
    for (const ancestor of superChain) {
        for (const [mName, mAst] of Object.entries(ancestor.methods)) {
            const methodFn = buildBoundMethod(mAst, instance, ancestor, env, evaluate);
            baseObj.fields[mName] = {
                value: methodFn,
                type: 'Function',
                isNullable: false,
                isConst: true
            };
        }
    }

    return baseObj;
}

function buildBoundMethod(methodAst, instance, declaringClassObj, env, evaluate) {
    if (methodAst.isHook) {
        const origBoundFn = buildBoundMethod(methodAst.origMethodAst, instance, declaringClassObj, env, evaluate);
        const hookClosure = createScope(env);
        hookClosure.values['this'] = {
            value: instance,
            type: 'Table',
            isConst: true,
            isNullable: false
        };
        hookClosure.values['orig'] = {
            value: origBoundFn,
            type: 'Function',
            isConst: true,
            isNullable: false
        };
        if (declaringClassObj.superClass) {
            hookClosure.values['base'] = {
                value: createBaseBinding(instance, declaringClassObj, env, evaluate),
                type: 'Base',
                isConst: true,
                isNullable: false
            };
        }

        return {
            kind: 'Function',
            name: methodAst.name,
            params: methodAst.params,
            body: methodAst.body,
            closure: hookClosure,
            boundInstance: instance,
            declaringClass: declaringClassObj.name
        };
    }

    const methodClosure = createScope(env);
    methodClosure.values['this'] = {
        value: instance,
        type: 'Table',
        isConst: true,
        isNullable: false
    };
    if (declaringClassObj.superClass) {
        methodClosure.values['base'] = {
            value: createBaseBinding(instance, declaringClassObj, env, evaluate),
            type: 'Base',
            isConst: true,
            isNullable: false
        };
    }

    return {
        kind: 'Function',
        name: methodAst.name,
        params: methodAst.params,
        body: methodAst.body,
        closure: methodClosure,
        boundInstance: instance,
        declaringClass: declaringClassObj.name
    };
}

function hookClassMethod(classObj, methodName, hookNode, env, evaluate) {
    let targetClass = classObj;
    let origMethodAst = null;

    let curr = classObj;
    while (curr) {
        if (curr.methods && curr.methods[methodName]) {
            targetClass = curr;
            origMethodAst = curr.methods[methodName];
            break;
        }
        curr = curr.superClass;
    }

    if (!origMethodAst) {
        printErr(`[ReferenceError: Line ${hookNode.line}] Method '${methodName}' does not exist on class '${classObj.name}'.`);
    }

    if (origMethodAst.access === 'private' || (targetClass.privateMembers && targetClass.privateMembers.has(methodName))) {
        printErr(`[TypeError: Line ${hookNode.line}] Cannot hook private method '${methodName}' of class '${targetClass.name}'.`);
    }

    const hookMethodAst = {
        name: methodName,
        params: hookNode.params,
        body: hookNode.body,
        access: origMethodAst.access || 'public',
        isHook: true,
        origMethodAst: origMethodAst
    };

    classObj.methods[methodName] = hookMethodAst;

    for (const inst of classObj.instances) {
        const boundHook = buildBoundMethod(hookMethodAst, inst, classObj, env, evaluate);
        inst.fields[methodName] = {
            value: boundHook,
            type: 'Function',
            isNullable: false,
            isConst: true
        };
    }
}

function instantiateClass(classObj, rawArgs, env, evaluate) {
    const chain = getHierarchy(classObj);
    const privateMembers = new Set();
    const privateOwners = new Map();

    for (const c of chain) {
        for (const pm of c.privateMembers) {
            privateMembers.add(pm);
            privateOwners.set(pm, c.name);
        }
    }

    const instance = {
        kind: 'Table',
        className: classObj.name,
        isInstance: true,
        classRef: classObj,
        fields: {},
        privateMembers,
        privateOwners
    };

    classObj.instances.add(instance);

    for (const c of chain) {
        const initEnv = createScope(env);
        initEnv.values['this'] = {
            value: instance,
            type: 'Table',
            isConst: true,
            isNullable: false
        };
        if (c.superClass) {
            initEnv.values['base'] = {
                value: createBaseBinding(instance, c, env, evaluate),
                type: 'Base',
                isConst: true,
                isNullable: false
            };
        }

        for (const field of c.fields) {
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
    }

    for (const c of chain) {
        for (const [methodName, methodAst] of Object.entries(c.methods)) {
            const fnObj = buildBoundMethod(methodAst, instance, c, env, evaluate);
            instance.fields[methodName] = {
                value: fnObj,
                type: 'Function',
                isNullable: false,
                isConst: true
            };
        }
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
        if (classObj.superClass) {
            ctorClosure.values['base'] = {
                value: createBaseBinding(instance, classObj, env, evaluate),
                type: 'Base',
                isConst: true,
                isNullable: false
            };
        }

        const ctorFn = {
            kind: 'Function',
            name: ctorAst.name,
            params: ctorAst.params,
            body: ctorAst.body,
            closure: ctorClosure,
            boundInstance: instance,
            declaringClass: classObj.name
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

    if (!callerThis || callerThis !== target) {
        const kind = isMethod ? 'method' : 'member';
        printErr(`[TypeError] Cannot access private ${kind} '${memberName}' of class '${target.className}'.`);
    }

    if (target.privateOwners && target.privateOwners.has(memberName)) {
        const ownerClass = target.privateOwners.get(memberName);
        const activeFnScope = findScope('__currentFunction', env);
        const currentFn = activeFnScope ? activeFnScope.values['__currentFunction'].value : null;
        if (currentFn && currentFn.declaringClass && currentFn.declaringClass !== ownerClass) {
            const kind = isMethod ? 'method' : 'member';
            printErr(`[TypeError] Cannot access private ${kind} '${memberName}' of parent class '${ownerClass}'.`);
        }
    }
}

module.exports = { evalClassDeclaration, instantiateClass, checkPrivateAccess, hookClassMethod };