import path from "path";
import { promisify } from "util";
import { readFileSync } from "fs";
import rimraf from "rimraf";
import esbuild from "esbuild";
import babelParser from "@babel/parser";
import generate from "@babel/generator";
import { transformFederatedRequire } from "../../src/transforms/transformFederatedRequire";

const emptyDir = promisify(rimraf);

async function buildFixture(fixtureName, options) {
  const src = path.resolve(__dirname, "../../fixtures", fixtureName, "src");
  const outdir = path.resolve(src, "../out");

  await emptyDir(outdir);

  await esbuild.build({
    entryPoints: {
      app1: path.join(src, "app1.jsx"),
      app2: path.join(src, "app2.jsx"),
    },
    outdir,
    bundle: true,
    chunkNames: "chunks/[name]-[hash]",
    format: "esm",
    minify: false,
    splitting: true,
    write: true,
    ...options,
  });

  return outdir;
}

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
    const out = await buildFixture("transformFederatedRequire");

    const { transform, code } = transformCode(
      readFileSync(path.join(out, "app1.js"), "utf-8")
    );

    console.log(transform, code);
  });
});
