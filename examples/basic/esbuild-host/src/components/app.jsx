import React from "react";

import federatedComponent, { context } from "./federated-component";

export { context };

const Header = federatedComponent("webpackRemote", "./header");
const Header2 = federatedComponent("esbuildRemote", "./header");
const Box = federatedComponent("esbuildRemote", "./box");

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Esbuild Host</title>
      </head>
      <body>
        <React.Suspense fallback="">
          {typeof window !== 'undefined' ? (
            <Header2>hello esbuild!</Header2>
          ) : null}
          {typeof window !== 'undefined' ? (
            <Box>hello esbuild box!</Box>
          ) : null}
          <Header>
            <h1>Header</h1>
            <p>Federated from a webpack build</p>

            <Header>
              <h1>Nested</h1>
              <p>Nested component</p>
            </Header>
          </Header>

          {Object.entries(process.env.REMOTE_HOSTS).map(([name, entry]) => {
            if (typeof entry === 'string') {
              return (
                <script key={name} src={`${entry}/build/remote-entry.js`} />
              )
            }

            const { url, type } = entry;

            return <script key={name} type={type} src={`${entry.url}/build/remote-entry.js`} />
          })}
          <script type="module" src={`build/app.js`} />
        </React.Suspense>
      </body>
    </html>
  );
}