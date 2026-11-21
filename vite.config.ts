import { defineConfig } from 'vite';
import { resolve } from 'path';
import { apiPlugin } from './src/server/apiPlugin';

export default defineConfig({
  plugins: [apiPlugin()],
  server: {
    port: 5173,
    open: true
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
