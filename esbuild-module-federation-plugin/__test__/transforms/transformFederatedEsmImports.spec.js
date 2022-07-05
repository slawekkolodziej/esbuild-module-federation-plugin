import babelParser from "@babel/parser";
import generate from "@babel/generator";
// import swc from '@swc/core';
import { trimIndent } from "../../src/utils/testUtils";
import { transformFederatedEsmImports } from "../../src/transforms/transformFederatedEsmImports";

// function transformCode(code) {
//   return swc.transformSync(code, {
//     plugin: (ast) => transformFederatedEsmImports(ast),
//     jsc: {
//       parser: {
//         jsx: true,
//       },
//       target: 'es2020'
//     }
//   });
// }

function transformCode(code) {
  const ast = babelParser.parse(code, {
    sourceType: "module",
    plugins: ["jsx"],
  });

  transformFederatedEsmImports(ast);

  return generate(ast, {
    sourceType: "module",
  });
}

describe("transformFederatedEsmImports", () => {
  it("does not modify non-federated import declaration", () => {
    const code = trimIndent(/* js */ `
      import React, { useMemo, useState as useState2 } from "react";
      import { render } from "react-dom";
    `);

    const result = transformCode(code);

    expect(trimIndent(result.code)).toEqual(code);
  });

  it("does not modify non-federated dynamic imports", () => {
    const code = trimIndent(/* js */ `
      async function fn() {
        import("my-module").then(console.log);
      }
    `);

    const result = transformCode(code);

    expect(trimIndent(result.code)).toEqual(code);
  });

  it("converts import declarations", () => {
    const code = trimIndent(/* js */ `
      import React, { useMemo, useState as useState2 } from '@runtime/federation/shared/react';
      import { render } from '@runtime/federation/shared/react-dom';
    `);

    const result = transformCode(code);

    expect(trimIndent(result.code)).toEqual(
      trimIndent(/* js */ `
        import { getModule, getModuleAsync } from "../federation-shared.js";
        const React = getModule("@runtime/federation/shared/react"),
              {
                useMemo,
                useState: useState2
              } = React;
        const {
          render
        } = getModule("@runtime/federation/shared/react-dom");
      `)
    );
  });

  it("converts dynamic imports", () => {
    const code = trimIndent(/* js */ `
      async function getRemoteStuff() {
        const remoteProp = await import("@runtime/federation/remote/someOtherComponent").then(mod => mod.someProp);
        console.log(remoteProp);
      }
    `);

    const result = transformCode(code);

    expect(trimIndent(result.code)).toEqual(
      trimIndent(/* js */ `
        import { getModule, getModuleAsync } from "../federation-shared.js";

        async function getRemoteStuff() {
          const remoteProp = await getModuleAsync("@runtime/federation/remote/someOtherComponent").then(mod => mod.someProp);
          console.log(remoteProp);
        }
      `)
    );
  });

  it("compiles complex example", () => {
    const code = trimIndent(/* js */ `
      import React, { useState } from '@runtime/federation/shared/react';
      import styled from 'styled-components';
      import Box from 'my-ui-lib/box';
      const Button = React.lazy(() => import("@runtime/federation/remote/lib1/button"));

      const StyledBox = styled(Box);
      
      function App() {
        return (
          <StyledBox>
            <h1>hello</h1>
            <Button>Click me</Button>
          </StyledBox>
        )
      }
    `);

    const result = transformCode(code);

    expect(trimIndent(result.code)).toEqual(
      trimIndent(/* js */ `
        import { getModule, getModuleAsync } from "../federation-shared.js";
        const React = getModule("@runtime/federation/shared/react"),
              {
                useState
              } = React;
        import styled from 'styled-components';
        import Box from 'my-ui-lib/box';
        const Button = React.lazy(() => getModuleAsync("@runtime/federation/remote/lib1/button"));
        const StyledBox = styled(Box);

        function App() {
          return <StyledBox>
            <h1>hello</h1>
            <Button>Click me</Button>
            </StyledBox>;
        }
      `)
    );
  });
});
