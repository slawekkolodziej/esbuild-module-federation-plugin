import { readFile, writeFile } from "fs/promises";
import { transformImportDeclarations } from "../transforms/transformImportDeclarations";
import { transformFederatedEsmImports } from "../transforms/transformFederatedEsmImports";
import { transformAddInitSharingCall } from "../transforms/transformAddInitSharingCall";
import { astToCode, codeToAst } from "../utils/astUtils";
import { getRelativePath, generateUniqueIdentifier } from "../utils/buildUtils";

export function processEntryPoints(build) {
  const outDir = build.initialOptions.outdir || "";
  const entryPoints = Object.entries<string>(build.initialOptions.entryPoints);
  const files = entryPoints.map(([out, _]) => {
    return [outDir, `${out}.js`].filter(Boolean).join("/");
  });

  return {
    hasEntryPoints: files.length > 0,
    isEntryPoint: (filePath) => files.includes(getRelativePath(filePath)),
    onEnd: () => {
      return Promise.all(
        files.map(async (file) => {
          const code = await readFile(file, "utf-8");
          const ast = codeToAst(code);

          const mainFnName = generateUniqueIdentifier(code, "mainFn");
          const loadFnName = generateUniqueIdentifier(code, "loadDepsFn");

          const modifiedAst = transformAddInitSharingCall(
            transformFederatedEsmImports(
              transformImportDeclarations(ast, {
                mainFnName,
                loadFnName,
              })
            ),
            {
              loadFnName,
            }
          );
          // minify!
          await writeFile(file, astToCode(modifiedAst));
        })
      );
    },
  };
}
