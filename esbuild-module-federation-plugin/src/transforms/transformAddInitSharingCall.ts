import t, { ImportDeclaration } from "@babel/types";
import { replaceNode } from "../utils/astUtils";
import { SHARED_SCOPE_MODULE_NAME } from "../const";
import { isCallExpression } from "typescript";

export function transformAddInitSharingCall(
  ast,
  { loadFnName }: { [key: string]: string }
) {
  const sharedScopeImportIndex = ast.program.body.findIndex(
    (node) =>
      t.isImportDeclaration(node) &&
      node.source.value === `./${SHARED_SCOPE_MODULE_NAME}.js`
  );

  if (sharedScopeImportIndex === -1) {
    throw new Error("Could not find shared scope chunk import declaration!");
  }

  const sharedScopeImport: ImportDeclaration =
    ast.program.body[sharedScopeImportIndex];

  // Add initSharing to existing import declaration
  sharedScopeImport.specifiers.push(
    t.importSpecifier(t.identifier("initSharing"), t.identifier("initSharing"))
  );

  const loadFnCallExpression = ast.program.body.find((node) => {
    if (t.isCallExpression(node)) {
      return isLoadFnExpression(loadFnName, node);
    } else if (t.isExpressionStatement(node)) {
      return isLoadFnExpression(loadFnName, node.expression);
    }
  });

  const initSharingCall = t.callExpression(
    t.memberExpression(
      t.callExpression(t.identifier("initSharing"), []),
      t.identifier("then")
    ),
    [t.identifier(loadFnName)]
  );

  replaceNode(loadFnCallExpression, initSharingCall);

  return ast;
}

function isLoadFnExpression(loadFnName, node) {
  return (
    t.isCallExpression(node) &&
    t.isIdentifier(node.callee) &&
    node.callee.name === loadFnName
  );
}
