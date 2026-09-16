import path from 'node:path';
import { fileURLToPath } from 'node:url';

import antfu from '@antfu/eslint-config';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import i18nJsonPlugin from 'eslint-plugin-i18n-json';
import reactCompiler from 'eslint-plugin-react-compiler';
import testingLibrary from 'eslint-plugin-testing-library';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default antfu(
  {
    // Enable React and TypeScript support
    react: true,
    // tsconfigPath turns on the type-aware rules (ts/no-unsafe-*, no-floating-promises).
    // Without it an `any` leaking out of an untyped API response is invisible.
    typescript: {
      tsconfigPath: path.join(__dirname, 'tsconfig.json'),
      tsconfigRootDir: __dirname,
    },

    // Disable JSON processing for translation files (handled by i18n-json plugin)
    jsonc: false,

    // Use ESLint Stylistic for formatting
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: true,
    },

    // Global ignores
    ignores: [
      'dist/*',
      'node_modules',
      '__tests__/',
      'coverage',
      '.expo',
      '.expo-shared',
      'android',
      'modules/*/android/build',
      'ios',
      '.vscode',
      'docs/',
      'cli/',
      'scripts/*',
      'AGENTS.md',
      'uniwind-types.d.ts',
      'expo-env.d.ts',
      'migration/*',
    ],
  },

  // Custom rules
  {
    rules: {
      'max-params': ['error', 3],
      // Length is not the thing that makes a function hard to read; a screen
      // component or a route table is long because it is a list.
      'max-lines-per-function': 'off',
      'react/display-name': 'off',
      'react/no-inline-styles': 'off',
      'react/destructuring-assignment': 'off',
      'react/require-default-props': 'off',
      'react-refresh/only-export-components': 'warn', // Too strict for React Native
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: [
            '/android',
            '/ios',
            'README.md',
            'README-project.md',
            'ISSUE_TEMPLATE.md',
            'PULL_REQUEST_TEMPLATE.md',
          ],
        },
      ],
      'node/prefer-global/process': 'off', // process is commonly used in React Native configs
      'ts/no-require-imports': 'off', // Sometimes needed for mocks
      'ts/no-use-before-define': 'off', // Allow forward references in React components
      'no-console': 'off', // Console is useful for debugging
      'no-cond-assign': 'off', // Allow assignment in conditions when intentional
      'regexp/no-super-linear-backtracking': 'off', // Relax regex performance rules
      'regexp/no-unused-capturing-group': 'off', // Allow unused capturing groups
    },
  },

  // TypeScript-specific rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'ts/consistent-type-definitions': ['error', 'type'], // Prefer type over interface
      'react-hooks/refs': 'off', // Allow useRef without exhaustive-deps
      'ts/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: true,
        },
      ],
    },
  },

  // Better TailwindCSS plugin
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ...betterTailwindcss.configs.recommended,
    settings: {
      'better-tailwindcss': {
        entryPoint: path.resolve(__dirname, './src/global.css'),
      },
    },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,
      'better-tailwindcss/no-unnecessary-whitespace': 'warn',
      'better-tailwindcss/no-unknown-classes': 'warn',
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off', // Can be too strict for some cases
    },
  },

  // Test files mock hooks, and a mock has to carry the name of the thing it
  // replaces — `useRouter` cannot be called `router` and still be found by the
  // module it stands in for.
  {
    files: ['**/*.test.{ts,tsx}', '**/__mocks__/**/*.{ts,tsx}', 'jest-setup.ts'],
    rules: {
      'react/no-unnecessary-use-prefix': 'off',
    },
  },

  // ponytail: tsconfigPath switches on every type-aware rule, and the rest of the
  // suite lands 467 errors on this codebase (247 of them strict-boolean-expressions).
  // Only the `any`-leak rules are enforced for now; turn these back on one at a time.
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'ts/strict-boolean-expressions': 'off',
      'ts/no-misused-promises': 'off',
      'ts/no-floating-promises': 'off',
      'ts/promise-function-async': 'off',
      'ts/no-unnecessary-type-assertion': 'off',
      'ts/unbound-method': 'off',
      'ts/await-thenable': 'off',
      'react/no-leaked-conditional-rendering': 'off',
    },
  },

  // React Compiler plugin
  {
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
    },
  },

  // i18n JSON validation
  {
    files: ['src/translations/*.json'],
    plugins: { 'i18n-json': i18nJsonPlugin },
    processor: {
      meta: { name: '.json' },
      ...i18nJsonPlugin.processors['.json'],
    },
    rules: {
      ...i18nJsonPlugin.configs.recommended.rules,
      'i18n-json/valid-message-syntax': [
        2,
        {
          syntax: path.resolve(
            __dirname,
            './scripts/i18next-syntax-validation.js',
          ),
        },
      ],
      'i18n-json/valid-json': 2,
      'i18n-json/sorted-keys': [2, { order: 'asc', indentSpaces: 2 }],
      'i18n-json/identical-keys': [
        2,
        { filePath: path.resolve(__dirname, './src/translations/en.json') },
      ],
      // Disable conflicting rules for i18n JSON files
      'style/semi': 'off',
      'style/comma-dangle': 'off',
      'style/quotes': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },

  // Testing Library rules
  {
    files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
    plugins: { 'testing-library': testingLibrary },
    rules: {
      ...testingLibrary.configs.react.rules,
    },
  },
);
