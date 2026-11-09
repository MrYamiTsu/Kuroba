const { ParserCursor } = require('./cursor');

class ParserTypes extends ParserCursor {
    parseType() {
        let isNullable = true;
        let baseType = null;
        let elemType = null;
        let isElemNullable = true;

        if (this.match('LPAREN')) {
            isNullable = false;
            baseType = this.consume('IDENTIFIER', "Expected type identifier inside '(...)'. (e.g. String, Int, List)").value;
            
            if ((baseType === 'List' || baseType === 'Stack' || baseType === 'Queue') && this.match('LESS')) {
                isElemNullable = false;

                if (this.match('LPAREN')) {
                    elemType = this.consume('IDENTIFIER', "Expected element type inside 'List<(...)>'.").value;
                    this.consume('RPAREN', "Expected closing ')' after element type.");
                } else {
                    elemType = this.consume('IDENTIFIER', "Expected element type inside 'List<...>'.").value;
                }

                this.consume('GREATER', "Expected closing '>' after List type.");
            }

            this.consume('RPAREN', "Expected closing ')' after non-nullable type.");
        } else {
            baseType = this.consume('IDENTIFIER', "Expected type identifier after '~' (e.g. String, Int, List).").value;

            if ((baseType === 'List' || baseType === 'Stack' || baseType === 'Queue') && this.match('LESS')) {
                if (this.match('LPAREN')) {
                    isElemNullable = false;
                    elemType = this.consume('IDENTIFIER', "Expected element type inside 'List<(...)>'.").value;
                    this.consume('RPAREN', "Expected closing ')' after element type.");
                } else {
                    isElemNullable = true;
                    elemType = this.consume('IDENTIFIER', "Expected element type inside 'List<...>'.").value;
                }

                this.consume('GREATER', "Expected closing '>' after List type.");
            }
        }

        return { baseType, isNullable, elemType, isElemNullable };
    }
}

module.exports = { ParserTypes };
