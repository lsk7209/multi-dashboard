import { existsSync, readFileSync } from "node:fs";
import YAML from "yaml";

interface Site {
  id: string;
  name?: string;
  enabled?: boolean;
  platform?: string;
  url?: string;
  wpRestBase?: string;
  ga4PropertyId?: string;
  gscSiteUrl?: string;
}

interface SitesFile {
  sites?: Site[];
}

export interface DashboardData {
  generatedAt: string;
  sites: Site[];
  enabledCount: number;
  wordpressCount: number;
  configuredCount: number;
  missingSiteConfig: boolean;
}

export function getDashboardData(): DashboardData {
  const path = "scripts/setup/sites.yaml";
  const sites = readSites(path);
  const enabledSites = sites.filter((site) => site.enabled !== false);
  const wordpressSites = enabledSites.filter((site) => site.platform === "wordpress");
  const configuredSites = enabledSites.filter((site) => hasRequiredSiteFields(site));

  return {
    generatedAt: new Date().toISOString(),
    sites: enabledSites,
    enabledCount: enabledSites.length,
    wordpressCount: wordpressSites.length,
    configuredCount: configuredSites.length,
    missingSiteConfig: enabledSites.length === 0,
  };
}

function readSites(path: string): Site[] {
  if (!existsSync(path)) {
    return [];
  }

  const raw = readFileSync(path, "utf8");
  const parsed = (YAML.parse(raw) ?? {}) as SitesFile;
  return parsed.sites ?? [];
}

function hasRequiredSiteFields(site: Site): boolean {
  if (!site.id || !site.platform || !site.url) {
    return false;
  }

  if (site.platform === "wordpress" && !site.wpRestBase) {
    return false;
  }

  return true;
}
