import { defineConfig } from 'vite';
import { resolve } from 'path';
import { apiPlugin } from './src/server/apiPlugin';

const rawAllowedHosts = process.env.ALLOWED_HOSTS || process.env.VITE_ALLOWED_HOSTS || 'true';
const allowedHosts: string[] | true =
  rawAllowedHosts === 'true' || rawAllowedHosts === 'all' || rawAllowedHosts === '*'
    ? true
    : rawAllowedHosts
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);

export default defineConfig({
  plugins: [apiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    allowedHosts: allowedHosts,
    watch: {
      usePolling: process.env.VITE_USE_POLLING === 'true'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: allowedHosts
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
