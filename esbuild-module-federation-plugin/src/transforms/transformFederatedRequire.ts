import { dirname, join } from "path";
import { readFile, writeFile } from "fs/promises";
import { FEDERATED_MODULE_RE_STR } from "../const";
import t from "@babel/types";
import { astToCode, codeToAst } from "../utils/astUtils";
import { createSharedScopeImport } from "./transformFederatedEsmImports";

type TransformFederatedRequireRetVal = {
  remoteEntryCode: string;
  requireMockCode: string;
  requireMockChunk: string;
  requireNamedExport: string;
};

async function transformFederatedRequire(
  remoteEntryPath
): Promise<TransformFederatedRequireRetVal> {
  const buildRoot = dirname(remoteEntryPath);
  const remoteEntryCode = await readFile(remoteEntryPath, "utf-8");
  const [ast, requireMockChunkDetails] = locateRequireChunk(
    codeToAst(remoteEntryCode)
  );

  const requireChunkPath = join(
    buildRoot,
    requireMockChunkDetails.requireMockChunk
  );
  const updatedRemoteEntryCode = astToCode(ast);
  const [requireMockCode] = await Promise.all([
    readFile(requireChunkPath, "utf-8"),
    writeFile(remoteEntryPath, updatedRemoteEntryCode),
  ]);

  const finalAst = alterGlobalRequire(
    codeToAst(requireMockCode),
    requireMockChunkDetails.requireNamedExport
  );
  const updatedRequireMockCode = astToCode(finalAst);

  await writeFile(requireChunkPath, updatedRequireMockCode);

  return {
    remoteEntryCode: updatedRemoteEntryCode,
    requireMockCode: updatedRequireMockCode,
    ...requireMockChunkDetails,
  };
}

type LocateRequireChunkRetVal = [
  ast: unknown,
  requireMockChunkDetails: {
    requireMockChunk: string;
    requireNamedExport: string;
  }
];

function locateRequireChunk(ast): LocateRequireChunkRetVal {
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

function alterGlobalRequire(ast, namedExport) {
  const namedExportDecl = ast.program.body.find((node) =>
    t.isExportNamedDeclaration(node)
  );

  if (!namedExportDecl) {
    throw new Error("Could not find named exports node.");
  }

  const requireMockExportSpecifier = namedExportDecl.specifiers.find(
    (specifier) => specifier.exported.name === namedExport
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

  return ast;
}

export { locateRequireChunk, transformFederatedRequire };
