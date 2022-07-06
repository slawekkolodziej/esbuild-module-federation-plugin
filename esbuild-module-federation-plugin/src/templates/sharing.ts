import { FEDERATED_MODULE_RE } from "../const";
import { normalizeModuleNameTemplate } from "../utils/federationUtils";

const sharingMainTemplate = (options, shared, remotes) => {
  const shareScopesMeta = `{
    ${
      Object.entries(shared)
        .map(
          ([shared, sharedConfig]) => `
      ${JSON.stringify(shared)}: {
        import: () => import(${JSON.stringify(shared)}),
        shareKey: ${JSON.stringify(sharedConfig.shareKey)},
        shareScope: ${JSON.stringify(sharedConfig.shareScope)},
        version: ${JSON.stringify(sharedConfig.version)}
      }`
        )
        .join(",\n  ") || ""
    }
  };`;

  return /* js */ `
    const uniqueName = '${options.name}';
    const shareScopesMeta = ${shareScopesMeta};
    const shareScopePromises = {};
    const modulesCache = {
      shared: {},
      remote: {}
    };
    const moduleCacheRe = ${FEDERATED_MODULE_RE.toString()};

    export const shareScopes = {};

    export function initSharing(name) {
      if (shareScopePromises[name]) {
        return shareScopePromises[name];
      }

      const scope = shareScopes[name] = shareScopes[name] || {};

      const register = (moduleName, version, factory, eager) => {
        const versions = scope[moduleName] = scope[moduleName] || {};
        const activeVersion = versions[version];
        if(!activeVersion || (
          !activeVersion.loaded && (
            !eager != !activeVersion.eager 
              ? eager
              : uniqueName > activeVersion.from
            )
          )
        ) {
          versions[version] = {
            get: factory,
            from: uniqueName,
            eager: !!eager,
            loaded: true
          };
        }

        return versions[version];
      };
      
      shareScopePromises[name] = Promise.all(
        Object.keys(shareScopesMeta).map(async (moduleName) => {
          const meta = shareScopesMeta[moduleName];

          const sharedModule = register(
            moduleName,
            meta.version,
            () => meta.import().then(m => () => m.default || m)
          );
          
          const moduleOrPromise = sharedModule.get();
          const module = (
            sharedModule.eager
              ? moduleOrPromise
              : (await moduleOrPromise)
            );

          modulesCache.shared[moduleName] = module;
        })
      ).then(() => {
        shareScopes[name] = scope;
      });
      return shareScopePromises[name];
    };

    export function getModule(moduleName) {
      const [_, type, name] = moduleName.match(moduleCacheRe);
      if (type === 'shared') {
        return modulesCache.shared[name]();
      } else if (type === 'remote') {
        if (!modulesCache.remote[name]) {
          modulesCache.remote[name] = getRemote(name);
        }
        return modulesCache.remote[name];
      }
    }

    export function getModuleAsync(moduleName) {
      const mod = getModule(moduleName);

      if (mod instanceof Promise) {
        return mod.then(mod => mod());
      }

      return mod;
    }

    ${normalizeModuleNameTemplate}
    ${remotesFactory(options, remotes)}
  `;
};

const loaders = {
  loadScript: /* js */ `
    function loadScript(name, src, attrs) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        Object.assign(script, attrs, {
          src,
          async: true,
          onload: () => {
            window[name].init(shareScopes.default);
            resolve();
          },
          onerror: (err) => {
            console.error(err);
            reject(err);
          }
        });
        document.head.appendChild(script);
      });
    }
  `,
};

function getNecessaryLoaders(remotes) {
  const loadersToInject = new Set();
  const loaderByType = {
    var: loaders.loadScript,
    esm: loaders.loadScript,
  };

  Object.values(remotes).forEach((config) => {
    loadersToInject.add(loaderByType[config.type]);
  });

  return Array.from(loadersToInject).join("\n");
}

function getImportingFn(remoteConfig) {
  switch (remoteConfig.type) {
    case "esm":
      return `loadScript('${remoteConfig.global}', '${remoteConfig.src}', { type: 'module' })
    `;
    case "var":
    default:
      return `loadScript('${remoteConfig.global}', '${remoteConfig.src}')
    `;
  }
}

function remotesFactory(options, remotes) {
  if (Object.keys(remotes).length === 0) {
    return "";
  }

  const remotesMeta = `{
    ${
      Object.entries(remotes)
        .map(
          ([remote, remoteConfig]) => `
      ${JSON.stringify(remote)}: {
        global: '${remoteConfig.global}',
        get: (path) => window.${remoteConfig.global}?.get(path),
        import: () => ${getImportingFn(remoteConfig)},
        loaded: false
      }`
        )
        .join(",\n  ") || ""
    }
  };`;

  return /* js */ `
    const remotesMeta = ${remotesMeta};

    ${getNecessaryLoaders(remotes)}

    function getRemote(moduleName) {
      const [pkg, relativePath] = normalizeModuleName(moduleName);
      const remoteMeta = remotesMeta[pkg];
      const module = remoteMeta.get(relativePath);

      if (module) {
        return module;
      }
      
      return remoteMeta.import()
        .then(() => {
          remoteMeta.loaded = true;
          return remoteMeta.get(relativePath);
        });
    }
  `;
}

export { sharingMainTemplate };
