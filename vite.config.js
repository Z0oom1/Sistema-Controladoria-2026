import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'frontend', // O Vite passa a operar DIRETAMENTE dentro da pasta frontend
  base: '/',        // Essencial para o roteamento de SPA/Multipáginas na nuvem
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
        input: {
            // Caminhos relativos à pasta 'frontend' (que é a root)
            index: path.resolve(__dirname, 'frontend/index.html'),
            login: path.resolve(__dirname, 'frontend/pages/login.html'),
            home: path.resolve(__dirname, 'frontend/pages/home.html')
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
