const esbuild = require("esbuild");

function build(options) {
  return esbuild.build({
    entryPoints: {
      esbuildModuleFederationPlugin: "./src/esbuildModuleFederationPlugin.js",
    },
    bundle: true,
    minify: false,
    outdir: "./dist",
    platform: "node",
    write: true,
    ...options,
  });
}

if (require.main === module) {
  build();
}

module.exports = build;
