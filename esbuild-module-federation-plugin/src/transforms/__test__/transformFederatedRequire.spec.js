import { join } from "path";
import { readFile } from "fs/promises";
import { buildFixture } from "../../utils/testUtils";
import { esbuildModuleFederationPlugin } from "../../esbuildModuleFederationPlugin";
import { processRequireCallPlugin } from "../../parts/requireCall";

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

describe("simpleRequireTransform", () => {
  it("overrides __require function", async () => {
    const finalEsbuildOptions = {
      ...esbuildOptions,
      plugins: [processRequireCallPlugin()],
    };

    const out = await buildFixture(
      "simpleRequireTransform",
      finalEsbuildOptions
    );

    await Promise.all([
      readFile(join(out, "app1.js"), "utf-8"),
      readFile(join(out, "app2.js"), "utf-8"),
      readFile(join(out, "chunks/chunk-JQ36GDTN.js"), "utf-8"),
      readFile(join(out, "chunks/chunk-RXKJD7WX.js"), "utf-8"),
    ]).then(([f1, f2, f3, f4]) => {
      expect(f1).toMatchSnapshot();
      expect(f2).toMatchSnapshot();
      expect(f3).toMatchSnapshot();
      expect(f4).toMatchSnapshot();
    });
  });

  it("overrides __require function in minified code", async () => {
    const finalEsbuildOptions = {
      ...esbuildOptions,
      minify: true,
      plugins: [processRequireCallPlugin()],
    };

    const out = await buildFixture(
      "simpleRequireTransform",
      finalEsbuildOptions,
      "out-minified"
    );

    await Promise.all([
      readFile(join(out, "app1.js"), "utf-8"),
      readFile(join(out, "app2.js"), "utf-8"),
      readFile(join(out, "chunks/chunk-M7TSN5LG.js"), "utf-8"),
      readFile(join(out, "chunks/chunk-HCA46YCB.js"), "utf-8"),
    ]).then(([f1, f2, f3, f4]) => {
      expect(f1).toMatchSnapshot();
      expect(f2).toMatchSnapshot();
      expect(f3).toMatchSnapshot();
      expect(f4).toMatchSnapshot();
    });
  });

  it("overrides __require function in node build", async () => {
    const esbuildOptions = {
      entryPoints: {
        server: "server.jsx",
      },
      bundle: true,
      write: true,
      minify: false,
      splitting: false,
      platform: "node",
      format: "cjs",
      plugins: [
        esbuildModuleFederationPlugin({
          remotes: {
            remoteModule: "remote@somewhere",
          },
          shared: ["react", "react-dom"],
        }),
      ],
    };

    const out = await buildFixture(
      "requireWithFederatedRemote",
      esbuildOptions,
      "out-node"
    );

    await Promise.all([
      readFile(join(out, "server.js"), "utf-8"),
      readFile(join(out, "federation-shared.js"), "utf-8"),
    ]).then(([f1, f2]) => {
      expect(f1).toMatchSnapshot();
      expect(f2).toMatchSnapshot();
    });
  });
});
