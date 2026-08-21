import type { CapacitorConfig } from "@capacitor/cli";

// Provisional development identifier. Replace this single value after the
// production identifier has been registered with Apple and Google.
export const PROVISIONAL_APP_ID = "dev.scenicroute.paris";

const config: CapacitorConfig = {
  appId: PROVISIONAL_APP_ID,
  appName: "Scenic Route",
  webDir: "mobile-dist/client",
  server: {
    // Native releases always load the local bundle; intentionally no `url`.
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
