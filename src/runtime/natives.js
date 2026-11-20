const fs = require('fs');
const path = require('path');
const { printErr } = require('../errors');
const { getType } = require('../evaluator/types');

let prngInstance = null;

function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function nextRandom() {
    return prngInstance ? prngInstance() : Math.random();
}

function jsToKurobaValue(json) {
    if (json === null || json === undefined) return null;
    if (typeof json === 'boolean' || typeof json === 'number' || typeof json === 'string') {
        return json;
    }
    if (Array.isArray(json)) {
        return json.map(jsToKurobaValue);
    }
    if (typeof json === 'object') {
        const fields = {};
        for (const [k, v] of Object.entries(json)) {
            const val = jsToKurobaValue(v);
            fields[k] = {
                value: val,
                type: getType(val),
                isNullable: true
            };
        }
        return { kind: 'Table', fields };
    }
    return json;
}

function kurobaValueToJs(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'boolean' || typeof val === 'number' || typeof val === 'string') {
        return val;
    }
    if (Array.isArray(val)) {
        return val.map(kurobaValueToJs);
    }
    if (val && typeof val === 'object') {
        if (val.kind === 'List' || val.kind === 'Stack' || val.kind === 'Queue') {
            return val.items.map(kurobaValueToJs);
        }
        if (val.kind === 'Table') {
            const obj = {};
            for (const [k, fieldDef] of Object.entries(val.fields)) {
                obj[k] = kurobaValueToJs(fieldDef.value);
            }
            return obj;
        }
        if (val.kind === 'Enum') {
            return val.name;
        }
    }
    return val;
}

const natives = {
    sqrt: (x) => Math.sqrt(x),
    pow: (b, e) => Math.pow(b, e),
    sin: (x) => Math.sin(x),
    cos: (x) => Math.cos(x),
    tan: (x) => Math.tan(x),
    atan2: (y, x) => Math.atan2(y, x),
    asin: (x) => Math.asin(x),
    acos: (x) => Math.acos(x),
    atan: (x) => Math.atan(x),
    log: (x) => Math.log(x),
    log10: (x) => Math.log10(x),
    exp: (x) => Math.exp(x),
    sleep: (ms) => {
        if (ms > 0) {
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.floor(ms));
        }
    },
    now: () => Date.now(),
    unix: () => Math.floor(Date.now() / 1000),
    perf: () => performance.now(),
    iso: () => new Date().toISOString().slice(0, 19),
    clock: () => {
        const d = new Date();
        const makeField = (v) => ({ value: v, type: 'Int', isNullable: false });
        return {
            kind: 'Table',
            fields: {
                year: makeField(d.getFullYear()),
                month: makeField(d.getMonth() + 1),
                day: makeField(d.getDate()),
                hours: makeField(d.getHours()),
                minutes: makeField(d.getMinutes()),
                seconds: makeField(d.getSeconds()),
                ms: makeField(d.getMilliseconds())
            }
        };
    },
    timeFormat: (ms) => {
        const totalSec = Math.floor(ms / 1000);
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        const pad = (n) => (n < 10 ? '0' + n : '' + n);
        if (hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(minutes)}:${pad(seconds)}`;
    },
    strUpper: (str) => String(str).toUpperCase(),
    strLower: (str) => String(str).toLowerCase(),
    strCount: (str) => String(str).length,
    strTrim: (str) => String(str).trim(),
    strSplit: (str, sep) => String(str).split(sep !== undefined ? String(sep) : ' '),
    strReplace: (str, target, repl) => String(str).replaceAll(String(target), String(repl)),
    strContains: (str, sub) => String(str).includes(String(sub)),
    strStartsWith: (str, prefix) => String(str).startsWith(String(prefix)),
    strEndsWith: (str, suffix) => String(str).endsWith(String(suffix)),
    strIndexOf: (str, sub) => String(str).indexOf(String(sub)),
    strSlice: (str, start, end) => String(str).slice(start, end !== undefined ? end : undefined),
    strRepeat: (str, n) => String(str).repeat(n),
    strReverse: (str) => String(str).split('').reverse().join(''),
    strJoin: (list, sep) => Array.isArray(list) ? list.join(sep !== undefined ? String(sep) : '') : '',
    ioCopy: (filePath) => {
        const p = String(filePath);
        if (!fs.existsSync(p)) {
            printErr({
                eName: 'IOError',
                eContext: `File not found: '${p}'.`
            });
        }
        try {
            return fs.readFileSync(p, 'utf-8');
        } catch (err) {
            printErr({
                eName: 'IOError',
                eContext: `Failed to read file '${p}': ${err.message}`
            });
        }
    },
    ioPaste: (filePath, content) => {
        const p = String(filePath);
        try {
            fs.writeFileSync(p, String(content), 'utf-8');
            return true;
        } catch (err) {
            printErr({
                eName: 'IOError',
                eContext: `Failed to write to file '${p}': ${err.message}`
            });
        }
    },
    ioPasteLn: (filePath, content) => {
        const p = String(filePath);
        try {
            fs.appendFileSync(p, String(content) + '\n', 'utf-8');
            return true;
        } catch (err) {
            printErr({
                eName: 'IOError',
                eContext: `Failed to append to file '${p}': ${err.message}`
            });
        }
    },
    ioAppend: (filePath, content) => {
        const p = String(filePath);
        try {
            fs.appendFileSync(p, String(content), 'utf-8');
            return true;
        } catch (err) {
            printErr({
                eName: 'IOError',
                eContext: `Failed to append to file '${p}': ${err.message}`
            });
        }
    },
    ioExists: (filePath) => {
        return fs.existsSync(String(filePath));
    },
    ioKill: (filePath) => {
        const p = String(filePath);
        if (!fs.existsSync(p)) return false;
        try {
            fs.unlinkSync(p);
            return true;
        } catch (err) {
            printErr({
                eName: 'IOError',
                eContext: `Failed to delete file '${p}': ${err.message}`
            });
        }
    },
    random: (...args) => {
        if (args.length === 0) return nextRandom();
        if (args.length === 1) {
            const max = Math.floor(args[0]);
            return Math.floor(nextRandom() * max) + 1;
        }
        if (args.length >= 2) {
            const min = Math.ceil(args[0]);
            const max = Math.floor(args[1]);
            return Math.floor(nextRandom() * (max - min + 1)) + min;
        }
    },
    random_seed: (seed) => {
        prngInstance = mulberry32(Math.floor(seed));
        return null;
    },
    random_float: (...args) => {
        if (args.length === 0) return nextRandom();
        if (args.length === 1) return nextRandom() * args[0];
        const min = args[0], max = args[1];
        return min + nextRandom() * (max - min);
    },
    random_int: (...args) => {
        if (args.length === 0) return Math.floor(nextRandom() * 100);
        if (args.length === 1) return Math.floor(nextRandom() * args[0]) + 1;
        const min = Math.ceil(args[0]);
        const max = Math.floor(args[1]);
        return Math.floor(nextRandom() * (max - min + 1)) + min;
    },
    random_chance: (prob) => nextRandom() < (typeof prob === 'number' ? prob : 0.5),
    random_uuid: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.floor(nextRandom() * 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    },
    random_token: (len = 16) => {
        const count = typeof len === 'number' ? len : 16;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let res = '';
        for (let i = 0; i < count; i++) {
            res += chars[Math.floor(nextRandom() * chars.length)];
        }
        return res;
    },
    json_parse: (str) => {
        if (typeof str !== 'string') {
            printErr({
                eName: 'TypeError',
                eContext: `Expected String argument in Json.parse(), but received '${getType(str)}'.`
            });
        }
        try {
            return jsToKurobaValue(JSON.parse(str));
        } catch (e) {
            printErr({
                eName: 'JsonError',
                eContext: `Failed to parse JSON string: ${e.message}`
            });
        }
    },
    json_stringify: (val, indent = 0) => {
        try {
            const jsVal = kurobaValueToJs(val);
            const spaces = (typeof indent === 'number' && indent > 0) ? indent : undefined;
            return JSON.stringify(jsVal, null, spaces);
        } catch (e) {
            printErr({
                eName: 'JsonError',
                eContext: `Failed to stringify value to JSON: ${e.message}`
            });
        }
    },
    json_is_valid: (str) => {
        if (typeof str !== 'string') return false;
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    },
    json_read: (filepath) => {
        if (!fs.existsSync(filepath)) {
            printErr({
                eName: 'IOError',
                eContext: `File not found in Json.read(): '${filepath}'.`
            });
        }
        try {
            const content = fs.readFileSync(filepath, 'utf-8');
            return jsToKurobaValue(JSON.parse(content));
        } catch (e) {
            printErr({
                eName: 'JsonError',
                eContext: `Failed to read/parse JSON file '${filepath}': ${e.message}`
            });
        }
    },
    json_write: (filepath, val, indent = 4) => {
        try {
            const jsVal = kurobaValueToJs(val);
            const spaces = (typeof indent === 'number' && indent > 0) ? indent : undefined;
            const str = JSON.stringify(jsVal, null, spaces);
            fs.writeFileSync(filepath, str, 'utf-8');
            return true;
        } catch (e) {
            printErr({
                eName: 'IOError',
                eContext: `Failed to write JSON file '${filepath}': ${e.message}`
            });
        }
    },
    json_minify: (str) => {
        try {
            return JSON.stringify(JSON.parse(str));
        } catch (e) {
            printErr({
                eName: 'JsonError',
                eContext: `Failed to minify JSON: ${e.message}`
            });
        }
    },
    json_format: (str, indent = 4) => {
        try {
            const spaces = (typeof indent === 'number' && indent > 0) ? indent : 4;
            return JSON.stringify(JSON.parse(str), null, spaces);
        } catch (e) {
            printErr({
                eName: 'JsonError',
                eContext: `Failed to format JSON: ${e.message}`
            });
        }
    },
    path_sep: () => path.sep,
    path_delimiter: () => path.delimiter,
    path_join: (...args) => {
        const parts = args.filter(a => typeof a === 'string');
        return parts.length === 0 ? '.' : path.join(...parts);
    },
    path_resolve: (...args) => {
        const parts = args.filter(a => typeof a === 'string');
        return path.resolve(...parts);
    },
    path_normalize: (p) => (typeof p === 'string' ? path.normalize(p) : ''),
    path_dirname: (p) => (typeof p === 'string' ? path.dirname(p) : ''),
    path_basename: (p, ext) => {
        if (typeof p !== 'string') return '';
        return typeof ext === 'string' ? path.basename(p, ext) : path.basename(p);
    },
    path_extname: (p) => (typeof p === 'string' ? path.extname(p) : ''),
    path_is_absolute: (p) => (typeof p === 'string' ? path.isAbsolute(p) : false),
    path_relative: (from, to) => {
        if (typeof from !== 'string' || typeof to !== 'string') return '';
        return path.relative(from, to);
    },
    path_parse: (p) => {
        if (typeof p !== 'string') return jsToKurobaValue({ root: '', dir: '', base: '', ext: '', name: '' });
        return jsToKurobaValue(path.parse(p));
    },
    path_format: (tableObj) => {
        const jsObj = kurobaValueToJs(tableObj);
        return typeof jsObj === 'object' && jsObj !== null ? path.format(jsObj) : '';
    }
};

module.exports = { natives };