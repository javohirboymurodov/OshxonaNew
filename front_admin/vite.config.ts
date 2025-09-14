import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2015',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Ant Design - split into smaller chunks
          'antd-core': ['antd/lib/layout', 'antd/lib/menu', 'antd/lib/button', 'antd/lib/input'],
          'antd-data': ['antd/lib/table', 'antd/lib/form', 'antd/lib/select', 'antd/lib/date-picker'],
          'antd-ui': ['antd/lib/modal', 'antd/lib/notification', 'antd/lib/spin', 'antd/lib/card'],
          'antd-icons': ['@ant-design/icons'],
          
          // State management
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'query-vendor': ['@tanstack/react-query'],
          
          // UI Libraries
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers'],
          
          // Utilities
          'utils': ['axios', 'dayjs', 'date-fns'],
          
          // Maps and charts
          'maps-charts': ['leaflet', 'react-leaflet', '@ant-design/plots'],
          
          // Performance libraries
          'performance': ['react-window', 'react-window-infinite-loader'],
          
          // Socket and real-time
          'realtime': ['socket.io-client'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      '@reduxjs/toolkit',
      'react-redux',
      '@tanstack/react-query',
      'axios'
    ],
    exclude: ['@ant-design/icons']
  },
})
