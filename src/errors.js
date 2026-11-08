const RED = '\x1b[31m';
const ORANGE_RED = '\x1b[38;2;255;85;0m';
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

function printException(message) {
    if (customHandler) {
        customHandler(message, true);
        return;
    }
    console.error(`${ORANGE_RED}${message}${RESET}`);
    process.exit(1);
}

module.exports = { printErr, printException, setErrorHandler };