import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'frontend', // Onde estão seus HTML/JS
  base: '/',        // Garante caminhos absolutos corretos na nuvem
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
        input: {
            // Nomeando as chaves explicitamente com 'pages/' força o Vite a recriar a subpasta dentro de /dist
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
