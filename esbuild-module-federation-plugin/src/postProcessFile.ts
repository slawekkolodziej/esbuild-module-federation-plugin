import { astToCode, codeToAst } from "./utils/astUtils";
import babelParser from "@babel/parser";
import t from "@babel/types";
import { FEDERATED_MODULE_RE_STR, SHARED_SCOPE_MODULE_NAME } from "./const";
import { transformFederatedEsmImports } from "./transforms/transformFederatedEsmImports";

function postProcessFile(code) {
  const ast = codeToAst(code);

  transformFederatedEsmImports(ast);

  return astToCode(ast);
}

function createSharedScopeImport() {
  return t.importDeclaration(
    [
      t.importSpecifier(t.identifier("getModule"), t.identifier("getModule")),
      t.importSpecifier(
        t.identifier("getModuleAsync"),
        t.identifier("getModuleAsync")
      ),
    ],
    t.stringLiteral(`../${SHARED_SCOPE_MODULE_NAME}.js`)
  );
}

function alterGlobalRequire(requireMockCode, requireNamedExport) {
  const ast = babelParser.parse(requireMockCode, {
    sourceType: "module",
  });

  const namedExportDecl = ast.program.body.find((node) =>
    t.isExportNamedDeclaration(node)
  );

  if (!namedExportDecl) {
    throw new Error("Could not find named exports node.");
  }

  const requireMockExportSpecifier = namedExportDecl.specifiers.find(
    (specifier) => specifier.exported.name === requireNamedExport
  );

  if (!requireMockExportSpecifier) {
    throw new Error("Could not find named export for require mock.");
  }

  const localName = requireMockExportSpecifier.local.name;
  const isRequireDecl = (node) => node.id.name === localName;
  const requireMockDeclGroup = ast.program.body.find(
    (node) =>
      t.isVariableDeclaration(node) && node.declarations.some(isRequireDecl)
  );
  const requireMockDecl = requireMockDeclGroup.declarations.find(isRequireDecl);

  if (!requireMockDecl) {
    throw new Error("Could not find require mock declaration.");
  }

  // The code below should generate the following syntax:
  // (req => mod => {
  //   if (mod.matches(FEDERATED_MODULE_RE)) {
  //       return getModule(mod);
  //   }
  //   return req(mod);
  // })(/* original syntax for __require would go here */)
  requireMockDecl.init = t.callExpression(
    t.arrowFunctionExpression(
      [t.identifier("req")],
      t.arrowFunctionExpression(
        [t.identifier("mod")],
        t.blockStatement([
          t.ifStatement(
            t.callExpression(
              t.memberExpression(t.identifier("mod"), t.identifier("match")),
              [t.regExpLiteral(FEDERATED_MODULE_RE_STR.replace(/\//g, "\\/"))]
            ),
            t.blockStatement([
              t.returnStatement(
                t.callExpression(t.identifier("getModule"), [
                  t.identifier("mod"),
                ])
              ),
            ])
          ),
          t.returnStatement(
            t.callExpression(t.identifier("req"), [t.identifier("mod")])
          ),
        ])
      )
    ),
    [requireMockDecl.init]
  );

  ast.program.body.unshift(createSharedScopeImport());

  return astToCode(ast);
}

function retrieveGlobalRequireChunk(remoteEntryCode) {
  const ast = codeToAst(remoteEntryCode);

  const iifeArguments = ast.program.body.find((node) =>
    t.isExpressionStatement(node)
  )?.expression.arguments;
  const localRequireName = iifeArguments.slice(-1)[0].name;

  // once we retrieved "require" name, we can delete it from iife
  iifeArguments.splice(1, 1);

  if (!localRequireName) {
    throw new Error('Could not found local "require" mock!');
  }

  const requireMockImportDecl = ast.program.body.find(
    (node) =>
      node.type === "ImportDeclaration" &&
      node.specifiers.some(
        (specifier) => specifier.local.name === localRequireName
      )
  );
  const requireMockChunk = requireMockImportDecl.source.value;

  if (!requireMockChunk) {
    throw new Error('Could not found "require" mock chunk!');
  }

  const requireNamedExport = requireMockImportDecl.specifiers[0].imported.name;

  ast.program.body = ast.program.body.filter(
    (node) => node !== requireMockImportDecl
  );

  return {
    requireMockChunk,
    requireNamedExport,
    remoteEntryCode: astToCode(ast),
  };
}

export { retrieveGlobalRequireChunk, alterGlobalRequire, postProcessFile };
