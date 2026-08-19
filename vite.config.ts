import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.BASE_PATH ??
  (process.env.GITHUB_ACTIONS === "true" && repositoryName ? `/${repositoryName}/` : "/");

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["robots.txt", "icons/apple-touch-icon-v2.png"],
      manifest: {
        name: "放射線技師ナレッジノート",
        short_name: "放射線ノート",
        description: "放射線技師のための個人用ナレッジノート",
        theme_color: "#f7faf9",
        background_color: "#f7faf9",
        display: "standalone",
        start_url: ".",
        scope: ".",
        lang: "ja",
        categories: ["medical", "education", "productivity"],
        icons: [
          {
            src: "icons/icon-192-v2.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512-v2.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,webp,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[^/]+\/storage\/v1\/object\//i,
            handler: "CacheFirst",
            options: {
              cacheName: "note-images",
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost/" } },
    setupFiles: "./src/test/setup.ts",
  },
});
