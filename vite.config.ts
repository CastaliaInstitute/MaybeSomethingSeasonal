import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['iOS >= 9', 'Safari >= 9'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    })
  ],
  // Served from the root of the custom domain (public/CNAME); GitHub redirects
  // the old castaliainstitute.github.io/MaybeSomethingSeasonal/ URL there.
  base: '/',
  build: {
    outDir: 'dist',
    target: 'es5',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  }
})
