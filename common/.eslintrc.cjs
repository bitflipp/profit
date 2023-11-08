/* eslint-env node */

module.exports = {
  extends: "modern",
  parserOptions: {
    sourceType: "module",
    ecmaVersion: "latest",
  },
  env: {
    mocha: true,
  },
  rules: {
    "no-continue": "off",
    "no-param-reassign": ["error", { props: false }],
  },
};
