import { defineConfig } from 'vite';

export default defineConfig({
  // './' keeps the build portable: GitHub Pages project sites, Netlify,
  // Cloudflare Pages, or just opening dist/ behind any static server.
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 1600 },
});
