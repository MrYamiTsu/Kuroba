const fs = require('fs');
const config = require('./config.json');
const { tokenize } = require('./src/lexer');
const { parse } = require('./src/parser');
const { evaluate } = require('./src/evaluator');
const { printErr } = require('./src/errors');

const arg = process.argv[2];

if (arg === '-v' || arg === '--version') {
    console.log(`${config.name} (${config.acronym}) v${config.version}`);
    process.exit(0);
}

if (arg === '-h' || arg === '--help') {
    console.log(`
${config.name} (${config.acronym}) v${config.version}
Author: ${config.author}
Repository: ${config.repository}

Usage:
  tulg <filename${config.extension}>      Run a specific script
  tulg                      Run ${config.defaultFile} by default
  tulg -v, --version        Show language version
  tulg -h, --help           Show this help message
`);
    process.exit(0);
}

let filename = arg;

if (!filename) {
    if (fs.existsSync(config.defaultFile)) {
        filename = config.defaultFile;
    } else {
        printErr(`[CLIError] No input file provided. Usage: tulg <filename${config.extension}>`);
    }
}

if (!filename.endsWith(config.extension)) {
    printErr(`[CLIError] Invalid file extension. Expected a '${config.extension}' file, but received: '${filename}'`);
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
