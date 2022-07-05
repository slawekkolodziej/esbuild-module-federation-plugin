const React = require("react");
const {
  renderToPipeableStream,
  renderToStaticMarkup,
} = require("react-dom/server");

const { json } = require("body-parser");
const cors = require("cors");
const express = require("express");

const App = require("./dist/app").default;
const remoteEntry = require("./dist/remote-entry");
const stats = require("./public/build/stats.json");
const federationStats = require("./public/build/federation-stats.json");

const exposes = federationStats.federatedModules.find(
  (m) => m.remote === "webpackRemote"
).exposes;

function getChunksForExposed(exposed) {
  return exposes[exposed].reduce((p, c) => {
    p.push(...c.chunks);
    return p;
  }, []);
}

const remoteInitPromise = remoteEntry.init({
  react: {
    [React.version]: {
      get: () => () => React,
    },
  },
});

const app = express();

app.use("/", cors(), express.static("./public"));

app.use("/prerender", json(), async (req, res, next) => {
  if (!req.body.module) {
    next();
    return;
  }

  try {
    const chunks = getChunksForExposed(req.body.module);

    await remoteInitPromise;

    const factory = await remoteEntry.get(req.body.module);
    let Component = factory();
    Component = (Component && Component.default) || Component;

    const html = renderToStaticMarkup(
      React.createElement(
        Component,
        req.body.props || {},
        `\u200Cchildren\u200C`
      )
    );

    res.json({
      chunks,
      html,
    });
  } catch (err) {
    next(err);
  }
});

app.use("/", (req, res) => {
  if (req.path !== "/") {
    res.status(404);
    res.send();
    return;
  }

  const chunksSet = new Set([
    ...stats.assetsByChunkName.app,
    ...stats.assetsByChunkName.bootstrap,
  ]);

  stats.chunks.forEach((chunk) => {
    if (chunk.runtime.includes("app")) {
      chunk.files.forEach((file) => chunksSet.add(file));
    }
  });

  const chunks = Array.from(chunksSet);

  let didError = false;
  const stream = renderToPipeableStream(
    React.createElement(App, {
      chunks,
    }),
    {
      onShellReady() {
        // The content above all Suspense boundaries is ready.
        // If something errored before we started streaming, we set the error code appropriately.
        res.statusCode = didError ? 500 : 200;
        res.write("<!DOCTYPE html>");
        stream.pipe(res);
      },
      onShellError(error) {
        // Something errored before we could complete the shell so we emit an alternative shell.
        res.statusCode = 500;
        res.send("<!doctype html>SSR error</script>");
      },
      onError(x) {
        didError = true;
        console.error(x);
      },
    }
  );
});

app.listen(3001, () =>
  console.log("webpack remote: started at http://localhost:3001")
);
