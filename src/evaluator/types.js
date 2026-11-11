const { printErr } = require('../errors');

function getType(val) {
    if (val && val.kind) return val.kind;
    if (Array.isArray(val)) return 'List';
    if (typeof val === 'number') return Number.isInteger(val) ? 'Int' : 'Float';
    if (typeof val === 'string') return 'String';
    if (typeof val === 'boolean') return 'Bool';
    if (val === null) return 'Null';
    return 'Unknown';
}

function isTruthy(val) {
    return val === true || val === 1;
}

function isKurobaEqual(a, b) {
    if ((a === 0 && b === false) || (a === false && b === 0)) return true;
    if ((a === 1 && b === true) || (a === true && b === 1)) return true;
    return a === b;
}

function castToType(val, targetType) {
    if (val === null || !targetType) return val;

    if (targetType === 'String') return String(val);
    if (targetType === 'Int' || targetType === 'Float') {
        let numb = Number(val);
        if (isNaN(numb)) {
            printErr(`[TypeError] Cannot cast value '${val}' to type '${targetType}'.`);
        }
        return (targetType === 'Int') ? Math.trunc(numb) : numb;
    }
    if (targetType === 'Bool') {
        if (val === 0 || val === 'FALSE' || val === false) return false;
        if (val === 1 || val === 'TRUE' || val === true) return true;
        return Boolean(val);
    }
    return val;
}

function formatKurobaValue(val, isInsideList = false) {
    if (val === true) return 'TRUE';
    if (val === false) return 'FALSE';
    if (val === null) return 'NULL';
    if (typeof val === 'string' && isInsideList) return `"${val}"`;
    if (val && val.kind === 'Table') {
        let keys = Object.keys(val.fields);
        if (keys.length === 0) return '{}';
        let entries = keys.map(k => `${k}: ${formatKurobaValue(val.fields[k].value, true)}`);
        return '{ ' + entries.join(', ') + ' }';
    }
    if (val && val.kind === 'Function') {
        return val.name ? `<function ${val.name}>` : '<function ~>';
    }
    if (val && val.kind) {
        return '[' + val.items.map(el => formatKurobaValue(el, true)).join(', ') + ']';
    }
    if (Array.isArray(val)) {
        return '[' + val.map(el => formatKurobaValue(el, true)).join(', ') + ']';
    }
    return String(val);
}

module.exports = { getType, isTruthy, isKurobaEqual, castToType, formatKurobaValue };

