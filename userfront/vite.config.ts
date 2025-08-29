import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003
  },
  // Vercel uchun qo'shimcha sozlamalar
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  preview: {
    port: 3003
  }
})