module.exports = {
  env: {
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parser: "typescript-eslint-parser",
  },
  plugins: ["prettier"],
  extends: ["eslint:recommended"],
  rules: {
    "prettier/prettier": "error",
    "padding-line-between-statements": [
      "error",
      { blankLine: "always", prev: "import", next: "*" },
      { blankLine: "never", prev: "import", next: "import" },
    ],
    "no-unused-vars": ["error", { varsIgnorePattern: "^_" }],
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      extends: [
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
      ],
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
          },
        ],
      },
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
    },
    {
      files: ["*.tsx", "*.jsx"],
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    {
      files: ["**/__test__/**/*"],
      env: {
        jest: true,
      },
      plugins: ["vitest"],
    },
    {
      files: ["esbuild-module-federation-plugin/**/*"],
      env: {
        node: true,
      },
    },
  ],
};
