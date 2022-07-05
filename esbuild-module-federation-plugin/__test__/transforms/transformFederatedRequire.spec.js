import path from "path";
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

describe("transformFederatedRequire", () => {
  it("does the thing", async () => {
    const out = await buildFixture("transformFederatedRequire", esbuildOptions);

    await transformFederatedRequire(path.join(out, "app1.js"));
  });
});
