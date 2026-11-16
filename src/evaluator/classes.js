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
            printErr({
                eName: 'ReferenceError',
                eContext: `Cannot inherit from undefined class '${node.superClass}'.`,
                eLine: node.line
            });
        }
        superClassObj = entry.value;
    }

    const classObj = {
        kind: 'Class',
        name: node.name,
        superClass: superClassObj,
        fields: node.fields,
        methods: {},
        sharedFields: {},
        sharedMethods: {},
        constructor: null,
        privateMembers: new Set(),
        privateSharedMembers: new Set(),
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

    if (node.sharedFields) {
        const sharedEnv = createScope(env);
        for (const f of node.sharedFields) {
            if (f.access === 'private') {
                classObj.privateSharedMembers.add(f.name);
            }
            let val = null;
            if (f.value !== undefined && f.value !== null) {
                const { evaluate } = require('./index');
                val = evaluate(f.value, sharedEnv);
            }
            let fieldType = f.explType || getType(val);
            if (f.typeInfo && f.typeInfo.baseType) {
                fieldType = f.typeInfo.baseType;
                if (!f.typeInfo.isNullable && val === null) {
                    printErr({
                        eName: 'TypeError',
                        eContext: `Cannot assign NULL to non-nullable shared field '${f.name}'.`,
                        eLine: f.line
                    });
                }
                if (val !== null) {
                    val = castToType(val, fieldType);
                }
            } else if (!f.isNullable && val === null) {
                printErr({
                    eName: 'TypeError',
                    eContext: `Cannot assign NULL to non-nullable shared field '${f.name}'.`,
                    eLine: f.line
                });
            }
            classObj.sharedFields[f.name] = {
                value: val,
                type: fieldType,
                isNullable: f.isNullable !== false,
                isConst: !!f.isConst,
                access: f.access
            };
        }
    }

    if (node.sharedMethods) {
        for (const m of node.sharedMethods) {
            if (m.access === 'private') {
                classObj.privateSharedMembers.add(m.name);
            }
            const methodClosure = createScope(env);
            methodClosure.values['__declaringClass'] = {
                value: node.name,
                type: 'String',
                isConst: true,
                isNullable: false
            };
            classObj.sharedMethods[m.name] = {
                kind: 'Function',
                name: m.name,
                params: m.params,
                body: m.body,
                closure: methodClosure,
                isShared: true,
                declaringClass: node.name
            };
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
            printErr({
                eName: 'TypeError',
                eContext: `Superclass '${superClass.name}' has no constructor that takes ${rawArgs.length} arguments.`
            });
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
    methodClosure.values['__declaringClass'] = {
        value: declaringClassObj.name,
        type: 'String',
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
        printErr({
            eName: 'ReferenceError',
            eContext: `Method '${methodName}' does not exist on class '${classObj.name}'.`,
            eLine: hookNode.line
        });
    }

    if (origMethodAst.access === 'private' || (targetClass.privateMembers && targetClass.privateMembers.has(methodName))) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot hook private method '${methodName}' of class '${targetClass.name}'.`,
            eLine: hookNode.line
        });
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
                    printErr({
                        eName: 'TypeError',
                        eContext: `Cannot assign NULL to non-nullable field '${field.name}' of type '(${fieldType})'.`,
                        eLine: field.line
                    });
                }
                if (val !== null) {
                    val = castToType(val, fieldType);
                }
            } else if (!field.isNullable && val === null) {
                printErr({
                    eName: 'TypeError',
                    eContext: `Cannot assign NULL to non-nullable field '${field.name}'.`,
                    eLine: field.line
                });
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
        printErr({
            eName: 'TypeError',
            eContext: `Class '${classObj.name}' has no constructor that takes ${rawArgs.length} arguments.`
        });
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
        printErr({
            eName: 'TypeError',
            eContext: `Cannot access private ${kind} '${memberName}' of class '${target.className}'.`
        });
    }

    if (target.privateOwners && target.privateOwners.has(memberName)) {
        const ownerClass = target.privateOwners.get(memberName);
        const activeFnScope = findScope('__currentFunction', env);
        const currentFn = activeFnScope ? activeFnScope.values['__currentFunction'].value : null;
        if (currentFn && currentFn.declaringClass && currentFn.declaringClass !== ownerClass) {
            const kind = isMethod ? 'method' : 'member';
            printErr({
                eName: 'TypeError',
                eContext: `Cannot access private ${kind} '${memberName}' of parent class '${ownerClass}'.`
            });
        }
    }
}

function checkPrivateSharedAccess(targetClass, memberName, env, isMethod = false) {
    if (!targetClass || targetClass.kind !== 'Class') return;
    if (!targetClass.privateSharedMembers || !targetClass.privateSharedMembers.has(memberName)) return;

    const activeThis = findScope('this', env);
    const callerThis = activeThis ? activeThis.values['this'].value : null;
    if (callerThis && (callerThis.className === targetClass.name || (callerThis.classRef && callerThis.classRef.name === targetClass.name))) {
        return;
    }

    const declaringScope = findScope('__declaringClass', env);
    const declaringClass = declaringScope ? declaringScope.values['__declaringClass'].value : null;
    if (declaringClass === targetClass.name) {
        return;
    }

    const kind = isMethod ? 'method' : 'member';
    printErr({
        eName: 'TypeError',
        eContext: `Cannot access private shared ${kind} '${memberName}' of class '${targetClass.name}'.`
    });
}

module.exports = { 
    evalClassDeclaration, 
    instantiateClass, 
    checkPrivateAccess, 
    checkPrivateSharedAccess, 
    hookClassMethod 
};