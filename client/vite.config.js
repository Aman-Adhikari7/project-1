import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The proxy forwards /api calls to the backend, so the browser never hits CORS problems.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:4000", "/socket.io": { target: "http://localhost:4000", ws: true } } },
});
