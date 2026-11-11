// ============================================================================
// Kuroba Lexer: Token Definitions, Keywords & Predicates
// ============================================================================

const KEYWORDS = {
  TRUE: { type: "BOOL", value: true },
  FALSE: { type: "BOOL", value: false },
  NULL: { type: "NULL", value: null },
  paste: { type: "PASTE", value: "paste" },
  pasteLn: { type: "PASTELN", value: "pasteLn" },
  copy: { type: "COPY", value: "copy" },
  copyKey: { type: "COPYKEY", value: "copyKey" },
  ivar: { type: "IVAR", value: "ivar" },
  iconst: { type: "ICONST", value: "iconst" },
  if: { type: "IF", value: "if" },
  then: { type: "THEN", value: "then" },
  elif: { type: "ELIF", value: "elif" },
  else: { type: "ELSE", value: "else" },
  end: { type: "END", value: "end" },
  for: { type: "FOR", value: "for" },
  while: { type: "WHILE", value: "while" },
  given: { type: "GIVEN", value: "given" },
  do: { type: "DO", value: "do" },
  in: { type: "IN", value: "in" },
  case: { type: "CASE", value: "case" },
  break: { type: "BREAK", value: "break" },
  skip: { type: "SKIP", value: "skip" },
  clear: { type: "CLEAR", value: "clear" },
  exit: { type: "EXIT", value: "exit" },
  kill: { type: "KILL", value: "kill" },
  throw: { type: "THROW", value: "throw" },
  function: { type: "FUNCTION", value: "function" },
  return: { type: "RETURN", value: "return" },
  hook: { type: "HOOK", value: "hook" },
  this: { type: "THIS", value: "this" },
  import: { type: "IMPORT", value: "import" },
  alias: { type: "ALIAS", value: "alias" },
  namespace: { type: "NAMESPACE", value: "namespace" },
  try: { type: "TRY", value: "try" },
  catch: { type: "CATCH", value: "catch" },
  finally: { type: "FINALLY", value: "finally" },
  is: { type: "IS", value: "is" }
};

const SYMBOLS = {
  ";": "SEMICOLON",
  "+": "PLUS",
  "-": "MINUS",
  "*": "MULT",
  "/": "DIVIDE",
  "(": "LPAREN",
  ")": "RPAREN",
  ":": "COLON",
  "%": "MODULO",
  "[": "LBRACKET",
  "]": "RBRACKET",
  ",": "COMMA",
  ".": "DOT",
  "{": "LBRACE",
  "}": "RBRACE"
};

const isDigit = (c) => c >= "0" && c <= "9";
const isLetter = (c) =>
  (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
const isIdentChar = (c) => isLetter(c) || isDigit(c);

module.exports = { KEYWORDS, SYMBOLS, isDigit, isLetter, isIdentChar };
