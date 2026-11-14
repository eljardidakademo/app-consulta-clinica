// Configuración de Vite (la herramienta que construye la app).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages publica la app en https://eljardidakademo.github.io/app-consulta-clinica/
// por eso todas las rutas cuelgan de esta carpeta.
const BASE = '/app-consulta-clinica/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    // Convierte la web en una PWA instalable en el móvil y con caché sin conexión.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Consulta clínica',
        short_name: 'Consulta',
        description: 'Consulta rápida: Farmacia, Anatomía e Imagen.',
        lang: 'es-ES',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#f6f4ef',
        theme_color: '#14302b',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Las respuestas de CIMA se guardan en caché para poder verlas sin conexión,
        // pero siempre se intenta primero la red para tener el dato más reciente.
        runtimeCaching: [
          {
            // Modelos 3D de Anatomía: se guardan la primera vez que se abren (no cambian a menudo).
            urlPattern: ({ url }) => url.pathname.includes('/anatomia/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'anatomia-modelos',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/cima\.aemps\.es\/cima\/rest\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cima-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // CIMAVet (medicamentos veterinarios): misma estrategia que CIMA.
            urlPattern: /^https:\/\/cimavet\.aemps\.es\/cimavet\/rest\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cimavet-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
