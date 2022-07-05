# esbuild module federation plugin

## TODO:

- [x] Lazy load remotes
- [x] Set up testing environment
- [ ] Convert code to TypeScript
- [ ] Replace Babel with SWC
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