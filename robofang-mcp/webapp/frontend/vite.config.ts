import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['goliath'],
    port: 10873,
    host: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:10871", changeOrigin: true },
    },
  },
});
