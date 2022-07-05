const React = require("react");
const { renderToPipeableStream } = require("react-dom/server");

const express = require("express");

const App = require("./dist/app");

const app = express();

app.use("/", express.static("./public"));

app.use("/", (req, res) => {
  if (req.path !== "/") {
    res.status(404);
    res.send();
    return;
  }

  let didError = false;
  const ctx = {};
  const stream = renderToPipeableStream(
    React.createElement(
      App.context.Provider,
      { value: ctx },
      React.createElement(App.default)
    ),
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
        res.send(
          '<!doctype html><p>Loading...</p><script src="clientrender.js"></script>'
        );
      },
      onError(x) {
        didError = true;
        console.error(x);
      },
    }
  );
});

app.listen(3000, () =>
  console.log("esbuild host: started at http://localhost:3000")
);
