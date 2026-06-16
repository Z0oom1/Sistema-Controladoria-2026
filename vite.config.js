import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'frontend', // Define a raiz do código fonte do front-end
  build: {
    outDir: '../dist', // Joga o resultado do build na pasta /dist na raiz do projeto
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Mapeia os pontos de entrada HTML corretamente
        login: path.resolve(__dirname, 'frontend/pages/login.html'),
        home: path.resolve(__dirname, 'frontend/pages/home.html')
      }
    }
  }
});
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
