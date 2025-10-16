import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
