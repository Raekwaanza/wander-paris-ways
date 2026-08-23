import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// A separate SPA-shell build stays independent from the web Cloudflare deployment. Only
// mobile-dist/client is copied into Capacitor; mobile-dist/server is build-time
// machinery and never enters the native application.
export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      spa: {
        enabled: true,
        maskPath: "/",
        prerender: { outputPath: "/index" },
      },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    viteReact(),
  ],
  base: "./",
  build: {
    outDir: "mobile-dist",
    // The SPA prerender executes server route modules at build time, but this virtual module
    // exists only in the deployed Worker runtime. Capacitor copies only mobile-dist/client.
    rolldownOptions: { external: ["cloudflare:workers"] },
  },
  resolve: { tsconfigPaths: true },
});
