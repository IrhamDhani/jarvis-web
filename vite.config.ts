import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  // GitHub project Pages uses this prefix; Netlify overrides it with "/".
  base: process.env.VITE_BASE_PATH || "/jarvis-web/",
  plugins: [react()],
  server: { host: "0.0.0.0" },
});
