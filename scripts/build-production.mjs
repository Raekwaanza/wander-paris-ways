// Cloudflare's Vite plugin emits required process-env secrets into the server
// build's .dev.vars file for local preview. Production bundles must not capture
// provider credentials from the shell that invokes the build.
delete process.env.OPENROUTESERVICE_API_KEY;
delete process.env.MAPTILER_API_KEY;

const viteBuild = Bun.spawn([process.execPath, "x", "vite", "build"], {
  env: process.env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exitCode = await viteBuild.exited;
