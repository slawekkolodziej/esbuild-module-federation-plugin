import t, { ObjectPattern, PatternLike } from "@babel/types";
import { ImportSpecifiers, extractImportSpecifiers } from "../utils/astUtils";

type LazyImportDeclarations = {
  arrayPatternElements: PatternLike[];
  variableDeclarators: any[];
};

export type ImportSpecifiersGroup = {
  defaultImports: Set<string>;
  namedImports: ImportSpecifiers["namedImports"];
};

export type ImportDeclarationDetails = Map<string, ImportSpecifiersGroup>;
export type UniqueNames = {
  mainFnName: string;
  loadFnName: string;
};
export function transformImportDeclarations(
  ast,
  { mainFnName, loadFnName }: UniqueNames
) {
  const groupedImportDeclarationDetails = new Map<
    string,
    ImportSpecifiersGroup
  >();

  const rootNodes = ast.program.body.reduce((acc, node) => {
    if (t.isImportDeclaration(node)) {
      const source = node.source.value;
      const specifiers = extractImportSpecifiers(node);

      addImportSpecifiersToGroup(
        groupedImportDeclarationDetails,
        specifiers,
        source
      );
    } else {
      acc.push(node);
    }
    return acc;
  }, []);

  const importSources = Array.from(groupedImportDeclarationDetails.keys());
  const groupedImportSpecifiers = Array.from(
    groupedImportDeclarationDetails.values()
  );

  const { arrayPatternElements, variableDeclarators } =
    groupedImportSpecifiers.reduce<LazyImportDeclarations>(
      (
        acc,
        {
          defaultImports: [defaultImport, ...additionalDefaultImports],
          namedImports,
        }
      ) => {
        if (defaultImport) {
          acc.arrayPatternElements.push(t.identifier(defaultImport));

          if (additionalDefaultImports.length > 0) {
            additionalDefaultImports.forEach((additionalDefaultImport) => {
              acc.variableDeclarators.push(
                t.variableDeclarator(
                  t.identifier(additionalDefaultImport),
                  t.identifier(defaultImport)
                )
              );
            });
          }

          if (namedImports) {
            acc.variableDeclarators.push(
              t.variableDeclarator(
                createVariableDeclaratorForNamedImports(namedImports),
                t.identifier(defaultImport)
              )
            );
          }
        } else if (namedImports) {
          acc.arrayPatternElements.push(
            createVariableDeclaratorForNamedImports(namedImports)
          );
        }

        return acc;
      },
      {
        arrayPatternElements: [],
        variableDeclarators: [],
      }
    );

  if (variableDeclarators.length) {
    rootNodes.unshift(t.variableDeclaration("const", variableDeclarators));
  }

  ast.program.body = [
    t.functionDeclaration(
      t.identifier(loadFnName),
      [],
      t.blockStatement([
        t.returnStatement(
          t.callExpression(
            t.memberExpression(
              t.callExpression(
                t.memberExpression(
                  t.identifier("Promise"),
                  t.identifier("all")
                ),
                [
                  t.arrayExpression(
                    importSources.map((importSource) =>
                      t.callExpression(t.import(), [
                        t.stringLiteral(importSource),
                      ])
                    )
                  ),
                ]
              ),
              t.identifier("then")
            ),
            [t.identifier(mainFnName)]
          )
        ),
      ])
    ),
    t.functionDeclaration(
      t.identifier(mainFnName),
      [t.arrayPattern(arrayPatternElements)],
      t.blockStatement(rootNodes)
    ),
    t.callExpression(t.identifier(loadFnName), []),
  ];

  return ast;
}

function addImportSpecifiersToGroup(
  importDeclarationDetails: ImportDeclarationDetails,
  specifiers: ImportSpecifiers,
  source: string
) {
  if (!importDeclarationDetails.has(source)) {
    importDeclarationDetails.set(source, {
      defaultImports: new Set(),
      namedImports: [],
    });
  }

  const specifiersSet = importDeclarationDetails.get(
    source
  ) as ImportSpecifiersGroup;
  if (specifiers.defaultImport) {
    specifiersSet.defaultImports.add(specifiers.defaultImport);
  }
  specifiersSet.namedImports = specifiersSet.namedImports.concat(
    specifiers.namedImports
  );
}

function createVariableDeclaratorForNamedImports(
  namedImports: ImportSpecifiers["namedImports"]
): ObjectPattern {
  return t.objectPattern(
    namedImports.map(({ local, imported }) =>
      t.objectProperty(
        t.identifier(imported),
        t.identifier(local),
        false,
        local === imported
      )
    )
  );
}
