import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import YAML from "yaml";
import { z } from "zod";

const siteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  enabled: z.boolean().default(true),
  platform: z.enum(["wordpress", "nextjs", "static"]),
  url: z.string().url(),
  wpRestBase: z.string().url().optional(),
  ga4PropertyId: z.string().min(1).optional(),
  gscSiteUrl: z.string().min(1).optional(),
  sitemapUrls: z.array(z.string().url()).optional(),
  contentSource: z
    .object({
      type: z.enum(["wordpress-ssh", "local-next", "github-next"]),
      sshHost: z.string().min(1).optional(),
      sshPort: z.number().int().positive().optional(),
      sshUser: z.string().min(1).optional(),
      sshKeyPath: z.string().min(1).optional(),
      wpPath: z.string().min(1).optional(),
      localPath: z.string().min(1).optional(),
      contentGlobs: z.array(z.string().min(1)).optional(),
      scheduledFields: z.array(z.string().min(1)).optional(),
      publishedFields: z.array(z.string().min(1)).optional(),
    })
    .optional(),
});

const sitesFileSchema = z.object({
  sites: z.array(siteSchema).default([]),
});

export type Site = z.infer<typeof siteSchema>;

export async function loadSites(path = "scripts/setup/sites.yaml"): Promise<Site[]> {
  if (!existsSync(path)) {
    return [];
  }

  const raw = await readFile(path, "utf8");
  const parsed = sitesFileSchema.parse(YAML.parse(raw) ?? {});
  return parsed.sites;
}

export async function loadEnabledSites(): Promise<Site[]> {
  return (await loadSites()).filter((site) => site.enabled);
}

export function requireWordPressRestBase(site: Site): string {
  if (site.platform !== "wordpress" || !site.wpRestBase) {
    throw new Error(`Site ${site.id} is missing wpRestBase`);
  }

  return site.wpRestBase.replace(/\/$/, "");
}
