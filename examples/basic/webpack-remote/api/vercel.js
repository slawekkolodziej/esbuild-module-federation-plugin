const { PassThrough } = require("stream");

const React = require("react");
const { renderToPipeableStream } = require("react-dom/server");

const App = require("../dist/app").default;
const stats = require("../public/build/stats.json");

export default function handler(req, res) {
  if (req.url !== "/") {
    res.status(404);
    res.send();
    return;
  }

  const chunks = stats.assetsByChunkName.app.concat(
    stats.assetsByChunkName.bootstrap,
    stats.chunks.reduce((r, chunk) => {
      if (chunk.runtime.includes("app")) {
        r.push(...chunk.files);
      }

      return r;
    }, [])
  );

  const writable = new PassThrough();
  let html = "";
  writable.on("data", (d) => {
    html += String(d);
  });

  writable.on("end", function () {
    // If something errored before we started streaming, we set the error code appropriately.
    res.statusCode = didError ? 500 : 200;
    res.setHeader("content-type", "text/html");
    res.send(html);
  });

  let didError = false;
  const { startWriting, abort } = renderToPipeableStream(
    React.createElement(App, { chunks }),
    writable,
    {
      onCompleteAll() {
        startWriting();
      },
      onError(x) {
        didError = true;
        console.error(x);
      },
    }
  );

  setTimeout(abort, 5000);
}
