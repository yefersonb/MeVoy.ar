import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      "/create_preference": "http://localhost:3001",
      "/webhook": "http://localhost:3001",
    },
  },
  build: {
    outDir: "build",
  },
});
