import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// A separate SPA-shell build keeps web SSR/Nitro deployment unchanged. Only
// mobile-dist/client is copied into Capacitor; mobile-dist/server is build-time
// machinery and never enters the native application.
export default defineConfig({
  // The SPA prerenderer uses TanStack's temporary server build. Nitro is only
  // part of the ordinary web deployment and is unnecessary for native assets.
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
    spa: {
      enabled: true,
      maskPath: "/",
      prerender: { outputPath: "/index" },
    },
  },
  vite: {
    base: "./",
    build: { outDir: "mobile-dist" },
  },
});
