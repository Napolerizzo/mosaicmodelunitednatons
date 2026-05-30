import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { createReadStream, existsSync } from 'fs'
import { extname, join } from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  pdf: 'application/pdf',
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-brand-assets',
      configureServer(server) {
        server.middlewares.use('/brand-assets', (req, res, next) => {
          const filePath = join(__dirname, 'brand-assets', decodeURIComponent(req.url || '/'))
          if (existsSync(filePath)) {
            const ext = extname(filePath).slice(1).toLowerCase()
            res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
            res.setHeader('Cache-Control', 'max-age=3600')
            createReadStream(filePath).pipe(res)
          } else {
            next()
          }
        })
      }
    }
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' }
  }
})

