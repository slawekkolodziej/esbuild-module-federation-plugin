import { trimIndent } from "../../utils/testUtils";
import { astToCode, codeToAst } from "../../utils/astUtils";
import { transformImportDeclarations } from "../../transforms/transformImportDeclarations";

function transformCode(code) {
  const ast = codeToAst(code);

  transformImportDeclarations(ast);

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
        Promise.all([import("react"), import("react-dom")]).then(([React, {
          render,
          hydrate: reactHydrate
        }]) => {
          const {
            useMemo,
            useState: useState2
          } = React;
          const RemoteModule = React.lazy(() => import('myremote/someModule'));
          console.log(React, RemoteModule, render);
        })
      `)
    );
  });

  it("can handle duplicated imports", () => {
    const code = trimIndent(/* js */ `
      import React3 from "@runtime/federation/shared/react";
      import { createRoot } from "@runtime/federation/shared/react-dom";

      init_define_process_env_REMOTE_HOSTS();
      import React2 from "@runtime/federation/shared/react";

      import React, { createContext, lazy, useContext } from "@runtime/federation/shared/react";
    `);

    const result = transformCode(code);

    expect(trimIndent(result)).toEqual(
      trimIndent(/* js */ `
        Promise.all([import("@runtime/federation/shared/react"), import("@runtime/federation/shared/react-dom")]).then(([React3, {
          createRoot
        }]) => {
          const React2 = React3,
                React = React3,
                {
                  createContext,
                  lazy,
                  useContext
                } = React3;
          init_define_process_env_REMOTE_HOSTS();
        })
      `)
    );
  });
});
