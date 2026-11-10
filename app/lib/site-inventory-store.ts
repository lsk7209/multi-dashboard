import { readFileSync } from "node:fs";
import type { SiteInventory } from "./site-inventory";
import { applyAdSenseEvidence, type ConsoleObservation, type AdSenseSnapshot } from "./adsense-evidence";

export function getSiteInventory(): SiteInventory | null {
  try {
    const inventory = JSON.parse(readFileSync("data/site-inventory.json", "utf8")) as SiteInventory;
    if (!Array.isArray(inventory.sites)) return null;
    let snapshot: AdSenseSnapshot = {};
    let observations: ConsoleObservation[] = [];
    const diagnostics: string[] = [];
    try {
      const data = JSON.parse(readFileSync("data/adsense-account-status-current.json", "utf8"));
      if (!data || !Array.isArray(data.sites)) throw new Error("Invalid snapshot");
      snapshot = data;
    } catch { diagnostics.push("AdSense API 스냅샷을 읽지 못했습니다. 현재 계정 조회 범위는 미확인입니다."); }
    try {
      const data = JSON.parse(readFileSync("data/adsense-console-observations.json", "utf8"));
      if (!Array.isArray(data)) throw new Error("Invalid observations");
      observations = data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") diagnostics.push("AdSense 콘솔 관측 기록을 읽지 못했습니다.");
    }
    return {...applyAdSenseEvidence(inventory, snapshot, observations), adsenseDiagnostics: diagnostics};
  } catch { return null; }
}
