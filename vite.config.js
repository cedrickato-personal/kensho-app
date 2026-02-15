import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const isPWA = process.env.VITE_BUILD_TARGET === "pwa";

export default defineConfig({
  plugins: [
    react(),
    ...(isPWA
      ? [
          VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icon.png", "icon-192.png", "icon-512.png"],
            manifest: {
              name: "KENSHO Tracker",
              short_name: "KENSHO",
              description: "Fitness & Life Tracker — Reveal Your True Nature",
              theme_color: "#030712",
              background_color: "#030712",
              display: "standalone",
              start_url: "/",
              icons: [
                { src: "icon-192.png", sizes: "192x192", type: "image/png" },
                { src: "icon-512.png", sizes: "512x512", type: "image/png" },
                { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
                  handler: "NetworkOnly",
                },
              ],
            },
          }),
        ]
      : []),
  ],
  base: isPWA ? "/" : "./",
  build: {
    outDir: isPWA ? "dist-pwa" : "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
