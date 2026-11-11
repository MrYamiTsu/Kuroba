const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { tokenize } = require('./src/lexer');
const { parse } = require('./src/parser');
const { evaluate } = require('./src/evaluator');
const { setCliArgs, setProjectContext } = require('./src/evaluator/scope');
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
  kuroba [options] [file${config.extension}] [args...]
  krb [options] [file${config.extension}] [args...]

Options:
  (no args)                  Start the interactive REPL shell
  <file${config.extension}> [args...]       Execute the specified script with arguments
  -i, --repl                 Start the interactive REPL shell
  -v, --version              Show language version
  -h, --help                 Show this help message

Aliases:
  krb                        Short launcher alias for kuroba
`);
    process.exit(0);
}

let filename = arg;
if (!filename || arg === '-i' || arg === '--repl') {
    setCliArgs([]);
    setProjectContext(process.cwd(), null);
    const { startRepl } = require('./src/repl');
    startRepl();
    return;
}

const isValidExtension = filename.endsWith(config.extension) || filename.endsWith('.tulg');
if (!isValidExtension) {
    printErr(`[CLIError] Invalid file extension. Expected a '${config.extension}' file, but received: '${filename}'`);
}

if (!fs.existsSync(filename)) {
    printErr(`[CLIError] File not found: '${filename}'`);
}

const resolvedFilename = path.resolve(filename);
setProjectContext(path.dirname(resolvedFilename), resolvedFilename);

const scriptArgs = process.argv.slice(3);
setCliArgs(scriptArgs);

const code = fs.readFileSync(filename, 'utf-8');

function run(input) {
    const tokens = tokenize(input);
    const ast = parse(tokens);
    evaluate(ast);
}

run(code);
