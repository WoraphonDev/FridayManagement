import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import refresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'contracts/**', 'reports/**'] },
  ...tseslint.configs.recommended,
  { files: ['**/*.ts', '**/*.tsx'], rules: { '@typescript-eslint/no-explicit-any': 'error' } },
  {
    files: ['frontend/src/**/*.tsx'],
    plugins: { 'react-hooks': hooks, 'react-refresh': refresh },
    rules: { ...hooks.configs.recommended.rules, 'react-refresh/only-export-components': 'warn' },
  },
);
