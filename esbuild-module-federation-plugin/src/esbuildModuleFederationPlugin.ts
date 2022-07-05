import path from "path";
import { readFile, writeFile } from "fs/promises";
import {
  postProcessFile,
  retrieveGlobalRequireChunk,
  alterGlobalRequire,
} from "./postProcessFile";
import {
  normalizeModuleName,
  normalizeShared,
  normalizeRemotes,
} from "./utils/federationUtils";
import { sharingMainTemplate } from "./templates/sharing";
import { remoteEntryTemplate } from "./templates/remoteEntry";
import {
  SHARED_MODULE_PREFIX,
  REMOTE_MODULE_PREFIX,
  SHARED_SCOPE_MODULE_NAME,
} from "./const";

export function esbuildModuleFederationPlugin(paramsOptions = {}) {
  const options = {
    ...paramsOptions,
  };

  return {
    name: "esbuild-module-federation-plugin",
    setup(build) {
      const outDir = build.initialOptions.outdir;
      const remoteEntryName = options.filename.replace(/\.js$/, "");
      const remoteEntryPath = path.join(outDir, remoteEntryName + ".js");
      const filesWithFederatedImports = new Set();
      const shared = normalizeShared(options.shared);
      const remotes = normalizeRemotes(options.remotes);

      build.initialOptions.metafile = true;
      build.initialOptions.entryPoints[remoteEntryName] = "remote-entry.js";
      build.initialOptions.entryPoints[SHARED_SCOPE_MODULE_NAME] =
        "@runtime/federation/sharing";

      // Resolve remote-entry.js
      build.onResolve({ filter: /^remote-entry\.js$/ }, (args) => {
        return {
          path: args.path,
          namespace: "federation/entry",
        };
      });

      // Generate remote-entry.js
      build.onLoad({ namespace: "federation/entry", filter: /.*/ }, () => {
        return {
          resolveDir: ".",
          contents: remoteEntryTemplate(options),
        };
      });

      // Resolve @runtime/federation/sharing
      build.onResolve(
        {
          filter: /@runtime\/federation\/sharing/,
        },
        () => {
          return {
            path: "@runtime/federation/sharing",
            namespace: "federation/sharing",
          };
        }
      );

      // Generate @runtime/federation/sharing
      build.onLoad({ namespace: "federation/sharing", filter: /.*/ }, () => {
        return {
          resolveDir: ".",
          loader: "js",
          contents: sharingMainTemplate(options, shared, remotes),
        };
      });

      // Resolve federated imports
      build.onResolve({ namespace: "file", filter: /.*/ }, (args) => {
        const [moduleName] = normalizeModuleName(args.path);
        const isSharedPackage = Object.hasOwn(shared, moduleName);
        const isRemotePackage = Object.hasOwn(remotes, moduleName);

        if (isSharedPackage || isRemotePackage) {
          filesWithFederatedImports.add(args.importer);

          const prefix = isSharedPackage
            ? SHARED_MODULE_PREFIX
            : REMOTE_MODULE_PREFIX;

          return {
            path: `${prefix}${args.path}`,
            external: true,
          };
        }

        return null;
      });

      // Post process code
      build.onEnd((result) => {
        const filesWithFederatedImportsArr = Array.from(
          filesWithFederatedImports
        );

        const modulesWithFederatedImports = filesWithFederatedImportsArr.map(
          (file) => path.relative(process.cwd(), file)
        );

        const chunksWithFederatedImports = Object.entries(
          result.metafile.outputs
        )
          .filter(([_, meta]) => {
            return Object.keys(meta.inputs).some((inputFile) =>
              modulesWithFederatedImports.includes(inputFile)
            );
          })
          .map(([chunkFile, _]) => chunkFile);

        console.log(
          `Post processing ${chunksWithFederatedImports.length} files.`
        );

        Promise.all([
          // The code below alters require() calls in a quite convoluted way
          // 1. It goes to remote-entry.js and gets reference to chunk containing
          //    esbuild's __require mock
          // 2. It goes to that chunk and alters local __require implementation so
          //    so it can try to import federated modules first
          // It would be nice to refactor this a bit and bring back minification
          readFile(remoteEntryPath, "utf-8")
            .then((code) => retrieveGlobalRequireChunk(code))
            .then(({ remoteEntryCode, requireMockChunk, requireNamedExport }) =>
              Promise.all([
                writeFile(remoteEntryPath, remoteEntryCode),
                readFile(path.join(outDir, requireMockChunk), "utf-8"),
                requireMockChunk,
                requireNamedExport,
              ])
            )
            .then(
              ([_, requireMockCode, requireMockChunk, requireNamedExport]) =>
                Promise.all([
                  requireMockChunk,
                  alterGlobalRequire(requireMockCode, requireNamedExport),
                ])
            )
            .then(([requireMockChunk, code]) =>
              writeFile(path.join(outDir, requireMockChunk), code)
            ),

          ...chunksWithFederatedImports.map(async (file) => {
            const code = await readFile(file, "utf-8");
            let transformedCode = postProcessFile(code);

            if (build.initialOptions.minify) {
              const { code } = await build.esbuild.transform(transformedCode, {
                minify: true,
              });
              transformedCode = code;
            }

            await writeFile(file, transformedCode);
          }),
        ]);
      });
    },
  };
}

export default esbuildModuleFederationPlugin;
