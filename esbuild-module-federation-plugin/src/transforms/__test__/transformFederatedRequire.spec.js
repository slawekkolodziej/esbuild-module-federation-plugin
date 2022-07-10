import path from "path";
import { transformFederatedRequire } from "../transformFederatedRequire";
import { buildFixture } from "../../utils/testUtils";

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
  it("properly overrides __require function", async () => {
    const out = await buildFixture("transformFederatedRequire", esbuildOptions);
    const { remoteEntryCode, requireMockCode } =
      await transformFederatedRequire(path.join(out, "app1.js"));

    expect(remoteEntryCode).toMatchSnapshot();
    expect(requireMockCode).toMatchSnapshot();
  });

  it("properly overrides __require function in minified code", async () => {
    const out = await buildFixture(
      "transformFederatedRequire",
      {
        ...esbuildOptions,
        minify: true,
      },
      "out-min"
    );
    const { remoteEntryCode, requireMockCode } =
      await transformFederatedRequire(path.join(out, "app1.js"));

    expect(remoteEntryCode).toMatchSnapshot();
    expect(requireMockCode).toMatchSnapshot();
  });
});
