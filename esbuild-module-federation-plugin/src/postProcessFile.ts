import { astToCode, codeToAst } from "./utils/astUtils";
import { transformFederatedEsmImports } from "./transforms/transformFederatedEsmImports";

export function postProcessFile(code) {
  const ast = codeToAst(code);

  transformFederatedEsmImports(ast);

  return astToCode(ast);
}
