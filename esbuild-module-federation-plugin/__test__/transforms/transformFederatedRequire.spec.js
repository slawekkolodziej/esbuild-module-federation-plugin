import path from "path";
import { readFileSync } from "fs";
import { transformFederatedRequire } from "../../src/transforms/transformFederatedRequire";
import { buildFixture } from "../../src/utils/testUtils";
import { codeToAst, astToCode } from "../../src/utils/astUtils";

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
  const ast = codeToAst(code);
  const transform = transformFederatedRequire(ast);
  const newCode = astToCode(ast);

  return {
    transform,
    code: newCode,
  };
}

describe("transformFederatedRequire", () => {
  it("does the thing", async () => {
    const out = await buildFixture("transformFederatedRequire", esbuildOptions);

    transformFederatedRequire(path.join(out, "app1.js"));
  });
});
