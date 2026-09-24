#!/usr/bin/env node
// Production static host for the Retail Inventory & Order Fulfillment Control
// Tower showcase, for Linux App Service (no IIS/web.config there — this is
// the actual running process). Serves the Vite build output (dist/) with SPA
// fallback routing, a /healthz endpoint, immutable caching for hashed assets,
// and no-cache for index.html so releases appear immediately.
// JSON profile: public changes stay in the current browser tab only; the
// customer/local profile persists to that browser's localStorage. No API, no
// database — this process only serves static files.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, posix } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('./dist', import.meta.url));
const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || '0.0.0.0';

// The build's fixed Vite `base` makes every asset reference absolute under
// this prefix (see src/basePath.ts, factory/standards/publishing-base-path.md),
// but Vite still places files flat in dist/ (dist/assets/*, not
// dist/retail-inventory-control/react/assets/*). Strip the prefix before
// resolving a file, the same way public/web.config's IIS rewrite rule does
// for Windows App Service — this is that rule's Linux/Node equivalent.
const mountPath = '/retail-inventory-control/react';
function stripMountPath(pathname) {
  if (pathname === mountPath || pathname.startsWith(`${mountPath}/`)) {
    return pathname.slice(mountPath.length) || '/';
  }
  return pathname;
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

// Vite assets look like /assets/index-jO9qD4dd.js (name + '-' + content hash).
// All content-hashed files are safe to cache for a year; index.html is not.
const isHashedAsset = (pathname) => /\/assets\/[^/]+[-.][0-9a-zA-Z_]{6,}\.(js|mjs|css|woff2?|png|svg|jpg|jpeg|ico|map)$/.test(pathname) || /\/assets\/[^/]+[-.][0-9a-zA-Z__-]{8,}\.(woff|ttf|eot)$/.test(pathname);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const send = (status, body, headers) => {
    response.writeHead(status, { 'content-length': Buffer.byteLength(body), ...headers });
    response.end(body);
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return send(405, `Method ${request.method} not allowed`, { 'allow': 'GET, HEAD' });
  }

  if (url.pathname === '/healthz') {
    // Liveness/readiness for Azure App Service health checks.
    const healthy = existsSync(join(distDir, 'index.html'));
    return send(healthy ? 200 : 503, JSON.stringify({ status: healthy ? 'ok' : 'missing-build' }), { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  }

  // Redirect the bare root to the canonical prefixed mount path so visitors
  // who type http://host/ (or land on the App Service root) end up on the
  // vanity URL the build is authored for. Only the exact root redirects;
  // root-mode deep links like /inventory still serve the SPA directly, and
  // the prefixed path /retail-inventory-control/react/* is untouched.
  if (url.pathname === '/' && !url.search) {
    response.writeHead(302, { 'location': `${mountPath}/`, 'cache-control': 'no-store' });
    return response.end();
  }

  // Decode, strip the mount prefix, and normalize; reject traversal outside dist/.
  let pathname;
  try {
    pathname = stripMountPath(decodeURIComponent(url.pathname));
  } catch {
    return send(400, 'Bad request', { 'content-type': 'text/plain; charset=utf-8' });
  }
  const relative = posix.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = normalize(join(distDir, relative));
  if (!filePath.startsWith(distDir)) {
    return send(403, 'Forbidden', { 'content-type': 'text/plain; charset=utf-8' });
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    // SPA fallback: serve index.html for direct routes such as /inventory.
    const indexPath = join(distDir, 'index.html');
    if (!existsSync(indexPath)) return send(404, 'Build output not found', { 'content-type': 'text/plain; charset=utf-8' });
    const html = createReadStream(indexPath);
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache, must-revalidate' });
    html.pipe(response);
    return;
  }

  const type = mimeTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  const headers = {
    'content-type': type,
    'x-content-type-options': 'nosniff',
  };
  if (isHashedAsset(pathname)) {
    headers['cache-control'] = 'public, max-age=31536000, immutable';
  } else {
    headers['cache-control'] = 'no-cache, must-revalidate';
  }

  const stats = statSync(filePath);
  if (request.method === 'HEAD') {
    response.writeHead(200, { ...headers, 'content-length': stats.size });
    return response.end();
  }
  response.writeHead(200, { ...headers, 'content-length': stats.size });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Retail Inventory & Order Fulfillment Control Tower listening on http://${host}:${port}`);
  console.log(`Serving ${distDir} with SPA fallback and /healthz monitoring.`);
});
