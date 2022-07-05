const { Visitor } = require("@swc/core/Visitor");
const { FEDERATED_MODULE_RE, SHARED_SCOPE_MODULE_NAME } = require("../const");
const st = require("../utils/swcUtils");

class TransformFederatedImports extends Visitor {
  constructor() {
    super();
    this.hasFederatedImports = false;
  }

  visitImportDeclaration(node) {
    const moduleName = node.source.value;

    if (!FEDERATED_MODULE_RE.test(moduleName)) {
      return node;
    }

    this.hasFederatedImports = true;

    const { defaultImport, namedImports } = node.specifiers.reduce(
      (acc, specifier) => {
        if (st.isImportDefaultSpecifier(specifier)) {
          acc.defaultImport = specifier.local.value;
        } else {
          const imported = specifier.imported || specifier.local;

          acc.namedImports.push({
            imported: imported.value,
            local: specifier.local.value,
          });
        }
        return acc;
      },
      { defaultImport: null, namedImports: [] }
    );

    const getModuleCall = createGetModuleCall(moduleName);

    return st.variableDeclaration(
      "const",
      [
        createDeclaratorForDefaultImport(defaultImport, getModuleCall),
        createDeclaratorForNamedImports(
          namedImports,
          defaultImport,
          getModuleCall
        ),
      ].filter(Boolean)
    );
  }
  visitCallee(node) {
    if (
      node.type === "MemberExpression" &&
      node.object.type === "CallExpression" &&
      node.object.callee.type === "Import"
    ) {
      const moduleName = node.object.arguments[0]?.expression.value;

      if (!FEDERATED_MODULE_RE.test(moduleName)) {
        return node;
      }

      this.hasFederatedImports = true;
      node.object.callee = st.identifier("getModuleAsync");
      // } else if (node.type === 'Import') {
      // console.log(node)
    }
    return node;
  }
}

function transformFederatedImports(ast) {
  const transformer = new TransformFederatedImports();
  const modifiedAst = transformer.visitProgram(ast);

  if (transformer.hasFederatedImports) {
    modifiedAst.body.unshift(createSharedScopeImport());
  }

  return modifiedAst;
}

function createGetModuleCall(moduleName) {
  return st.callExpression(st.identifier("getModule"), [
    st.expression(st.stringLiteral(moduleName)),
  ]);
}

function createDeclaratorForDefaultImport(defaultImportName, getModuleCall) {
  if (!defaultImportName) {
    return null;
  }

  return st.variableDeclarator(st.identifier(defaultImportName), getModuleCall);
}

function createDeclaratorForNamedImports(
  namedImports,
  defaultImportName,
  getModuleCall
) {
  if (namedImports.length === 0) {
    return null;
  }

  return st.variableDeclarator(
    st.objectPattern(
      namedImports.map(({ imported, local }) =>
        imported === local
          ? st.assignmentPatternProperty(st.identifier(imported))
          : st.keyValuePatternProperty(
              st.identifier(imported),
              st.identifier(local)
            )
      )
    ),
    defaultImportName ? st.identifier(defaultImportName) : getModuleCall
  );
}

function createSharedScopeImport() {
  return st.importDeclaration(
    [
      st.importSpecifier(
        st.identifier("getModule"),
        st.identifier("getModule")
      ),
      st.importSpecifier(
        st.identifier("getModuleAsync"),
        st.identifier("getModuleAsync")
      ),
    ],
    st.stringLiteral(`../${SHARED_SCOPE_MODULE_NAME}.js`)
  );
}

module.exports = {
  transformFederatedImports,
  TransformFederatedImports,
};
