const fs = require('fs');
const { formatKurobaValue, isTruthy } = require('./types');
const { evaluate } = require('./index');

function evalPaste(node, env) {
    if (node.isEmpty) {
        if (node.newLine) console.log();
        return null;
    }
    let val = evaluate(node.expr, env);
    let txt = formatKurobaValue(val);
    if (node.newLine) console.log(txt);
    else process.stdout.write(txt);
    return val;
}

function evalCopy(node, env) {
    if (node.prompt !== null) {
        let val = evaluate(node.prompt, env);
        process.stdout.write(formatKurobaValue(val));
    }

    if (node.oneKey) {
        let buf = Buffer.alloc(1);
        if (process.stdin.setRawMode) process.stdin.setRawMode(true);
        try {
            fs.readSync(0, buf, 0, 1, null);
        } finally {
            if (process.stdin.setRawMode) process.stdin.setRawMode(false);
        }
        if (buf[0] === 3) process.exit(130);
        return buf.toString('utf8');
    }

    let chunks = [];
    let buf = Buffer.alloc(1);
    while (true) {
        let bytesRead = 0;
        try {
            bytesRead = fs.readSync(0, buf, 0, 1, null);
        } catch (e) { break; }
        if (bytesRead === 0) break;
        let char = buf.toString('utf8');
        if (char === '\r') continue;
        if (char === '\n') break;
        chunks.push(char);
    }
    return chunks.join('');
}

function evalClear(node, env) {
    if (node.condition === null || isTruthy(evaluate(node.condition, env))) {
        process.stdout.write('\x1Bc');
    }
}

function evalExit(node, env) {
    if (node.condition === null || isTruthy(evaluate(node.condition, env))) {
        process.exit(0);
    }
}

module.exports = { evalPaste, evalCopy, evalClear, evalExit };

