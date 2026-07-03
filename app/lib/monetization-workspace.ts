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
  priority?: string;
  region?: string;
  network?: string;
  category: string;
  platformUrl: string;
  homepageUrl?: string;
  applyUrl?: string;
  sourceUrl?: string;
  countries: string[];
  usedBySites: string[];
  usedByAppsInToss: string[];
  publicTrackingLabel: string;
  disclosureRequired: boolean;
  disclosureNote: string;
  monetizationModel?: string;
  payoutModel?: string;
  approvalDifficulty?: string;
  bannerSuitability?: string;
  deepLinkTemplate?: string;
  contentFit?: string[];
  recommendedSlots?: string[];
  allowedSites?: string[];
  risk?: string;
  complianceNotes?: string[];
  integrationSupport?: AffiliateIntegrationSupport;
  merchantTotalReported: number;
  merchantSnapshotFile: string;
  lastReviewed: string;
  nextAction: string;
  notes: string;
}

export interface AffiliateIntegrationSupport {
  api: string;
  feed: string;
  mcp: string;
  cli: string;
  notes: string[];
}

export interface AffiliateItemSummary {
  id: string;
  programId: string;
  title: string;
  status: string;
  priority: string;
  region: string;
  network: string;
  category: string;
  payoutModel: string;
  approvalDifficulty: string;
  bannerSuitability: string;
  contentFit: string[];
  recommendedSlots: string[];
  allowedSites: string[];
  applyUrl: string;
  sourceUrl: string;
  nextAction: string;
  risk: string;
  complianceNotes: string[];
  integrationSupport: AffiliateIntegrationSupport;
}

export interface AffiliateSiteRoutingEntry {
  siteId: string;
  name: string;
  domain: string;
  enabled: boolean;
  platform: string;
  monetization: boolean;
  targetMarket: string;
  primaryAudience: string;
  activePrograms: string[];
  blockedPrograms: string[];
  coupangExposure: string;
  coupangChannelStatus: CoupangChannelStatus | "not_listed";
  coupangRegistered: boolean;
  notes: string;
  source: string[];
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

export type CoupangChannelStatus =
  | "not_registered"
  | "registered"
  | "screenshot_submitted"
  | "approved"
  | "rejected"
  | "paused";

export interface CoupangChannelRegistryEntry {
  siteId: string;
  domain: string;
  status: CoupangChannelStatus;
  priority: string;
  firstUse: string;
  registeredAt: string | null;
  approvedAt: string | null;
  screenshotUrl: string;
  notes: string;
}

export interface CoupangChannelRegistrySnapshot {
  generatedAt: string | null;
  policy: {
    exposureMode: "registered_channel_allowlist";
    requiredDisclosureKo: string;
    notes: string[];
  };
  channels: CoupangChannelRegistryEntry[];
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
  affiliateItems: AffiliateItemSummary[];
  siteRouting: AffiliateSiteRoutingEntry[];
  playbook: {
    disclosureTemplateKo: string;
    disclosureTemplateEn: string;
    defaultRel: string;
    bannerSlotStrategy: Array<{ slot: string; purpose: string; fit: string }>;
    priorityRules: Array<{ id: string; rule: string }>;
  };
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
  coupangChannelRegistry: CoupangChannelRegistrySnapshot;
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
  affiliateItems: [],
  siteRouting: [],
  playbook: {
    disclosureTemplateKo:
      "이 글에는 제휴 링크가 포함되어 있으며, 링크를 통한 구매 또는 가입 시 일정액의 수수료를 받을 수 있습니다.",
    disclosureTemplateEn:
      "This content contains affiliate links. We may earn a commission when you buy or sign up through these links.",
    defaultRel: "sponsored nofollow",
    bannerSlotStrategy: [],
    priorityRules: [],
  },
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

const EMPTY_COUPANG_CHANNEL_REGISTRY: CoupangChannelRegistrySnapshot = {
  generatedAt: null,
  policy: {
    exposureMode: "registered_channel_allowlist",
    requiredDisclosureKo:
      "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.",
    notes: [],
  },
  channels: [],
};

export function getMonetizationWorkspaceData(): MonetizationWorkspaceData {
  return {
    bannerManagement: readJson("data/banner-management.json", EMPTY_BANNER),
    affiliateInventory: readJson("data/affiliate-inventory.json", EMPTY_AFFILIATES),
    coupangChannelRegistry: readJson(
      "data/coupang-channel-registry.json",
      EMPTY_COUPANG_CHANNEL_REGISTRY,
    ),
  };
}

export interface CoupangExposureDecision {
  allowed: boolean;
  reason: string;
  channel: CoupangChannelRegistryEntry | null;
  purpose: CoupangExposurePurpose;
}

export type CoupangExposurePurpose = "public" | "approval_screenshot";

export function decideCoupangExposure(
  registry: CoupangChannelRegistrySnapshot,
  input: {
    domain?: string;
    purpose?: CoupangExposurePurpose;
    siteId?: string;
  },
): CoupangExposureDecision {
  const purpose = input.purpose ?? "public";
  const channel = findCoupangChannel(registry, input);

  if (!channel) {
    return {
      allowed: false,
      channel: null,
      purpose,
      reason: "channel_not_found",
    };
  }

  if (channel.status === "registered" || channel.status === "screenshot_submitted") {
    return {
      allowed: true,
      channel,
      purpose,
      reason: channel.status,
    };
  }

  if (channel.status !== "approved") {
    return {
      allowed: false,
      channel,
      purpose,
      reason: `channel_${channel.status}`,
    };
  }

  return {
    allowed: true,
    channel,
    purpose,
    reason: "approved",
  };
}

export function findCoupangChannel(
  registry: CoupangChannelRegistrySnapshot,
  input: { domain?: string; siteId?: string },
): CoupangChannelRegistryEntry | null {
  const siteId = normalizeLookupValue(input.siteId);
  const domain = normalizeDomain(input.domain);

  return (
    registry.channels.find((channel) => {
      return (
        (siteId && normalizeLookupValue(channel.siteId) === siteId) ||
        (domain && normalizeDomain(channel.domain) === domain)
      );
    }) ?? null
  );
}

function normalizeLookupValue(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeDomain(value: string | undefined): string {
  return normalizeLookupValue(value)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
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
