"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { formatDisplayPath } from "../lib/display-path.js";

interface PlacementRow {
  id: string;
  siteKey: string | null;
  slotKey: string | null;
  siteUrl: string | null;
  name: string;
  type: string;
  noAdPolicy: string;
  status: string;
  assignedCreativeId: string | null;
  assignedCreativeName: string | null;
  assignedTrackingLinkId: string | null;
  assignedTrackingSlug: string | null;
  requests: number;
  imageRequests: number;
  noAd: number;
}

interface CreativeRow {
  id: string;
  offerId: string | null;
  name: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  status: string;
  policyStatus: string;
}

interface TrackingLinkRow {
  id: string;
  slug: string;
  publicUrl: string;
  offerId: string | null;
  offerName: string | null;
  status: string;
}

interface AssignmentRow {
  id: string;
  placementId: string;
  placementName: string;
  placementSiteKey: string | null;
  placementSlotKey: string | null;
  placementSiteUrl: string | null;
  creativeName: string | null;
  trackingSlug: string | null;
  weight: number;
  status: string;
}

interface SiteSummaryRow {
  siteKey: string;
  siteUrl: string | null;
  placements: number;
  activePlacements: number;
  assignedPlacements: number;
  unassignedPlacements: number;
  requests: number;
  imageRequests: number;
  noAd: number;
  clicks: number;
  imageRequests7d: number;
  clicks7d: number;
  lastUpdatedAt: string;
}

interface BannerManagementState {
  adminAuthRequired: boolean;
  dbPath: string;
  dbExists: boolean;
  dbUpdatedAt: string | null;
  writable: boolean;
  persistenceNote: string;
  publicBaseUrl: string;
  placements: PlacementRow[];
  creatives: CreativeRow[];
  trackingLinks: TrackingLinkRow[];
  assignments: AssignmentRow[];
  siteSummaries: SiteSummaryRow[];
}

const EMPTY_STATE: BannerManagementState = {
  adminAuthRequired: false,
  assignments: [],
  creatives: [],
  dbExists: false,
  dbPath: "",
  dbUpdatedAt: null,
  persistenceNote: "",
  publicBaseUrl: "",
  placements: [],
  siteSummaries: [],
  trackingLinks: [],
  writable: false,
};

const STATUS_OPTIONS = ["active", "paused", "inactive"] as const;
const POLICY_OPTIONS = ["approved", "review", "rejected"] as const;
const NO_AD_OPTIONS = ["transparent", "house", "collapse"] as const;
const BANNER_ADMIN_TOKEN_STORAGE_KEY = "multi-dashboard.bannerAdminToken";

type ApiAction =
  | "createPlacement"
  | "updatePlacement"
  | "createCreative"
  | "updateCreative"
  | "createTrackingLink"
  | "updateTrackingLink"
  | "assignPlacement";

type BannerOpsTabId = "overview" | "sites" | "setup" | "assignments" | "install" | "diagnostics";
type SortDirection = "asc" | "desc";
type OpsPriorityTone = "critical" | "warning" | "info";
type DiagnosticFocusId = "all" | "unassigned" | "no_ad" | "inactive_placements" | "creative_issues" | "tracking_issues";
type SiteQuickFilterId = "all" | "attention" | "unassigned" | "no_ad" | "inactive" | "zero_click_7d" | "recent_exposure";
type SiteSortKey =
  | "activePlacements"
  | "assignedPlacements"
  | "clicks"
  | "clicks7d"
  | "ctr"
  | "ctr7d"
  | "imageRequests"
  | "imageRequests7d"
  | "lastUpdatedAt"
  | "noAd"
  | "placements"
  | "requests"
  | "siteKey"
  | "unassignedPlacements";

const SITE_SUMMARY_COLUMNS: Array<{ key: SiteSortKey; label: string }> = [
  { key: "siteKey", label: "사이트" },
  { key: "placements", label: "슬롯" },
  { key: "activePlacements", label: "활성" },
  { key: "assignedPlacements", label: "배정" },
  { key: "unassignedPlacements", label: "미배정" },
  { key: "noAd", label: "no_ad" },
  { key: "requests", label: "요청" },
  { key: "imageRequests", label: "이미지" },
  { key: "clicks", label: "리다이렉트" },
  { key: "ctr", label: "리다이렉트율" },
  { key: "imageRequests7d", label: "7일 이미지" },
  { key: "clicks7d", label: "7일 리다이렉트" },
  { key: "ctr7d", label: "7일 리다이렉트율" },
  { key: "lastUpdatedAt", label: "갱신" },
];
const SITE_QUICK_FILTERS: Array<{ id: SiteQuickFilterId; label: string }> = [
  { id: "all", label: "전체" },
  { id: "attention", label: "점검 필요" },
  { id: "unassigned", label: "미배정 있음" },
  { id: "no_ad", label: "no_ad 있음" },
  { id: "inactive", label: "활성 0" },
  { id: "zero_click_7d", label: "7일 리다이렉트 없음" },
  { id: "recent_exposure", label: "최근 호출 있음" },
];

const MAX_TABLE_ROWS = 50;
const BANNER_OPS_TABS: Array<{ id: BannerOpsTabId; label: string }> = [
  { id: "overview", label: "요약" },
  { id: "sites", label: "사이트" },
  { id: "setup", label: "설정" },
  { id: "assignments", label: "배정" },
  { id: "install", label: "설치" },
  { id: "diagnostics", label: "진단" },
];

export function BannerManagementConsole() {
  const [state, setState] = useState<BannerManagementState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [placementForm, setPlacementForm] = useState({
    name: "본문 중간 배너",
    noAdPolicy: "transparent",
    siteKey: "temon",
    siteUrl: "",
    slotKey: "quiz-bottom",
    status: "active",
    type: "image_link",
  });
  const [creativeForm, setCreativeForm] = useState({
    height: "90",
    imageUrl: "https://placehold.co/728x90/png?text=Affiliate+Banner",
    offerId: "",
    name: "기본 728x90 배너",
    policyStatus: "approved",
    status: "active",
    width: "728",
  });
  const [trackingForm, setTrackingForm] = useState({
    offerId: "",
    offerName: "기본 제휴 링크",
    publicUrl: "https://example.com/",
    slug: `offer-${Date.now().toString().slice(-6)}`,
    status: "active",
  });
  const [assignmentForm, setAssignmentForm] = useState({
    creativeId: "",
    placementId: "",
    trackingLinkId: "",
    weight: "100",
  });
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<BannerOpsTabId>("overview");
  const [diagnosticFocus, setDiagnosticFocus] = useState<DiagnosticFocusId>("all");
  const [siteQuickFilter, setSiteQuickFilter] = useState<SiteQuickFilterId>("all");
  const [siteSort, setSiteSort] = useState<{ key: SiteSortKey; direction: SortDirection }>({
    direction: "desc",
    key: "imageRequests",
  });

  useEffect(() => {
    setAdminToken(window.localStorage.getItem(BANNER_ADMIN_TOKEN_STORAGE_KEY) ?? "");
    void loadState();
  }, []);

  const siteOptions = useMemo(() => {
    const sites = new Map<string, { siteKey: string; siteUrl: string | null; placements: number }>();
    for (const summary of state.siteSummaries) {
      sites.set(summary.siteKey, {
        siteKey: summary.siteKey,
        siteUrl: summary.siteUrl,
        placements: summary.placements,
      });
    }
    for (const placement of state.placements) {
      const siteKey = placement.siteKey || "legacy";
      if (!sites.has(siteKey)) {
        sites.set(siteKey, {
          siteKey,
          siteUrl: placement.siteUrl,
          placements: 1,
        });
      }
    }
    return Array.from(sites.values()).sort((a, b) => a.siteKey.localeCompare(b.siteKey));
  }, [state.placements, state.siteSummaries]);

  const filteredPlacements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return state.placements.filter((placement) => {
      const placementSite = placement.siteKey || "legacy";
      const isAssigned = Boolean(placement.assignedCreativeId && placement.assignedTrackingLinkId);
      if (siteFilter !== "all" && placementSite !== siteFilter) return false;
      if (statusFilter !== "all" && placement.status !== statusFilter) return false;
      if (assignmentFilter === "assigned" && !isAssigned) return false;
      if (assignmentFilter === "unassigned" && isAssigned) return false;
      if (!query) return true;
      return [
        placement.id,
        placement.name,
        placement.siteKey,
        placement.slotKey,
        placement.siteUrl,
        placement.assignedCreativeName,
        placement.assignedTrackingSlug,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [assignmentFilter, searchQuery, siteFilter, state.placements, statusFilter]);

  const filteredAssignments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return state.assignments.filter((assignment) => {
      const assignmentSite = assignment.placementSiteKey || "legacy";
      if (siteFilter !== "all" && assignmentSite !== siteFilter) return false;
      if (!query) return true;
      return [
        assignment.id,
        assignment.placementId,
        assignment.placementName,
        assignment.placementSiteKey,
        assignment.placementSlotKey,
        assignment.placementSiteUrl,
        assignment.creativeName,
        assignment.trackingSlug,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [searchQuery, siteFilter, state.assignments]);

  const baseFilteredSiteSummaries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return state.siteSummaries.filter((site) => {
      if (siteFilter !== "all" && site.siteKey !== siteFilter) return false;
      if (!query) return true;
      return [site.siteKey, site.siteUrl]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [searchQuery, siteFilter, state.siteSummaries]);
  const filteredSiteSummaries = useMemo(
    () => baseFilteredSiteSummaries.filter((site) => matchesSiteQuickFilter(site, siteQuickFilter)),
    [baseFilteredSiteSummaries, siteQuickFilter],
  );
  const sortedSiteSummaries = useMemo(
    () => sortSiteSummaries(filteredSiteSummaries, siteSort.key, siteSort.direction),
    [filteredSiteSummaries, siteSort.direction, siteSort.key],
  );
  const visibleSiteSummaries = useMemo(
    () => sortedSiteSummaries.slice(0, MAX_TABLE_ROWS),
    [sortedSiteSummaries],
  );
  const siteQuickFilterCounts = useMemo(
    () =>
      Object.fromEntries(
        SITE_QUICK_FILTERS.map((filter) => [
          filter.id,
          baseFilteredSiteSummaries.filter((site) => matchesSiteQuickFilter(site, filter.id)).length,
        ]),
      ) as Record<SiteQuickFilterId, number>,
    [baseFilteredSiteSummaries],
  );

  const selectedSiteSummary = useMemo(
    () => (siteFilter === "all" ? null : state.siteSummaries.find((site) => site.siteKey === siteFilter) ?? null),
    [siteFilter, state.siteSummaries],
  );

  const fleetSummary = useMemo(
    () =>
      state.siteSummaries.reduce(
        (summary, site) => ({
          activePlacements: summary.activePlacements + site.activePlacements,
          assignedPlacements: summary.assignedPlacements + site.assignedPlacements,
          clicks: summary.clicks + site.clicks,
          clicks7d: summary.clicks7d + site.clicks7d,
          imageRequests: summary.imageRequests + site.imageRequests,
          imageRequests7d: summary.imageRequests7d + site.imageRequests7d,
          placements: summary.placements + site.placements,
          requests: summary.requests + site.requests,
          unassignedPlacements: summary.unassignedPlacements + site.unassignedPlacements,
        }),
        {
          activePlacements: 0,
          assignedPlacements: 0,
          clicks: 0,
          clicks7d: 0,
          imageRequests: 0,
          imageRequests7d: 0,
          placements: 0,
          requests: 0,
          unassignedPlacements: 0,
        },
      ),
    [state.siteSummaries],
  );

  useEffect(() => {
    setAssignmentForm((current) => ({
      creativeId: current.creativeId || state.creatives[0]?.id || "",
      placementId:
        current.placementId && (filteredPlacements.length === 0 || filteredPlacements.some((item) => item.id === current.placementId))
          ? current.placementId
          : filteredPlacements[0]?.id || state.placements[0]?.id || "",
      trackingLinkId: current.trackingLinkId || state.trackingLinks[0]?.id || "",
      weight: current.weight || "100",
    }));
  }, [filteredPlacements, state.creatives, state.placements, state.trackingLinks]);

  const selectedPlacement = useMemo(
    () => state.placements.find((placement) => placement.id === assignmentForm.placementId),
    [assignmentForm.placementId, state.placements],
  );
  const install = selectedPlacement ? buildInstallCode(selectedPlacement, state.publicBaseUrl) : null;
  const activeUnassignedPlacements = useMemo(
    () => filteredPlacements.filter((placement) => placement.status === "active" && !isPlacementAssigned(placement)),
    [filteredPlacements],
  );
  const noAdPlacements = useMemo(
    () => filteredPlacements.filter((placement) => placement.noAd > 0).sort((a, b) => b.noAd - a.noAd),
    [filteredPlacements],
  );
  const inactivePlacements = useMemo(
    () => filteredPlacements.filter((placement) => placement.status !== "active"),
    [filteredPlacements],
  );
  const assignmentCandidatePlacements = useMemo(() => {
    const candidates = new Map<string, PlacementRow>();
    for (const placement of activeUnassignedPlacements) {
      candidates.set(placement.id, placement);
    }
    for (const placement of noAdPlacements) {
      candidates.set(placement.id, placement);
    }
    return Array.from(candidates.values()).slice(0, 8);
  }, [activeUnassignedPlacements, noAdPlacements]);
  const reviewCreatives = useMemo(
    () => state.creatives.filter((creative) => creative.status !== "active" || creative.policyStatus !== "approved"),
    [state.creatives],
  );
  const trackingLinkIssues = useMemo(
    () => state.trackingLinks.filter((link) => link.status !== "active" || !link.offerId),
    [state.trackingLinks],
  );
  const diagnosticPlacementRows = useMemo(() => {
    if (diagnosticFocus === "unassigned") return activeUnassignedPlacements;
    if (diagnosticFocus === "no_ad") return noAdPlacements;
    if (diagnosticFocus === "inactive_placements") return inactivePlacements;
    return filteredPlacements;
  }, [activeUnassignedPlacements, diagnosticFocus, filteredPlacements, inactivePlacements, noAdPlacements]);
  const diagnosticCreativeRows = useMemo(
    () => (diagnosticFocus === "creative_issues" ? reviewCreatives : state.creatives),
    [diagnosticFocus, reviewCreatives, state.creatives],
  );
  const diagnosticTrackingLinkRows = useMemo(
    () => (diagnosticFocus === "tracking_issues" ? trackingLinkIssues : state.trackingLinks),
    [diagnosticFocus, state.trackingLinks, trackingLinkIssues],
  );
  const diagnosticFocusCards: Array<{
    detail: string;
    id: DiagnosticFocusId;
    label: string;
    tone: OpsPriorityTone;
    value: number;
  }> = [
    {
      detail: "전체 진단 테이블",
      id: "all",
      label: "전체",
      tone: "info",
      value: filteredPlacements.length + state.creatives.length + state.trackingLinks.length,
    },
    {
      detail: "active인데 소재/링크 없음",
      id: "unassigned",
      label: "미배정 슬롯",
      tone: "critical",
      value: activeUnassignedPlacements.length,
    },
    {
      detail: "요청 대비 광고 없음",
      id: "no_ad",
      label: "no_ad 슬롯",
      tone: "warning",
      value: noAdPlacements.length,
    },
    {
      detail: "paused/inactive 슬롯",
      id: "inactive_placements",
      label: "비활성 슬롯",
      tone: "info",
      value: inactivePlacements.length,
    },
    {
      detail: "비활성 또는 검수 미승인",
      id: "creative_issues",
      label: "소재 이슈",
      tone: "warning",
      value: reviewCreatives.length,
    },
    {
      detail: "비활성 또는 offerId 없음",
      id: "tracking_issues",
      label: "추적 링크 이슈",
      tone: "warning",
      value: trackingLinkIssues.length,
    },
  ];
  const attentionSites = useMemo(
    () =>
      filteredSiteSummaries.filter(
        (site) => site.unassignedPlacements > 0 || site.noAd > 0 || site.activePlacements === 0,
      ),
    [filteredSiteSummaries],
  );
  const topEffectSites = useMemo(
    () =>
      filteredSiteSummaries
        .filter((site) => site.imageRequests7d > 0)
        .sort((a, b) => getCtrRate7d(b) - getCtrRate7d(a) || b.clicks7d - a.clicks7d || b.imageRequests7d - a.imageRequests7d),
    [filteredSiteSummaries],
  );
  const zeroClickExposureSites = useMemo(
    () =>
      filteredSiteSummaries
        .filter((site) => site.imageRequests7d >= 20 && site.clicks7d === 0)
        .sort((a, b) => b.imageRequests7d - a.imageRequests7d),
    [filteredSiteSummaries],
  );
  const attentionCount =
    activeUnassignedPlacements.length + noAdPlacements.length + reviewCreatives.length + trackingLinkIssues.length + attentionSites.length;
  const inactiveSiteCount = filteredSiteSummaries.filter((site) => site.activePlacements === 0).length;
  const noAdSiteCount = filteredSiteSummaries.filter((site) => site.noAd > 0).length;
  const unassignedSiteCount = filteredSiteSummaries.filter((site) => site.unassignedPlacements > 0).length;
  const adminTokenMissing = state.adminAuthRequired && !adminToken.trim();
  const controlsDisabled = isSaving || !state.writable || adminTokenMissing;
  const hasBannerData =
    state.placements.length > 0 || state.creatives.length > 0 || state.trackingLinks.length > 0 || state.siteSummaries.length > 0;
  const opsReadinessCards = [
    {
      detail: state.dbPath ? formatDisplayPath(state.dbPath) : "data/monetization/ad-manage.db",
      label: "운영 DB",
      ok: state.dbExists,
      value: state.dbExists ? "연결됨" : "없음",
    },
    {
      detail: state.persistenceNote || "쓰기 상태를 확인하는 중입니다.",
      label: "쓰기 상태",
      ok: state.writable,
      value: state.writable ? "가능" : "제한",
    },
    {
      detail: state.adminAuthRequired ? "브라우저 저장 토큰 기준" : "토큰 없이 조작 가능",
      label: "관리 권한",
      ok: !adminTokenMissing,
      value: state.adminAuthRequired ? (adminTokenMissing ? "토큰 필요" : "확인됨") : "불필요",
    },
    {
      detail: `사이트 ${formatNumber(state.siteSummaries.length)} · 슬롯 ${formatNumber(state.placements.length)}`,
      label: "데이터 적재",
      ok: hasBannerData,
      value: hasBannerData ? "있음" : "비어 있음",
    },
  ];
  const filteredActivePlacements = filteredPlacements.filter((placement) => placement.status === "active");
  const filteredAssignedActivePlacements = filteredActivePlacements.filter(isPlacementAssigned);
  const assignmentRate =
    filteredActivePlacements.length > 0 ? filteredAssignedActivePlacements.length / filteredActivePlacements.length : 0;
  const noAdTotal = filteredPlacements.reduce((total, placement) => total + placement.noAd, 0);
  const requestTotal = filteredPlacements.reduce((total, placement) => total + placement.requests, 0);
  const filteredImageRequests = filteredPlacements.reduce((total, placement) => total + placement.imageRequests, 0);
  const filteredClicks = filteredSiteSummaries.reduce((total, site) => total + site.clicks, 0);
  const filteredClicks7d = filteredSiteSummaries.reduce((total, site) => total + site.clicks7d, 0);
  const filteredImageRequests7d = filteredSiteSummaries.reduce((total, site) => total + site.imageRequests7d, 0);
  const filteredFunnel = [
    {
      label: "활성 슬롯",
      value: filteredActivePlacements.length,
      detail: `전체 ${formatNumber(filteredPlacements.length)}개`,
    },
    {
      label: "배정 커버리지",
      value: formatPercent(assignmentRate),
      detail: `${formatNumber(filteredAssignedActivePlacements.length)} / ${formatNumber(filteredActivePlacements.length)} 활성`,
    },
    {
      label: "이미지 요청",
      value: formatNumber(filteredImageRequests),
      detail: `요청 ${formatNumber(requestTotal)}회`,
    },
    {
      label: "no_ad",
      value: formatNumber(noAdTotal),
      detail: requestTotal > 0 ? `${formatPercent(noAdTotal / requestTotal)} 발생` : "요청 없음",
      warning: noAdTotal > 0,
    },
    {
      label: "점검 큐",
      value: formatNumber(attentionCount),
      detail: "미배정, no_ad, 소재, 링크, 사이트",
      warning: attentionCount > 0,
    },
  ];
  const overviewHealthCards = [
    {
      detail: `활성 ${formatNumber(filteredActivePlacements.length)}개 중 ${formatNumber(filteredAssignedActivePlacements.length)}개`,
      label: "배정 커버리지",
      tone: assignmentRate < 1 ? "warning" : "normal",
      value: formatPercent(assignmentRate),
    },
    {
      detail: requestTotal > 0 ? `요청 ${formatNumber(requestTotal)}회 중 ${formatNumber(noAdTotal)}회` : "요청 없음",
      label: "no_ad 비율",
      tone: noAdTotal > 0 ? "warning" : "normal",
      value: requestTotal > 0 ? formatPercent(noAdTotal / requestTotal) : "0%",
    },
    {
      detail: `리다이렉트 ${formatNumber(filteredClicks)}회 · 이미지 ${formatNumber(filteredImageRequests)}회`,
      label: "누적 리다이렉트율",
      tone: "normal",
      value: formatPercent(getCtrRate({ clicks: filteredClicks, imageRequests: filteredImageRequests })),
    },
    {
      detail: `리다이렉트 ${formatNumber(filteredClicks7d)}회 · 이미지 ${formatNumber(filteredImageRequests7d)}회`,
      label: "최근 7일 리다이렉트율",
      tone: zeroClickExposureSites.length > 0 ? "warning" : "normal",
      value: formatPercent(getCtrRate7d({ clicks7d: filteredClicks7d, imageRequests7d: filteredImageRequests7d })),
    },
  ];
  const overviewActionQueue: Array<{
    action: () => void;
    count: number;
    detail: string;
    label: string;
    tone: OpsPriorityTone;
  }> = [
    {
      action: () => {
        setActiveTab("sites");
        setSiteQuickFilter("inactive");
      },
      count: inactiveSiteCount,
      detail: "활성 슬롯이 없는 사이트를 먼저 분리합니다.",
      label: "활성 슬롯 없음",
      tone: "critical",
    },
    {
      action: () => {
        setActiveTab("assignments");
        setAssignmentFilter("unassigned");
      },
      count: activeUnassignedPlacements.length,
      detail: "active 슬롯인데 소재 또는 추적 링크가 비어 있습니다.",
      label: "활성 미배정 슬롯",
      tone: "critical",
    },
    {
      action: () => {
        setActiveTab("sites");
        setSiteQuickFilter("no_ad");
      },
      count: noAdSiteCount,
      detail: "no_ad 발생 사이트를 요청량 기준으로 점검합니다.",
      label: "no_ad 발생 사이트",
      tone: "warning",
    },
    {
      action: () => {
        setActiveTab("sites");
        setSiteQuickFilter("zero_click_7d");
      },
      count: zeroClickExposureSites.length,
      detail: "최근 7일 노출은 있지만 리다이렉트 호출이 없는 사이트입니다.",
      label: "7일 리다이렉트 없음",
      tone: "warning",
    },
    {
      action: () => setActiveTab("setup"),
      count: reviewCreatives.length + trackingLinkIssues.length,
      detail: "소재 정책 상태와 추적 링크 연결 상태를 확인합니다.",
      label: "소재/링크 점검",
      tone: "info",
    },
  ];

  function getPreferredPlacementForSite(siteKey: string) {
    const sitePlacements = state.placements.filter((placement) => (placement.siteKey || "legacy") === siteKey);
    return (
      sitePlacements.find((placement) => placement.status === "active" && !isPlacementAssigned(placement)) ??
      sitePlacements.find((placement) => placement.status === "active" && placement.noAd > 0) ??
      sitePlacements.find((placement) => placement.status === "active") ??
      sitePlacements[0] ??
      null
    );
  }

  function selectPlacementWorkflow(placement: PlacementRow, tab: "assignments" | "install" = "assignments") {
    setSiteFilter(placement.siteKey || "legacy");
    setSearchQuery("");
    setSiteQuickFilter("all");
    setStatusFilter(tab === "assignments" ? "active" : "all");
    setAssignmentFilter(tab === "assignments" && !isPlacementAssigned(placement) ? "unassigned" : "all");
    setAssignmentForm((current) => ({
      creativeId: current.creativeId || placement.assignedCreativeId || state.creatives[0]?.id || "",
      placementId: placement.id,
      trackingLinkId: current.trackingLinkId || placement.assignedTrackingLinkId || state.trackingLinks[0]?.id || "",
      weight: current.weight || "100",
    }));
    setActiveTab(tab);
  }

  function openSiteWorkflow(site: SiteSummaryRow, tab: "assignments" | "install") {
    const placement = getPreferredPlacementForSite(site.siteKey);
    setSiteFilter(site.siteKey);
    setSearchQuery("");
    setSiteQuickFilter("all");
    setStatusFilter(tab === "assignments" ? "active" : "all");
    setAssignmentFilter(tab === "assignments" && site.unassignedPlacements > 0 ? "unassigned" : "all");
    if (placement) selectPlacementWorkflow(placement, tab);
    setActiveTab(tab);
  }

  async function loadState() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/banner-management", { cache: "no-store" });
      const payload = (await response.json()) as BannerManagementState | { error?: string };
      if (!response.ok) throw new Error("error" in payload ? payload.error : "배너 운영 상태를 불러오지 못했습니다.");
      setState(payload as BannerManagementState);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "배너 운영 상태를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitAction(action: ApiAction, payload: Record<string, unknown>, success: string) {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken.trim()) headers["x-banner-admin-token"] = adminToken.trim();
      const response = await fetch("/api/banner-management", {
        body: JSON.stringify({ action, ...payload }),
        headers,
        method: "POST",
      });
      const next = (await response.json()) as BannerManagementState | { error?: string };
      if (!response.ok) throw new Error("error" in next ? next.error : "배너 설정 저장에 실패했습니다.");
      setState(next as BannerManagementState);
      setMessage(success);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "배너 설정 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  function saveAdminToken() {
    window.localStorage.setItem(BANNER_ADMIN_TOKEN_STORAGE_KEY, adminToken.trim());
    setMessage("Admin token saved in this browser.");
    setError(null);
  }

  function clearAdminToken() {
    window.localStorage.removeItem(BANNER_ADMIN_TOKEN_STORAGE_KEY);
    setAdminToken("");
    setMessage("Admin token cleared.");
  }

  function createPlacement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAction("createPlacement", placementForm, "배치 위치를 만들었습니다.");
  }

  function createCreative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAction(
      "createCreative",
      {
        ...creativeForm,
        height: numberOrNull(creativeForm.height),
        width: numberOrNull(creativeForm.width),
      },
      "배너 소재를 만들었습니다.",
    );
  }

  function createTrackingLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAction("createTrackingLink", trackingForm, "추적 링크를 만들었습니다.");
  }

  function assignPlacement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAction(
      "assignPlacement",
      {
        ...assignmentForm,
        weight: numberOrDefault(assignmentForm.weight, 100),
      },
      "배치 위치에 소재와 추적 링크를 연결했습니다.",
    );
  }

  function toggleSiteSort(key: SiteSortKey) {
    setSiteSort((current) => ({
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
      key,
    }));
  }

  return (
    <section className="panel banner-console">
      <div className="panel-heading">
        <div>
          <h2>배너 설정 운영</h2>
          <p>배치 위치, 소재, 추적 링크, 연결 상태를 멀티 대시보드 안에서 직접 관리합니다.</p>
        </div>
        <button className="ops-button ops-button-secondary" type="button" onClick={() => void loadState()}>
          새로고침
        </button>
      </div>

      <div className="ops-notice">
        <strong>{state.writable ? "쓰기 가능" : "쓰기 제한 가능"}</strong>
        <span>{state.persistenceNote || "배너 DB 상태를 확인하는 중입니다."}</span>
        <code>{formatDisplayPath(state.dbPath || "data/monetization/ad-manage.db")}</code>
      </div>

      <div className="ops-readiness-grid" aria-label="배너 운영 준비 상태">
        {opsReadinessCards.map((card) => (
          <div className={card.ok ? "ops-readiness-card" : "ops-readiness-card warning"} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </div>
        ))}
      </div>

      {!state.dbExists ? (
        <p className="ops-warning-message">배너 운영 DB가 아직 없습니다. 설정 탭에서 첫 배치 위치, 소재, 추적 링크를 만들면 운영 데이터가 생성됩니다.</p>
      ) : null}
      {adminTokenMissing ? (
        <p className="ops-warning-message">관리 토큰이 필요합니다. 토큰을 저장하기 전까지 생성/수정 버튼은 비활성화됩니다.</p>
      ) : null}
      {!isLoading && state.dbExists && !hasBannerData ? (
        <p className="ops-warning-message">현재 배너 운영 데이터가 비어 있습니다. 설정 탭에서 최소 1개 배치 위치와 소재, 추적 링크를 등록하세요.</p>
      ) : null}

      {state.adminAuthRequired ? (
        <div className="ops-admin-token">
          <label>
            Admin token
            <input
              autoComplete="off"
              placeholder="Required for create/update actions"
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
            />
          </label>
          <button className="ops-button ops-button-secondary" type="button" onClick={saveAdminToken}>
            Save token
          </button>
          <button className="ops-button ops-button-secondary" type="button" onClick={clearAdminToken}>
            Clear
          </button>
        </div>
      ) : null}

      {message ? <p className="ops-message">{message}</p> : null}
      {error ? <p className="ops-error">{error}</p> : null}

      <nav className="ops-subtabs" aria-label="배너 운영 메뉴">
        {BANNER_OPS_TABS.map((tab) => (
          <button
            aria-pressed={activeTab === tab.id}
            className={activeTab === tab.id ? "is-active" : ""}
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="ops-control-panel">
        <div className="ops-control-heading">
          <div>
            <h3>사이트 운영 필터</h3>
            <p>수백 개 사이트의 배너 슬롯을 사이트, 상태, 배정 여부, 키워드로 좁혀서 운영합니다.</p>
          </div>
          <strong>
            {formatNumber(filteredPlacements.length)} / {formatNumber(state.placements.length)} 슬롯
          </strong>
        </div>
        <div className="ops-filter-grid">
          <label>
            검색
            <input
              placeholder="siteKey, slotKey, 배너명, 제휴 링크"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <label>
            사이트
            <select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
              <option value="all">전체 사이트</option>
              {siteOptions.map((site) => (
                <option key={site.siteKey} value={site.siteKey}>
                  {site.siteKey} ({formatNumber(site.placements)})
                </option>
              ))}
            </select>
          </label>
          <label>
            슬롯 상태
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">전체 상태</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            배정 여부
            <select value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)}>
              <option value="all">전체 슬롯</option>
              <option value="assigned">배정 완료</option>
              <option value="unassigned">미배정</option>
            </select>
          </label>
        </div>
        <div className="ops-kpi-strip" aria-label="필터 기준 배너 핵심 지표">
          {filteredFunnel.map((item) => (
            <div className={item.warning ? "ops-kpi warning" : "ops-kpi"} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </div>
          ))}
        </div>
        <div className="ops-fleet-metrics">
          <span>사이트 {formatNumber(state.siteSummaries.length)}개</span>
          <span>전체 슬롯 {formatNumber(fleetSummary.placements)}개</span>
          <span>활성 {formatNumber(fleetSummary.activePlacements)}개</span>
          <span>배정 {formatNumber(fleetSummary.assignedPlacements)}개</span>
          <span>미배정 {formatNumber(fleetSummary.unassignedPlacements)}개</span>
          <span>이미지 요청 {formatNumber(fleetSummary.imageRequests)}회</span>
          <span>리다이렉트 {formatNumber(fleetSummary.clicks)}회</span>
          <span>리다이렉트율 {formatPercent(getCtrRate(fleetSummary))}</span>
          <span>7일 리다이렉트율 {formatPercent(getCtrRate7d(fleetSummary))}</span>
        </div>
        {selectedSiteSummary ? (
          <div className="ops-site-focus">
            <strong>{selectedSiteSummary.siteKey}</strong>
            <span>{selectedSiteSummary.siteUrl ?? "사이트 URL 미등록"}</span>
            <span>
              슬롯 {formatNumber(selectedSiteSummary.placements)}개 · 미배정{" "}
              {formatNumber(selectedSiteSummary.unassignedPlacements)}개 · 이미지 요청{" "}
              {formatNumber(selectedSiteSummary.imageRequests)}회 · 리다이렉트 {formatNumber(selectedSiteSummary.clicks)}회 ·
              리다이렉트율 {formatPercent(getCtrRate(selectedSiteSummary))} · 7일 리다이렉트율{" "}
              {formatPercent(getCtrRate7d(selectedSiteSummary))}
            </span>
          </div>
        ) : null}
      </div>

      {activeTab === "overview" ? (
        <div className="ops-tab-panel">
          <div className="ops-overview-layout">
            <section className="ops-overview-section">
              <div className="ops-section-heading">
                <div>
                  <h3>운영 상태 요약</h3>
                  <p>필터 기준으로 배너 커버리지, no_ad, 내부 리다이렉트율을 한 번에 비교합니다.</p>
                </div>
                <strong>{formatNumber(filteredSiteSummaries.length)}개 사이트</strong>
              </div>
              <div className="ops-executive-grid">
                <div className="ops-metric-card">
                  <span>운영 사이트</span>
                  <strong>{formatNumber(state.siteSummaries.length)}</strong>
                  <small>필터 결과 {formatNumber(filteredSiteSummaries.length)}개</small>
                </div>
                <div className="ops-metric-card">
                  <span>전체 슬롯</span>
                  <strong>{formatNumber(fleetSummary.placements)}</strong>
                  <small>
                    활성 {formatNumber(fleetSummary.activePlacements)}개 · 미배정{" "}
                    {formatNumber(fleetSummary.unassignedPlacements)}개
                  </small>
                </div>
                {overviewHealthCards.map((card) => (
                  <div className={card.tone === "warning" ? "ops-metric-card warning" : "ops-metric-card"} key={card.label}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <small>{card.detail}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="ops-overview-section ops-priority-section">
              <div className="ops-section-heading">
                <div>
                  <h3>오늘 처리할 배너 이슈</h3>
                  <p>운영 영향이 큰 항목부터 바로 해당 탭/필터로 이동합니다.</p>
                </div>
                <strong>{formatNumber(attentionCount)}건</strong>
              </div>
              <div className="ops-priority-list">
                {overviewActionQueue.map((item) => (
                  <button
                    className={`ops-priority-row ${item.count > 0 ? `is-${item.tone}` : "is-clear"}`}
                    key={item.label}
                    type="button"
                    onClick={item.action}
                  >
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <b>{formatNumber(item.count)}</b>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="ops-signal-strip" aria-label="배너 운영 신호">
            <span>미배정 사이트 {formatNumber(unassignedSiteCount)}개</span>
            <span>no_ad 사이트 {formatNumber(noAdSiteCount)}개</span>
            <span>활성 0 사이트 {formatNumber(inactiveSiteCount)}개</span>
            <span>7일 노출 {formatNumber(filteredImageRequests7d)}회</span>
            <span>7일 리다이렉트 {formatNumber(filteredClicks7d)}회</span>
          </div>

          <div className="ops-exception-grid">
            <OpsTable
              title={`최근 7일 리다이렉트율 상위 사이트 (${formatNumber(topEffectSites.length)})`}
              isLoading={isLoading}
              emptyText="아직 최근 7일 이미지 요청이 있는 사이트가 없습니다."
            >
              {topEffectSites.slice(0, 10).map((site) => (
                <tr key={site.siteKey}>
                  <td>
                    <strong>{site.siteKey}</strong>
                    <small>{site.siteUrl ?? "URL 미등록"}</small>
                  </td>
                  <td>7일 리다이렉트율 {formatPercent(getCtrRate7d(site))}</td>
                  <td>7일 리다이렉트 {formatNumber(site.clicks7d)}</td>
                  <td>7일 이미지 {formatNumber(site.imageRequests7d)}</td>
                  <td>누적 리다이렉트율 {formatPercent(getCtrRate(site))}</td>
                </tr>
              ))}
            </OpsTable>

            <OpsTable
              title={`최근 7일 노출 대비 리다이렉트 없음 (${formatNumber(zeroClickExposureSites.length)})`}
              isLoading={isLoading}
              emptyText="최근 7일 이미지 요청 20회 이상인데 리다이렉트 0회인 사이트가 없습니다."
            >
              {zeroClickExposureSites.slice(0, 10).map((site) => (
                <tr key={site.siteKey}>
                  <td>
                    <strong>{site.siteKey}</strong>
                    <small>{site.siteUrl ?? "URL 미등록"}</small>
                  </td>
                  <td>7일 이미지 {formatNumber(site.imageRequests7d)}</td>
                  <td>7일 리다이렉트 {formatNumber(site.clicks7d)}</td>
                  <td>7일 리다이렉트율 {formatPercent(getCtrRate7d(site))}</td>
                </tr>
              ))}
            </OpsTable>

            <OpsTable
              title={`활성 미배정 슬롯 (${formatNumber(activeUnassignedPlacements.length)})`}
              isLoading={isLoading}
              emptyText="미배정 활성 슬롯이 없습니다."
            >
              {activeUnassignedPlacements.slice(0, MAX_TABLE_ROWS).map((placement) => (
                <tr key={placement.id}>
                  <td>
                    <strong>{placement.name}</strong>
                    <small>{formatSlotLabel(placement)}</small>
                  </td>
                  <td>{placement.assignedCreativeName ?? "소재 없음"}</td>
                  <td>{placement.assignedTrackingSlug ?? "링크 없음"}</td>
                </tr>
              ))}
            </OpsTable>

            <OpsTable title={`no_ad 발생 슬롯 (${formatNumber(noAdPlacements.length)})`} isLoading={isLoading} emptyText="no_ad 발생 슬롯이 없습니다.">
              {noAdPlacements.slice(0, MAX_TABLE_ROWS).map((placement) => (
                <tr key={placement.id}>
                  <td>
                    <strong>{placement.name}</strong>
                    <small>{formatSlotLabel(placement)}</small>
                  </td>
                  <td>{formatNumber(placement.noAd)}</td>
                  <td>{formatPercent(getNoAdRate(placement))}</td>
                </tr>
              ))}
            </OpsTable>

            <OpsTable title={`소재 검수/상태 (${formatNumber(reviewCreatives.length)})`} isLoading={isLoading} emptyText="검수 대기 또는 비활성 소재가 없습니다.">
              {reviewCreatives.slice(0, MAX_TABLE_ROWS).map((creative) => (
                <tr key={creative.id}>
                  <td>
                    <strong>{creative.name}</strong>
                    <small>{creative.offerId ?? "affiliate item 없음"}</small>
                  </td>
                  <td>{creative.policyStatus}</td>
                  <td>{creative.status}</td>
                </tr>
              ))}
            </OpsTable>

            <OpsTable title={`추적 링크 점검 (${formatNumber(trackingLinkIssues.length)})`} isLoading={isLoading} emptyText="추적 링크 점검 항목이 없습니다.">
              {trackingLinkIssues.slice(0, MAX_TABLE_ROWS).map((link) => (
                <tr key={link.id}>
                  <td>
                    <strong>{link.slug}</strong>
                    <small>{link.offerId ?? "affiliate item 없음"}</small>
                  </td>
                  <td>{link.offerName ?? "-"}</td>
                  <td>{link.status}</td>
                </tr>
              ))}
            </OpsTable>

            <OpsTable title={`사이트 점검 (${formatNumber(attentionSites.length)})`} isLoading={isLoading} emptyText="사이트 단위 점검 항목이 없습니다.">
              {attentionSites.slice(0, MAX_TABLE_ROWS).map((site) => (
                <tr key={site.siteKey}>
                  <td>
                    <strong>{site.siteKey}</strong>
                    <small>{site.siteUrl ?? "URL 미등록"}</small>
                  </td>
                  <td>미배정 {formatNumber(site.unassignedPlacements)}</td>
                  <td>no_ad {formatNumber(site.noAd)}</td>
                  <td>활성 {formatNumber(site.activePlacements)}</td>
                </tr>
              ))}
            </OpsTable>
          </div>
        </div>
      ) : null}

      {activeTab === "sites" ? (
        <div className="ops-tab-panel">
          <div className="ops-table-card ops-site-summary">
            <div className="ops-table-card-heading">
              <div>
                <h3>사이트별 배너 운영 현황 ({formatNumber(filteredSiteSummaries.length)})</h3>
                <p>
                  {formatNumber(visibleSiteSummaries.length)} / {formatNumber(filteredSiteSummaries.length)}개 표시
                  {sortedSiteSummaries.length > MAX_TABLE_ROWS ? ` · 첫 ${formatNumber(MAX_TABLE_ROWS)}개` : ""}
                </p>
              </div>
              <div className="ops-quick-filters" aria-label="사이트 빠른 필터">
                {SITE_QUICK_FILTERS.map((filter) => (
                  <button
                    aria-pressed={siteQuickFilter === filter.id}
                    className={siteQuickFilter === filter.id ? "active" : ""}
                    key={filter.id}
                    type="button"
                    onClick={() => setSiteQuickFilter(filter.id)}
                  >
                    <span>{filter.label}</span>
                    <strong>{formatNumber(siteQuickFilterCounts[filter.id])}</strong>
                  </button>
                ))}
              </div>
            </div>
            <div className="workspace-table-wrap">
              <table className="workspace-table ops-table ops-site-summary-table">
                <thead>
                  <tr>
                    {SITE_SUMMARY_COLUMNS.map((column) => (
                      <th key={column.key}>
                        <button
                          aria-label={`${column.label} 기준 정렬`}
                          aria-pressed={siteSort.key === column.key}
                          className={siteSort.key === column.key ? "ops-sort-button active" : "ops-sort-button"}
                          type="button"
                          onClick={() => toggleSiteSort(column.key)}
                        >
                          <span>{column.label}</span>
                          <span>{siteSort.key === column.key ? (siteSort.direction === "desc" ? "↓" : "↑") : "↕"}</span>
                        </button>
                      </th>
                    ))}
                    <th>조치</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                        <tr>
                          <td colSpan={SITE_SUMMARY_COLUMNS.length + 1}>불러오는 중입니다.</td>
                        </tr>
                      ) : visibleSiteSummaries.length > 0 ? (
                    visibleSiteSummaries.map((site) => {
                      const risk = getSiteRisk(site);
                      return (
                        <tr
                          className={risk.level === "none" ? undefined : `ops-risk-row ops-risk-${risk.level}`}
                          data-risk={risk.level}
                          data-risk-reason={risk.reason}
                          key={site.siteKey}
                        >
                          <td>
                            <strong>{site.siteKey}</strong>
                            <small>{site.siteUrl ?? "URL 미등록"}</small>
                            {risk.level === "none" ? null : <small className="ops-risk-label">{risk.label}</small>}
                          </td>
                          <td>{formatNumber(site.placements)}</td>
                          <td>{formatNumber(site.activePlacements)}</td>
                          <td>{formatNumber(site.assignedPlacements)}</td>
                          <td>{formatNumber(site.unassignedPlacements)}</td>
                          <td>{formatNumber(site.noAd)}</td>
                          <td>{formatNumber(site.requests)}</td>
                          <td>{formatNumber(site.imageRequests)}</td>
                          <td>{formatNumber(site.clicks)}</td>
                          <td>{formatPercent(getCtrRate(site))}</td>
                          <td>{formatNumber(site.imageRequests7d)}</td>
                          <td>{formatNumber(site.clicks7d)}</td>
                          <td>{formatPercent(getCtrRate7d(site))}</td>
                          <td>{formatDateTime(site.lastUpdatedAt)}</td>
                          <td className="ops-site-actions">
                            <button type="button" onClick={() => openSiteWorkflow(site, "assignments")}>
                              배정
                            </button>
                            <button type="button" onClick={() => openSiteWorkflow(site, "install")}>
                              설치
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={SITE_SUMMARY_COLUMNS.length + 1}>조건에 맞는 사이트별 배너 슬롯이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "setup" ? (
        <div className="ops-tab-panel">
          <div className="ops-form-grid">
            <form className="ops-form" onSubmit={createTrackingLink}>
              <h3>1. 추적 링크</h3>
              <label>
                슬러그
                <input
                  required
                  value={trackingForm.slug}
                  onChange={(event) => setTrackingForm({ ...trackingForm, slug: event.target.value })}
                />
              </label>
              <label>
                목적 URL
                <input
                  required
                  type="url"
                  value={trackingForm.publicUrl}
                  onChange={(event) => setTrackingForm({ ...trackingForm, publicUrl: event.target.value })}
                />
              </label>
              <label>
                Affiliate item ID
                <input
                  placeholder="coupang-partners-primary"
                  value={trackingForm.offerId}
                  onChange={(event) => setTrackingForm({ ...trackingForm, offerId: event.target.value })}
                />
              </label>
              <label>
                오퍼 이름
                <input
                  value={trackingForm.offerName}
                  onChange={(event) => setTrackingForm({ ...trackingForm, offerName: event.target.value })}
                />
              </label>
              <label>
                상태
                <select
                  value={trackingForm.status}
                  onChange={(event) => setTrackingForm({ ...trackingForm, status: event.target.value })}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <button className="ops-button" disabled={controlsDisabled}>
                링크 생성
              </button>
            </form>

            <form className="ops-form" onSubmit={createCreative}>
              <h3>2. 배너 소재</h3>
              <label>
                소재 이름
                <input
                  required
                  value={creativeForm.name}
                  onChange={(event) => setCreativeForm({ ...creativeForm, name: event.target.value })}
                />
              </label>
              <label>
                이미지 URL
                <input
                  required
                  type="url"
                  value={creativeForm.imageUrl}
                  onChange={(event) => setCreativeForm({ ...creativeForm, imageUrl: event.target.value })}
                />
              </label>
              <label>
                Affiliate item ID
                <input
                  placeholder="coupang-partners-primary"
                  value={creativeForm.offerId}
                  onChange={(event) => setCreativeForm({ ...creativeForm, offerId: event.target.value })}
                />
              </label>
              <div className="ops-two">
                <label>
                  너비
                  <input
                    inputMode="numeric"
                    value={creativeForm.width}
                    onChange={(event) => setCreativeForm({ ...creativeForm, width: event.target.value })}
                  />
                </label>
                <label>
                  높이
                  <input
                    inputMode="numeric"
                    value={creativeForm.height}
                    onChange={(event) => setCreativeForm({ ...creativeForm, height: event.target.value })}
                  />
                </label>
              </div>
              <div className="ops-two">
                <label>
                  상태
                  <select
                    value={creativeForm.status}
                    onChange={(event) => setCreativeForm({ ...creativeForm, status: event.target.value })}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  검수
                  <select
                    value={creativeForm.policyStatus}
                    onChange={(event) => setCreativeForm({ ...creativeForm, policyStatus: event.target.value })}
                  >
                    {POLICY_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="ops-button" disabled={controlsDisabled}>
                소재 생성
              </button>
            </form>

            <form className="ops-form" onSubmit={createPlacement}>
              <h3>3. 배치 위치</h3>
              <label>
                위치 이름
                <input
                  required
                  value={placementForm.name}
                  onChange={(event) => setPlacementForm({ ...placementForm, name: event.target.value })}
                />
              </label>
              <div className="ops-two">
                <label>
                  사이트 키
                  <input
                    required
                    value={placementForm.siteKey}
                    onChange={(event) => setPlacementForm({ ...placementForm, siteKey: event.target.value })}
                  />
                </label>
                <label>
                  슬롯 키
                  <input
                    required
                    value={placementForm.slotKey}
                    onChange={(event) => setPlacementForm({ ...placementForm, slotKey: event.target.value })}
                  />
                </label>
              </div>
              <label>
                사이트 URL
                <input
                  type="url"
                  value={placementForm.siteUrl}
                  onChange={(event) => setPlacementForm({ ...placementForm, siteUrl: event.target.value })}
                />
              </label>
              <label>
                유형
                <select
                  value={placementForm.type}
                  onChange={(event) => setPlacementForm({ ...placementForm, type: event.target.value })}
                >
                  <option value="image_link">image_link</option>
                  <option value="js_slot">js_slot</option>
                </select>
              </label>
              <label>
                no_ad 정책
                <select
                  value={placementForm.noAdPolicy}
                  onChange={(event) => setPlacementForm({ ...placementForm, noAdPolicy: event.target.value })}
                >
                  {NO_AD_OPTIONS.map((policy) => (
                    <option key={policy} value={policy}>
                      {policy}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                상태
                <select
                  value={placementForm.status}
                  onChange={(event) => setPlacementForm({ ...placementForm, status: event.target.value })}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <button className="ops-button" disabled={controlsDisabled}>
                위치 생성
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {activeTab === "assignments" ? (
        <div className="ops-tab-panel">
          <div className="ops-assignment-queue">
            <div className="ops-section-heading">
              <div>
                <h3>배정 후보 큐</h3>
                <p>미배정 active 슬롯과 no_ad 발생 슬롯을 먼저 보여줍니다.</p>
              </div>
              <strong>{formatNumber(assignmentCandidatePlacements.length)}개</strong>
            </div>
            {assignmentCandidatePlacements.length > 0 ? (
              <div className="ops-assignment-candidates">
                {assignmentCandidatePlacements.map((placement) => {
                  const assigned = isPlacementAssigned(placement);
                  return (
                    <div className={assigned ? "ops-assignment-candidate" : "ops-assignment-candidate is-unassigned"} key={placement.id}>
                      <div>
                        <strong>{formatSlotLabel(placement)}</strong>
                        <small>{placement.name}</small>
                        <small>
                          {assigned ? "배정됨" : "미배정"} · no_ad {formatNumber(placement.noAd)} · 요청{" "}
                          {formatNumber(placement.requests)}
                        </small>
                      </div>
                      <div className="ops-candidate-actions">
                        <button type="button" onClick={() => selectPlacementWorkflow(placement, "assignments")}>
                          선택
                        </button>
                        <button type="button" onClick={() => selectPlacementWorkflow(placement, "install")}>
                          설치
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="ops-empty-state">현재 필터 조건에서 우선 배정할 슬롯이 없습니다.</p>
            )}
          </div>

          <form className="ops-assignment" onSubmit={assignPlacement}>
            <div>
              <h3>4. 소재 연결</h3>
              <p>선택한 배치 위치의 기존 active 연결은 inactive로 바꾸고 새 연결을 active로 저장합니다.</p>
            </div>
            <select
              required
              disabled={controlsDisabled}
              value={assignmentForm.placementId}
              onChange={(event) => setAssignmentForm({ ...assignmentForm, placementId: event.target.value })}
            >
              <option value="">배치 위치 선택</option>
              {filteredPlacements.map((placement) => (
                <option key={placement.id} value={placement.id}>
                  {formatSlotLabel(placement)} · {placement.name}
                </option>
              ))}
            </select>
            <select
              required
              disabled={controlsDisabled}
              value={assignmentForm.creativeId}
              onChange={(event) => setAssignmentForm({ ...assignmentForm, creativeId: event.target.value })}
            >
              <option value="">소재 선택</option>
              {state.creatives.map((creative) => (
                <option key={creative.id} value={creative.id}>
                  {creative.name}
                </option>
              ))}
            </select>
            <select
              required
              disabled={controlsDisabled}
              value={assignmentForm.trackingLinkId}
              onChange={(event) => setAssignmentForm({ ...assignmentForm, trackingLinkId: event.target.value })}
            >
              <option value="">추적 링크 선택</option>
              {state.trackingLinks.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.slug}
                </option>
              ))}
            </select>
            <label>
              Weight
              <input
                disabled={controlsDisabled}
                inputMode="numeric"
                min="0"
                value={assignmentForm.weight}
                onChange={(event) => setAssignmentForm({ ...assignmentForm, weight: event.target.value })}
              />
            </label>
            <button className="ops-button" disabled={controlsDisabled}>
              연결 저장
            </button>
          </form>

          <OpsTable
            title={`최근 연결 이력 (${formatNumber(filteredAssignments.length)})`}
            isLoading={isLoading}
            emptyText="연결 이력이 없습니다."
          >
            {filteredAssignments.slice(0, MAX_TABLE_ROWS).map((assignment) => (
              <tr key={assignment.id}>
                <td>
                  <strong>{assignment.placementName}</strong>
                  <small>{formatAssignmentSlotLabel(assignment)}</small>
                  <small>{assignment.id}</small>
                </td>
                <td>{assignment.creativeName ?? "-"}</td>
                <td>{assignment.trackingSlug ?? "-"}</td>
                <td>{assignment.weight}</td>
                <td>{assignment.status}</td>
              </tr>
            ))}
          </OpsTable>
        </div>
      ) : null}

      {activeTab === "install" ? (
        <div className="ops-tab-panel">
          <div className="ops-install ops-install-panel">
            <div>
              <strong>사이트 설치 코드</strong>
              <span>{install ? install.slotLabel : "배치 위치를 선택하세요."}</span>
            </div>
            <label>
              설치 슬롯
              <select
                value={assignmentForm.placementId}
                onChange={(event) => setAssignmentForm({ ...assignmentForm, placementId: event.target.value })}
              >
                <option value="">배치 위치 선택</option>
                {filteredPlacements.map((placement) => (
                  <option key={placement.id} value={placement.id}>
                    {formatSlotLabel(placement)} · {placement.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedPlacement ? (
              <div className="ops-install-checklist">
                <span>
                  상태 <strong>{selectedPlacement.status}</strong>
                </span>
                <span>
                  소재 <strong>{selectedPlacement.assignedCreativeName ?? "미배정"}</strong>
                </span>
                <span>
                  추적 <strong>{selectedPlacement.assignedTrackingSlug ?? "미배정"}</strong>
                </span>
                <span>
                  no_ad <strong>{formatNumber(selectedPlacement.noAd)}</strong>
                </span>
                <span>
                  요청 <strong>{formatNumber(selectedPlacement.requests)}</strong>
                </span>
              </div>
            ) : null}
            {install ? (
              <div className="ops-install-code">
                <code>{`<a href="${install.clickUrl}" rel="sponsored nofollow"><img src="${install.imageUrl}" alt="" loading="lazy" /></a>`}</code>
                <code>{`image: ${install.imageUrl}`}</code>
                <code>{`click: ${install.clickUrl}`}</code>
              </div>
            ) : (
              <p className="ops-empty-state">설치 코드를 만들 배치 위치가 없습니다.</p>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "diagnostics" ? (
        <div className="ops-tab-panel">
          <div className="ops-diagnostic-board">
            <div className="ops-section-heading">
              <div>
                <h3>진단 우선순위</h3>
                <p>배치, 소재, 추적 링크의 위험 항목을 그룹별로 좁혀서 확인합니다.</p>
              </div>
              <strong>{diagnosticFocusCards.find((card) => card.id === diagnosticFocus)?.label ?? "전체"}</strong>
            </div>
            <div className="ops-diagnostic-filters" aria-label="진단 필터">
              {diagnosticFocusCards.map((card) => (
                <button
                  aria-pressed={diagnosticFocus === card.id}
                  className={diagnosticFocus === card.id ? `active is-${card.tone}` : `is-${card.tone}`}
                  key={card.id}
                  type="button"
                  onClick={() => setDiagnosticFocus(card.id)}
                >
                  <span>{card.label}</span>
                  <strong>{formatNumber(card.value)}</strong>
                  <small>{card.detail}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="ops-table-grid">
            <OpsTable
              title={`배치 위치 (${formatNumber(diagnosticPlacementRows.length)}, 첫 ${MAX_TABLE_ROWS}개)`}
              isLoading={isLoading}
              emptyText="배치 위치가 없습니다."
            >
              {diagnosticPlacementRows.slice(0, MAX_TABLE_ROWS).map((placement) => (
                <tr key={placement.id}>
                  <td>
                    <strong>{placement.name}</strong>
                    <small>{placement.id}</small>
                    <small>{formatSlotLabel(placement)}</small>
                  </td>
                  <td>{placement.type}</td>
                  <td>{placement.noAdPolicy}</td>
                  <td>{placement.assignedCreativeName ?? "-"}</td>
                  <td>{placement.assignedTrackingSlug ?? "-"}</td>
                  <td>{formatNumber(placement.requests)}</td>
                  <td>{formatNumber(placement.noAd)}</td>
                  <td>
                    <StatusSelect
                      disabled={controlsDisabled}
                      value={placement.status}
                      onChange={(status) =>
                        void submitAction("updatePlacement", { id: placement.id, status }, "배치 위치 상태를 저장했습니다.")
                      }
                    />
                  </td>
                </tr>
              ))}
            </OpsTable>

            <OpsTable title={`소재 (${formatNumber(diagnosticCreativeRows.length)}, 첫 ${MAX_TABLE_ROWS}개)`} isLoading={isLoading} emptyText="소재가 없습니다.">
              {diagnosticCreativeRows.slice(0, MAX_TABLE_ROWS).map((creative) => (
                <tr key={creative.id}>
                  <td>
                    <strong>{creative.name}</strong>
                    <small>{creative.imageUrl}</small>
                    <small>{creative.offerId ?? "no affiliate item"}</small>
                  </td>
                  <td>{creative.width ?? "-"}x{creative.height ?? "-"}</td>
                  <td>
                    <select
                      disabled={controlsDisabled}
                      value={creative.policyStatus}
                      onChange={(event) =>
                        void submitAction(
                          "updateCreative",
                          { id: creative.id, policyStatus: event.target.value },
                          "소재 검수 상태를 저장했습니다.",
                        )
                      }
                    >
                      {POLICY_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <StatusSelect
                      disabled={controlsDisabled}
                      value={creative.status}
                      onChange={(status) =>
                        void submitAction("updateCreative", { id: creative.id, status }, "소재 상태를 저장했습니다.")
                      }
                    />
                  </td>
                </tr>
              ))}
            </OpsTable>

            <OpsTable
              title={`추적 링크 (${formatNumber(diagnosticTrackingLinkRows.length)}, 첫 ${MAX_TABLE_ROWS}개)`}
              isLoading={isLoading}
              emptyText="추적 링크가 없습니다."
            >
              {diagnosticTrackingLinkRows.slice(0, MAX_TABLE_ROWS).map((link) => (
                <tr key={link.id}>
                  <td>
                    <strong>{link.slug}</strong>
                    <small>{link.publicUrl}</small>
                    <small>{link.offerId ?? "no affiliate item"}</small>
                  </td>
                  <td>{link.offerName ?? "-"}</td>
                  <td>
                    <StatusSelect
                      disabled={controlsDisabled}
                      value={link.status}
                      onChange={(status) =>
                        void submitAction("updateTrackingLink", { id: link.id, status }, "추적 링크 상태를 저장했습니다.")
                      }
                    />
                  </td>
                </tr>
              ))}
            </OpsTable>

            <OpsTable
              title={`최근 연결 이력 (${formatNumber(filteredAssignments.length)}, 첫 ${MAX_TABLE_ROWS}개)`}
              isLoading={isLoading}
              emptyText="연결 이력이 없습니다."
            >
              {filteredAssignments.slice(0, MAX_TABLE_ROWS).map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <strong>{assignment.placementName}</strong>
                    <small>{formatAssignmentSlotLabel(assignment)}</small>
                    <small>{assignment.id}</small>
                  </td>
                  <td>{assignment.creativeName ?? "-"}</td>
                  <td>{assignment.trackingSlug ?? "-"}</td>
                  <td>{assignment.weight}</td>
                  <td>{assignment.status}</td>
                </tr>
              ))}
            </OpsTable>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OpsTable({
  children,
  emptyText,
  isLoading,
  title,
}: {
  children: ReactNode;
  emptyText: string;
  isLoading: boolean;
  title: string;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="ops-table-card">
      <h3>{title}</h3>
      <div className="workspace-table-wrap">
        <table className="workspace-table ops-table">
          <tbody>
            {isLoading ? (
              <tr>
                <td>불러오는 중입니다.</td>
              </tr>
            ) : hasRows ? (
              children
            ) : (
              <tr>
                <td>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusSelect({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (status: string) => void;
  value: string;
}) {
  return (
    <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function buildInstallCode(placement: PlacementRow, publicBaseUrl: string) {
  const base = publicBaseUrl.replace(/\/+$/, "");
  const slot = placement.siteKey && placement.slotKey ? `${placement.siteKey}.${placement.slotKey}` : "";
  const query = slot
    ? `slot=${encodeURIComponent(slot)}`
    : `placementId=${encodeURIComponent(placement.id)}`;
  return {
    clickUrl: `${base}/api/banner-management/click?${query}`,
    imageUrl: `${base}/api/banner-management/image?${query}`,
    slotLabel: formatSlotLabel(placement),
  };
}

function isPlacementAssigned(placement: PlacementRow): boolean {
  return Boolean(placement.assignedCreativeId && placement.assignedTrackingLinkId);
}

function getNoAdRate(placement: PlacementRow): number {
  if (placement.requests <= 0) return 0;
  return placement.noAd / placement.requests;
}

function getCtrRate(input: { clicks: number; imageRequests: number }): number {
  if (input.imageRequests <= 0) return 0;
  return input.clicks / input.imageRequests;
}

function getCtrRate7d(input: { clicks7d: number; imageRequests7d: number }): number {
  if (input.imageRequests7d <= 0) return 0;
  return input.clicks7d / input.imageRequests7d;
}

function matchesSiteQuickFilter(site: SiteSummaryRow, filter: SiteQuickFilterId): boolean {
  switch (filter) {
    case "all":
      return true;
    case "attention":
      return getSiteRisk(site).level !== "none";
    case "inactive":
      return site.activePlacements === 0;
    case "no_ad":
      return site.noAd > 0;
    case "recent_exposure":
      return site.imageRequests7d > 0;
    case "unassigned":
      return site.unassignedPlacements > 0;
    case "zero_click_7d":
      return site.imageRequests7d >= 20 && site.clicks7d === 0;
  }
}

function getSiteRisk(site: SiteSummaryRow): {
  label: string;
  level: "critical" | "high" | "medium" | "none";
  reason: string;
} {
  if (site.activePlacements === 0) {
    return {
      label: "활성 슬롯 없음",
      level: "critical",
      reason: "inactive",
    };
  }
  if (site.unassignedPlacements > 0) {
    return {
      label: "미배정 있음",
      level: "high",
      reason: "unassigned",
    };
  }
  if (site.noAd > 0) {
    return {
      label: "no_ad 발생",
      level: "medium",
      reason: "no_ad",
    };
  }
  if (site.imageRequests7d >= 20 && site.clicks7d === 0) {
    return {
      label: "7일 리다이렉트 없음",
      level: "medium",
      reason: "zero_click_7d",
    };
  }
  return {
    label: "정상",
    level: "none",
    reason: "none",
  };
}

function sortSiteSummaries(sites: SiteSummaryRow[], key: SiteSortKey, direction: SortDirection): SiteSummaryRow[] {
  const multiplier = direction === "desc" ? -1 : 1;
  return [...sites].sort((a, b) => {
    const first = getSiteSortValue(a, key);
    const second = getSiteSortValue(b, key);
    if (typeof first === "string" && typeof second === "string") {
      return first.localeCompare(second, "ko-KR", { numeric: true, sensitivity: "base" }) * multiplier;
    }
    return ((first as number) - (second as number)) * multiplier;
  });
}

function getSiteSortValue(site: SiteSummaryRow, key: SiteSortKey): number | string {
  switch (key) {
    case "ctr":
      return getCtrRate(site);
    case "ctr7d":
      return getCtrRate7d(site);
    case "lastUpdatedAt":
      return Date.parse(site.lastUpdatedAt) || 0;
    case "siteKey":
      return site.siteKey;
    default:
      return site[key];
  }
}

function formatSlotLabel(placement: PlacementRow): string {
  if (placement.siteKey && placement.slotKey) return `${placement.siteKey}.${placement.slotKey}`;
  return placement.siteKey || placement.slotKey || "legacy placement";
}

function formatAssignmentSlotLabel(assignment: AssignmentRow): string {
  if (assignment.placementSiteKey && assignment.placementSlotKey) {
    return `${assignment.placementSiteKey}.${assignment.placementSlotKey}`;
  }
  return assignment.placementSiteKey || assignment.placementSlotKey || "legacy placement";
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function numberOrDefault(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatDateTime(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
