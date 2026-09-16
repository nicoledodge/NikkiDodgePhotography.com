import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // replace with your repository name
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
      '/uploads': process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
    },
  },
})
