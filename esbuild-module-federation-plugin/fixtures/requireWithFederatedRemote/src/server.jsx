const React = require("react");
const { renderToPipeableStream } = require("react-dom/server");
const express = require("express");

const app = express();

const Header = React.lazy(() => import("remoteModule/Header"));

app.use("/", express.static("./public"));
app.use("/", (req, res) => {
  const stream = renderToPipeableStream(
    <div>
      <Header />
      <div>hello</div>
    </div>,
    {
      onShellReady() {
        res.statusCode = 200;
        res.write("<!DOCTYPE html>");
        stream.pipe(res);
      },
      onShellError() {
        res.statusCode = 500;
        res.send(
          '<!doctype html><p>Loading...</p><script src="clientrender.js"></script>'
        );
      },
      onError(x) {
        console.error(x);
      },
    }
  );
});

app.listen(3000, () =>
  console.log("esbuild host: started at http://localhost:3000")
);
