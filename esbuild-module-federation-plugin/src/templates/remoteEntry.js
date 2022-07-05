function remoteEntryTemplate(options) {
  const exposes = options.exposes || {};

  return /* js */ `
    import { shareScopes, initSharing } from '@runtime/federation/sharing';

    (function(self){
      const moduleMap = {
        ${Object.entries(exposes)
          .map(
            ([expose, sourceFile]) =>
              `'${expose}': () => () => import('${sourceFile}')`
          )
          .join(",")}
      };

      function get(module, getScope) {
        getScope = moduleMap[module]
          ? moduleMap[module]()
          : Promise.resolve().then(() => {
              throw new Error('Module "' + module + '" does not exist in container.');
            });

        return getScope;
      }
      
      function init(shareScope, initScope) {
        const name = 'default';
        const oldScope = shareScopes[name];
      
        if (oldScope && oldScope !== shareScope) {
          throw new Error('Container initialization failed as it has already been initialized with a different share scope.');
        }
      
        shareScopes[name] = shareScope;
        return initSharing(name).then(() => {
          // FIXME: Require CSS chunk only when it exists and when it's requested
          if (import.meta?.url) {
            const linkUrl = new URL('./remote-entry.css', import.meta.url).toString()
            const l = document.createElement('link');
            l.type = 'text/css';
            l.rel = 'stylesheet';
            l.href = linkUrl;
            document.head.appendChild(l);
          }
        });
      }
      self['${options.name}'] = { get, init };
    }(globalThis, require/*we use global require here just to trick esbuild into injecting its mock reference*/));
  `;
}

module.exports = {
  remoteEntryTemplate,
};
