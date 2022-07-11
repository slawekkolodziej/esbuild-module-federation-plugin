import path from "path";
import { transformFederatedRequire } from "../transforms/transformFederatedRequire";
import { getRelativeChunkPath } from "../utils/buildUtils";

export const REQUIRE_MOCK_CONTENT = `(function(r){return typeof r/* require mock */}(require))`;

export function processRequireCall(build) {
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
        contents: REQUIRE_MOCK_CONTENT,
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

export function processRequireCallPlugin() {
  return {
    name: "mf/test/process-require-call",
    setup(build) {
      const { onEnd } = processRequireCall(build);

      build.onEnd(onEnd);
    },
  };
}
