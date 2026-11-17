const { printErr } = require('../errors');

function evalEnumDeclaration(node, env, evaluate) {
    const enumObj = {
        kind: 'Enum',
        name: node.name,
        members: {},
        values: new Set()
    };

    for (const m of node.members) {
        let val = m.value !== null ? evaluate(m.value, env) : m.name;
        enumObj.members[m.name] = val;
        enumObj.values.add(val);
    }

    env.values[node.name] = {
        value: enumObj,
        type: 'Enum',
        isConst: true,
        isNullable: false
    };

    return enumObj;
}

module.exports = { evalEnumDeclaration };