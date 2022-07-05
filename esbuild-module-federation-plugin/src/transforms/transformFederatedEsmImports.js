const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const { FEDERATED_MODULE_RE, SHARED_SCOPE_MODULE_NAME } = require("../const");
const st = require("../utils/swcUtils");

const TransformFederatedEsmImports = () => {
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

      const { defaultImport, namedImports } = node.specifiers.reduce(
        (acc, specifier) => {
          if (t.isImportDefaultSpecifier(specifier)) {
            acc.defaultImport = specifier.local.name;
          } else {
            acc.namedImports.push({
              imported: specifier.imported.name,
              local: specifier.local.name,
            });
          }
          return acc;
        },
        { defaultImport: null, namedImports: [] }
      );

      const getModuleCall = createGetModuleCall(moduleName);
      const newNode = t.variableDeclaration(
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

      replaceNode(path.node, newNode);
    },
    Import(path) {
      const moduleName = path.parent.arguments[0].value;

      if (FEDERATED_MODULE_RE.test(moduleName)) {
        sideEffects.hasFederatedImports = true;

        replaceNode(path.parent, createDynamicImport(moduleName));
      }
    },
  };

  return {
    visitor,
    sideEffects,
  };
};

function transformFederatedEsmImports(ast) {
  const { visitor, sideEffects } = TransformFederatedEsmImports();

  traverse(ast, visitor);

  if (sideEffects.hasFederatedImports) {
    ast.program.body.unshift(createSharedScopeImport());
  }

  return ast;
}

function createGetModuleCall(moduleName) {
  return t.callExpression(t.identifier("getModule"), [
    t.stringLiteral(moduleName),
  ]);
}

function createDeclaratorForDefaultImport(defaultImportName, getModuleCall) {
  if (!defaultImportName) {
    return null;
  }

  return t.variableDeclarator(t.identifier(defaultImportName), getModuleCall);
}

function createDeclaratorForNamedImports(
  namedImports,
  defaultImportName,
  getModuleCall
) {
  if (namedImports.length === 0) {
    return null;
  }

  return t.variableDeclarator(
    st.objectPattern(
      namedImports.map(({ imported, local }) =>
        t.objectProperty(
          t.identifier(imported),
          t.identifier(local),
          false,
          imported === local
        )
      )
    ),
    defaultImportName ? t.identifier(defaultImportName) : getModuleCall
  );
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

function createDynamicImport(moduleName) {
  return t.callExpression(t.identifier("getModuleAsync"), [
    t.stringLiteral(moduleName),
  ]);
}

function replaceNode(node, newNode) {
  const currentKeys = Object.keys(node);
  const newKeys = Object.keys(newNode);

  Object.assign(node, newNode);

  currentKeys
    .filter((key) => !newKeys.includes(key))
    .forEach((key) => {
      delete node[key];
    });
}

module.exports = {
  createSharedScopeImport,
  transformFederatedEsmImports,
  TransformFederatedEsmImports,
};
