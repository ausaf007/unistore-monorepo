import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin /api in dev — no CORS setup needed on the Express side.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
