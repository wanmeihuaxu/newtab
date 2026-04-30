import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function sanitizeFileName(name) {
  if (name.startsWith('_')) {
    return 'chunk' + name.slice(1)
  }
  return name
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        popup: path.resolve(__dirname, 'popup.html'),
        background: path.resolve(__dirname, 'src/background.js'),
        content: path.resolve(__dirname, 'src/content.js')
      },
      output: {
        entryFileNames: chunkInfo => {
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return `${chunkInfo.name}.js`
          }
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: chunkInfo => {
          const name = sanitizeFileName(chunkInfo.name)
          return `assets/${name}-[hash].js`
        },
        assetFileNames: assetInfo => {
          const name = assetInfo.name || 'asset'
          const sanitized = sanitizeFileName(name)
          if (sanitized.endsWith('.css')) {
            return `assets/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        }
      }
    }
  }
})
