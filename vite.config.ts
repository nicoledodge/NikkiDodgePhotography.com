import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // replace with your repository name
  build: {
    outDir: 'public_html', // Change output folder from 'dist' to 'public_html'
  },
  plugins: [react()],
})
