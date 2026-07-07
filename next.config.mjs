/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/*": [
      "data/site-stats.json",
      "data/ops-triage.json",
      "data/gsc-permission-audit-*.json",
      "data/fleet-optimization-chain-*.json",
      "data/dashboard-post-recovery-chain-*.json",
      "data/t3-title-content-handoff-*.json",
      "scripts/setup/sites.yaml",
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
