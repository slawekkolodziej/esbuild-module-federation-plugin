import babelParser from "@babel/parser";
import generate, { GeneratorResult } from "@babel/generator";

export function codeToAst(code: string) {
  return babelParser.parse(code, {
    sourceType: "module",
    plugins: ["jsx"],
  });
}

export function astToCode(ast): GeneratorResult {
  return generate(ast).code;
}