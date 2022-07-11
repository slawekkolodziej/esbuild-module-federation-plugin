import { trimIndent } from "../../utils/testUtils";
import { astToCode, codeToAst } from "../../utils/astUtils";
import { transformAddInitSharingCall } from "../transformAddInitSharingCall";

function transformCode(code) {
  const ast = codeToAst(code);

  transformAddInitSharingCall(ast, {
    loadFnName: "loadDeps",
  });

  return astToCode(ast);
}

describe("transformAddInitSharingCall", () => {
  it("transforms import declarations into dynamic imports", () => {
    const code = trimIndent(/* js */ `
      import { getModuleAsync } from "./federation-shared.js";

      function loadDeps() {
        return Promise.all([getModuleAsync("@runtime/federation/shared/react"), getModuleAsync("@runtime/federation/shared/react-dom")]).then(main);
      }

      function main([{
        initSharing
      }, Vk, {
        createRoot: Wk
      }]) {}

      loadDeps()
    `);

    const result = transformCode(code);

    expect(trimIndent(result)).toEqual(
      trimIndent(/* js */ `
        import { getModuleAsync, initSharing } from "./federation-shared.js";

        function loadDeps() {
          return Promise.all([getModuleAsync("@runtime/federation/shared/react"), getModuleAsync("@runtime/federation/shared/react-dom")]).then(main);
        }
  
        function main([{
          initSharing
        }, Vk, {
          createRoot: Wk
        }]) {}

        initSharing().then(loadDeps)
      `)
    );
  });
});
