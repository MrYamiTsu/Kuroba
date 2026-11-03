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

        let expr = null;

        if (match('LBRACKET')) {
            let elements = [];

            if (!check('RBRACKET')) {
                while (true) {
                    elements.push(parseLogicOr());
                    if (!match('COMMA')) break;
                    if (check('RBRACKET')) break;
                }
            }

            consume('RBRACKET', "Expected closing ']' after list elements.");

            expr = { type: 'ListLiteral', elements };
        }
        else if (match('COPY', 'COPYKEY')) {
            let isOneKey = (previous().type === 'COPYKEY');

            consume('LPAREN', "Expected '(' after 'copy'.");

            let prompt = null;
            if (!check('RPAREN')) {
                prompt = parseLogicOr();
            }

            consume('RPAREN', "Expected ')' after 'copy' prompt.");
            expr = { type: 'CopyExpression', prompt, oneKey: isOneKey };
        }
        else if (match('IDENTIFIER')) {
            expr = { type: 'Variable', name: previous().value };
        }
        else if (match('INT', 'STRING', 'BOOL', 'FLOAT', 'NULL')) {
            return previous().value;
        }
        else if (match('LPAREN')) {
            let openParen = previous();
            expr = parseLogicOr();

            if (!match('RPAREN')) {
                printErr(`[SyntaxError: ${formatLocation(peek() || openParen)}] Unclosed parenthesis. Missing closing ')' to match '(' at Line ${openParen.line}, Col ${openParen.col}.`);
            }
        }
        else {
            printErr(`[SyntaxError: ${formatLocation(token)}] Unexpected token '${token.value}' of type '${token.type}'.`);
        }

        while (true) {
            if (match('LBRACKET')) {
                let index = parseLogicOr();
                consume('RBRACKET', "Expected closing ']' after index.");
                expr = { type: 'IndexAccess', target: expr, index };
            } else if (match('DOT')) {
                let methodName = consume('IDENTIFIER', "Expected method name after '.' (e.g. push, pop, peek, count).").value;
                consume('LPAREN', `Expected '(' after method '${methodName}'.`);
                let args = [];

                if (!check('RPAREN')) {
                    while (true) {
                        args.push(parseLogicOr());
                        if (!match('COMMA')) break;
                    }
                }

                consume('RPAREN', `Expected ')' after method arguments.`);
                expr = { type: 'MethodCall', target: expr, method: methodName, args };
            } else {
                break;
            }
        }

        return expr;
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

    function parseType() {
        let isNullable = true;
        let baseType = null;
        let elemType = null;
        let isElemNullable = true;

        if (match('LPAREN')) {
            isNullable = false;
            baseType = consume('IDENTIFIER', "Expected type identifier inside '(...)'. (e.g. String, Int, List)").value;
            
            if ((baseType === 'List' || baseType === 'Stack' || baseType === 'Queue') && match('LESS')) {
                isElemNullable = false;

                if (match('LPAREN')) {
                    elemType = consume('IDENTIFIER', "Expected element type inside 'List<(...)>'.").value;
                    consume('RPAREN', "Expected closing ')' after element type.");
                } else {
                    elemType = consume('IDENTIFIER', "Expected element type inside 'List<...>'.").value;
                }

                consume('GREATER', "Expected closing '>' after List type.");
            }

            consume('RPAREN', "Expected closing ')' after non-nullable type.");
        } else {
            baseType = consume('IDENTIFIER', "Expected type identifier after '~' (e.g. String, Int, List).").value;

            if ((baseType === 'List' || baseType === 'Stack' || baseType === 'Queue') && match('LESS')) {
                if (match('LPAREN')) {
                    isElemNullable = false;
                    elemType = consume('IDENTIFIER', "Expected element type inside 'List<(...)>'.").value;
                    consume('RPAREN', "Expected closing ')' after element type.");
                } else {
                    isElemNullable = true;
                    elemType = consume('IDENTIFIER', "Expected element type inside 'List<...>'.").value;
                }

                consume('GREATER', "Expected closing '>' after List type.");
            }
        }

        return { baseType, isNullable, elemType, isElemNullable };
    }

    function parseVarDeclaration() {
        let isConst = previous().type === 'ICONST';
        let isNullable = true;
        let explType = null;

        let typeInfo = null;
        if (match('TILDE')) {
            typeInfo = parseType();
            explType = typeInfo.baseType;
            isNullable = typeInfo.isNullable;
        }

        let varName = consume('IDENTIFIER', "Expected variable name in declaration.").value;
        consume('ASSIGN', `Missing '=' assignment operator after variable name '${varName}'.`);
        let value = parseLogicOr();

        return { type: 'VarDeclar', name: varName, explType, isNullable, value, isConst, typeInfo };
    }

    function parseWhileStatement() {
        let condition = parseCondition();
        consume('THEN', "Expected 'then' after 'while' condition.");

        let body = [];
        while (!check('END') && !isAtEnd()) {
            body.push(parseStatement());
        }
        consume('END', "Unclosed 'while' loop. Expected 'end'.");
        
        return {
            type: 'WhileStatement',
            condition,
            body
        };
    }

    function parseDoWhileStatement() {
        let body = [];
        while (!check('WHILE') && !isAtEnd()) {
            body.push(parseStatement());
        }
        consume('WHILE', "Expected 'while' after 'do' loop body.");
        let condition = parseCondition();
        consume('SEMICOLON', "Expected ';' after 'do ... while' condition.")
        
        return {
            type: 'DoWhileStatement',
            condition,
            body
        };
    }

    function parseStatement() {
        let stmt;

        if (match('IF'))    return parseIfStatement();
        if (match('FOR'))   return parseForStatement();
        if (match('WHILE')) return parseWhileStatement();
        if (match('GIVEN')) return parseGivenStatement();
        if (match('DO'))    return parseDoWhileStatement();

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
        else if (check('COPY') || check('COPYKEY')) {
            stmt = parsePrimary();
        }
        else if (match('CLEAR')) {
            consume('LPAREN', "Expected '(' after 'clear'.");
            
            let condition = null;
            if (!check('RPAREN')) {
                condition = parseLogicOr();
            }

            consume('RPAREN', "Expected ')' after 'clear' condition.");
            stmt = { type: 'ClearStatement', condition };
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
        else if (check('IDENTIFIER') && tokens[cursor + 1] && tokens[cursor + 1].type === 'LBRACKET') {
            let varName = advance().value;
            advance();
            let index = parseLogicOr();
            consume('RBRACKET', "Expected ']' after list index.");

            if (match('INCREMENT')) {
                stmt = { type: 'IndexAssign', name: varName, index, value: 1, operator: '+' };
            } else if (match('DECREMENT')) {
                stmt = { type: 'IndexAssign', name: varName, index, value: 1, operator: '-' };
            } else if (match('ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN')) {
                let assignToken = previous();
                let expr = parseLogicOr();
                let opMap = {
                    'PLUSASSIGN': '+',
                    'MINUSASSIGN': '-',
                    'MULTASSIGN': '*',
                    'DIVIDEASSIGN': '/',
                    'MODULOASSIGN': '%'
                };
                
                stmt = {
                    type: 'IndexAssign',
                    name: varName,
                    index,
                    value: expr,
                    operator: opMap[assignToken.type] || null
                };
            } else {
                printErr(`[SyntaxError: ${formatLocation(peek())}] Expected assignment operator after list index '${varName}[...]'.`);
            }
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

            let typeInfo = parseType();
            let targetType = typeInfo.baseType;
            let isNullable = typeInfo.isNullable;

            consume('ASSIGN', `Missing '=' assignment operator after '${varName}~${targetType}'.`);
            let value = parseLogicOr();
            stmt = { type: 'VarRetype', name: varName, targetType, isNullable, value, typeInfo };
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
