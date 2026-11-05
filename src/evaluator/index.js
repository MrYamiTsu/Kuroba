const { printErr } = require('../errors');
const { createScope } = require('./scope');

function evaluate(node, env = createScope()) {
    if (!node || !node.type) return node;

    switch (node.type) {
        case 'Program':
            for (let stmt of node.body) evaluate(stmt, env);
            return;
        case 'Literal':             return node.value;
        case 'VarDeclar':           return evalVarDeclar(node, env);
        case 'VarAssign':           return evalVarAssign(node, env);
        case 'Variable':            return evalVariable(node, env);
        case 'VarRetype':           return evalVarRetype(node, env);
        case 'SwapStatement':       return evalSwap(node, env);
        case 'IfStatement':         return evalIf(node, env);
        case 'ForStatement':        return evalFor(node, env);
        case 'WhileStatement':      return evalWhile(node, env);
        case 'DoWhileStatement':    return evalDoWhile(node, env);
        case 'GivenStatement':      return evalGiven(node, env);
        case 'ForInStatement':      return evalForIn(node, env);
        case 'BreakStatement':      return { isBreak: true };
        case 'SkipStatement':       return { isSkip: true };
        case 'PasteStatement':      return evalPaste(node, env);
        case 'CopyExpression':      return evalCopy(node, env);
        case 'ClearStatement':      return evalClear(node, env);
        case 'ExitStatement':       return evalExit(node, env);
        case 'MathExpression':      return evalMath(node, env);
        case 'UnaryExpression':     return evalUnary(node, env);
        case 'LogicalExpression':   return evalLogical(node, env);
        case 'ListLiteral':         return evalListLiteral(node, env);
        case 'IndexAccess':         return evalIndexAccess(node, env);
        case 'IndexAssign':         return evalIndexAssign(node, env);
        case 'PropertyAssign':      return evalPropertyAssign(node, env);
        case 'MethodCall':          return evalMethodCall(node, env);
        case 'TableLiteral':        return evalTableLiteral(node, env);
        case 'KillStatement':       return evalKill(node, env);
        case 'FunctionDeclaration': return evalFunctionDeclaration(node, env);
        case 'ReturnStatement':     return evalReturn(node, env);
        case 'CallExpression':      return evalCall(node, env);
        case 'HookStatement':       return evalHook(node, env);
        case 'ImportStatement':     return evalImport(node, env);
        default:
            printErr(`[RuntimeError] Unknown AST node type '${node.type}'.`);
    }
}

module.exports = { evaluate };

const { evalVarDeclar, evalVarAssign, evalVariable, evalVarRetype, evalSwap, evalKill } = require('./variables');
const { evalListLiteral, evalIndexAccess, evalIndexAssign, evalPropertyAssign, evalMethodCall, evalTableLiteral } = require('./collections');
const { evalIf, evalFor, evalWhile, evalDoWhile, evalGiven, evalForIn } = require('./control');
const { evalPaste, evalCopy, evalClear, evalExit } = require('./io');
const { evalMath, evalUnary, evalLogical } = require('./operations');
const { evalFunctionDeclaration, evalReturn, evalCall, evalHook } = require('./functions');
const { evalImport } = require('./packages');