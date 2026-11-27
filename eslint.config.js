// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.wrangler/**',
      '**/.expo/**',
      '**/*.config.js',
      '**/*.config.cjs',
      'apps/mobile/babel.config.js',
      'apps/mobile/metro.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Clean architecture: the domain must not import frameworks or infrastructure.
    files: ['packages/domain/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'hono',
                'hono/*',
                'mongodb',
                'expo*',
                'react',
                'react-native',
                'zod',
                '@entre-nos/contracts',
                '@entre-nos/ui',
                'node:*',
              ],
              message: 'packages/domain must stay framework-free (clean architecture).',
            },
          ],
        },
      ],
    },
  },
);
