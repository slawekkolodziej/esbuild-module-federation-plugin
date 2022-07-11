import { dirname, join } from "path";
import { readFile, writeFile, rm } from "fs/promises";
import t from "@babel/types";
import { SHARED_SCOPE_MODULE_NAME, FEDERATED_MODULE_RE_STR } from "../const";
import { astToCode, codeToAst } from "../utils/astUtils";
import { generateUniqueIdentifier } from "../utils/buildUtils";
import { createSharedScopeImport } from "./transformFederatedEsmImports";

type TransformFederatedRequireRetVal = {
  requireMockCode: string;
  requireMockChunk: string;
  requireNamedExport: string;
};

export async function transformFederatedRequireCjs(
  filePath: string,
  relativeChunkPath = "."
) {
  // const buildRoot = dirname(requireMockPath);
  const code = await readFile(filePath, "utf-8");
  const originalRequireFn = generateUniqueIdentifier(code, "originalRequire");
  const federatedModuleRe = generateUniqueIdentifier(code, "federatedModuleRe");

  const requireMock = /* js */ `
    var Module = require('module');
    var { getModule } = require('${relativeChunkPath}/${SHARED_SCOPE_MODULE_NAME}.js')
    var ${originalRequireFn} = Module.prototype.require;
    var ${federatedModuleRe} = new RegExp(
      '${FEDERATED_MODULE_RE_STR.replace(/\//g, "\\/")})'
    );

    Module.prototype.require = function(mod) {
      if (mod.match(${federatedModuleRe})) {
        return getModule(mod);
      }
      return ${originalRequireFn}.apply(this, arguments);
    };
  `;

  return await writeFile(filePath, [requireMock, code].join("\n"));
}

export async function transformFederatedRequireEsm(
  requireMockPath: string,
  relativeChunkPath = "."
): Promise<TransformFederatedRequireRetVal> {
  const buildRoot = dirname(requireMockPath);
  const code = await readFile(requireMockPath, "utf-8");
  const requireMockChunkDetails = locateRequireChunk(codeToAst(code));
  const requireChunkPath = join(
    buildRoot,
    requireMockChunkDetails.requireMockChunk
  );
  const [requireMockCode] = await Promise.all([
    readFile(requireChunkPath, "utf-8"),
    rm(requireMockPath),
  ]);
  const finalAst = alterGlobalRequire(
    codeToAst(requireMockCode),
    requireMockChunkDetails.requireNamedExport,
    relativeChunkPath
  );
  const updatedRequireMockCode = astToCode(finalAst);

  await writeFile(requireChunkPath, updatedRequireMockCode);

  return {
    requireMockCode: updatedRequireMockCode,
    ...requireMockChunkDetails,
  };
}

type LocateRequireChunkRetVal = {
  requireMockChunk: string;
  requireNamedExport: string;
};

export function locateRequireChunk(ast): LocateRequireChunkRetVal {
  const iife = ast.program.body.find(
    (node) =>
      t.isExpressionStatement(node) &&
      t.isCallExpression(node.expression) &&
      node.expression.arguments.length > 0
  );
  const iifeArguments = iife.expression.arguments;
  const localRequireName = iifeArguments[0].name;

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

  return {
    requireMockChunk,
    requireNamedExport,
  };
}

function alterGlobalRequire(ast, namedExport, relativeChunkPath) {
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

  ast.program.body.unshift(
    createSharedScopeImport(relativeChunkPath, {
      getModule: true,
      getModuleAsync: false,
    })
  );

  return ast;
}
