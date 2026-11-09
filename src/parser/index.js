const { ParserStatements } = require('./statements');

function parse(tokens) {
    const parser = new ParserStatements(tokens);
    return parser.parseProgram();
}

module.exports = { parse, Parser: ParserStatements };
