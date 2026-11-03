function createScope(parent = null) {
    return { values: {}, parent };
}

function findScope(name, env) {
    let curr = env;
    while (curr) {
        if (name in curr.values) return curr;
        curr = curr.parent;
    }
    return null;
}

module.exports = { createScope, findScope };

