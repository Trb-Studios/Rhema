import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri serves the interface from this dev server while developing, then from the
// built files in dist/ once packaged. The fixed port matches tauri.conf.json.
export default defineConfig({
  // Relative asset paths, so a build also works when served from a subpath.
  base: './',
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    // Cargo writes thousands of files under src-tauri/target while building; watching
    // them crashes the dev server on Windows when a build script is locked (EBUSY).
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    outDir: 'dist',
    target: 'chrome105',
    sourcemap: true,
  },
});
