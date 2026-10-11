import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { host: true },
  build: { chunkSizeWarningLimit: 1200 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Our own service worker (src/sw.ts) so it can also receive push notifications.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      includeAssets: ['icon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Running Low',
        short_name: 'Running Low',
        description: 'A shared list for the things we’re running low on.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F2F2F7',
        theme_color: '#F2F2F7',
        icons: [
          { src: 'pwa-64x64.png?v=basket', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png?v=basket', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png?v=basket', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png?v=basket', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
