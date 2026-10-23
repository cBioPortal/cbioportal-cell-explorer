import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify('0.0.1-component'),
    __COMMIT_HASH__: JSON.stringify('component'),
    'import.meta.env.VITE_ENABLE_STATS_WIDGET': JSON.stringify('false'),
    'import.meta.env.VITE_ENABLE_PROFILER': JSON.stringify('false'),
    'import.meta.env.VITE_ENABLE_POSTMESSAGE': JSON.stringify('false'),
  },
  worker: {
    format: 'es',
    plugins: () => [react()],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
      output: {
        inlineDynamicImports: true,
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        assetFileNames: (asset) => (asset.name?.endsWith('.css') ? 'style.css' : asset.name ?? '[name][extname]'),
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  plugins: [
    {
      name: 'inline-workers',
      enforce: 'pre',
      transform(code) {
        if (code.includes('?worker')) {
          return code.replace(/\?worker(['"])/g, '?worker&inline$1')
        }
      },
    },
    react(),
  ],
})
