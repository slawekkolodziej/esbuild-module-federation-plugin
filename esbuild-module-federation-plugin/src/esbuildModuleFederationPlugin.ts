import path from "path";
import { readFile, writeFile } from "fs/promises";
import { ModuleFederationPluginOptions } from "./types";
import {
  normalizeModuleName,
  normalizeShared,
  normalizeRemotes,
} from "./utils/federationUtils";
import { transformFederatedRequire } from "./transforms/transformFederatedRequire";
import { transformImportDeclarations } from "./transforms/transformImportDeclarations";
import { transformFederatedEsmImports } from "./transforms/transformFederatedEsmImports";
import { transformAddInitSharingCall } from "./transforms/transformAddInitSharingCall";
import { sharingMainTemplate } from "./templates/sharing";
import { remoteEntryTemplate } from "./templates/remoteEntry";
import {
  SHARED_MODULE_PREFIX,
  REMOTE_MODULE_PREFIX,
  SHARED_SCOPE_MODULE_NAME,
} from "./const";
import { astToCode, codeToAst } from "./utils/astUtils";

export function esbuildModuleFederationPlugin(
  paramsOptions: ModuleFederationPluginOptions = {}
) {
  const options = {
    ...paramsOptions,
    shared: normalizeShared(paramsOptions.shared),
    remotes: normalizeRemotes(paramsOptions.remotes),
  };

  return {
    name: "esbuild-module-federation-plugin",
    setup(build) {
      const { shared, remotes } = options;
      const filesWithFederatedImports = new Set<string>();
      const relativeChunkPath = getRelativeChunkPath(build);

      build.initialOptions.metafile = true;

      const { isEntryPoint, onEnd: entryPointPostProcess } =
        processEntryPoints(build);
      processSharing(build, options);
      processRemoteEntry(build, options);
      const { onEnd: postProcessRequireMock } = processRequireCall(build);

      // Resolve federated imports
      build.onResolve({ namespace: "file", filter: /.*/ }, (args) => {
        const [moduleName] = normalizeModuleName(args.path);
        const isSharedPackage = Object.hasOwn(shared, moduleName);
        const isRemotePackage = Object.hasOwn(remotes, moduleName);

        if ((isSharedPackage || isRemotePackage) && args.importer) {
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
        const modulesWithFederatedImports = Array.from(
          filesWithFederatedImports
        ).map((file) => getRelativePath(file));

        const chunksWithFederatedImports = Object.entries(
          result.metafile.outputs
        )
          .filter(([chunkFile, meta]) => {
            if (isEntryPoint(chunkFile)) {
              return false;
            }

            return Object.keys(meta.inputs).some((inputFile) =>
              modulesWithFederatedImports.includes(inputFile)
            );
          })
          .map(([chunkFile, _]) => chunkFile);

        console.log(
          `Post processing ${chunksWithFederatedImports.length} files.`
        );

        Promise.all([
          postProcessRequireMock(),
          entryPointPostProcess(),
          ...chunksWithFederatedImports.map(async (file) => {
            const code = await readFile(file, "utf-8");
            const ast = codeToAst(code);
            const newAst = transformFederatedEsmImports(ast, relativeChunkPath);

            await writeFile(file, astToCode(newAst));
          }),
        ]);
      });
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

function processRemoteEntry(build, options) {
  if (!options.filename) {
    return {
      onEnd: noop,
    };
  }

  const remoteEntryName = options.filename.replace(/\.js$/, "");

  build.initialOptions.entryPoints[remoteEntryName] = "remote-entry.js";

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
}

function processEntryPoints(build) {
  const outDir = build.initialOptions.outdir || "";
  const entryPoints = Object.entries<string>(build.initialOptions.entryPoints);
  const files = entryPoints.map(([out, _]) => {
    return [outDir, `${out}.js`].filter(Boolean).join("/");
  });

  return {
    hasEntryPoints: files.length > 0,
    isEntryPoint: (filePath) => files.includes(getRelativePath(filePath)),
    onEnd: () => {
      return Promise.all(
        files.map(async (file) => {
          const code = await readFile(file, "utf-8");
          const ast = codeToAst(code);

          const mainFnName = generateUniqueIdentifier(code, "mainFn");
          const loadFnName = generateUniqueIdentifier(code, "loadDepsFn");

          const modifiedAst = transformAddInitSharingCall(
            transformFederatedEsmImports(
              transformImportDeclarations(ast, {
                mainFnName,
                loadFnName,
              })
            ),
            {
              loadFnName,
            }
          );
          // minify!
          await writeFile(file, astToCode(modifiedAst));
        })
      );
    },
  };
}

function processSharing(build, options) {
  build.initialOptions.entryPoints[SHARED_SCOPE_MODULE_NAME] =
    "@runtime/federation/sharing";

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
      contents: sharingMainTemplate(options),
    };
  });

  return {};
}

function processRequireCall(build) {
  const requireMockName = "require-mock";
  const requireMockFilter = new RegExp(`${requireMockName}\\.js`);
  const outDir = build.initialOptions.outdir;
  const requireMockEntryPath = path.join(outDir, `${requireMockName}.js`);

  build.initialOptions.entryPoints[requireMockName] = `${requireMockName}.js`;

  build.onResolve({ filter: requireMockFilter }, (args) => {
    return {
      path: args.path,
      namespace: "federation/require-mock",
    };
  });

  // Generate remote-entry.js
  build.onLoad(
    { namespace: "federation/require-mock", filter: requireMockFilter },
    () => {
      return {
        resolveDir: ".",
        contents: `(function(r){return typeof r/* require mock */}(require))`,
      };
    }
  );

  return {
    onEnd: () =>
      transformFederatedRequire(
        requireMockEntryPath,
        getRelativeChunkPath(build)
      ),
  };
}

function getRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath);
}

function getRelativeChunkPath(build) {
  return (
    (build.initialOptions.chunkNames ?? "[name]-[hash]")
      .split("/")
      .slice(0, -1)
      .map(() => "..")
      .join("/") || "."
  );
}

function generateUniqueIdentifier(code, prefix = "var") {
  let i = 0;
  let varName = `__${prefix}${i}`;

  while (code.indexOf(varName) > -1) {
    varName = `${prefix}${i}`;
    i++;
  }

  return varName;
}

export default esbuildModuleFederationPlugin;
