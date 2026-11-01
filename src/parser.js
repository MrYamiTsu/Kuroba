const { printErr } = require('./errors');

function parse(tokens) {
    let cursor = 0;

    // ========================================================================
    // 1. TOKEN STREAM CURSOR & MATCHING UTILITIES
    // ========================================================================

    function formatLocation(token) {
        if (!token) return 'at end of file';
        return `Line ${token.line}, Col ${token.col}`;
    }

    function peek() {
        return tokens[cursor];
    }

    function previous() {
        return tokens[cursor - 1];
    }

    function isAtEnd() {
        return cursor >= tokens.length;
    }

    function check(type) {
        if (isAtEnd()) return false;
        return peek().type === type;
    }

    function advance() {
        if (!isAtEnd()) cursor++;
        return previous();
    }

    function match(...types) {
        for (let type of types) {
            if (check(type)) {
                advance();
                return true;
            }
        }
        return false;
    }

    function consume(type, message) {
        if (check(type)) return advance();
        let token = peek() || previous();
        printErr(`[SyntaxError: ${formatLocation(token)}] ${message}`);
    }

    // ========================================================================
    // 2. EXPRESSION PARSING (PRECEDENCE HIERARCHY)
    // ========================================================================

    function parsePrimary() {
        let token = peek();

        if (!token) {
            printErr("[SyntaxError: at end of file] Unexpected end of input. Expected expression.");
        }

        if (match('IDENTIFIER')) {
            return { type: 'Variable', name: previous().value };
        }

        if (match('INT', 'STRING', 'BOOL', 'FLOAT', 'NULL')) {
            return previous().value;
        }

        if (match('LPAREN')) {
            let openParen = previous();
            let expr = parseLogicOr();
            if (!match('RPAREN')) {
                printErr(`[SyntaxError: ${formatLocation(peek() || openParen)}] Unclosed parenthesis. Missing closing ')' to match '(' at Line ${openParen.line}, Col ${openParen.col}.`);
            }
            return expr;
        }

        printErr(`[SyntaxError: ${formatLocation(token)}] Unexpected token '${token.value}' of type '${token.type}'.`);
    }

    function parseUnary() {
        if (match('NOT')) {
            let op = previous().value;
            let right = parseUnary();
            return { type: 'UnaryExpression', operator: op, right };
        }
        return parsePrimary();
    }

    function parseMult() {
        let left = parseUnary();

        while (match('MULT', 'DIVIDE', 'MODULO')) {
            let op = previous().value;
            let right = parseUnary();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    function parseAdd() {
        let left = parseMult();

        while (match('PLUS', 'MINUS')) {
            let op = previous().value;
            let right = parseMult();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    function parseComparaison() {
        let left = parseAdd();

        while (match('LESS', 'GREATER', 'LESSEQUAL', 'GREATEREQUAL')) {
            let op = previous().value;
            let right = parseAdd();
            left = { type: 'MathExpression', operator: op, left, right};
        }

        return left;
    }

    function parseEquality() {
        let left = parseComparaison();

        while (match('EQUALS', 'NOTEQUALS')) {
            let op = previous().value;
            let right = parseComparaison();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    function parseLogicAnd() {
        let left = parseEquality();

        while (match('AND')) {
            let op = previous().value;
            let right = parseEquality();
            left = { type: 'LogicalExpression', operator: op, left, right };
        }

        return left;
    }

    function parseLogicOr() {
        let left = parseLogicAnd();

        while (match('OR')) {
            let op = previous().value;
            let right = parseLogicAnd();
            left = { type: 'LogicalExpression', operator: op, left, right };
        }

        return left;
    }

    function parseCondition() {
        if (match('LPAREN')) {
            let cond = parseLogicOr();
            consume('RPAREN', "Unclosed parenthesis in condition.");
            return cond;
        } else if (check('IDENTIFIER')) {
            return { type: 'Variable', name: advance().value };
        } else if (check('NOT')) {
            return parseUnary();
        } else {
            printErr("[SyntaxError] Comparisons in conditions must be wrapped in parentheses '(...)'.");
        }
    }

    // ========================================================================
    // 3. STATEMENT PARSING & CONTROL FLOW
    // ========================================================================

    function parseIfStatement() {
        let cond = parseCondition();
        consume('THEN', "Expected 'then' after 'if' condition.");

        let thenBranch = [];
        while (!check('ELIF') && !check('ELSE') && !check('END') && !isAtEnd()) {
            thenBranch.push(parseStatement());
        }

        let elifBranches = [];
        while (match('ELIF')) {
            let elifCond = parseCondition();
            consume('THEN', "Expected 'then' after 'elif' condition.");

            let elifBody = [];
            while (!check('ELIF') && !check('ELSE') && !check('END') && !isAtEnd()) {
                elifBody.push(parseStatement());
            }
            elifBranches.push({ condition: elifCond, body: elifBody });
        }

        let elseBranch = null;
        if (match('ELSE')) {
            elseBranch = [];
            while (!check('END') && !isAtEnd()) {
                elseBranch.push(parseStatement());
            }
        }

        consume('END', "Unclosed 'if' block. Expected 'end'.");
        return {
            type: 'IfStatement',
            condition: cond,
            thenBranch,
            elifBranches,
            elseBranch
        };
    }

    function parseForStatement() {
        consume('LPAREN', "Expected '(' before for-loop header.");

        let init = null;
        if (!check('SEMICOLON')) {
            if (match('IVAR', 'ICONST')) {
                init = parseVarDeclaration();
            } else {
                init = parseAssignmentOrExpr();
            }
        }
        consume('SEMICOLON', "Expected ';' after for-loop initialization.");

        let condition = null;
        if (!check('SEMICOLON')) {
            condition = parseLogicOr();
        }
        consume('SEMICOLON', "Expected ';' after for-loop condition.");

        let update = null;
        if (!check('RPAREN')) {
            update = parseAssignmentOrExpr();
        }
        consume('RPAREN', "Expected ')' after for-loop header.");
        consume('THEN', "Expected 'then' after for-loop header.");

        let body = [];
        while (!check('END') && !isAtEnd()) {
            body.push(parseStatement());
        }
        consume('END', "Unclosed 'for' loop. Expected 'end'.");

        return {
            type: 'ForStatement',
            init,
            condition,
            update,
            body
        };
    }

    function parseAssignmentOrExpr() {
        if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'INCREMENT') {
            let varName = advance().value;
            advance();
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: '+', left: { type: 'Variable', name: varName }, right: 1 }
            };
        }
        if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'DECREMENT') {
            let varName = advance().value;
            advance();
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: '-', left: { type: 'Variable', name: varName }, right: 1 }
            };
        }
        if (check('IDENTIFIER') && tokens[cursor + 1] && ['ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN'].includes(tokens[cursor + 1].type)) {
            let varName = advance().value;
            let assignToken = advance();
            let expr = parseLogicOr();
            if (assignToken.type === 'ASSIGN') {
                return { type: 'VarAssign', name: varName, value: expr };
            }
            let opMap = {
                'PLUSASSIGN': '+',
                'MINUSASSIGN': '-',
                'MULTASSIGN': '*',
                'DIVIDEASSIGN': '/',
                'MODULOASSIGN': '%'
            };
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: opMap[assignToken.type], left: { type: 'Variable', name: varName }, right: expr }
            };
        }
        return parseLogicOr();
    }

    function parseGivenStatement() {
        let exprTarget = parseEquality();
        let cases = [];

        consume('THEN', "Expected 'then' after 'given' expression.");

        while (!check('END') && !isAtEnd()) {
            consume('CASE', "Expected 'case' in 'given' block.");
            consume('COLON', "Expected ':' after 'case'.");

            let isDefault = false;
            let caseValue = null;

            if (match('TILDE')) {
                isDefault = true;
            } else {
                caseValue = parseEquality();
            }

            let caseBody = [];
            while (!check('CASE') && !check('END') && !isAtEnd()) {
                caseBody.push(parseStatement());
            }

            cases.push({ isDefault, value: caseValue, body: caseBody });
        }

        consume('END', "Unclosed 'given' block. Expected 'end'.");
        return {
            type: 'GivenStatement',
            target: exprTarget,
            cases
        };
    }

    function parseVarDeclaration() {
        let isConst = previous().type === 'ICONST';
        let isNullable = true;
        let explType = null;

        if (match('TILDE')) {
            if (match('LPAREN')) {
                isNullable = false;
                explType = consume('IDENTIFIER', "Expected type identifier inside '~(...)'.").value;
                consume('RPAREN', "Expected closing ')' after non-nullable type.");
            } else {
                explType = consume('IDENTIFIER', "Expected type identifier after '~' (e.g. String, Int, or Bool).").value;
            }
        }

        let varName = consume('IDENTIFIER', "Expected variable name in declaration.").value;
        consume('ASSIGN', `Missing '=' assignment operator after variable name '${varName}'.`);
        let value = parseLogicOr();

        return { type: 'VarDeclar', name: varName, explType, isNullable, value, isConst };
    }

    function parseStatement() {
        let stmt;

        if (match('IF'))    return parseIfStatement();
        if (match('FOR'))   return parseForStatement();
        if (match('GIVEN')) return parseGivenStatement();

        if (match('IVAR', 'ICONST')) {
            stmt = parseVarDeclaration();
        }
        else if (match('PASTE', 'PASTELN')) {
            let isLn = previous().type === 'PASTELN';
            let kw = previous().value;
            consume('LPAREN', `Expected '(' after '${kw}'.`);
            let expr = undefined;
            let isEmpty = false;
            if (isLn && check('RPAREN')) {
                isEmpty = true;
            } else {
                expr = parseLogicOr();
            }
            consume('RPAREN', `Expected ')' after '${kw}' argument.`);
            stmt = { type: 'PasteStatement', expr, newLine: isLn, isEmpty };
        }
        else if (match('EXIT')) {
            consume('LPAREN', "Expected '(' after 'exit'.");
            
            let condition = null;
            if (!check('RPAREN')) {
                condition = parseLogicOr();
            }

            consume('RPAREN', "Expected ')' after 'exit' condition.");
            stmt = { type: 'ExitStatement', condition };
        }
        else if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'INCREMENT') {
            let varName = advance().value;
            advance();
            stmt = {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: '+', left: { type: 'Variable', name: varName }, right: 1 }
            };
        }
        else if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'DECREMENT') {
            let varName = advance().value;
            advance();
            stmt = {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: '-', left: { type: 'Variable', name: varName }, right: 1 }
            };
        }
        else if (check('IDENTIFIER') && tokens[cursor + 1] && ['ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN'].includes(tokens[cursor + 1].type)) {
            let varName = advance().value;
            let assignToken = advance();
            let expr = parseLogicOr();

            if (assignToken.type === 'ASSIGN') {
                stmt = { type: 'VarAssign', name: varName, value: expr };
            } else {
                let opMap = {
                    'PLUSASSIGN': '+',
                    'MINUSASSIGN': '-',
                    'MULTASSIGN': '*',
                    'DIVIDEASSIGN': '/',
                    'MODULOASSIGN': '%'
                };
                stmt = {
                    type: 'VarAssign',
                    name: varName,
                    value: { type: 'MathExpression', operator: opMap[assignToken.type], left: { type: 'Variable', name: varName }, right: expr
                    }
                };
            }
        }
        else if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'TILDE') {
            let varName = advance().value;
            advance();

            let isNullable = true;
            let targetType = null;

            if (match('LPAREN')) {
                isNullable = false;
                targetType = consume('IDENTIFIER', "Expected type identifier inside '~(...)'.").value;
                consume('RPAREN', "Expected closing ')' after non-nullable type.");
            } else {
                targetType = consume('IDENTIFIER', "Expected type identifier after '~'.").value;
            }

            consume('ASSIGN', `Missing '=' assignment operator after '${varName}~${targetType}'.`);
            let value = parseLogicOr();
            stmt = { type: 'VarRetype', name: varName, targetType, isNullable, value };
        }
        else if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'SWAP') {
            let leftVar = advance().value;
            advance();
            let rightVar = consume('IDENTIFIER', "Expected variable name after '<->' swap operator.").value;
            stmt = { type: 'SwapStatement', left: leftVar, right: rightVar };
        }
        else if (match('BREAK')) {
            stmt = { type: 'BreakStatement' };
        }
        else if (match('SKIP')) {
            stmt = { type: 'SkipStatement' };
        }
        else {
            stmt = parseLogicOr();
        }

        consume('SEMICOLON', "Missing semicolon ';' at the end of statement.");
        return stmt;
    }

    // ========================================================================
    // 4. PARSER ENTRYPOINT (PROGRAM)
    // ========================================================================

    let statements = [];
    while (!isAtEnd()) {
        statements.push(parseStatement());
    }

    return {
        type: 'Program',
        body: statements
    };
}

module.exports = { parse };
