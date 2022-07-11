import { trimIndent } from "../../utils/testUtils";
import { astToCode, codeToAst } from "../../utils/astUtils";
import { transformImportDeclarations } from "../../transforms/transformImportDeclarations";

function transformCode(code) {
  const ast = codeToAst(code);

  transformImportDeclarations(ast, {
    mainFnName: "appMain",
    loadFnName: "loadDeps",
  });

  return astToCode(ast);
}

describe("transformImportDeclarations", () => {
  it("transforms import declarations into dynamic imports", () => {
    const code = trimIndent(/* js */ `
      import React, { useMemo, useState as useState2 } from "react";
      import { render, hydrate as reactHydrate } from "react-dom";

      const RemoteModule = React.lazy(() => import('myremote/someModule'));

      console.log(React, RemoteModule, render);
    `);

    const result = transformCode(code);

    expect(trimIndent(result)).toEqual(
      trimIndent(/* js */ `
        function loadDeps() {
          return Promise.all([import("react"), import("react-dom")]).then(appMain);
        }

        function appMain([React, {
          render,
          hydrate: reactHydrate
        }]) {
          const {
            useMemo,
            useState: useState2
          } = React;
          const RemoteModule = React.lazy(() => import('myremote/someModule'));
          console.log(React, RemoteModule, render);
        }

        loadDeps()
      `)
    );
  });

  it("can handle duplicated imports", () => {
    const code = trimIndent(/* js */ `
      import React3 from "@runtime/federation/shared/react";
      import { createRoot } from "@runtime/federation/shared/react-dom";

      import React2 from "@runtime/federation/shared/react";

      import React, { createContext, lazy, useContext } from "@runtime/federation/shared/react";
    `);

    const result = transformCode(code);

    expect(trimIndent(result)).toEqual(
      trimIndent(/* js */ `
        function loadDeps() {
          return Promise.all([import("@runtime/federation/shared/react"), import("@runtime/federation/shared/react-dom")]).then(appMain);
        }

        function appMain([React3, {
          createRoot
        }]) {
          const React2 = React3,
                React = React3,
                {
                  createContext,
                  lazy,
                  useContext
                } = React3;
        }

        loadDeps()
      `)
    );
  });
});
