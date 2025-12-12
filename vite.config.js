import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

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
          // 为不同的入口文件设置不同的输出名称
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return `${chunkInfo.name}.js`
          }
          return 'assets/[name]-[hash].js'
        }
      }
    }
  }
})
