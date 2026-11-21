import { defineConfig } from 'vite';
import { apiPlugin } from './src/server/apiPlugin';

export default defineConfig({
  plugins: [apiPlugin()],
  server: {
    port: 5173,
    open: true
  },
  publicDir: 'public'
});
