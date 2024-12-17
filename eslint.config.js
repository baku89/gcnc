import pluginJs from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		ignores: ['**/node_modules/**', 'lib/**'],
		languageOptions: {
			globals: {...globals.browser, ...globals.node},
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			'simple-import-sort': simpleImportSort,
			'unused-imports': unusedImports,
		},
		rules: {
			'no-console': 'off',
			'no-debugger': 'warn',
			eqeqeq: 'error',
			'prefer-const': 'error',
			'@typescript-eslint/no-explicit-any': 'off',
			'simple-import-sort/imports': 'error',
			'unused-imports/no-unused-imports': 'error',
			'@typescript-eslint/no-namespace': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
		},
	},
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	eslintConfigPrettier,
]
