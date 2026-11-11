
// Imports the shared Capacitor configuration type for native platform builds.
import type { CapacitorConfig } from "@capacitor/cli";

// Defines the shared application identity and bundled web output for Android and iOS.
const config: CapacitorConfig = {
  // Uses the same stable bundle identifier on both native platforms.
  appId: "com.uniable.app",
  // Sets the app name displayed on the device home screen.
  appName: "UniAble",
  // Points native projects to Vite's production web bundle.
  webDir: "dist",
  // Keeps Android's established HTTP asset-loading scheme unchanged.
  server: {
    androidScheme: "http"
  }
};

// Exports the configuration used by Capacitor's Android and iOS commands.
export default config;
