module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    "padding-line-between-statements": [
      "error",
      { blankLine: "never", prev: "import", next: "import" },
    ],
  },
};
