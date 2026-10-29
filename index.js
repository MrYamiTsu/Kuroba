const fs = require('fs');
const { tokenize } = require('./lexer');
const { parse } = require('./parser');
const { evaluate } = require('./evaluator');
const { printErr } = require('./errors');

let filename = process.argv[2];

if (!filename) {
    if (fs.existsSync('main.tulg')) {
        filename = 'main.tulg';
    } else {
        printErr('[CLIError] No input file provided. Usage: tulg <filename.tulg>');
    }
}

if (!filename.endsWith('.tulg')) {
    printErr(`[CLIError] Invalid file extension. Expected a '.tulg' file, but received: '${filename}'`);
}

if (!fs.existsSync(filename)) {
    printErr(`[CLIError] File not found: '${filename}'`);
}

const code = fs.readFileSync(filename, 'utf-8');

function run(input) {
    let tokens = tokenize(input);
    let node = parse(tokens);
    let result = evaluate(node);
    return result;
}

run(code);
