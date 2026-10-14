import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';
import checkFile from 'eslint-plugin-check-file';

export default [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'prisma/**', '*.config.*', '.vscode/**'] },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },

    plugins: {
      boundaries,
      'check-file': checkFile,
    },

    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
      },
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app', mode: 'folder' },
        { type: 'views', pattern: 'src/views/*', mode: 'folder', capture: ['slice'] },
        { type: 'widgets', pattern: 'src/widgets/*', mode: 'folder', capture: ['slice'] },
        { type: 'features', pattern: 'src/features/*', mode: 'folder', capture: ['slice'] },
        { type: 'entities', pattern: 'src/entities/*', mode: 'folder', capture: ['slice'] },
        { type: 'shared', pattern: 'src/shared', mode: 'folder' },
        { type: 'server', pattern: 'src/server', mode: 'folder' },
      ],
    },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
      ],

      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message: 'Модуль нижчого слою (${file.type}) не може імпортувати модуль вищого слою (${dependency.type})',
          rules: [
            { from: 'app', allow: ['views', 'widgets', 'features', 'entities', 'shared', 'server'] },
            { from: 'views', allow: ['widgets', 'features', 'entities', 'shared', 'server'] },
            { from: 'widgets', allow: ['features', 'entities', 'shared'] },
            { from: 'features', allow: ['entities', 'shared', 'server'] },
            { from: 'entities', allow: ['shared'] },
            { from: 'server', allow: ['entities', 'shared'] },
          ],
        },
      ],

      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          message:
            'Модуль (${file.type}) повинен імпортуватися через Public API. Прямий імпорт з (${dependency.source}) заборонений',
          rules: [
            { target: 'views', allow: '*.page.tsx' },
            { target: ['views', 'widgets', 'features', 'entities'], allow: 'index.{ts,tsx}' },
            { target: ['shared', 'server'], allow: '**' },
          ],
        },
      ],
    },
  },
];
