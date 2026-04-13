import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const commitHash = execSync('git rev-parse --short=7 HEAD').toString().trim()

export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8001',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
