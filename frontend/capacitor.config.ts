
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.uniable.app",
  appName: "UniAble",
  webDir: "dist",
  server: {
    androidScheme: "http"
  }
};

export default config;
