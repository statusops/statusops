module.exports = {
  env: {
    commonjs: true,
    es6: true,
    mocha: true,
  },
  extends: ["standard", "eslint:recommended", "plugin:prettier/recommended"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  overrides: [
    {
      files: ["*.test.js", "*/helper.js"],
      rules: {
        "no-unused-expressions": "off",
        "no-new": "off",
      },
    },
    {
      files: ["*.test.js", "*helpers.js", "*helper.js"],
      rules: {
        "no-undef": "off",
      },
    },
  ],
};
