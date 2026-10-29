const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function printErr(message) {
    console.error(`${RED}${message}${RESET}`);
    process.exit(1);
}

module.exports = { printErr };