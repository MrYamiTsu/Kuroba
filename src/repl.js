const readline = require('readline');
const { tokenize } = require('./lexer');
const { parse } = require('./parser');
const { evaluate } = require('./evaluator');
const { createScope } = require('./evaluator/scope');
const { formatKurobaValue } = require('./evaluator/types');
const { setErrorHandler } = require('./errors');
const config = require('../config.json');

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

const STATEMENT_TYPES = new Set([
    'VarDeclar', 'VarAssign', 'VarRetype', 'SwapStatement',
    'IfStatement', 'ForStatement', 'WhileStatement', 'DoWhileStatement',
    'GivenStatement', 'ForInStatement', 'BreakStatement', 'SkipStatement',
    'PasteStatement', 'ClearStatement', 'ExitStatement',
    'KillStatement', 'FunctionDeclaration', 'HookStatement', 'ReturnStatement'
]);

function isExpressionNode(stmt) {
    if (stmt === null || typeof stmt !== 'object') {
        return true;
    }
    return !STATEMENT_TYPES.has(stmt.type);
}

function getUnclosedDepth(tokens) {
    let blockDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;
    let parenDepth = 0;

    for (const t of tokens) {
        if (t.type === 'THEN' || t.type === 'DO') blockDepth++;
        else if (t.type === 'END') blockDepth--;
        else if (t.type === 'LBRACE') braceDepth++;
        else if (t.type === 'RBRACE') braceDepth--;
        else if (t.type === 'LBRACKET') bracketDepth++;
        else if (t.type === 'RBRACKET') bracketDepth--;
        else if (t.type === 'LPAREN') parenDepth++;
        else if (t.type === 'RPAREN') parenDepth--;
    }

    const total = (blockDepth > 0 ? blockDepth : 0) +
                  (braceDepth > 0 ? braceDepth : 0) +
                  (bracketDepth > 0 ? bracketDepth : 0) +
                  (parenDepth > 0 ? parenDepth : 0);
    return total;
}

function startRepl() {
    console.log(`${CYAN}   _  ___   _ ____   ___  ____    _    ${RESET}`);
    console.log(`${CYAN}  | |/ / | | |  _ \\ / _ \\| __ )  / \\   ${RESET}`);
    console.log(`${CYAN}  | ' /| | | | |_) | | | |  _ \\ / _ \\  ${RESET}`);
    console.log(`${CYAN}  | . \\| |_| |  _ <| |_| | |_) / ___ \\ ${RESET}`);
    console.log(`${CYAN}  |_|\\_\\\\___/|_| \\_\\\\___/|____/_/   \\_\\  ${YELLOW}v${config.version} Interactive Shell${RESET}`);
    console.log(`${GRAY}  Type 'exit()' or press Ctrl+C to quit, 'clear()' to clear screen.${RESET}\n`);

    const env = createScope();

    setErrorHandler((errMsg) => {
        throw new Error(errMsg);
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${GREEN}>>> ${RESET}`
    });

    let buffer = [];

    rl.prompt();

    rl.on('SIGINT', () => {
        if (buffer.length > 0) {
            buffer = [];
            console.log(`\n${GRAY}(input cancelled)${RESET}`);
            rl.setPrompt(`${GREEN}>>> ${RESET}`);
            rl.prompt();
        } else {
            console.log(`\n${GRAY}Sayonara!${RESET}`);
            process.exit(0);
        }
    });

    rl.on('line', (rawLine) => {
        const line = rawLine.trim();

        if (buffer.length === 0) {
            if (line === 'exit' || line === 'exit()' || line === 'quit' || line === 'quit()') {
                console.log(`${GRAY}Sayonara!${RESET}`);
                process.exit(0);
            }

            if (line === 'clear' || line === 'clear()') {
                console.clear();
                rl.prompt();
                return;
            }

            if (line === 'help' || line === 'help()') {
                console.log(`${CYAN}Kuroba Interactive Shell Help:${RESET}`);
                console.log(`  - Enter any Kuroba expression to evaluate it: ${GREEN}42${RESET}, ${GREEN}"hello"${RESET}, ${GREEN}2 + 3${RESET}`);
                console.log(`  - Declare variables: ${GREEN}ivar x = 10;${RESET}`);
                console.log(`  - Print text: ${GREEN}pasteLn("Hello!");${RESET}`);
                console.log(`  - Commands: ${YELLOW}clear()${RESET} to clear screen, ${YELLOW}exit()${RESET} to quit.\n`);
                rl.prompt();
                return;
            }

            if (line === '') {
                rl.prompt();
                return;
            }
        } else {
            if (line === '') {
                buffer = [];
                rl.setPrompt(`${GREEN}>>> ${RESET}`);
                rl.prompt();
                return;
            }
        }

        buffer.push(rawLine);

        let depth = 0;
        try {
            const combinedSource = buffer.join('\n');
            const tokens = tokenize(combinedSource);
            depth = getUnclosedDepth(tokens);
        } catch (e) {
            if (e.message && (e.message.includes('Unterminated') || e.message.includes('Unclosed'))) {
                depth = 1;
            } else {
                console.log(`${RED}${e.message || e}${RESET}`);
                buffer = [];
                rl.setPrompt(`${GREEN}>>> ${RESET}`);
                rl.prompt();
                return;
            }
        }

        if (depth > 0) {
            rl.setPrompt(`${YELLOW}... ${RESET}`);
            rl.prompt();
            return;
        }

        const fullCode = buffer.join('\n').trim();
        buffer = [];
        rl.setPrompt(`${GREEN}>>> ${RESET}`);

        let codeToExecute = fullCode;
        if (!codeToExecute.endsWith(';') && !codeToExecute.endsWith('end') && !codeToExecute.endsWith('}}')) {
            codeToExecute += ';';
        }

        try {
            const tokens = tokenize(codeToExecute);
            const ast = parse(tokens);

            let lastResult = null;
            let lastIsExpr = false;
            let lastWasPasteWithoutNewline = false;

            if (ast && ast.body) {
                for (const stmt of ast.body) {
                    lastIsExpr = isExpressionNode(stmt);
                    lastWasPasteWithoutNewline = (stmt && stmt.type === 'PasteStatement' && !stmt.newLine);
                    lastResult = evaluate(stmt, env);
                }
            }

            if (lastWasPasteWithoutNewline) {
                process.stdout.write('\n');
            }

            if (lastIsExpr && lastResult !== undefined) {
                console.log(`${CYAN}${formatKurobaValue(lastResult)}${RESET}`);
            }
        } catch (err) {
            console.log(`${RED}${err.message || err}${RESET}`);
        }

        rl.prompt();
    });

    rl.on('close', () => {
        process.exit(0);
    });
}

module.exports = { startRepl };
