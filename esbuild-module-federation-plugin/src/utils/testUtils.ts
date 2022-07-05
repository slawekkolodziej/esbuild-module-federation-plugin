import path from "path";
import vm from "vm";
import { promisify } from "util";
import rimraf from "rimraf";
import esbuild from "esbuild";
import babelParser from "@babel/parser";
import generate from "@babel/generator";

export const emptyDir = promisify(rimraf);

function createSyntheticModule(moduleMock, context) {
  const exportNames = Object.keys(moduleMock);

  return new vm.SyntheticModule(
    exportNames,
    function () {
      exportNames.forEach((exportName) => {
        this.setExport(exportName, moduleMock[exportName]);
      });
    },
    { context }
  );
}

function createModule(moduleMock, context, importModuleDynamically) {
  return new vm.SourceTextModule(moduleMock, {
    importModuleDynamically,
    context,
  });
}

function linkerFactory(modules, context) {
  const linker = (dep) => {
    const moduleMock = modules[dep];

    if (typeof moduleMock === "string") {
      return createModule(moduleMock, context, dynamicLoader);
    }

    return createSyntheticModule(moduleMock, context);
  };

  const dynamicLoader = async (moduleName) => {
    const esModule = linker(moduleName);

    await esModule.link(linker);
    await esModule.evaluate();

    return esModule;
  };

  return {
    dynamicLoader,
    linker,
  };
}

export async function mockModule(code, modules) {
  const context = vm.createContext({
    require: (mod) => modules[mod],
    globalThis: {},
  });
  const { dynamicLoader, linker } = linkerFactory(modules, context);
  const moduleMock = createModule(code, context, dynamicLoader);
  await moduleMock.link(linker);
  await moduleMock.evaluate();

  return [moduleMock, context.globalThis];
}

const WHITE_SPACE_RE = /^(\s+)/;

export function trimIndent(str = '') {
  const lines = str.trim().split("\n");

  return lines.map((line) => line.replace(WHITE_SPACE_RE, "")).join("\n");
}

export async function buildFixture(fixtureName, options) {
  const src = path.resolve(__dirname, "../../fixtures", fixtureName, "src");
  const outdir = path.resolve(src, "../out");

  await emptyDir(outdir);

  await esbuild.build({
    ...options,
    absWorkingDir: src,
    outdir,
  });

  return outdir;
}
