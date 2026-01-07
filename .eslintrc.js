module.exports = {
  extends: [
    'next/core-web-vitals',
    'next/typescript',
    'prettier',
  ],
  plugins: ['boundaries'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          {
            from: ['features'],
            allow: ['components', 'lib'],
          },
          {
            from: ['components'],
            allow: ['lib'],
          },
          {
            from: ['app'],
            allow: ['features', 'components', 'lib'],
          },
          {
            from: ['lib'],
            allow: ['lib'],
          },
        ],
      },
    ],
  },
  settings: {
    'boundaries/elements': [
      {
        type: 'app',
        pattern: 'app/*',
        mode: 'folder',
      },
      {
        type: 'features',
        pattern: 'features/*',
        mode: 'folder',
      },
      {
        type: 'components',
        pattern: 'components/*',
      },
      {
        type: 'lib',
        pattern: 'lib/*',
      },
    ],
  },
}
