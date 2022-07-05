import t from "@babel/types";

function createSpan() {
  return {
    start: 0,
    end: 0,
    ctxt: 0,
  };
}

function babelToSwc(fn) {
  return (...args) => {
    const node = fn(...args);

    return {
      ...node,
      span: createSpan(),
    };
  };
}

const arrowFunctionExpression = babelToSwc(t.arrowFunctionExpression);
const blockStatement = babelToSwc(t.blockStatement);
const callExpression = babelToSwc(t.callExpression);
const identifier = (name) => ({
  type: "Identifier",
  value: name,
  span: createSpan(),
});
const expression = (expression) => ({
  type: "Expression",
  expression,
  spread: null,
});
const ifStatement = babelToSwc(t.ifStatement);
const importDeclaration = babelToSwc(t.importDeclaration);
const importSpecifier = babelToSwc(t.importSpecifier);
const memberExpression = babelToSwc(t.memberExpression);
const objectProperty = babelToSwc(t.objectProperty);
const regExpLiteral = babelToSwc(t.regExpLiteral);
const returnStatement = babelToSwc(t.returnStatement);
const stringLiteral = babelToSwc(t.stringLiteral);
const variableDeclaration = babelToSwc(t.variableDeclaration);
const variableDeclarator = babelToSwc(t.variableDeclarator);

const isExportNamedDeclaration = t.isExportNamedDeclaration;
const isExpressionStatement = t.isExpressionStatement;
const isImportDefaultSpecifier = t.isImportDefaultSpecifier;
const isVariableDeclaration = t.isVariableDeclaration;

const objectPattern = (properties) => ({
  type: "ObjectPattern",
  properties,
  span: createSpan(),
  optional: false,
});

const assignmentPatternProperty = (key) => ({
  type: "AssignmentPatternProperty",
  key,
  value: null,
  span: createSpan(),
  optional: false,
});

const keyValuePatternProperty = (key, value) => ({
  type: "KeyValuePatternProperty",
  key,
  value,
  span: createSpan(),
});

export {
  arrowFunctionExpression,
  blockStatement,
  callExpression,
  expression,
  identifier,
  ifStatement,
  importDeclaration,
  importSpecifier,
  memberExpression,
  objectPattern,
  objectProperty,
  assignmentPatternProperty,
  keyValuePatternProperty,
  regExpLiteral,
  returnStatement,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
  isExportNamedDeclaration,
  isExpressionStatement,
  isImportDefaultSpecifier,
  isVariableDeclaration,
};
