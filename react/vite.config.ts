import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
// Fixed absolute base: the built bundle's asset URLs always carry the public
// mount prefix. public/web.config rewrites requests for that exact prefix
// back to the App Service root, so the same build serves both
// /retail-inventory-control/react/* and the App Service root directly.
// See factory/standards/publishing-base-path.md — the mount segment matches
// this app's own id, the standard's default rule (no override needed).
export default defineConfig({
  plugins: [tailwindcss()],
  base: '/retail-inventory-control/react/',
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true, headers: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } },
});
