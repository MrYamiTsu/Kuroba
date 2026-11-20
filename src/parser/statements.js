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
            let errTok = this.peek() || this.previous();
            printErr({
                eName: 'SyntaxError',
                eContext: `Too many values in declaration: expected at most ${names.length}, got ${values.length}.`,
                eLine: errTok ? errTok.line : null,
                eCol: errTok ? errTok.col : null
            });
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
        let errTok = this.peek();
        printErr({
            eName: 'SyntaxError',
            eContext: `Expected assignment operator after ${targetDesc}.`,
            eLine: errTok ? errTok.line : null,
            eCol: errTok ? errTok.col : null
        });
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
        if (this.match('ENUM'))     return this.parseEnumDeclaration();
        
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
                    printErr({
                        eName: 'SyntaxError',
                        eContext: "Namespace 'Main' cannot be split into modules.",
                        eLine: startToken.line,
                        eCol: startToken.col
                    });
                }

                if (this.match('CLASS')) {
                    let classTok = this.previous();
                    let className = this.consume('IDENTIFIER', "Expected class name after 'class'.").value;
                    modName = className;

                    let superClass = null;
                    if (this.match('FROM')) {
                        superClass = this.parseDottedIdentifier(`Expected superclass name after 'from' in class '${className}'.`);
                    }

                    this.consume('THEN', `Expected 'then' after class declaration '${className}'.`);

                    let { fields, methods, sharedFields, sharedMethods } = this.parseClassBody(className);

                    let classDecl = {
                        type: 'ClassDeclaration',
                        name: className,
                        superClass,
                        fields,
                        methods,
                        sharedFields,
                        sharedMethods,
                        line: classTok.line,
                        col: classTok.col
                    };

                    return {
                        type: 'NamespaceStatement',
                        namespace: nsName,
                        module: modName,
                        isClassModule: true,
                        classDecl,
                        body: [classDecl],
                        line: startToken.line,
                        col: startToken.col
                    };
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
        } else if (this.match('BREAK')) {
            stmt = { type: 'BreakStatement' };
        } else if (this.match('SKIP')) {
            stmt = { type: 'SkipStatement' };
        } else {
            let expr = this.parseLogicOr();
            const nextToken = this.peek();
            const isAssignOp = nextToken && ['INCREMENT', 'DECREMENT', 'ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN'].includes(nextToken.type);
            
            if (this.match('SWAP')) {
                let startToken = this.previous();
                if (expr.type !== 'Variable' && expr.type !== 'IndexAccess') {
                    printErr({
                        eName: 'SyntaxError',
                        eContext: "Invalid left-hand target in '<->' swap statement. Must be a variable, table property, or collection index.",
                        eLine: startToken.line,
                        eCol: startToken.col
                    });
                }
                
                let right = this.parseLogicOr();
                if (right.type !== 'Variable' && right.type !== 'IndexAccess') {
                    printErr({
                        eName: 'SyntaxError',
                        eContext: "Invalid right-hand target in '<->' swap statement. Must be a variable, table property, or collection index.",
                        eLine: startToken.line,
                        eCol: startToken.col
                    });
                }
                stmt = { type: 'SwapStatement', left: expr, right: right, line: startToken.line, col: startToken.col };
            } else if (expr.type === 'Variable' && (this.check('TILDE') || isAssignOp)) {
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

    parseClassBody(className) {
        let fields = [];
        let methods = [];
        let sharedFields = [];
        let sharedMethods = [];

        while (!this.check('END') && !this.isAtEnd()) {
            let isShared = false;
            let access = 'public';

            if (this.match('SHARED')) {
                if (this.match('THEN')) {
                    while (!this.check('END') && !this.isAtEnd()) {
                        let innerAccess = 'public';
                        if (this.match('PRIVATE')) {
                            if (this.check('SHARED')) {
                                let tok = this.peek();
                                printErr({
                                    eName: 'SyntaxError',
                                    eContext: "'shared' modifier must be placed before the visibility modifier (e.g. 'shared private ...').",
                                    eLine: tok ? tok.line : null,
                                    eCol: tok ? tok.col : null
                                });
                            }
                            innerAccess = 'private';
                        } else if (this.match('PROTECTED')) {
                            if (this.check('SHARED')) {
                                let tok = this.peek();
                                printErr({
                                    eName: 'SyntaxError',
                                    eContext: "'shared' modifier must be placed before the visibility modifier (e.g. 'shared protected ...').",
                                    eLine: tok ? tok.line : null,
                                    eCol: tok ? tok.col : null
                                });
                            }
                            innerAccess = 'protected';
                        } else if (this.match('ISOLATED')) {
                            if (this.check('SHARED')) {
                                let tok = this.peek();
                                printErr({
                                    eName: 'SyntaxError',
                                    eContext: "'shared' modifier must be placed before the visibility modifier (e.g. 'shared isolated ...').",
                                    eLine: tok ? tok.line : null,
                                    eCol: tok ? tok.col : null
                                });
                            }
                            innerAccess = 'isolated';
                        } else if (this.match('EXCLUSIVE')) {
                            if (this.check('SHARED')) {
                                let tok = this.peek();
                                printErr({
                                    eName: 'SyntaxError',
                                    eContext: "'shared' modifier must be placed before the visibility modifier (e.g. 'shared exclusive ...').",
                                    eLine: tok ? tok.line : null,
                                    eCol: tok ? tok.col : null
                                });
                            }
                            innerAccess = 'exclusive';
                        } else if (this.match('PUBLIC')) {
                            if (this.check('SHARED')) {
                                let tok = this.peek();
                                printErr({
                                    eName: 'SyntaxError',
                                    eContext: "'shared' modifier must be placed before the visibility modifier (e.g. 'shared public ...').",
                                    eLine: tok ? tok.line : null,
                                    eCol: tok ? tok.col : null
                                });
                            }
                            innerAccess = 'public';
                        }

                        if (this.match('IVAR', 'ICONST')) {
                            let decl = this.parseVarDeclaration();
                            if (decl.type === 'MultiVarDeclar') {
                                for (let d of decl.declarations) {
                                    sharedFields.push({ ...d, access: innerAccess, isShared: true });
                                }
                            } else {
                                sharedFields.push({ ...decl, access: innerAccess, isShared: true });
                            }
                            this.consume('SEMICOLON', "Missing semicolon ';' after shared field declaration.");
                        } else if (this.match('FUNCTION')) {
                            let method = this.parseFunctionDeclaration(false);
                            sharedMethods.push({ ...method, access: innerAccess, isShared: true });
                        } else {
                            let tok = this.peek();
                            printErr({
                                eName: 'SyntaxError',
                                eContext: `Unexpected token '${tok ? tok.value : 'EOF'}' inside 'shared' block of class '${className}'.`,
                                eLine: tok ? tok.line : null,
                                eCol: tok ? tok.col : null
                            });
                        }
                    }
                    this.consume('END', "Expected 'end' to close 'shared' block.");
                    continue;
                } else {
                    isShared = true;
                    if (this.match('PRIVATE')) {
                        access = 'private';
                    } else if (this.match('PROTECTED')) {
                        access = 'protected';
                    } else if (this.match('ISOLATED')) {
                        access = 'isolated';
                    } else if (this.match('EXCLUSIVE')) {
                        access = 'exclusive';
                    } else if (this.match('PUBLIC')) {
                        access = 'public';
                    }
                }
            } else if (this.match('PRIVATE')) {
                if (this.check('SHARED')) {
                    let tok = this.peek();
                    printErr({
                        eName: 'SyntaxError',
                        eContext: "'shared' modifier must be placed before the visibility modifier (e.g. 'shared private ...').",
                        eLine: tok ? tok.line : null,
                        eCol: tok ? tok.col : null
                    });
                }
                access = 'private';
            } else if (this.match('PROTECTED')) {
                if (this.check('SHARED')) {
                    let tok = this.peek();
                    printErr({
                        eName: 'SyntaxError',
                        eContext: "'shared' modifier must be placed before the visibility modifier (e.g. 'shared protected ...').",
                        eLine: tok ? tok.line : null,
                        eCol: tok ? tok.col : null
                    });
                }
                access = 'protected';
            } else if (this.match('ISOLATED')) {
                if (this.check('SHARED')) {
                    let tok = this.peek();
                    printErr({
                        eName: 'SyntaxError',
                        eContext: "'shared' modifier must be placed before the visibility modifier (e.g. 'shared isolated ...').",
                        eLine: tok ? tok.line : null,
                        eCol: tok ? tok.col : null
                    });
                }
                access = 'isolated';
            } else if (this.match('EXCLUSIVE')) {
                if (this.check('SHARED')) {
                    let tok = this.peek();
                    printErr({
                        eName: 'SyntaxError',
                        eContext: "'shared' modifier must be placed before the visibility modifier (e.g. 'shared exclusive ...').",
                        eLine: tok ? tok.line : null,
                        eCol: tok ? tok.col : null
                    });
                }
                access = 'exclusive';
            } else if (this.match('PUBLIC')) {
                if (this.check('SHARED')) {
                    let tok = this.peek();
                    printErr({
                        eName: 'SyntaxError',
                        eContext: "'shared' modifier must be placed before the visibility modifier (e.g. 'shared public ...').",
                        eLine: tok ? tok.line : null,
                        eCol: tok ? tok.col : null
                    });
                }
                access = 'public';
            }

            if (this.match('IVAR', 'ICONST')) {
                let decl = this.parseVarDeclaration();
                const targetFields = isShared ? sharedFields : fields;
                if (decl.type === 'MultiVarDeclar') {
                    for (let d of decl.declarations) {
                        targetFields.push({ ...d, access, isShared });
                    }
                } else {
                    targetFields.push({ ...decl, access, isShared });
                }
                this.consume('SEMICOLON', "Missing semicolon ';' after field declaration in class.");
            } else if (this.match('FUNCTION')) {
                let method = this.parseFunctionDeclaration(false);
                const targetMethods = isShared ? sharedMethods : methods;
                targetMethods.push({ ...method, access, isShared });
            } else {
                let tok = this.peek();
                printErr({
                    eName: 'SyntaxError',
                    eContext: `Unexpected token '${tok ? tok.value : 'EOF'}' inside class '${className}'. Expected field or method declaration.`,
                    eLine: tok ? tok.line : null,
                    eCol: tok ? tok.col : null
                });
            }
        }

        this.consume('END', `Expected 'end' to close class '${className}' block.`);

        return { fields, methods, sharedFields, sharedMethods };
    }

    parseClassDeclaration() {
        let startToken = this.previous();
        let className = this.consume('IDENTIFIER', "Expected class name after 'class'.").value;
        
        let superClass = null;
        if (this.match('FROM')) {
            superClass = this.parseDottedIdentifier(`Expected superclass name after 'from' in class '${className}'.`);
        }

        this.consume('THEN', `Expected 'then' after class declaration '${className}'.`);

        let { fields, methods, sharedFields, sharedMethods } = this.parseClassBody(className);

        return {
            type: 'ClassDeclaration',
            name: className,
            superClass,
            fields,
            methods,
            sharedFields,
            sharedMethods,
            line: startToken.line,
            col: startToken.col
        };
    }

    parseEnumDeclaration() {
        let startToken = this.previous();
        let enumName = this.consume('IDENTIFIER', "Expected enum name after 'enum'.").value;
        this.consume('THEN', `Expected 'then' after enum declaration '${enumName}'.`);

        let members = [];
        while (!this.check('END') && !this.isAtEnd()) {
            let memberToken = this.consume('IDENTIFIER', `Expected enum member name in '${enumName}'.`);

            if (members.some(m => m.name === memberToken.value)) {
                printErr({
                    eName: 'SyntaxError',
                    eContext: `Duplicate enum member '${memberToken.value}' in enum '${enumName}'.`,
                    eLine: memberToken.line,
                    eCol: memberToken.col
                });
            }

            let valueExpr = null;
            if (this.match('ASSIGN')) {
                valueExpr = this.parseLogicOr();
            }

            members.push({
                name: memberToken.value,
                value: valueExpr,
                line: memberToken.line,
                col: memberToken.col
            });

            if (!this.match('COMMA')) {
                break;
            }
        }

        this.consume('END', `Expected 'end' to close enum '${enumName}' block.`);

        return {
            type: 'EnumDeclaration',
            name: enumName,
            members,
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
