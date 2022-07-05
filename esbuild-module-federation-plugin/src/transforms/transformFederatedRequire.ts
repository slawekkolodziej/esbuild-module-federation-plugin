import babelParser from "@babel/parser";
import generate from "@babel/generator";
import t from "@babel/types";

function transformFederatedRequire(ast) {
  const [astWithoutRequire, { requireMockChunk, requireNamedExport }] =
    locateRequireChunk(ast);

  return astWithoutRequire;
}

function locateRequireChunk(ast) {
  // remote-entry.js contains the code similar to this:
  // import { foo as require } from './chunks/chunk-123.js';
  // (function(self) {
  //   ...
  // }(globalThis, require))
  // esbuild will convert'require' calls to its own __require or a minified
  // version of the name. This code is used to get the variable's name.
  const iifeArguments = ast.program.body.find((node) =>
    t.isExpressionStatement(node)
  )?.expression.arguments;
  const localRequireName = iifeArguments.slice(-1)[0].name;

  if (!localRequireName) {
    throw new Error('Could not found local "require" mock!');
  }

  // Now look for an import statement that declares __require.
  const requireMockImportDecl = ast.program.body.find(
    (node) =>
      node.type === "ImportDeclaration" &&
      node.specifiers.some(
        (specifier) => specifier.local.name === localRequireName
      )
  );
  // Using the import statement we can get chunk name.
  const requireMockChunk = requireMockImportDecl.source.value;

  if (!requireMockChunk) {
    throw new Error('Could not found "require" mock chunk!');
  }

  // Aside from the chunk name, we must get the export name for __require,
  // (it would be 'foo' in the example code above).
  const requireNamedExport = requireMockImportDecl.specifiers[0].imported.name;

  // When we have all of the necessary information, we can remove both - iife's argument
  // and import statement
  iifeArguments.splice(1, 1);
  ast.program.body = ast.program.body.filter(
    (node) => node !== requireMockImportDecl
  );

  return [
    ast,
    {
      requireMockChunk,
      requireNamedExport,
    },
  ];
}

export {
  locateRequireChunk,
  transformFederatedRequire,
};
