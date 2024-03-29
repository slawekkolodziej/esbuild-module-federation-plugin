import path from "path";

export function getRelativeChunkPath(build) {
  return (
    (build.initialOptions.chunkNames ?? "[name]-[hash]")
      .split("/")
      .slice(0, -1)
      .map(() => "..")
      .join("/") || "."
  );
}

export function generateUniqueIdentifier(code, prefix = "var") {
  let i = 0;
  let varName = `__${prefix}${i}`;

  while (code.indexOf(varName) > -1) {
    varName = `${prefix}${i}`;
    i++;
  }

  return varName;
}

export function isNodeBuild(build) {
  return (
    build.initialOptions.format === "cjs" &&
    build.initialOptions.platform === "node"
  );
}

export function getRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath);
}
