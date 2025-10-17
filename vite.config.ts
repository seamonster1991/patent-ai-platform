import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],

  server: {
    port: 5174,
    host: true,
    hmr: {
      overlay: true,
      port: 24678 // HMR 포트 변경으로 캐시 회피
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // 🚨 강력한 캐시 무효화 설정
  optimizeDeps: {
    force: true, // 의존성 캐시 강제 재빌드
    include: [], // 빈 배열로 모든 의존성 재빌드 강제
    exclude: ['@vite/client', '@vite/env']
  },
  // 개발 환경에서 캐시 비활성화
  define: {
    __VITE_IS_MODERN__: 'true',
    __CACHE_BUSTER__: JSON.stringify(Date.now())
  },
  // 빌드 시 파일명에 해시 강제 적용
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`
      }
    }
  }
})
