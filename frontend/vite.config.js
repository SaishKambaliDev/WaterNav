import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, keep the browser API URL same-origin and forward it to Express.
// Production is served by Express, so no proxy is involved there.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
});
