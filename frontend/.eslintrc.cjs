/* eslint-env node */

module.exports = {
  root: true,
  extends: ["modern", "plugin:vue/vue3-essential", "eslint:recommended", "@vue/eslint-config-prettier"],
  env: {
    "vue/setup-compiler-macros": true,
  },
};
