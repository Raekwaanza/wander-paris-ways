import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    // Nitro packages the ordinary SSR application. The mobile config deliberately omits it.
    command === "build" && nitro({ defaultPreset: "cloudflare-module" }),
    viteReact(),
  ],
  server: {
    host: "::",
    port: 8080,
  },
  resolve: { tsconfigPaths: true },
}));
