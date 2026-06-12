import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw-push.js',
      registerType: 'autoUpdate',
      // We register the SW ourselves in src/pwa.js (with auto-reload on update).
      // Disable the plugin's minimal auto-register to avoid a double registration.
      injectRegister: null,
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png', 'logo.svg'],
      manifest: {
        id: '/',
        name: 'Gosto Puro',
        short_name: 'Gosto Puro',
        description: 'Ricette sane, fitness e per ogni occasione',
        theme_color: '#2D6A4F',
        background_color: '#F0FDF4',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'it',
        dir: 'ltr',
        categories: ['food', 'lifestyle', 'health'],
        launch_handler: { client_mode: 'navigate-existing' },
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
