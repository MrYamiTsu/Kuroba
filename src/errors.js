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

function formatTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `${date} ${time}`;
}

function formatExceptionMessage(rawVal, line, col, fallbackFormatted) {
    let name = "Exception";
    let showLines = true;
    let showTime = false;
    let code = null;
    let context = null;

    if (rawVal && rawVal.kind === 'Table' && rawVal.fields) {
        if ('exName' in rawVal.fields && rawVal.fields.exName.value !== null) {
            name = String(rawVal.fields.exName.value);
        }
        if ('exLines' in rawVal.fields) {
            let lVal = rawVal.fields.exLines.value;
            showLines = (lVal !== false && lVal !== 0);
        }
        if ('exTime' in rawVal.fields) {
            let tVal = rawVal.fields.exTime.value;
            showTime = (tVal !== false && tVal !== 0 && tVal !== null);
        }
        if ('exCode' in rawVal.fields && rawVal.fields.exCode.value !== null) {
            code = rawVal.fields.exCode.value;
        }
        if ('exContext' in rawVal.fields && rawVal.fields.exContext.value !== null) {
            context = String(rawVal.fields.exContext.value);
        }
    }

    let loc = (line !== undefined) ? `Line ${line}, Col ${col}` : null;
    let header = `[${name}${showLines && loc ? ': ' + loc : ''}]`;

    let desc = (context !== null) ? context : fallbackFormatted;
    if (code !== null) {
        desc = `Error ${code}: ${desc}`;
    }

    let timePrefix = showTime ? `[${formatTimestamp()}] ` : '';
    return `${timePrefix}${header} ${desc}`;
}

function parseRuntimeErrorToTable(message) {
    let match = message.match(/^\[([a-zA-Z]+)(?::\s*Line\s*(\d+),\s*Col\s*(\d+))?\]\s*(.*)$/s);
    let name = match ? match[1] : "RuntimeError";
    let context = match ? match[4] : message;
    return {
        kind: 'Table',
        fields: {
            exName: { value: name, type: 'String', isNullable: false },
            exContext: { value: context, type: 'String', isNullable: false },
            exTime: { value: false, type: 'Bool', isNullable: false }
        }
    };
}

module.exports = {
    printErr,
    printException,
    setErrorHandler,
    pushTryContext,
    popTryContext,
    isInsideTry,
    KurobaUserException,
    KurobaRuntimeError,
    formatTimestamp,
    formatExceptionMessage,
    parseRuntimeErrorToTable
};