import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'ChatYuk Web',
        short_name: 'ChatYuk',
        description: 'ChatYuk di browser — obrolan realtime, ringan, dan cepat.',
        theme_color: '#2196f3',
        background_color: '#0b1117',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
    {
      name: 'manifest-credentials',
      apply: 'build',
      closeBundle() {
        const file = 'dist/index.html'
        const html = readFileSync(file, 'utf8')
        writeFileSync(
          file,
          html.replace(
            '<link rel="manifest" href="/manifest.webmanifest">',
            '<link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials">',
          ),
        )
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
