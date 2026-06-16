import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'frontend',
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
        input: {
            // Definindo explicitamente o nome da saída para manter a estrutura de subpastas
            'index': path.resolve(__dirname, 'frontend/index.html'),
            'pages/login': path.resolve(__dirname, 'frontend/pages/login.html'),
            'pages/home': path.resolve(__dirname, 'frontend/pages/home.html')
        },
        output: {
            manualChunks(id) {
                if (id.includes('node_modules')) {
                    return 'vendor';
                }
            }
        }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:2006',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:2006',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
