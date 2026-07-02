import { existsSync, readFileSync } from "node:fs";

export interface BannerPlacementSummary {
  id: string;
  name: string;
  status: string;
  assignedCreativeName?: string;
  assignedTrackingSlug?: string;
  requests: number;
  imageRequests: number;
  noAd: number;
}

export interface BannerManagementSnapshot {
  generatedAt: string | null;
  source: {
    sourceKind: "multi-dashboard-local";
    workspacePath: string;
    dbPath: string;
    dbExists: boolean;
    dbUpdatedAt?: string;
    sourceNote?: string;
  };
  counts: {
    placements: number;
    activePlacements: number;
    creatives: number;
    activeCreatives: number;
    trackingLinks: number;
    activeTrackingLinks: number;
    assignments: number;
    activeAssignments: number;
    placementEvents: number;
    requests: number;
    served: number;
    noAd: number;
    imageRequests: number;
  };
  noAdRate: number | null;
  eventBreakdown: Array<{ type: string; count: number }>;
  topPlacements: BannerPlacementSummary[];
}

export interface AffiliateProgramSummary {
  id: string;
  name: string;
  status: string;
  category: string;
  platformUrl: string;
  countries: string[];
  usedBySites: string[];
  usedByAppsInToss: string[];
  publicTrackingLabel: string;
  disclosureRequired: boolean;
  disclosureNote: string;
  merchantTotalReported: number;
  merchantSnapshotFile: string;
  lastReviewed: string;
  nextAction: string;
  notes: string;
}

export interface AffiliateCandidateSummary {
  category: string;
  name: string;
  commissionKrw: number;
  previousMonthApplyRatePercent: number | null;
  previousMonthApprovalRatePercent: number | null;
  promotion: boolean;
  priorityNote: string;
}

export interface AffiliateInventorySnapshot {
  generatedAt: string | null;
  source: {
    sourceKind: "multi-dashboard-local";
    workspacePath: string;
    inventoryPath: string;
    merchantsPath: string;
    analysisPath: string;
    inventoryExists?: boolean;
    merchantsExists?: boolean;
    inventoryUpdatedAt?: string;
    merchantsUpdatedAt?: string;
    sourceNote?: string;
  };
  sourcePolicy: string;
  lastManualSync: string;
  programs: AffiliateProgramSummary[];
  ripplealba: {
    programId: string;
    programName: string;
    merchantTotalReported: number;
    snapshotStartedAt: string;
    snapshotStatus: string;
    merchantEntryCount: number;
    categoriesSeen: string[];
    highValueCandidates: AffiliateCandidateSummary[];
    currentCaptureSummary: Record<string, unknown>;
    priorityRules: Array<{ id: string; rule: string }>;
  };
}

export interface MonetizationWorkspaceData {
  bannerManagement: BannerManagementSnapshot;
  affiliateInventory: AffiliateInventorySnapshot;
}

const EMPTY_BANNER: BannerManagementSnapshot = {
  generatedAt: null,
  source: {
    sourceKind: "multi-dashboard-local",
    workspacePath: "D:\\web\\multi-dashboard",
    dbPath: "D:\\web\\multi-dashboard\\data\\monetization\\ad-manage.db",
    dbExists: false,
    sourceNote: "Standalone banner operations source owned by this multi-dashboard repository.",
  },
  counts: {
    placements: 0,
    activePlacements: 0,
    creatives: 0,
    activeCreatives: 0,
    trackingLinks: 0,
    activeTrackingLinks: 0,
    assignments: 0,
    activeAssignments: 0,
    placementEvents: 0,
    requests: 0,
    served: 0,
    noAd: 0,
    imageRequests: 0,
  },
  noAdRate: null,
  eventBreakdown: [],
  topPlacements: [],
};

const EMPTY_AFFILIATES: AffiliateInventorySnapshot = {
  generatedAt: null,
  source: {
    sourceKind: "multi-dashboard-local",
    workspacePath: "D:\\web\\multi-dashboard",
    inventoryPath: "D:\\web\\multi-dashboard\\data\\monetization\\affiliates\\inventory.yml",
    merchantsPath: "D:\\web\\multi-dashboard\\data\\monetization\\affiliates\\ripplealba-merchants.yml",
    analysisPath: "D:\\web\\multi-dashboard\\data\\monetization\\affiliates\\ripplealba-analysis.md",
    inventoryExists: false,
    merchantsExists: false,
    sourceNote: "Standalone affiliate operations source owned by this multi-dashboard repository.",
  },
  sourcePolicy: "metadata_only",
  lastManualSync: "",
  programs: [],
  ripplealba: {
    programId: "",
    programName: "",
    merchantTotalReported: 0,
    snapshotStartedAt: "",
    snapshotStatus: "",
    merchantEntryCount: 0,
    categoriesSeen: [],
    highValueCandidates: [],
    currentCaptureSummary: {},
    priorityRules: [],
  },
};

export function getMonetizationWorkspaceData(): MonetizationWorkspaceData {
  return {
    bannerManagement: readJson("data/banner-management.json", EMPTY_BANNER),
    affiliateInventory: readJson("data/affiliate-inventory.json", EMPTY_AFFILIATES),
  };
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}
