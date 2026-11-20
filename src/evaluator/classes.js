const { printErr } = require('../errors');
const { getType, castToType } = require('./types');
const { createScope, findScope, resolveQualifiedValue } = require('./scope');
const { evalCall } = require('./functions');

function evalInterfaceDeclaration(node, env, shouldBind = true) {
    let superInterfaces = [];
    if (node.superInterfaces && node.superInterfaces.length > 0) {
        for (const parentName of node.superInterfaces) {
            const parentObj = resolveQualifiedValue(parentName, env);
            if (!parentObj || parentObj.kind !== 'Interface') {
                printErr({
                    eName: 'ReferenceError',
                    eContext: `Cannot extend undefined or invalid interface '${parentName}'.`,
                    eLine: node.line,
                    eCol: node.col
                });
            }
            superInterfaces.push(parentObj);
        }
    }

    const interfaceObj = {
        kind: 'Interface',
        name: node.name,
        superInterfaces,
        methods: node.methods || [],
        getters: node.getters || [],
        setters: node.setters || [],
        fields: node.fields || [],
        line: node.line,
        col: node.col
    };

    if (shouldBind) {
        env.values[node.name] = {
            value: interfaceObj,
            type: 'Interface',
            isConst: true,
            isNullable: false
        };
    }

    return interfaceObj;
}

function getAllClassMethods(classObj) {
    const methods = new Map();
    let curr = classObj;
    while (curr) {
        if (curr.methods) {
            for (const [mName, mAst] of Object.entries(curr.methods)) {
                if (!methods.has(mName)) {
                    methods.set(mName, mAst);
                }
            }
        }
        curr = curr.superClass;
    }
    return methods;
}

function getAllClassGetters(classObj) {
    const getters = new Map();
    let curr = classObj;
    while (curr) {
        if (curr.getters) {
            for (const g of curr.getters) {
                if (!getters.has(g.name)) {
                    getters.set(g.name, g);
                }
            }
        }
        curr = curr.superClass;
    }
    return getters;
}

function getAllClassSetters(classObj) {
    const setters = new Map();
    let curr = classObj;
    while (curr) {
        if (curr.setters) {
            for (const s of curr.setters) {
                if (!setters.has(s.name)) {
                    setters.set(s.name, s);
                }
            }
        }
        curr = curr.superClass;
    }
    return setters;
}

function getAllClassFields(classObj) {
    const fields = new Map();
    let curr = classObj;
    while (curr) {
        if (curr.fields) {
            for (const f of curr.fields) {
                if (!fields.has(f.name)) {
                    fields.set(f.name, f);
                }
            }
        }
        curr = curr.superClass;
    }
    return fields;
}

function collectInterfaceRequirements(ifaceObj, visited = new Set()) {
    if (visited.has(ifaceObj)) return { methods: [], getters: [], setters: [], fields: [] };
    visited.add(ifaceObj);

    let methods = [...(ifaceObj.methods || [])];
    let getters = [...(ifaceObj.getters || [])];
    let setters = [...(ifaceObj.setters || [])];
    let fields = [...(ifaceObj.fields || [])];

    for (const sup of (ifaceObj.superInterfaces || [])) {
        const subReq = collectInterfaceRequirements(sup, visited);
        methods.push(...subReq.methods);
        getters.push(...subReq.getters);
        setters.push(...subReq.setters);
        fields.push(...subReq.fields);
    }

    return { methods, getters, setters, fields };
}

function verifyInterfaceContract(classObj, ifaceObj, node) {
    const reqs = collectInterfaceRequirements(ifaceObj);
    const classMethods = getAllClassMethods(classObj);
    const classGetters = getAllClassGetters(classObj);
    const classSetters = getAllClassSetters(classObj);
    const classFields = getAllClassFields(classObj);

    for (const reqMethod of reqs.methods) {
        if (!classMethods.has(reqMethod.name)) {
            printErr({
                eName: 'TypeError',
                eContext: `Class '${classObj.name}' does not implement method '${reqMethod.name}' required by interface '${ifaceObj.name}'.`,
                eLine: node.line,
                eCol: node.col
            });
        }
        const classM = classMethods.get(reqMethod.name);
        const reqMinParams = (reqMethod.params || []).filter(p => !p.defaultValue).length;
        const classMaxParams = (classM.params || []).length;
        if (reqMinParams > classMaxParams) {
            printErr({
                eName: 'TypeError',
                eContext: `Method '${reqMethod.name}' in class '${classObj.name}' expects fewer parameters than required by interface '${ifaceObj.name}'.`,
                eLine: node.line,
                eCol: node.col
            });
        }
    }

    for (const reqGetter of reqs.getters) {
        if (!classGetters.has(reqGetter.name) && !classFields.has(reqGetter.name)) {
            printErr({
                eName: 'TypeError',
                eContext: `Class '${classObj.name}' does not implement getter or field '${reqGetter.name}' required by interface '${ifaceObj.name}'.`,
                eLine: node.line,
                eCol: node.col
            });
        }
    }

    for (const reqSetter of reqs.setters) {
        const hasSetter = classSetters.has(reqSetter.name);
        const field = classFields.get(reqSetter.name);
        const hasMutableField = field && !field.isConst && field.type !== 'ConstDeclar';
        if (!hasSetter && !hasMutableField) {
            printErr({
                eName: 'TypeError',
                eContext: `Class '${classObj.name}' does not implement setter '${reqSetter.name}' required by interface '${ifaceObj.name}'.`,
                eLine: node.line,
                eCol: node.col
            });
        }
    }

    for (const reqField of reqs.fields) {
        if (!classFields.has(reqField.name)) {
            printErr({
                eName: 'TypeError',
                eContext: `Class '${classObj.name}' does not implement field '${reqField.name}' required by interface '${ifaceObj.name}'.`,
                eLine: node.line,
                eCol: node.col
            });
        }
        if (reqField.isConst) {
            const field = classFields.get(reqField.name);
            if (!field.isConst && field.type !== 'ConstDeclar') {
                printErr({
                    eName: 'TypeError',
                    eContext: `Field '${reqField.name}' in class '${classObj.name}' must be constant (iconst) as required by interface '${ifaceObj.name}'.`,
                    eLine: node.line,
                    eCol: node.col
                });
            }
        }
    }
}

function evalClassDeclaration(node, env, shouldBind = true) {
    let superClassObj = null;
    if (node.superClass) {
        const val = resolveQualifiedValue(node.superClass, env);
        if (!val || val.kind !== 'Class') {
            printErr({
                eName: 'ReferenceError',
                eContext: `Cannot inherit from undefined class '${node.superClass}'.`,
                eLine: node.line
            });
        }
        superClassObj = val;
    }

    const interfaces = [];
    if (node.interfaces && node.interfaces.length > 0) {
        for (const ifaceName of node.interfaces) {
            const ifaceObj = resolveQualifiedValue(ifaceName, env);
            if (!ifaceObj || ifaceObj.kind !== 'Interface') {
                printErr({
                    eName: 'ReferenceError',
                    eContext: `Cannot implement undefined or invalid interface '${ifaceName}'.`,
                    eLine: node.line,
                    eCol: node.col
                });
            }
            interfaces.push(ifaceObj);
        }
    }

    const classObj = {
        kind: 'Class',
        name: node.name,
        superClass: superClassObj,
        interfaces,
        fields: node.fields,
        methods: {},
        sharedFields: {},
        sharedMethods: {},
        constructor: null,
        privateMembers: new Set(),
        protectedMembers: new Set(),
        isolatedMembers: new Set(),
        exclusiveMembers: new Set(),
        privateSharedMembers: new Set(),
        protectedSharedMembers: new Set(),
        isolatedSharedMembers: new Set(),
        exclusiveSharedMembers: new Set(),
        instances: new Set()
    };

    classObj.getters = node.getters || [];
    classObj.setters = node.setters || [];

    for (const f of node.fields) {
        if (f.access === 'private') {
            classObj.privateMembers.add(f.name);
        } else if (f.access === 'protected') {
            classObj.protectedMembers.add(f.name);
        } else if (f.access === 'isolated') {
            classObj.isolatedMembers.add(f.name);
        } else if (f.access === 'exclusive') {
            classObj.exclusiveMembers.add(f.name);
        }
    }

    for (const s of (node.setters || [])) {
        const constField = (node.fields || []).find(f => f.name === s.name && (f.isConst || f.type === 'ConstDeclar'));
        if (constField) {
            printErr({
                eName: 'SyntaxError',
                eContext: `Cannot define setter for constant '${s.name}' in class '${node.name}'.`,
                eLine: s.line
            });
        }
    }

    for (const m of node.methods) {
        if (m.access === 'private') {
            classObj.privateMembers.add(m.name);
        } else if (m.access === 'protected') {
            classObj.protectedMembers.add(m.name);
        } else if (m.access === 'isolated') {
            classObj.isolatedMembers.add(m.name);
        } else if (m.access === 'exclusive') {
            classObj.exclusiveMembers.add(m.name);
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
            } else if (f.access === 'protected') {
                classObj.protectedSharedMembers.add(f.name);
            } else if (f.access === 'isolated') {
                classObj.isolatedSharedMembers.add(f.name);
            } else if (f.access === 'exclusive') {
                classObj.exclusiveSharedMembers.add(f.name);
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
            } else if (m.access === 'protected') {
                classObj.protectedSharedMembers.add(m.name);
            } else if (m.access === 'isolated') {
                classObj.isolatedSharedMembers.add(m.name);
            } else if (m.access === 'exclusive') {
                classObj.exclusiveSharedMembers.add(m.name);
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
                access: m.access || 'public',
                declaringClass: node.name
            };
        }
    }

    for (const iface of interfaces) {
        verifyInterfaceContract(classObj, iface, node);
    }

    if (shouldBind) {
        env.values[node.name] = {
            value: classObj,
            type: 'Class',
            isConst: true,
            isNullable: false
        };
    }

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
            ctorClosure.values['__declaringClass'] = {
                value: superClass.name,
                type: 'String',
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
            const acc = mAst.access || 'public';
            if (acc === 'private' || acc === 'isolated' || acc === 'exclusive') {
                continue;
            }
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

    const origAcc = origMethodAst.access || 'public';
    if (origAcc === 'private' || origAcc === 'isolated' || (targetClass.privateMembers && targetClass.privateMembers.has(methodName)) || (targetClass.isolatedMembers && targetClass.isolatedMembers.has(methodName))) {
        const accLabel = (origAcc === 'isolated' || (targetClass.isolatedMembers && targetClass.isolatedMembers.has(methodName))) ? 'isolated' : 'private';
        printErr({
            eName: 'TypeError',
            eContext: `Cannot hook ${accLabel} method '${methodName}' of class '${targetClass.name}'.`,
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
    const memberAccess = new Map();
    const memberOwners = new Map();
    const privateMembers = new Set();
    const privateOwners = new Map();
    const protectedMembers = new Set();
    const isolatedMembers = new Set();
    const exclusiveMembers = new Set();

    const instance = {
        kind: 'Table',
        className: classObj.name,
        isInstance: true,
        classRef: classObj,
        fields: {},
        getters: {},
        setters: {},
        memberAccess,
        memberOwners,
        privateMembers,
        privateOwners,
        protectedMembers,
        isolatedMembers,
        exclusiveMembers
    };

    classObj.instances.add(instance);

    for (const c of chain) {
        const isSelf = (c === classObj);

        for (const g of (c.getters || [])) {
            instance.getters[g.name] = { ast: g, declaringClass: c.name };
        }
        for (const s of (c.setters || [])) {
            instance.setters[s.name] = { ast: s, declaringClass: c.name };
        }

        const initEnv = createScope(env);
        initEnv.values['this'] = {
            value: instance,
            type: 'Table',
            isConst: true,
            isNullable: false
        };
        initEnv.values['__declaringClass'] = {
            value: c.name,
            type: 'String',
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
            const acc = field.access || 'public';
            if (!isSelf && acc === 'exclusive') {
                continue;
            }

            const isPrivateOrIsolated = (acc === 'private' || acc === 'isolated');
            const storageKey = isPrivateOrIsolated ? `__${c.name}__${field.name}` : field.name;

            if (isSelf || !isPrivateOrIsolated) {
                memberAccess.set(field.name, acc);
                memberOwners.set(field.name, c.name);
            }
            if (isPrivateOrIsolated) {
                memberAccess.set(storageKey, acc);
                memberOwners.set(storageKey, c.name);
            }
            if (acc === 'private') {
                privateMembers.add(field.name);
                privateOwners.set(field.name, c.name);
            } else if (acc === 'protected') {
                protectedMembers.add(field.name);
            } else if (acc === 'isolated') {
                isolatedMembers.add(field.name);
            } else if (acc === 'exclusive') {
                exclusiveMembers.add(field.name);
            }

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

            const fieldDef = {
                value: val,
                type: fieldType,
                isNullable: field.isNullable !== false,
                isConst: !!field.isConst,
                access: acc,
                declaringClass: c.name
            };
            instance.fields[storageKey] = fieldDef;
            if (isSelf) {
                if (!isPrivateOrIsolated || !(field.name in instance.fields)) {
                    instance.fields[field.name] = fieldDef;
                }
            } else if (!isPrivateOrIsolated) {
                instance.fields[field.name] = fieldDef;
            }
        }
    }

    for (const c of chain) {
        const isSelf = (c === classObj);
        for (const [methodName, methodAst] of Object.entries(c.methods)) {
            const acc = methodAst.access || 'public';
            if (!isSelf && (acc === 'isolated' || acc === 'exclusive')) {
                continue;
            }

            const isPrivateOrIsolated = (acc === 'private' || acc === 'isolated');
            const storageKey = isPrivateOrIsolated ? `__${c.name}__${methodName}` : methodName;

            memberAccess.set(methodName, acc);
            memberOwners.set(methodName, c.name);
            if (isPrivateOrIsolated) {
                memberAccess.set(storageKey, acc);
                memberOwners.set(storageKey, c.name);
            }
            if (acc === 'private') {
                privateMembers.add(methodName);
                privateOwners.set(methodName, c.name);
            } else if (acc === 'protected') {
                protectedMembers.add(methodName);
            } else if (acc === 'isolated') {
                isolatedMembers.add(methodName);
            } else if (acc === 'exclusive') {
                exclusiveMembers.add(methodName);
            }

            const fnObj = buildBoundMethod(methodAst, instance, c, env, evaluate);
            const methodDef = {
                value: fnObj,
                type: 'Function',
                isNullable: false,
                isConst: true,
                access: acc,
                declaringClass: c.name
            };
            instance.fields[storageKey] = methodDef;
            if (!isPrivateOrIsolated || !(methodName in instance.fields)) {
                instance.fields[methodName] = methodDef;
            }
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
        ctorClosure.values['__declaringClass'] = {
            value: classObj.name,
            type: 'String',
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

function checkMemberAccess(target, memberName, env, isMethod = false) {
    if (!target || !target.isInstance) {
        return;
    }

    let access = 'public';
    let ownerClass = target.className;

    if (target.memberAccess && target.memberAccess.has(memberName)) {
        access = target.memberAccess.get(memberName);
        ownerClass = target.memberOwners.get(memberName) || target.className;
    } else if (target.privateMembers && target.privateMembers.has(memberName)) {
        access = 'private';
        ownerClass = target.privateOwners ? target.privateOwners.get(memberName) : target.className;
    }

    if (access === 'public' || access === 'exclusive') {
        return;
    }

    const kind = isMethod ? 'method' : 'member';
    const activeThis = findScope('this', env);
    const callerThis = activeThis ? activeThis.values['this'].value : null;

    if (!callerThis || callerThis !== target) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot access ${access} ${kind} '${memberName}' of class '${target.className}'.`
        });
    }

    if (access === 'protected') {
        return;
    }

    const activeFnScope = findScope('__currentFunction', env);
    const currentFn = activeFnScope ? activeFnScope.values['__currentFunction'].value : null;
    let callerDeclaringClass = currentFn ? currentFn.declaringClass : null;
    if (!callerDeclaringClass) {
        const declScope = findScope('__declaringClass', env);
        callerDeclaringClass = declScope ? declScope.values['__declaringClass'].value : null;
    }

    if (callerDeclaringClass && callerDeclaringClass !== ownerClass) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot access ${access} ${kind} '${memberName}' of parent class '${ownerClass}'.`
        });
    }
}

function checkSharedMemberAccess(targetClass, memberName, env, isMethod = false) {
    if (!targetClass || targetClass.kind !== 'Class') return;

    let curr = targetClass;
    let access = 'public';
    let ownerClass = targetClass.name;

    while (curr) {
        if (curr.sharedFields && memberName in curr.sharedFields) {
            access = curr.sharedFields[memberName].access || 'public';
            ownerClass = curr.name;
            break;
        }
        if (curr.sharedMethods && memberName in curr.sharedMethods) {
            const m = curr.sharedMethods[memberName];
            access = m.access || 'public';
            ownerClass = curr.name;
            break;
        }
        curr = curr.superClass;
    }

    if (access === 'public') return;

    const kind = isMethod ? 'method' : 'member';

    if (ownerClass !== targetClass.name && (access === 'isolated' || access === 'exclusive')) {
        printErr({
            eName: 'ReferenceError',
            eContext: `Shared ${kind} '${memberName}' does not exist on class '${targetClass.name}'.`
        });
    }

    if (access === 'exclusive') {
        return;
    }

    const activeThis = findScope('this', env);
    const callerThis = activeThis ? activeThis.values['this'].value : null;
    const declaringScope = findScope('__declaringClass', env);
    const declaringClass = declaringScope ? declaringScope.values['__declaringClass'].value : null;

    let callerClassName = null;
    let callerClassRef = null;
    if (callerThis && callerThis.isInstance) {
        callerClassName = callerThis.className;
        callerClassRef = callerThis.classRef;
    } else if (declaringClass) {
        callerClassName = declaringClass;
    }

    if (!callerClassName) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot access ${access} shared ${kind} '${memberName}' of class '${targetClass.name}'.`
        });
    }

    if (access === 'protected') {
        let isDescendant = false;
        let c = targetClass;
        while (c) {
            if (c.name === ownerClass) { isDescendant = true; break; }
            c = c.superClass;
        }
        if (!isDescendant) {
            printErr({
                eName: 'TypeError',
                eContext: `Cannot access protected shared ${kind} '${memberName}' of class '${ownerClass}'.`
            });
        }
        return;
    }

    if (callerClassName !== ownerClass) {
        printErr({
            eName: 'TypeError',
            eContext: `Cannot access ${access} shared ${kind} '${memberName}' of parent class '${ownerClass}'.`
        });
    }
}

function resolveMemberKey(instance, memberName, env) {
    if (!instance || !instance.isInstance || !instance.fields) return memberName;

    const activeFnScope = findScope('__currentFunction', env);
    const currentFn = activeFnScope ? activeFnScope.values['__currentFunction'].value : null;
    let callerClass = currentFn ? currentFn.declaringClass : null;
    if (!callerClass) {
        const declScope = findScope('__declaringClass', env);
        callerClass = declScope ? declScope.values['__declaringClass'].value : null;
    }

    if (callerClass) {
        const mangledKey = `__${callerClass}__${memberName}`;
        if (mangledKey in instance.fields) {
            return mangledKey;
        }
    }

    return memberName;
}

function invokeGetter(getterAst, instance, rawValue, declaringClass, env, evaluate) {
    const scope = createScope(env);
    scope.values['this'] = { value: instance, type: 'Table', isConst: true, isNullable: false };
    scope.values['value'] = { value: rawValue, type: getType(rawValue), isConst: false, isNullable: true };
    scope.values['__declaringClass'] = { value: declaringClass, type: 'String', isConst: true, isNullable: false };

    try {
        for (const stmt of getterAst.body) {
            const res = evaluate(stmt, scope);
            if (res && res.isReturn) {
                return res.value;
            }
            if (res && res.__returnValue !== undefined) {
                return res.__returnValue;
            }
        }
    } catch (e) {
        throw e;
    }
    return scope.values['value'] ? scope.values['value'].value : rawValue;
}

function invokeSetter(setterAst, instance, rawValue, newVal, declaringClass, env, evaluate) {
    const scope = createScope(env);
    scope.values['this'] = { value: instance, type: 'Table', isConst: true, isNullable: false };
    scope.values[setterAst.param] = { value: newVal, type: getType(newVal), isConst: false, isNullable: true };
    scope.values['value'] = { value: rawValue, type: getType(rawValue), isConst: false, isNullable: true };
    scope.values['__declaringClass'] = { value: declaringClass, type: 'String', isConst: true, isNullable: false };

    try {
        for (const stmt of setterAst.body) {
            const res = evaluate(stmt, scope);
            if (res && res.isReturn) {
                break;
            }
            if (res && res.__returnValue !== undefined) {
                break;
            }
        }
    } catch (e) {
        throw e;
    }
    return scope.values['value'] ? scope.values['value'].value : newVal;
}

function checkPrivateAccess(target, memberName, env, isMethod = false) {
    return checkMemberAccess(target, memberName, env, isMethod);
}

function checkPrivateSharedAccess(targetClass, memberName, env, isMethod = false) {
    return checkSharedMemberAccess(targetClass, memberName, env, isMethod);
}

module.exports = { 
    evalClassDeclaration, 
    evalInterfaceDeclaration,
    instantiateClass, 
    checkMemberAccess,
    checkPrivateAccess,
    checkSharedMemberAccess,
    checkPrivateSharedAccess,
    hookClassMethod,
    resolveMemberKey,
    invokeGetter,
    invokeSetter
};