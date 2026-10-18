import { readFileSync } from "node:fs";
import type { SiteInventory } from "./site-inventory";

export function getSiteInventory(): SiteInventory | null {
  try {
    const inventory = JSON.parse(readFileSync("data/site-inventory.json", "utf8")) as SiteInventory;
    if (!Array.isArray(inventory.sites)) return null;
    // A stored approval is only current for one day; preserve source timestamps.
    const age = Date.now() - Date.parse(inventory.adsenseCheckedAt ?? "");
    if (!Number.isFinite(age) || age > 24 * 3600000 || age < -300000 || !inventory.adsenseListComplete) {
      inventory.adsenseListComplete = false;
      inventory.sites = inventory.sites.map(site => ({ ...site, approval: site.monetization ? "UNKNOWN" : "EXCLUDED" }));
    }
    return inventory;
  } catch { return null; }
}
