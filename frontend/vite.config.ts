import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    base: './', // Essential for GitHub Pages relative paths
    server: {
        port: 5173,
        proxy: {
            '/ws': {
                target: 'ws://localhost:8001',
                ws: true
            },
            '/api': {
                target: 'http://localhost:8001',
                changeOrigin: true
            }
        }
    }
})
