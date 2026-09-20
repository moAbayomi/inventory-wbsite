import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import reactPlugin from "eslint-plugin-react"
import { defineConfig, globalIgnores } from 'eslint/config'

/** @type {import('eslint').Linter.Config[]}  */
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...reactPlugin.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true, 
        }
      }
    },
    rules: {
      "react/no-unescaped-entities": "off",
      "react/prop-types": "off",
    }
  },
])
