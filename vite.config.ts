import { defineConfig } from 'vite';
import { resolve } from 'path';
import { apiPlugin } from './src/server/apiPlugin';

export default defineConfig({
  plugins: [apiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    watch: {
      usePolling: process.env.VITE_USE_POLLING === 'true'
    }
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        profile: resolve(__dirname, 'profile.html')
      }
    }
  }
});
