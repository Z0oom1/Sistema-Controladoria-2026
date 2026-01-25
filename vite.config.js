import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'frontend', // Onde estão seus HTML/JS
  base: './',      // Caminho relativo para facilitar o build final
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
        input: {
            main: path.resolve(__dirname, 'frontend/pages/login.html'), // Ponto de entrada
            // Adicione outras páginas aqui se necessário
        }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Redireciona chamadas da API para o seu servidor Node (porta 2006)
      '/api': {
        target: 'http://localhost:2006',
        changeOrigin: true,
        secure: false
      },
      // Redireciona a conexão do Socket.IO para o servidor Node
      '/socket.io': {
        target: 'http://localhost:2006',
        ws: true,
        changeOrigin: true
      }
    }
  }
});