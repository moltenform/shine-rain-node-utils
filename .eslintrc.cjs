module.exports = {
    env: {
        browser: false, // Browser global variables like `window` etc.
        commonjs: false, // CommonJS global variables and CommonJS scoping.Allows require, exports and module.
        es6: true, // Enable all ECMAScript 6 features except for modules.
        jest: false, // Jest global variables like `it` etc.
        node: true, // Defines things like process.env when generating through node
        es2020: true, // enables globalThis
    },
    ignorePatterns: [
    ],
    globals: {
        document: true,
        window: true,
        "makePageVisible": true,
        "data": true,
        "make": true,
        "byId": true,
        "sleep": true,
        "alertBox": true,
        "getUrlSection": true,
        "getLastPathPart": true,
        "simpleSanitize": true,
        $: true,
        _: true,
        "callApiOrThrow": true,
        "callApiAndRefresh": true,
        "alert": true,
        "prompt": true,
        "confirm": true,
        "CSV": true,
        "goHome": true,
        "showAll": true,
        "hideAll": true,
        "assertTrue": true,
        ___: true,
    },
    extends: [
        'eslint:recommended',
    ],
    // parser: "babel-eslint", // Uses babel-eslint transforms.
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 2022, // use this, not 2018
        sourceType: 'module', // Allows for the use of imports
    },
    plugins: [
        'import', // eslint-plugin-import plugin. https://www.npmjs.com/package/eslint-plugin-import
        // 'unused-imports',
    ],
    root: true, // For configuration cascading.
    rules: {
        'no-debugger': 'off',
        'react/react-in-jsx-scope': 'off',
        'jsx-a11y/alt-text': 'off',
        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/no-static-element-interactions': 'off',
        'eol-last': 'off',
        'testing-library/render-result-naming-convention': 'off',
        'react-hooks/exhaustive-deps': 'off',
        'unused-imports/no-unused-imports': 'warn',
        'unused-imports/no-unused-vars': 'off',
        'no-unused-vars': 'off',
        'no-unreachable': 'warn',
        'jsx-a11y/no-noninteractive-element-interactions': 'off',
        'react/prop-types': 'off', //just use typescript if you care
    },
    settings: {
        react: {
            version: 'detect', // Detect react version
        },
    },
};
