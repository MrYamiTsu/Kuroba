const RED = '\x1b[31m';
const RESET = '\x1b[0m';
let customHandler = null;

function setErrorHandler(handler) {
    customHandler = handler;
}

function printErr(message) {
    if (customHandler) {
        customHandler(message);
        return;
    }
    console.error(`${RED}${message}${RESET}`);
    process.exit(1);
}

module.exports = { printErr, setErrorHandler };