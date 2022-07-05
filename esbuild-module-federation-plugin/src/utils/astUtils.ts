import babelParser from "@babel/parser";
import generate from "@babel/generator";

export function codeToAst(code: string) {
  return babelParser.parse(code, {
    sourceType: "module",
    plugins: ["jsx"],
  });
}

export function astToCode(ast): string {
  return generate(ast).code;
}
