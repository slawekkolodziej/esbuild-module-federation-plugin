const esbuild = require("esbuild");
const {
  esbuildModuleFederationPlugin,
} = require("esbuild-module-federation-plugin");
const { nodeExternalsPlugin } = require("esbuild-node-externals");

esbuild
  .build({
    outdir: "public/build",
    entryPoints: {
      app: "src/index.jsx",
    },
    plugins: [
      esbuildModuleFederationPlugin({
        name: "default",
        shared: {
          react: {
            singleton: true,
          },
          "react-dom": {
            singleton: true,
          },
        },
        remotes: {
          webpackRemote: "http://localhost:3001/build/remote-entry.js",
          esbuildRemote: {
            src: "http://localhost:3002/build/remote-entry.js",
            type: "esm",
          },
        },
      }),
    ],
    define: {
      "process.env.NODE_ENV": `"production"`,
      "process.env.REMOTE_HOSTS": JSON.stringify({
        webpackRemote: process.env.REMOTE_HOST || "http://localhost:3001",
        esbuildRemote: { url: "http://localhost:3002", type: "module" },
      }),
    },
    splitting: true,
    minify: false,
    format: "esm",
    bundle: true,
    write: true,
  })
  .then((build) => {
    if (build.errors && build.errors.length) {
      build.errors.forEach((err) => console.error(err.detail));
      process.exit(1);
    }
    if (build.warnings && build.warnings.length) {
      build.warnings.forEach((warn) => console.warn(warn.text));
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

esbuild
  .build({
    outdir: "dist",
    entryPoints: {
      app: "src/components/app.jsx",
    },
    plugins: [
      nodeExternalsPlugin(),
      esbuildModuleFederationPlugin({
        name: "default",
        shared: {
          react: {
            singleton: true,
          },
          "react-dom": {
            singleton: true,
          },
        },
        remotes: {
          webpackRemote: "http://localhost:3001/build/remote-entry.js",
          esbuildRemote: {
            src: "http://localhost:3002/build/remote-entry.js",
            type: "esm",
          },
        },
      }),
    ],
    define: {
      "process.env.NODE_ENV": `"production"`,
      "process.env.REMOTE_HOSTS": JSON.stringify({
        webpackRemote: process.env.REMOTE_HOST || "http://localhost:3001",
        esbuildRemote: { url: "http://localhost:3002", type: "module" },
      }),
    },
    platform: "node",
    format: "cjs",
    bundle: true,
    write: true,
  })
  .then((build) => {
    if (build.errors && build.errors.length) {
      build.errors.forEach((err) => console.error(err.detail));
      process.exit(1);
    }
    if (build.warnings && build.warnings.length) {
      build.warnings.forEach((warn) => console.warn(warn.text));
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
