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
  kuroba <filename${config.extension}>     Run a specific script
  kuroba                     Run ${config.defaultFile} by default
  kuroba -v, --version       Show language version
  kuroba -h, --help          Show this help message

Aliases:
  kb <filename>              Short command alias
`);
    process.exit(0);
}

let filename = arg;

if (!filename) {
    if (fs.existsSync(config.defaultFile)) {
        filename = config.defaultFile;
    } else if (fs.existsSync('main.tulg')) {
        filename = 'main.tulg';
    } else {
        printErr(`[CLIError] No input file provided. Usage: kuroba <filename${config.extension}>`);
    }
}

const isValidExtension = filename.endsWith(config.extension) || filename.endsWith('.tulg');
if (!isValidExtension) {
    printErr(`[CLIError] Invalid file extension. Expected a '${config.extension}' file, but received: '${filename}'`);
}

if (!fs.existsSync(filename)) {
    printErr(`[CLIError] File not found: '${filename}'`);
}

const code = fs.readFileSync(filename, 'utf-8');

function run(input) {
    const tokens = tokenize(input);
    const ast = parse(tokens);
    evaluate(ast);
}

run(code);
