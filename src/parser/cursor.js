const { printErr } = require('../errors');

const OP_MAP = {
    'PLUSASSIGN': '+',
    'MINUSASSIGN': '-',
    'MULTASSIGN': '*',
    'DIVIDEASSIGN': '/',
    'MODULOASSIGN': '%'
};

class ParserCursor {
    constructor(tokens) {
        this.tokens = tokens;
        this.cursor = 0;
    }

    formatLocation(token) {
        if (!token) return 'at end of file';
        return `Line ${token.line}, Col ${token.col}`;
    }

    peek() {
        return this.tokens[this.cursor];
    }

    previous() {
        return this.tokens[this.cursor - 1];
    }

    isAtEnd() {
        return this.cursor >= this.tokens.length;
    }

    check(type) {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    advance() {
        if (!this.isAtEnd()) this.cursor++;
        return this.previous();
    }

    match(...types) {
        for (let type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    consume(type, message) {
        if (this.check(type)) return this.advance();
        let token = this.peek() || this.previous();
        printErr(`[SyntaxError: ${this.formatLocation(token)}] ${message}`);
    }

    isPropertyAssignAhead() {
        let k = this.cursor;
        
        while (this.tokens[k] && this.tokens[k].type === 'IDENTIFIER' && this.tokens[k + 1] && this.tokens[k + 1].type === 'DOT') {
            k += 2;
        }

        return this.tokens[k] && this.tokens[k].type === 'IDENTIFIER' && this.tokens[k + 1] && [
            'ASSIGN', 'PLUSASSIGN', 'MINUSASSIGN', 'MULTASSIGN', 'DIVIDEASSIGN', 'MODULOASSIGN', 'INCREMENT', 'DECREMENT', 'TILDE'
        ].includes(this.tokens[k + 1].type);
    }
}

module.exports = { ParserCursor, OP_MAP };
