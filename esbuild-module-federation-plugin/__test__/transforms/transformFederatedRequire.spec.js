import path from "path";
import { readFileSync } from "fs";
import babelParser from "@babel/parser";
import generate from "@babel/generator";
import { transformFederatedRequire } from "../../src/transforms/transformFederatedRequire";
import { buildFixture } from "../../src/utils/testUtils";

const esbuildOptions = {
  entryPoints: {
    app1: "app1.jsx",
    app2: "app2.jsx",
  },
  bundle: true,
  chunkNames: "chunks/[name]-[hash]",
  format: "esm",
  minify: false,
  splitting: true,
  write: true,
};

function transformCode(code) {
  const ast = babelParser.parse(code, {
    sourceType: "module",
  });

  const transform = transformFederatedRequire(ast);
  const newCode = generate(ast, {
    sourceType: "module",
  });

  return {
    transform,
    code: newCode,
  };
}

describe("transformFederatedRequire", () => {
  it("does the thing", async () => {
    const out = await buildFixture("transformFederatedRequire", esbuildOptions);

    const { transform, code } = transformCode(
      readFileSync(path.join(out, "app1.js"), "utf-8")
    );
  });
});
