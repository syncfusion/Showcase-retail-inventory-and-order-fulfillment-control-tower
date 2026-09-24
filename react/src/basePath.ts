const mountPath = '/retail-inventory-control/react';

/**
 * Keep one build usable both through the public vanity path and directly
 * from the App Service root. See factory/standards/publishing-base-path.md;
 * this app's mount path is the standard's default (matches the app id).
 */
export function getPublicBasePath(pathname = window.location.pathname): string {
  return pathname === mountPath || pathname.startsWith(`${mountPath}/`) ? mountPath : '';
}
