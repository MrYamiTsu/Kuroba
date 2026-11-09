const RED = '\x1b[31m';
const ORANGE_RED = '\x1b[38;2;255;85;0m';
const RESET = '\x1b[0m';

let customHandler = null;
let tryDepth = 0;

function setErrorHandler(handler) {
    customHandler = handler;
}

function printErr(message) {
    if (tryDepth > 0) {
        throw new KurobaRuntimeError(message);
    }
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


function pushTryContext() { tryDepth++; }
function popTryContext() { tryDepth--; }
function isInsideTry() { return tryDepth > 0; }

class KurobaUserException extends Error {
    constructor(value, formattedMsg) {
        super(formattedMsg);
        this.isKurobaUserException = true;
        this.value = value;
        this.formattedMsg = formattedMsg;
    }
}

class KurobaRuntimeError extends Error {
    constructor(message) {
        super(message);
        this.isKurobaRuntimeError = true;
        this.message = message;
    }
}

module.exports = {
    printErr,
    printException,
    setErrorHandler,
    pushTryContext,
    popTryContext,
    isInsideTry,
    KurobaUserException,
    KurobaRuntimeError
};