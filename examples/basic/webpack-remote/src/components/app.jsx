import React from "react";
import Header from "./header";

const RemoteFooter = typeof window !== 'undefined'
  ? React.lazy(() => import("esbuildRemote/header"))
  : null;

const ESBuildBox = typeof window !== 'undefined'
  ? React.lazy(() => import("esbuildRemote/box"))
  : null;

export default function App({ chunks }) {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Webpack Remote</title>

        {chunks.map((c) =>
          c.endsWith(".css") ? (
            <link key={c} rel="stylesheet" href={`build/${c}`} />
          ) : null
        )}
      </head>
      <body>
        <Header>
          <h1>Header</h1>
          <p>My supercool header</p>
        </Header>
        {typeof window !== 'undefined' ? (
          <ESBuildBox>I am esbuild box</ESBuildBox>
        ) : null}
        {typeof window !== 'undefined' ? (
          <RemoteFooter>hello remote footer</RemoteFooter>
        ) : null}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__CHUNKS__ = ${JSON.stringify(chunks)};`,
          }}
        />

        {chunks.map((c,i) =>
          c.endsWith(".js") ? <script key={c} src={`build/${c}`} /> : null
        )}
      </body>
    </html>
  );
}
