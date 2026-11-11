const { ParserExpressions } = require('./expressions');
const { OP_MAP } = require('./cursor');
const { printErr } = require('../errors');

class ParserControl extends ParserExpressions {
    parseIfStatement() {
        let cond = this.parseCondition();
        this.consume('THEN', "Expected 'then' after 'if' condition.");

        let thenBranch = [];
        while (!this.check('ELIF') && !this.check('ELSE') && !this.check('END') && !this.isAtEnd()) {
            thenBranch.push(this.parseStatement());
        }

        let elifBranches = [];
        while (this.match('ELIF')) {
            let elifCond = this.parseCondition();
            this.consume('THEN', "Expected 'then' after 'elif' condition.");

            let elifBody = [];
            while (!this.check('ELIF') && !this.check('ELSE') && !this.check('END') && !this.isAtEnd()) {
                elifBody.push(this.parseStatement());
            }
            elifBranches.push({ condition: elifCond, body: elifBody });
        }

        let elseBranch = null;
        if (this.match('ELSE')) {
            elseBranch = [];
            while (!this.check('END') && !this.isAtEnd()) {
                elseBranch.push(this.parseStatement());
            }
        }

        this.consume('END', "Unclosed 'if' block. Expected 'end'.");
        return {
            type: 'IfStatement',
            condition: cond,
            thenBranch,
            elifBranches,
            elseBranch
        };
    }

    parseForStatement() {
        let startToken = this.previous();
        this.consume('LPAREN', "Expected '(' before for-loop header.");

        let isForIn = false;
        for (let i = this.cursor; i < this.tokens.length; i++) {
            if (this.tokens[i].type === 'SEMICOLON' || this.tokens[i].type === 'RPAREN') break;
            if (this.tokens[i].type === 'IN') {
                isForIn = true;
                break;
            }
        }

        if (isForIn) {
            this.consume('IVAR', "Expected 'ivar' before variable name in for-in loop.");
            let firstVar = this.consume('IDENTIFIER', "Expected variable name in for-in loop.").value;
            let indexVar = null;
            let itemVar = firstVar;

            if (this.match('COMMA')) {
                indexVar = firstVar;
                itemVar = this.consume('IDENTIFIER', "Expected item variable name after ',' in for-in loop.").value;
            }

            this.consume('IN', "Expected 'in' keyword in for-in loop.");
            let iterable = this.parseLogicOr();
            this.consume('RPAREN', "Expected ')' after for-in loop header.");
            this.consume('THEN', "Expected 'then' after for-in loop header.");

            let body = [];
            while (!this.check('END') && !this.isAtEnd()) {
                body.push(this.parseStatement());
            }
            this.consume('END', "Unclosed 'for' loop. Expected 'end'.");

            return {
                type: 'ForInStatement',
                indexVar,
                itemVar,
                iterable,
                body,
                line: startToken.line,
                col: startToken.col
            };
        }

        let init = null;
        if (!this.check('SEMICOLON')) {
            if (this.match('IVAR', 'ICONST')) {
                init = this.parseVarDeclaration();
            } else {
                init = this.parseAssignmentOrExpr();
            }
        }
        this.consume('SEMICOLON', "Expected ';' after for-loop initialization.");

        let condition = null;
        if (!this.check('SEMICOLON')) {
            condition = this.parseLogicOr();
        }
        this.consume('SEMICOLON', "Expected ';' after for-loop condition.");

        let update = null;
        if (!this.check('RPAREN')) {
            update = this.parseAssignmentOrExpr();
        }
        this.consume('RPAREN', "Expected ')' after for-loop header.");
        this.consume('THEN', "Expected 'then' after for-loop header.");

        let body = [];
        while (!this.check('END') && !this.isAtEnd()) {
            body.push(this.parseStatement());
        }
        this.consume('END', "Unclosed 'for' loop. Expected 'end'.");

        return {
            type: 'ForStatement',
            init,
            condition,
            update,
            body
        };
    }

    parseAssignmentOrExpr() {
        if (this.check('IDENTIFIER') && this.tokens[this.cursor + 1] && this.tokens[this.cursor + 1].type === 'INCREMENT') {
            let varName = this.advance().value;
            this.advance();
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: '+', left: { type: 'Variable', name: varName }, right: 1 }
            };
        }
        if (this.check('IDENTIFIER') && this.tokens[this.cursor + 1] && this.tokens[this.cursor + 1].type === 'DECREMENT') {
            let varName = this.advance().value;
            this.advance();
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: '-', left: { type: 'Variable', name: varName }, right: 1 }
            };
        }
        if (this.check('IDENTIFIER') && this.tokens[this.cursor + 1] && ['ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN'].includes(this.tokens[this.cursor + 1].type)) {
            let varName = this.advance().value;
            let assignToken = this.advance();
            let expr = this.parseLogicOr();
            if (assignToken.type === 'ASSIGN') {
                return { type: 'VarAssign', name: varName, value: expr };
            }
            return {
                type: 'VarAssign',
                name: varName,
                value: { type: 'MathExpression', operator: OP_MAP[assignToken.type], left: { type: 'Variable', name: varName }, right: expr }
            };
        }
        return this.parseLogicOr();
    }

    parseGivenStatement() {
        let exprTarget = this.parseEquality();
        let cases = [];

        this.consume('THEN', "Expected 'then' after 'given' expression.");

        while (!this.check('END') && !this.isAtEnd()) {
            this.consume('CASE', "Expected 'case' in 'given' block.");

            let isDefault = false;
            let caseValue = null;

            if (this.match('TILDE')) {
                isDefault = true;
            } else {
                caseValue = this.parseEquality();
            }

            this.consume('THEN', "Expected 'then' after case condition.");

            let caseBody = [];
            while (!this.check('CASE') && !this.check('END') && !this.isAtEnd()) {
                caseBody.push(this.parseStatement());
            }

            cases.push({ isDefault, value: caseValue, body: caseBody });
        }

        this.consume('END', "Unclosed 'given' block. Expected 'end'.");
        return {
            type: 'GivenStatement',
            target: exprTarget,
            cases
        };
    }

    parseWhileStatement() {
        let condition = this.parseCondition();
        this.consume('THEN', "Expected 'then' after 'while' condition.");

        let body = [];
        while (!this.check('END') && !this.isAtEnd()) {
            body.push(this.parseStatement());
        }
        this.consume('END', "Unclosed 'while' loop. Expected 'end'.");
        
        return {
            type: 'WhileStatement',
            condition,
            body
        };
    }

    parseDoWhileStatement() {
        let body = [];
        while (!this.check('WHILE') && !this.isAtEnd()) {
            body.push(this.parseStatement());
        }
        this.consume('WHILE', "Expected 'while' after 'do' loop body.");
        let condition = this.parseCondition();
        this.consume('SEMICOLON', "Expected ';' after 'do ... while' condition.");
        
        return {
            type: 'DoWhileStatement',
            condition,
            body
        };
    }

    parseParameterList() {
        let params = [];

        if (!this.check('RPAREN')) {
            while (true) {
                this.consume('IVAR', "Expected 'ivar' before parameter name.");

                let typeInfo = null;
                if (this.match('TILDE')) {
                    typeInfo = this.parseType();
                }

                let paramName = this.consume('IDENTIFIER', "Expected parameter name.").value;
                let hasDefault = false;
                let defaultValue = null;

                if (this.match('ASSIGN')) {
                    hasDefault = true;
                    defaultValue = this.parseLogicOr();
                }

                params.push({ name: paramName, typeInfo, hasDefault, defaultValue });

                if (!this.match('COMMA')) break;
            }
        }

        return params;
    }

    parseHookStatement() {
        let startToken = this.previous();
        
        let varName = this.consume('IDENTIFIER', "Expected function name or table after 'hook'.").value;
        let target = { type: 'Variable', name: varName };

        while (this.match('LBRACKET')) {
            let index = this.parseLogicOr();
            this.consume('RBRACKET', "Expected ']' after index in hook target.");
            target = { type: 'IndexAccess', target, index };
        }

        this.consume('LPAREN', "Expected '(' after hook target.");
        let params = this.parseParameterList();

        this.consume('RPAREN', "Expected ')' after hook parameters.");
        this.consume('THEN', "Expected 'then' after hook header.");

        let body = [];
        while (!this.check('END') && !this.isAtEnd()) {
            body.push(this.parseStatement());
        }

        this.consume('END', "Unclosed hook. Expected 'end'.");

        return {
            type: 'HookStatement',
            target,
            params,
            body,
            line: startToken.line,
            col: startToken.col
        };
    }

    parseFunctionDeclaration(isExpression = false) {
        let startToken = this.previous();
        let name = null;
        let isAnonymous = false;

        if (this.match('TILDE')) {
            isAnonymous = true;
        } else if (this.check('IDENTIFIER')) {
            name = this.advance().value;
        } else {
            printErr(`[SyntaxError: Line ${startToken.line}, Col ${startToken.col}] Expected function name or '~' for anonymous function after 'function'.`);
        }

        this.consume('LPAREN', "Expected '(' after function name or '~'.");
        let params = this.parseParameterList();

        this.consume('RPAREN', "Expected ')' after function parameters.");
        this.consume('THEN', "Expected 'then' after function header.");

        let body = [];
        while (!this.check('END') && !this.isAtEnd()) {
            body.push(this.parseStatement());
        }

        this.consume('END', "Unclosed function. Expected 'end'.");

        return {
            type: 'FunctionDeclaration',
            name,
            isAnonymous,
            params,
            body,
            line: startToken.line,
            col: startToken.col
        };
    }

    parseTryStatement() {
        let startToken = this.previous();
        this.match('THEN');

        let tryBlock = [];
        while (!this.check('CATCH') && !this.check('FINALLY') && !this.check('END') && !this.isAtEnd()) {
            tryBlock.push(this.parseStatement());
        }

        let catchVar = null;
        let catchBlock = null;

        if (this.match('CATCH')) {
            this.consume('LPAREN', "Expected '(' after 'catch'.");
            this.consume('IVAR', "Expected 'ivar' in catch parameter.");
            catchVar = this.consume('IDENTIFIER', "Expected variable name after 'ivar' in catch.").value;
            this.consume('RPAREN', "Expected ')' after catch parameter.");
            this.match('THEN');

            catchBlock = [];
            while (!this.check('FINALLY') && !this.check('END') && !this.isAtEnd()) {
                catchBlock.push(this.parseStatement());
            }
        }

        let finallyBlock = null;
        if (this.match('FINALLY')) {
            this.match('THEN');

            finallyBlock = [];
            while (!this.check('END') && !this.isAtEnd()) {
                finallyBlock.push(this.parseStatement());
            }
        }

        if (!catchBlock && !finallyBlock) {
            printErr(`[SyntaxError: Line ${startToken.line}, Col ${startToken.col}] 'try' block must contain at least a 'catch' or 'finally' clause.`);
        }

        this.consume('END', "Unclosed 'try' block. Expected 'end'.");

        return {
            type: 'TryStatement',
            tryBlock,
            catchVar,
            catchBlock,
            finallyBlock,
            line: startToken.line,
            col: startToken.col
        };
    }
}

module.exports = { ParserControl };
