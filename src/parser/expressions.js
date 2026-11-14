const { ParserTypes } = require('./types');
const { printErr } = require('../errors');
const { tokenize } = require('../lexer');

class ParserExpressions extends ParserTypes {
    parsePrimary() {
        let token = this.peek();

        if (!token) {
            printErr("[SyntaxError: at end of file] Unexpected end of input. Expected expression.");
        }

        let expr = null;

        if (this.match('LBRACKET')) {
            let elements = [];

            if (!this.check('RBRACKET')) {
                while (true) {
                    elements.push(this.parseLogicOr());
                    if (!this.match('COMMA')) break;
                    if (this.check('RBRACKET')) break;
                }
            }

            this.consume('RBRACKET', "Expected closing ']' after list elements.");
            expr = { type: 'ListLiteral', elements };
        }
        else if (this.match('LBRACE')) {
            let entries = [];

            if (!this.check('RBRACE')) {
                while (true) {
                    let key = null;

                    if (this.match('IDENTIFIER', 'STRING')) {
                        key = this.previous().value;
                    } else {
                        printErr(`[SyntaxError: ${this.formatLocation(this.peek())}] Expected key (identifier or string) in Table literal.`);
                    }

                    let typeInfo = null;
                    if (this.match('TILDE')) {
                        typeInfo = this.parseType();
                    }

                    this.consume('COLON', `Expected ':' after key '${key}' in Table literal.`);
                    let value = this.parseLogicOr();
                    entries.push({ key, value, typeInfo });

                    if (!this.match('COMMA')) break;
                    if (this.check('RBRACE')) break;
                }
            }
            this.consume('RBRACE', "Expected closing '}' after Table entries.");
            expr = { type: 'TableLiteral', entries };
        }
        else if (this.match('COPY', 'COPYKEY')) {
            let isOneKey = (this.previous().type === 'COPYKEY');

            this.consume('LPAREN', "Expected '(' after 'copy'.");

            let prompt = null;
            if (!this.check('RPAREN')) {
                prompt = this.parseLogicOr();
            }

            this.consume('RPAREN', "Expected ')' after 'copy' prompt.");
            expr = { type: 'CopyExpression', prompt, oneKey: isOneKey };
        }
        else if (this.match('FUNCTION')) {
            expr = this.parseFunctionDeclaration(true);
        }
        else if (this.match('THIS')) {
            expr = { type: 'Variable', name: 'this' };
        }
        else if (this.match('BASE')) {
            expr = { type: 'Variable', name: 'base' };
        }
        else if (this.match('IDENTIFIER')) {
            expr = { type: 'Variable', name: this.previous().value };
        }
        else if (this.match('INT', 'STRING', 'BOOL', 'FLOAT', 'NULL')) {
            return this.previous().value;
        }
        else if (this.match('INTERPOLATEDSTRING')) {
            return this.parseInterpolatedString(this.previous());
        }
        else if (this.match('LPAREN')) {
            let openParen = this.previous();
            expr = this.parseLogicOr();

            if (!this.match('RPAREN')) {
                printErr(`[SyntaxError: ${this.formatLocation(this.peek() || openParen)}] Unclosed parenthesis. Missing closing ')' to match '(' at Line ${openParen.line}, Col ${openParen.col}.`);
            }
        }
        else {
            printErr(`[SyntaxError: ${this.formatLocation(token)}] Unexpected token '${token.value}' of type '${token.type}'.`);
        }

        while (true) {
            if (this.match('LBRACKET')) {
                let index = this.parseLogicOr();
                this.consume('RBRACKET', "Expected closing ']' after index.");
                expr = { type: 'IndexAccess', target: expr, index };
            } else if (this.match('DOT')) {
                let memberName = this.consume('IDENTIFIER', "Expected property or method name after '.' (e.g. push, pop, peek, count, args).").value;
                if (this.match('LPAREN')) {
                    let args = [];

                    if (!this.check('RPAREN')) {
                        while (true) {
                            args.push(this.parseLogicOr());
                            if (!this.match('COMMA')) break;
                        }
                    }

                    this.consume('RPAREN', "Expected ')' after method arguments.");
                    expr = { type: 'MethodCall', target: expr, method: memberName, args };
                } else {
                    expr = { type: 'IndexAccess', target: expr, index: memberName, isDotAccess: true };
                }
            } else if (this.match('LPAREN')) {
                let args = [];

                if (!this.check('RPAREN')) {
                    while (true) {
                        args.push(this.parseLogicOr());
                        if (!this.match('COMMA')) break;
                    }
                }

                this.consume('RPAREN', "Expected ')' after function arguments.");
                expr = { type: 'CallExpression', caller: expr, args };
            } else {
                break;
            }
        }

        return expr;
    }

    parseInterpolatedString(token) {
        let raw = token.value;
        let parts = [];
        let i = 0;
        let textBuf = "";

        while (i < raw.length) {
            if (raw[i] === '\\' && (raw[i + 1] === '{' || raw[i + 1] === '}' || raw[i + 1] === '"')) {
                textBuf += raw[i + 1];
                i += 2;
                continue;
            }

            if (raw[i] === '{') {
                if (textBuf.length > 0) {
                    parts.push({ type: 'Literal', value: textBuf });
                    textBuf = "";
                }

                i++;
                let exprStr = "";
                let braceCount = 1;

                while (i < raw.length && braceCount > 0) {
                    if (raw[i] === '{') braceCount++;
                    else if (raw[i] === '}') braceCount--;
                    if (braceCount > 0) exprStr += raw[i];
                    i++;
                }

                if (braceCount > 0) {
                    printErr(`[SyntaxError: Line ${token.line}, Col ${token.col}] Unclosed '{' in interpolated string.`);
                }

                const innerTokens = tokenize(exprStr + ";");
                const innerAst = new this.constructor(innerTokens).parseProgram();

                if (innerAst.body.length > 0) {
                    parts.push(innerAst.body[0]);
                }

                continue;
            }
            textBuf += raw[i];
            i++;
        }

        if (textBuf.length > 0) {
            parts.push({ type: 'Literal', value: textBuf });
        }

        return {
            type: 'InterpolatedString',
            parts,
            line: token.line,
            col: token.col
        };
    }

    parseUnary() {
        if (this.match('NOT', 'MINUS')) {
            let op = this.previous().value;
            let right = this.parseUnary();
            return { type: 'UnaryExpression', operator: op, right };
        }
        return this.parsePrimary();
    }

    parseMult() {
        let left = this.parseUnary();

        while (this.match('MULT', 'DIVIDE', 'MODULO')) {
            let op = this.previous().value;
            let right = this.parseUnary();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    parseAdd() {
        let left = this.parseMult();

        while (this.match('PLUS', 'MINUS')) {
            let op = this.previous().value;
            let right = this.parseMult();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    parseComparaison() {
        let left = this.parseAdd();

        while (this.match('LESS', 'GREATER', 'LESSEQUAL', 'GREATEREQUAL', 'IS')) {
            let opToken = this.previous();

            if (opToken.type === 'IS') {
                let targetSpec = null;

                if (this.match('NULL')) {
                    targetSpec = { kind: 'literal', value: null, label: 'NULL' };
                } else if (this.match('BOOL')) {
                    let bVal = this.previous().value;
                    targetSpec = { kind: 'literal', value: bVal, label: bVal ? 'TRUE' : 'FALSE' };
                } else {
                    targetSpec = { kind: 'type', typeInfo: this.parseType() };
                }

                left = { type: 'IsExpression', left, targetSpec };
            } else {
                let right = this.parseAdd();
                left = { type: 'MathExpression', operator: opToken.value, left, right };
            }
        }
        
        return left;
    }

    parseEquality() {
        let left = this.parseComparaison();

        while (this.match('EQUALS', 'NOTEQUALS')) {
            let op = this.previous().value;
            let right = this.parseComparaison();
            left = { type: 'MathExpression', operator: op, left, right };
        }

        return left;
    }

    parseLogicAnd() {
        let left = this.parseEquality();

        while (this.match('AND')) {
            let op = this.previous().value;
            let right = this.parseEquality();
            left = { type: 'LogicalExpression', operator: op, left, right };
        }

        return left;
    }

    parseLogicOr() {
        let left = this.parseLogicAnd();

        while (this.match('OR')) {
            let op = this.previous().value;
            let right = this.parseLogicAnd();
            left = { type: 'LogicalExpression', operator: op, left, right };
        }

        return left;
    }

    parseCondition() {
        if (this.match('LPAREN')) {
            let cond = this.parseLogicOr();
            this.consume('RPAREN', "Unclosed parenthesis in condition.");
            return cond;
        } else if (this.check('IDENTIFIER')) {
            return { type: 'Variable', name: this.advance().value };
        } else if (this.check('NOT')) {
            return this.parseUnary();
        } else {
            printErr("[SyntaxError] Comparisons in conditions must be wrapped in parentheses '(...)'.");
        }
    }
}

module.exports = { ParserExpressions };
