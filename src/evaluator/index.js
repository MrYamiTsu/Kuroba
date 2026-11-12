const { printErr } = require('../errors');
const { createScope } = require('./scope');
const { evalVarDeclar, evalVarAssign, evalVariable, evalVarRetype, evalSwap, evalKill } = require('./variables');
const { evalListLiteral, evalIndexAccess, evalMemberAssign, evalMethodCall } = require('./collections');
const { evalTableLiteral } = require('./tables');
const { evalIf, evalFor, evalWhile, evalDoWhile, evalGiven, evalForIn, evalThrow, evalTry } = require('./control');
const { evalPaste, evalCopy, evalClear, evalExit } = require('./io');
const { evalMath, evalUnary, evalLogical, evalIs } = require('./operations');
const { evalFunctionDeclaration, evalReturn, evalCall, evalHook } = require('./functions');
const { evalImport } = require('./packages');
const { evalClassDeclaration } = require('./classes');

function evaluate(node, env = createScope()) {
    if (!node || !node.type) return node;

    switch (node.type) {
        case 'Program':
            for (let stmt of node.body) evaluate(stmt, env);
            return;
        case 'NamespaceStatement':
            for (const stmt of node.body) {
                let res = evaluate(stmt, env);
                if (res && (res.isReturn || res.isBreak || res.isSkip)) return res;
            }
            return null;
        case 'InterpolatedString': 
            let res = '';
            for (let part of node.parts) {
                let v = evaluate(part, env);
                res += (v === null ? 'null' : String(v));
            }
            return res;
        case 'Literal':             return node.value;
        case 'VarDeclar':           return evalVarDeclar(node, env, evaluate);
        case 'MultiVarDeclar': {
            let lastVal = null;
            for (let decl of node.declarations) {
                lastVal = evalVarDeclar(decl, env, evaluate);
            }
            return lastVal;
        }
        case 'VarAssign':           return evalVarAssign(node, env, evaluate);
        case 'Variable':            return evalVariable(node, env);
        case 'VarRetype':           return evalVarRetype(node, env, evaluate);
        case 'SwapStatement':       return evalSwap(node, env);
        case 'IfStatement':         return evalIf(node, env, evaluate);
        case 'ForStatement':        return evalFor(node, env, evaluate);
        case 'WhileStatement':      return evalWhile(node, env, evaluate);
        case 'DoWhileStatement':    return evalDoWhile(node, env, evaluate);
        case 'GivenStatement':      return evalGiven(node, env, evaluate);
        case 'ForInStatement':      return evalForIn(node, env, evaluate);
        case 'BreakStatement':      return { isBreak: true };
        case 'SkipStatement':       return { isSkip: true };
        case 'PasteStatement':      return evalPaste(node, env, evaluate);
        case 'CopyExpression':      return evalCopy(node, env, evaluate);
        case 'ClearStatement':      return evalClear(node, env, evaluate);
        case 'ExitStatement':       return evalExit(node, env, evaluate);
        case 'ThrowStatement':      return evalThrow(node, env, evaluate);
        case 'TryStatement':        return evalTry(node, env, evaluate);
        case 'MathExpression':      return evalMath(node, env, evaluate);
        case 'UnaryExpression':     return evalUnary(node, env, evaluate);
        case 'LogicalExpression':   return evalLogical(node, env, evaluate);
        case 'IsExpression':        return evalIs(node, env, evaluate);
        case 'ListLiteral':         return evalListLiteral(node, env, evaluate);
        case 'IndexAccess':         return evalIndexAccess(node, env, evaluate);
        case 'MemberAssign':        return evalMemberAssign(node, env, evaluate);
        case 'MethodCall':          return evalMethodCall(node, env, evaluate);
        case 'TableLiteral':        return evalTableLiteral(node, env, evaluate);
        case 'KillStatement':       return evalKill(node, env);
        case 'FunctionDeclaration': return evalFunctionDeclaration(node, env);
        case 'ReturnStatement':     return evalReturn(node, env, evaluate);
        case 'CallExpression':      return evalCall(node, env, evaluate);
        case 'HookStatement':       return evalHook(node, env, evaluate);
        case 'ImportStatement':     return evalImport(node, env, evaluate);
        case 'ClassDeclaration':    return evalClassDeclaration(node, env);
        default:
            printErr(`[RuntimeError] Unknown AST node type '${node.type}'.`);
    }
}

module.exports = { evaluate };