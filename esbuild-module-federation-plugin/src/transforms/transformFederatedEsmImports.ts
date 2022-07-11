import traverse from "@babel/traverse";
import t from "@babel/types";
import { replaceNode } from "../utils/astUtils";
import { FEDERATED_MODULE_RE, SHARED_SCOPE_MODULE_NAME } from "../const";
import { convertImportDeclarations } from "../utils/astUtils";

export const TransformFederatedEsmImports = () => {
  const sideEffects = {
    hasFederatedImports: false,
  };

  const visitor = {
    ImportDeclaration(path) {
      const node = path.node;
      const moduleName = path.node.source.value;

      if (!FEDERATED_MODULE_RE.test(moduleName)) {
        return;
      }

      sideEffects.hasFederatedImports = true;

      const getModuleCall = createGetModuleCall(moduleName);
      const newNode = convertImportDeclarations(node, getModuleCall);

      replaceNode(node, newNode);
    },
    Import(path) {
      const moduleName = path.parent.arguments[0].value;

      if (FEDERATED_MODULE_RE.test(moduleName)) {
        sideEffects.hasFederatedImports = true;

        const newNode = createDynamicImport(moduleName);

        replaceNode(path.parent, newNode);
      }
    },
  };

  return {
    visitor,
    sideEffects,
  };
};

export function transformFederatedEsmImports(ast, relativeChunkPath) {
  const { visitor, sideEffects } = TransformFederatedEsmImports();

  traverse(ast, visitor);

  if (sideEffects.hasFederatedImports) {
    ast.program.body.unshift(createSharedScopeImport(relativeChunkPath));
  }

  return ast;
}

function createGetModuleCall(moduleName) {
  return t.callExpression(t.identifier("getModule"), [
    t.stringLiteral(moduleName),
  ]);
}

export function createSharedScopeImport(relativeChunkPath = ".") {
  return t.importDeclaration(
    [
      t.importSpecifier(t.identifier("getModule"), t.identifier("getModule")),
      t.importSpecifier(
        t.identifier("getModuleAsync"),
        t.identifier("getModuleAsync")
      ),
    ],
    t.stringLiteral(`${relativeChunkPath}/${SHARED_SCOPE_MODULE_NAME}.js`)
  );
}

function createDynamicImport(moduleName) {
  return t.callExpression(t.identifier("getModuleAsync"), [
    t.stringLiteral(moduleName),
  ]);
}
