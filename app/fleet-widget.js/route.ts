import fleetSites from "../lib/affiliate-fleet-sites.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fleetWidgetSource(): string {
  return `(() => {
  'use strict';
  const sites = ${JSON.stringify(fleetSites)};
  const bootstrap = document.currentScript?.src;
  if (!bootstrap) return;
  const host = location.hostname.toLowerCase();
  if (location.protocol !== 'https:' || location.port || !Object.hasOwn(sites, host)) return;
  const site = sites[host];
  const path = location.pathname.toLowerCase();
  if (/(?:^|\\/)(?:api|admin|wp-admin|wp-login\\.php|auth|account|my-account|cart|checkout|login|register)(?:\\/|$)/.test(path)) return;
  if (document.querySelector('script[data-affiliate-fleet-widget]')) return;
  if ([...document.scripts].some(script => {
    try { return ['/category-widget.js', '/widget.js'].includes(new URL(script.src).pathname); } catch { return false; }
  })) return;
  const install = () => {
    if (document.querySelector('script[data-affiliate-fleet-widget]')) return;
    const script = document.createElement('script');
    script.src = new URL('/category-widget.js', bootstrap).href;
    script.dataset.siteKey = site;
    script.dataset.affiliateFleetWidget = '';
    script.async = true;
    document.head.append(script);
  };
  if (document.head) install(); else document.addEventListener('DOMContentLoaded', install, { once: true });
})();`;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/fleet-widget.js" || url.search) return new Response(null, { status: 404 });
  return new Response(fleetWidgetSource(), { headers: {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
