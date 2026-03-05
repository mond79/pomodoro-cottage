import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'img/*.png', 'img/*.webp'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB로 캐싱 허용 용량 증가 (고해상도 배경화면 대응)
        navigateFallbackDenylist: [/^\/api\//, /^\/authorize/, /^\/oauth2callback/], // 백엔드 API 라우트 가로채기 방지
        runtimeCaching: [
          {
            urlPattern: /\/api\/ambient-sounds/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ambient-sounds-list-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7일
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/audio\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ambient-audio-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30일
              },
              cacheableResponse: {
                statuses: [0, 200] // 206 제거: 워크박스가 200 응답만 캐시에 넣고 Range 요청은 플러그인이 처리하게 함
              },
              rangeRequests: true // 이것만으로 충분하며, 206 상태 코드를 cacheableResponse에 넣지 않아야 합니다.
            }
          }
        ]
      },
      manifest: {
        name: 'Mond Cottage',
        short_name: 'Cottage',
        description: '감성 오두막 뽀모도로 타이머 & 플래너',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
