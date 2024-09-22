import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './',
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
