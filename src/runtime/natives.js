const fs = require('fs');
const { printErr } = require('../errors');

const natives = {
    random: (...args) => {
        if (args.length === 0) {
            return Math.random();
        }
        
        if (args.length === 1) {
            const max = Math.floor(args[0]);
            return Math.floor(Math.random() * max) + 1;
        }
        
        if (args.length >= 2) {
            const min = Math.ceil(args[0]);
            const max = Math.floor(args[1]);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    },
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
            printErr(`[IOError] File not found: '${p}'.`);
        }
        try {
            return fs.readFileSync(p, 'utf-8');
        } catch (err) {
            printErr(`[IOError] Failed to read file '${p}': ${err.message}`);
        }
    },
    ioPaste: (filePath, content) => {
        const p = String(filePath);
        try {
            fs.writeFileSync(p, String(content), 'utf-8');
            return true;
        } catch (err) {
            printErr(`[IOError] Failed to write to file '${p}': ${err.message}`);
        }
    },
    ioPasteLn: (filePath, content) => {
        const p = String(filePath);
        try {
            fs.appendFileSync(p, String(content) + '\n', 'utf-8');
            return true;
        } catch (err) {
            printErr(`[IOError] Failed to append to file '${p}': ${err.message}`);
        }
    },
    ioAppend: (filePath, content) => {
        const p = String(filePath);
        try {
            fs.appendFileSync(p, String(content), 'utf-8');
            return true;
        } catch (err) {
            printErr(`[IOError] Failed to append to file '${p}': ${err.message}`);
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
            printErr(`[IOError] Failed to delete file '${p}': ${err.message}`);
        }
    }
};

module.exports = { natives };