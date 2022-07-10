import {
  getVersion,
  normalizeModuleName,
  normalizeRemotes,
  normalizeShared,
} from "../federationUtils";

describe("getVersion", () => {
  it("gives correct version of packages", () => {
    expect(getVersion("react")).toEqual("18.2.0");
    expect(getVersion("react-dom")).toEqual("18.2.0");
    expect(getVersion("esbuild")).toEqual("0.12.9");
    expect(getVersion("vitest")).toEqual("0.17.0");
  });
});

describe("normalizeShared", () => {
  it("expands shared modules when provided as array of strings", () => {
    expect(normalizeShared(["react", "react-dom"])).toEqual({
      react: {
        shareKey: "react",
        shareScope: ["default"],
        version: "18.2.0",
      },
      "react-dom": {
        shareKey: "react-dom",
        shareScope: ["default"],
        version: "18.2.0",
      },
    });
  });

  it("expands shared modules when provided as object", () => {
    expect(
      normalizeShared({
        react: {
          singleton: true,
        },
        "react-dom": {
          singleton: true,
        },
      })
    ).toEqual({
      react: {
        shareKey: "react",
        shareScope: ["default"],
        version: "18.2.0",
      },
      "react-dom": {
        shareKey: "react-dom",
        shareScope: ["default"],
        version: "18.2.0",
      },
    });
  });
});

describe("normalizeRemotes", () => {
  it("parses webpack-like remotes", () => {
    expect(
      normalizeRemotes({
        app1: "http://localhost:3002/remoteEntry.js",
        app2: "app2@http://localhost:3002/remoteEntry.js",
      })
    ).toEqual({
      app1: {
        global: "app1",
        src: "http://localhost:3002/remoteEntry.js",
        type: "var",
      },
      app2: {
        global: "app2",
        src: "http://localhost:3002/remoteEntry.js",
        type: "var",
      },
    });
  });

  it("parses remotes provided as configuration object", () => {
    expect(
      normalizeRemotes({
        app: {
          src: "http://localhost:3002/remoteEntry.js",
          type: "esm",
        },
      })
    ).toEqual({
      app: {
        global: "app",
        src: "http://localhost:3002/remoteEntry.js",
        type: "esm",
      },
    });
  });
});

describe("normalizeModuleName", () => {
  it("normalizes remote module", () => {
    expect(normalizeModuleName("remoteApp/component/header")).toEqual([
      "remoteApp",
      "./component/header",
    ]);
  });
  it("normalizes scoped module", () => {
    expect(normalizeModuleName("@runtime/federation/shared")).toEqual([
      "@runtime/federation",
      "./shared",
    ]);
  });
});
