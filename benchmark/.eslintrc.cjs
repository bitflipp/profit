/* eslint-env node */

module.exports = {
  env: {
    node: true,
  },
  extends: "modern",
  parserOptions: {
    sourceType: "module",
    ecmaVersion: "latest",
  },
  rules: {
    "no-process-exit": "off",
  },
};
