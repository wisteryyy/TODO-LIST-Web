import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Проксируем запросы к бэкенду, чтобы не было проблем с CORS в разработке
    proxy: {
      '/auth': 'http://localhost:3000',
      '/tasks': 'http://localhost:3000',
    },
  },
});