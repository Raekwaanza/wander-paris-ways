import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const scenicE2EFixtures =
    command === "serve" && process.env["SCENIC_E2E_FIXTURES"] === "1" ? "1" : "0";

  return {
    plugins: [
      cloudflare({
        viteEnvironment: { name: "ssr" },
        config: (config) => ({
          vars: { ...(config.vars ?? {}), SCENIC_E2E_FIXTURES: scenicE2EFixtures },
        }),
      }),
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
      viteReact(),
    ],
    server: {
      host: "::",
      port: 8080,
    },
    resolve: { tsconfigPaths: true },
  };
});
