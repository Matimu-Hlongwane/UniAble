import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allows access via tunnels (e.g. ngrok) during mobile testing.
    // Narrow this to your own tunnel host in production use.
    allowedHosts: true,
  },
});
