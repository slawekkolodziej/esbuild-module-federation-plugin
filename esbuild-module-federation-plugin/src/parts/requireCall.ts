import path from "path";
import {
  transformFederatedRequireCjs,
  transformFederatedRequireEsm,
} from "../transforms/transformFederatedRequire";
import { isNodeBuild, getRelativeChunkPath } from "../utils/buildUtils";
import { SHARED_SCOPE_MODULE_NAME } from "../const";

export const REQUIRE_MOCK_CONTENT = `(function(r){return typeof r/* require mock */}(require))`;

export function processRequireCall(build) {
  const isNode = isNodeBuild(build);
  const outDir = build.initialOptions.outdir;

  if (isNode) {
    const entryPoints = Object.entries(build.initialOptions.entryPoints).filter(
      ([key, _]) => key !== SHARED_SCOPE_MODULE_NAME
    );

    return {
      onEnd: () => {
        return Promise.all(
          entryPoints.map(([out, _]) => {
            const filePath = `${outDir}/${out}.js`;

            return transformFederatedRequireCjs(filePath);
          })
        );
      },
    };
  } else {
    const requireMockName = "require-mock";
    const requireMockFilter = new RegExp(`${requireMockName}\\.js`);
    const requireMockEntryPath = path.join(outDir, `${requireMockName}.js`);

    build.initialOptions.entryPoints[requireMockName] = `${requireMockName}.js`;

    build.onResolve({ filter: requireMockFilter }, (args) => {
      return {
        path: args.path,
        namespace: "federation/require-mock",
      };
    });

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
        transformFederatedRequireEsm(
          requireMockEntryPath,
          getRelativeChunkPath(build)
        ),
    };
  }
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
