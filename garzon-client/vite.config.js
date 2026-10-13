import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";


// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (command === 'build') {
    const apiUrl = env.VITE_API_URL?.trim();
    if (!apiUrl) throw new Error('Set VITE_API_URL to the deployed backend URL ending in /api/v1 before building.');
    const url = new URL(apiUrl);
    if (url.protocol !== 'https:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname) || url.pathname.replace(/\/+$/, '') !== '/api/v1' || url.search || url.hash || url.username || url.password) {
      throw new Error('VITE_API_URL must be an HTTPS backend URL ending in /api/v1, without credentials, query parameters, or a fragment.');
    }
  }
  return {
  plugins: [react(), tailwindcss()],
  };
})
