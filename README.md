# esbuild module federation plugin

## TODO:

- [x] Lazy load remotes
- [x] Set up proper testing environment
- [x] Convert code to TypeScript?
- [ ] Replace Babel with SWC or other, faster tool
      After initial work it seems that SWC Visitor is buggy. It does not visit all CallExpression statements. Possibly related issue: https://github.com/swc-project/swc/issues/1623
- [ ] Call `initSharing` inside entrypoints
- [ ] Use this plugin inside esbuild-host code
- [ ] Add support for node builds
- [ ] Add proper support for CSS chunks
- [ ] Experiment with node MF streaming with hot code reload controlled by sockets

## Using esbuild module as remote in webpack app

```js
function esmRemote(name, url) {
  return `promise new Promise(resolve => {
    const script = document.createElement('script');
    script.src = '${url}';
    script.type = 'module';
    script.onload = () => {
      const proxy = {
        get: (request) => window.${name}.get(request),
        init: (arg) => {
          try {
            return window.${name}.init(arg);
          } catch(e) {
            console.log('remote container already initialized')
          }
        }
      }
      resolve(proxy)
    }
    document.head.appendChild(script);
  })`;
}

// later in your webpack config:
new webpack.container.ModuleFederationPlugin({
  name: "main_app",
  remotes: {
    'esbuildRemote': esmRemote(
      'esbuildRemote',
      'http://localhost:3002/build/remote-entry.js'
    )
  }
})
```