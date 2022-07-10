import babelParser from "@babel/parser";
import generate from "@babel/generator";
import t, {
  CallExpression,
  VariableDeclaration,
  ImportDeclaration,
  VariableDeclarator,
} from "@babel/types";

type ImportSpecifiers = {
  defaultImport: string | null;
  namedImports: Array<{ local: string; imported: string }>;
};

type MaybeVariableDeclarator = VariableDeclarator | null;

export function codeToAst(code: string) {
  return babelParser.parse(code, {
    sourceType: "module",
    plugins: ["jsx"],
  });
}

export function astToCode(ast): string {
  return generate(ast).code;
}

export function replaceNode(node, newNode) {
  const currentKeys = Object.keys(node);
  const newKeys = Object.keys(newNode);

  Object.assign(node, newNode);

  currentKeys
    .filter((key) => !newKeys.includes(key))
    .forEach((key) => {
      delete node[key];
    });
}

export function convertImportDeclarations(
  node: ImportDeclaration,
  callExpression: CallExpression
): VariableDeclaration {
  const { defaultImport, namedImports } =
    node.specifiers.reduce<ImportSpecifiers>(
      (acc, specifier) => {
        if (t.isImportDefaultSpecifier(specifier)) {
          acc.defaultImport = specifier.local.name;
        } else if (t.isImportSpecifier(specifier)) {
          acc.namedImports.push({
            imported: t.isStringLiteral(specifier.imported)
              ? specifier.imported.value
              : specifier.imported.name,
            local: specifier.local.name,
          });
        }
        return acc;
      },
      { defaultImport: null, namedImports: [] }
    );

  const newNode = t.variableDeclaration(
    "const",
    [
      createDeclaratorForDefaultImport(defaultImport, callExpression),
      createDeclaratorForNamedImports(
        namedImports,
        defaultImport,
        callExpression
      ),
    ].filter(isVariableDeclarator)
  );

  return newNode;
}

function isVariableDeclarator(
  decl: MaybeVariableDeclarator
): decl is VariableDeclarator {
  return decl !== null;
}

function createDeclaratorForDefaultImport(
  defaultImportName: ImportSpecifiers["defaultImport"],
  callExpression: CallExpression
): MaybeVariableDeclarator {
  if (!defaultImportName) {
    return null;
  }

  return t.variableDeclarator(t.identifier(defaultImportName), callExpression);
}

function createDeclaratorForNamedImports(
  namedImports: ImportSpecifiers["namedImports"],
  defaultImportName: ImportSpecifiers["defaultImport"],
  callExpression: CallExpression
): MaybeVariableDeclarator {
  if (namedImports.length === 0) {
    return null;
  }

  return t.variableDeclarator(
    t.objectPattern(
      namedImports.map(({ imported, local }) =>
        t.objectProperty(
          t.identifier(imported),
          t.identifier(local),
          false,
          imported === local
        )
      )
    ),
    defaultImportName ? t.identifier(defaultImportName) : callExpression
  );
}
