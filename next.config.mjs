/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/*": [
      "data/site-stats.json",
      "scripts/setup/sites.yaml",
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
