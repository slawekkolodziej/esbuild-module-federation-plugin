import { templateToFunction } from "./templateUtils";

export function getVersion(shared) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(require.resolve(`${shared}/package.json`)).version;
}

export function normalizeShared(shared) {
  shared = shared || [];

  if (Array.isArray(shared)) {
    return shared.reduce((acc, shared) => {
      return {
        ...acc,
        [shared]: {
          shareKey: shared,
          shareScope: ["default"],
          version: getVersion(shared),
        },
      };
    }, {});
  }

  return Object.entries(shared).reduce((acc, [shared, sharedConfig]) => {
    let shareScope = ["default"];
    if (Array.isArray(sharedConfig.shareScope)) {
      shareScope = sharedConfig.shareScope;
    } else if (typeof sharedConfig.shareScope === "string") {
      shareScope = [sharedConfig.shareScope];
    }

    return {
      ...acc,
      [shared]: {
        shareKey: sharedConfig.shareKey || shared,
        shareScope,
        version: sharedConfig.version || getVersion(shared),
      },
    };
  }, {});
}

export const normalizeModuleNameTemplate = /* js */ `
  function normalizeModuleName(moduleName) {
    const firstChar = moduleName[0];

    if (firstChar === "@") {
      const [modScope, modName, ...modPath] = moduleName.split("/");

      return [[modScope, modName].join("/"), "./" + modPath.join("/")];
    } else if (firstChar === ".") {
      return [moduleName];
    } else {
      const [modName, ...modPath] = moduleName.split("/");

      return [modName, "./" + modPath.join("/")];
    }
  }
`;
export const normalizeModuleName = templateToFunction(
  normalizeModuleNameTemplate
);

export function normalizeRemotes(remotes = {}) {
  const remoteAddressWithGlobalRe = /^(?:([a-z-_][a-z0-9-_]+)@)?(.+)$/i;

  return Object.entries(remotes).reduce((acc, [remote, remoteConfig]) => {
    const config = {};

    if (typeof remoteConfig === "string") {
      const [, global, src] = remoteConfig.match(remoteAddressWithGlobalRe);

      config.type = "var";
      config.global = global;
      config.src = src;
    }

    return {
      ...acc,
      [remote]: {
        src: config.src || remoteConfig.src || "",
        type: config.type || remoteConfig.type || "var",
        global: config.global || remoteConfig.global || remote,
      },
    };
  }, {});
}
