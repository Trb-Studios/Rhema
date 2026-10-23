import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri serves the interface from this dev server while developing, then from the
// built files in dist/ once packaged. The fixed port matches tauri.conf.json.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'chrome105',
    sourcemap: true,
  },
});
