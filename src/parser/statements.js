const { ParserControl } = require('./control');
const { OP_MAP } = require('./cursor');
const { printErr } = require('../errors');

class ParserStatements extends ParserControl {
    parseVarDeclaration() {
        let isConst = this.previous().type === 'ICONST';
        let isNullable = true;
        let explType = null;

        let typeInfo = null;
        if (this.match('TILDE')) {
            typeInfo = this.parseType();
            explType = typeInfo.baseType;
            isNullable = typeInfo.isNullable;
        }

        let names = [];
        while (true) {
            names.push(this.consume('IDENTIFIER', "Expected variable name in declaration.").value);
            if (!this.match('COMMA')) break;
        }

        this.consume('ASSIGN', `Missing '=' assignment operator after variable name '${names[names.length - 1]}'.`);

        let values = [];
        while (true) {
            values.push(this.parseLogicOr());
            if (!this.match('COMMA')) break;
        }

        if (values.length > names.length) {
            printErr(`[SyntaxError: ${this.formatLocation(this.peek() || this.previous())}] Too many values in declaration: expected at most ${names.length}, got ${values.length}.`);
        }

        if (names.length === 1) {
            return { type: 'VarDeclar', name: names[0], explType, isNullable, value: values[0], isConst, typeInfo };
        }

        let declarations = names.map((varName, i) => {
            let valueExpr = (i < values.length) ? values[i] : values[values.length - 1];
            return { type: 'VarDeclar', name: varName, explType, isNullable, value: valueExpr, isConst, typeInfo };
        });

        return { type: 'MultiVarDeclar', declarations };
    }

    parseAssignSuffix(targetDesc) {
        if (this.match('INCREMENT')) return { value: 1, operator: '+' };
        if (this.match('DECREMENT')) return { value: 1, operator: '-' };
        if (this.match('ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN')) {
            let op = OP_MAP[this.previous().type] || null;
            let expr = this.parseLogicOr();
            return { value: expr, operator: op };
        }
        printErr(`[SyntaxError: ${this.formatLocation(this.peek())}] Expected assignment operator after ${targetDesc}.`);
    }

    parseStatement() {
        let stmt;

        if (this.match('IF'))       return this.parseIfStatement();
        if (this.match('FOR'))      return this.parseForStatement();
        if (this.match('WHILE'))    return this.parseWhileStatement();
        if (this.match('GIVEN'))    return this.parseGivenStatement();
        if (this.match('DO'))       return this.parseDoWhileStatement();
        if (this.match('FUNCTION')) return this.parseFunctionDeclaration(false);
        if (this.match('HOOK'))     return this.parseHookStatement();
        if (this.match('TRY'))      return this.parseTryStatement();
        if (this.match('CLASS'))    return this.parseClassDeclaration();
        
        if (this.match('IVAR', 'ICONST')) {
            stmt = this.parseVarDeclaration();
        } else if (this.match('RETURN')) {
            let startToken = this.previous();

            let value = null;
            if (!this.check('SEMICOLON')) {
                value = this.parseLogicOr();
            }

            stmt = { type: 'ReturnStatement', value, line: startToken.line, col: startToken.col };
        } else if (this.match('IMPORT')) {
            let pkgName = this.consume('IDENTIFIER', "Expected package name after 'import'.").value;
            let modules = [];

            if (this.match('TILDE')) {
                this.consume('LPAREN', "Expected '(' after '~' in import statement.");

                if (!this.check('RPAREN')) {
                    while (true) {
                        modules.push(this.consume('IDENTIFIER', "Expected module name.").value);
                        if (!this.match('COMMA')) break;
                    }
                }

                this.consume('RPAREN', "Expected ')' after import module list.");
            }

            let aliasName = null;
            if (this.match('ALIAS')) {
                if (this.match('TILDE')) {
                    aliasName = '~';
                } else {
                    aliasName = this.consume('IDENTIFIER', "Expected alias name or '~' after 'alias'.").value;
                }
            }

            stmt = {
                type: 'ImportStatement',
                package: pkgName,
                modules,
                alias: aliasName
            };
        } else if (this.match('NAMESPACE')) {
            let startToken = this.previous();
            let nsName = this.consume('IDENTIFIER', "Expected namespace name after 'namespace'.").value;

            let modName = null;

            if (this.match('TILDE')) {
                if (nsName === 'Main') {
                    printErr(`[SyntaxError: Line ${startToken.line}, Col ${startToken.col}] Namespace 'Main' cannot be split into modules.`);
                }
                
                modName = this.consume('IDENTIFIER', "Expected module name after '~'.").value;
            }

            this.consume('THEN', `Expected 'then' after namespace declaration '${nsName}'.`);

            let body = [];
            while (!this.check('END') && !this.isAtEnd()) {
                body.push(this.parseStatement());
            }

            this.consume('END', `Expected 'end' to close namespace '${nsName}' block.`);

            return {
                type: 'NamespaceStatement',
                namespace: nsName,
                module: modName,
                body,
                line: startToken.line,
                col: startToken.col
            };
        } else if (this.match('PASTE', 'PASTELN')) {
            let isLn = this.previous().type === 'PASTELN';
            let kw = this.previous().value;

            this.consume('LPAREN', `Expected '(' after '${kw}'.`);

            let expr = undefined;
            let isEmpty = false;

            if (isLn && this.check('RPAREN')) {
                isEmpty = true;
            } else {
                expr = this.parseLogicOr();
            }

            this.consume('RPAREN', `Expected ')' after '${kw}' argument.`);
            stmt = { type: 'PasteStatement', expr, newLine: isLn, isEmpty };
        } else if (this.check('COPY') || this.check('COPYKEY')) {
            stmt = this.parsePrimary();
        } else if (this.match('CLEAR')) {
            this.consume('LPAREN', "Expected '(' after 'clear'.");
            
            let condition = null;
            if (!this.check('RPAREN')) {
                condition = this.parseLogicOr();
            }

            this.consume('RPAREN', "Expected ')' after 'clear' condition.");
            stmt = { type: 'ClearStatement', condition };
        } else if (this.match('EXIT')) {
            this.consume('LPAREN', "Expected '(' after 'exit'.");
            
            let condition = null;
            if (!this.check('RPAREN')) {
                condition = this.parseLogicOr();
            }

            this.consume('RPAREN', "Expected ')' after 'exit' condition.");
            stmt = { type: 'ExitStatement', condition };
        } else if (this.match('KILL')) {
            let startToken = this.previous();
            let varName = this.consume('IDENTIFIER', "Expected variable name after 'kill'.").value;
            
            stmt = { type: 'KillStatement', name: varName, line: startToken.line, col: startToken.col };
        } else if (this.match('THROW')) {
            let startToken = this.previous();
            let value = this.parseLogicOr();
            stmt = { type: 'ThrowStatement', value, line: startToken.line, col: startToken.col };
                } else if (this.check('IDENTIFIER') && this.tokens[this.cursor + 1] && this.tokens[this.cursor + 1].type === 'SWAP') {
            let leftVar = this.advance().value;
            this.advance();
            let rightVar = this.consume('IDENTIFIER', "Expected variable name after '<->' swap operator.").value;
            stmt = { type: 'SwapStatement', left: leftVar, right: rightVar };
        } else if (this.match('BREAK')) {
            stmt = { type: 'BreakStatement' };
        } else if (this.match('SKIP')) {
            stmt = { type: 'SkipStatement' };
        } else {
            let expr = this.parseLogicOr();
            const nextToken = this.peek();
            const isAssignOp = nextToken && ['INCREMENT', 'DECREMENT', 'ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN'].includes(nextToken.type);
            
            if (expr.type === 'Variable' && (this.check('TILDE') || isAssignOp)) {
                if (this.match('TILDE')) {
                    let typeInfo = this.parseType();
                    let targetType = typeInfo.baseType;
                    let isNullable = typeInfo.isNullable;

                    this.consume('ASSIGN', `Missing '=' assignment operator after '${expr.name}~${targetType}'.`);
                    let value = this.parseLogicOr();
                    stmt = { type: 'VarRetype', name: expr.name, targetType, isNullable, value, typeInfo };
                } else {
                    let rhs = this.parseAssignSuffix(`variable '${expr.name}'`);
                    stmt = {
                        type: 'VarAssign',
                        name: expr.name,
                        value: rhs.operator
                            ? { type: 'MathExpression', operator: rhs.operator, left: { type: 'Variable', name: expr.name }, right: rhs.value }
                            : rhs.value
                    };
                }
            } else if (expr.type === 'IndexAccess' && (this.check('TILDE') || isAssignOp)) {
                let typeInfo = this.match('TILDE') ? this.parseType() : null;
                let desc = expr.isDotAccess ? `property '${expr.index}'` : 'list index';
                let rhs = this.parseAssignSuffix(desc);
                stmt = {
                    type: 'MemberAssign',
                    target: expr.target,
                    index: expr.index,
                    isDotAccess: expr.isDotAccess,
                    value: rhs.value,
                    operator: rhs.operator,
                    typeInfo
                };
            } else {
                stmt = expr;
            }
        }

        this.consume('SEMICOLON', "Missing semicolon ';' at the end of statement.");
        return stmt;
    }

    parseClassDeclaration() {
        let startToken = this.previous();
        let className = this.consume('IDENTIFIER', "Expected class name after 'class'.").value;
        
        let superClass = null;
        if (this.match('FROM')) {
            superClass = this.consume('IDENTIFIER', `Expected superclass name after 'from' in class '${className}'.`).value;
        }

        this.consume('THEN', `Expected 'then' after class declaration '${className}'.`);

        let fields = [];
        let methods = [];

        while (!this.check('END') && !this.isAtEnd()) {
            let access = 'public';
            if (this.match('PUBLIC')) {
                access = 'public';
            } else if (this.match('PRIVATE')) {
                access = 'private';
            }

            if (this.match('IVAR', 'ICONST')) {
                let decl = this.parseVarDeclaration();
                if (decl.type === 'MultiVarDeclar') {
                    for (let d of decl.declarations) {
                        fields.push({ ...d, access });
                    }
                } else {
                    fields.push({ ...decl, access });
                }
                this.consume('SEMICOLON', "Missing semicolon ';' after field declaration in class.");
            } else if (this.match('FUNCTION')) {
                let method = this.parseFunctionDeclaration(false);
                methods.push({ ...method, access });
            } else {
                let tok = this.peek();
                printErr(`[SyntaxError: ${this.formatLocation(tok)}] Unexpected token '${tok ? tok.value : 'EOF'}' inside class '${className}'. Expected field or method declaration.`);
            }
        }

        this.consume('END', `Expected 'end' to close class '${className}' block.`);

        return {
            type: 'ClassDeclaration',
            name: className,
            superClass,
            fields,
            methods,
            line: startToken.line,
            col: startToken.col
        };
    }

    parseProgram() {
        let statements = [];
        while (!this.isAtEnd()) {
            statements.push(this.parseStatement());
        }

        return {
            type: 'Program',
            body: statements
        };
    }
}

module.exports = { ParserStatements };
