const esbuild = require("esbuild");
const { writeFileSync } = require("fs");
const cssModulesPlugin = require("esbuild-css-modules-plugin");
const {
  federationShareScopePlugin,
} = require("esbuild-federation-share-scope");
const { nodeExternalsPlugin } = require("esbuild-node-externals");
const {
  esbuildModuleFederationPlugin,
} = require("esbuild-module-federation-plugin");

esbuild
  .build({
    outdir: "public/build",
    entryPoints: {},
    plugins: [
      cssModulesPlugin({
        v2: true,
      }),
      esbuildModuleFederationPlugin({
        shared: {
          react: {
            singleton: true,
          },
          "react-dom": {
            singleton: true,
          },
        },
        name: "esbuildRemote",
        filename: "remote-entry.js",
        exposes: {
          "./header": "./src/components/header.jsx",
          "./footer": "./src/components/footer.jsx",
          "./box": "./src/components/Box/index.tsx",
        },
        remotes: {
          webpackRemote: {
            src: "http://localhost:3001/build/remote-entry.js",
            type: "var",
          },
        },
      }),
    ],
    define: {
      "process.env.NODE_ENV": `"production"`,
      // "process.env.REMOTE_HOSTS": JSON.stringify({
      //   webpackRemote: process.env.REMOTE_HOST || "http://localhost:3001",
      // }),
    },
    // inject: ['./test.js'],
    splitting: true,
    chunkNames: "chunks/[name]-[hash]",
    minify: false,
    format: "esm",
    bundle: true,
    write: true,
  })
  .then((build) => {
    writeFileSync("meta.json", JSON.stringify(build.metafile));

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

// esbuild
//   .build({
//     outdir: "dist",
//     entryPoints: {
//       app: "src/components/app.jsx",
//     },
//     plugins: [
//       nodeExternalsPlugin(),
//       federationShareScopePlugin(process.cwd(), {
//         shared: ["react"],
//       }),
//     ],
//     define: {
//       "process.env.NODE_ENV": `"production"`,
//       "process.env.REMOTE_HOSTS": JSON.stringify({
//         webpackRemote: process.env.REMOTE_HOST || "http://localhost:3001",
//       }),
//     },
//     platform: "node",
//     format: "cjs",
//     bundle: true,
//     write: true,
//   })
//   .then((build) => {
//     if (build.errors && build.errors.length) {
//       build.errors.forEach((err) => console.error(err.detail));
//       process.exit(1);
//     }
//     if (build.warnings && build.warnings.length) {
//       build.warnings.forEach((warn) => console.warn(warn.text));
//     }
//   })
//   .catch((err) => {
//     console.error(err);
//     process.exit(1);
//   });
