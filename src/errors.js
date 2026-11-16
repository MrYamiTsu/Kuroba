const RED = '\x1b[31m';
const ORANGE_RED = '\x1b[38;2;255;85;0m';
const RESET = '\x1b[0m';

let customHandler = null;
let tryDepth = 0;

function setErrorHandler(handler) {
    customHandler = handler;
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
    constructor(message, errorTable = null) {
        super(typeof message === 'string' ? message : ((message && message.eContext) || 'RuntimeError'));
        this.isKurobaRuntimeError = true;
        this.message = typeof message === 'string' ? message : '';
        this.errorTable = errorTable;
    }
}

function formatTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `${date} ${time}`;
}

function createErrorTable(obj) {
    if (obj && obj.kind === 'Table') return obj;

    let name = obj.eName || "RuntimeError";
    let context = (obj.eContext !== undefined) ? obj.eContext : (obj.message || "");
    let time = (obj.eTime !== undefined) ? obj.eTime : false;
    let lines = (obj.eLines !== undefined) ? obj.eLines : true;
    let code = (obj.eCode !== undefined) ? obj.eCode : null;
    let line = (obj.eLine !== undefined) ? obj.eLine : null;
    let col = (obj.eCol !== undefined) ? obj.eCol : null;

    let fields = {
        eName: { value: String(name), type: 'String', isNullable: false },
        eContext: { value: String(context), type: 'String', isNullable: false },
        eTime: { value: Boolean(time), type: 'Bool', isNullable: false }
    };
    if (lines !== true) {
        fields.eLines = { value: Boolean(lines), type: 'Bool', isNullable: false };
    }
    if (code !== null) {
        fields.eCode = { value: code, type: typeof code === 'number' ? 'Int' : 'String', isNullable: true };
    }
    if (line !== null) {
        fields.eLine = { value: line, type: 'Int', isNullable: true };
    }
    if (col !== null) {
        fields.eCol = { value: col, type: 'Int', isNullable: true };
    }

    return {
        kind: 'Table',
        fields
    };
}

function formatExceptionMessage(rawVal, line, col, fallbackFormatted) {
    let name = "Exception";
    let showLines = true;
    let showTime = false;
    let code = null;
    let context = null;

    if (rawVal && rawVal.kind === 'Table' && rawVal.fields) {
        let f = rawVal.fields;
        if ('eName' in f && f.eName.value !== null) {
            name = String(f.eName.value);
        }

        if ('eLines' in f) {
            let lVal = f.eLines.value;
            showLines = (lVal !== false && lVal !== 0);
        }

        if ('eTime' in f) {
            let tVal = f.eTime.value;
            showTime = (tVal !== false && tVal !== 0 && tVal !== null);
        }

        if ('eCode' in f && f.eCode.value !== null) {
            code = f.eCode.value;
        }

        if ('eContext' in f && f.eContext.value !== null) {
            context = String(f.eContext.value);
        }

        if (line === undefined && 'eLine' in f && f.eLine.value !== null) {
            line = f.eLine.value;
        }
        if (col === undefined && 'eCol' in f && f.eCol.value !== null) {
            col = f.eCol.value;
        }
    }

    let loc = null;
    if (line !== undefined && line !== null) {
        loc = (col !== undefined && col !== null) ? `Line ${line}, Col ${col}` : `Line ${line}`;
    }
    let header = `[${name}${showLines && loc ? ': ' + loc : ''}]`;

    let desc = (context !== null) ? context : fallbackFormatted;
    if (code !== null) {
        desc = `Error ${code}: ${desc}`;
    }

    let timePrefix = showTime ? `[${formatTimestamp()}] ` : '';
    return `${timePrefix}${header} ${desc}`;
}

function parseRuntimeErrorToTable(message) {
    let match = message.match(/^\[([a-zA-Z]+)(?::\s*Line\s*(\d+)(?:,\s*Col\s*(\d+))?)?\]\s*(.*)$/s);
    let name = match ? match[1] : "RuntimeError";
    let line = match && match[2] ? parseInt(match[2], 10) : null;
    let col = match && match[3] ? parseInt(match[3], 10) : null;
    let context = match ? match[4] : message;
    let fields = {
        eName: { value: name, type: 'String', isNullable: false },
        eContext: { value: context, type: 'String', isNullable: false },
        eTime: { value: false, type: 'Bool', isNullable: false }
    };
    if (line !== null) {
        fields.eLine = { value: line, type: 'Int', isNullable: true };
    }
    if (col !== null) {
        fields.eCol = { value: col, type: 'Int', isNullable: true };
    }
    return {
        kind: 'Table',
        fields
    };
}

function printErr(arg) {
    let formattedMsg;
    let errorTable;

    if (arg && typeof arg === 'object') {
        errorTable = createErrorTable(arg);
        let line = arg.eLine !== undefined ? arg.eLine : undefined;
        let col = arg.eCol !== undefined ? arg.eCol : undefined;
        formattedMsg = formatExceptionMessage(errorTable, line, col, "");
    } else {
        formattedMsg = String(arg);
        errorTable = parseRuntimeErrorToTable(formattedMsg);
    }

    if (tryDepth > 0) {
        throw new KurobaRuntimeError(formattedMsg, errorTable);
    }
    if (customHandler) {
        customHandler(formattedMsg);
        return;
    }
    console.error(`${RED}${formattedMsg}${RESET}`);
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
    parseRuntimeErrorToTable,
    createErrorTable
};