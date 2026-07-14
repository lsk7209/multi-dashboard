import { existsSync, readdirSync, readFileSync } from "node:fs";
import YAML from "yaml";
import {
  getOpsMailPersistenceNote,
  getOpsMailReviewState,
  type OpsMailReviewStatus,
} from "./ops-mail-review-store";
import {
  isMaintenanceRefreshFailureSource,
  readinessBlockingRefreshFailureSources,
} from "./refresh-failure-details";

const REQUIRED_DASHBOARD_POST_RECOVERY_ACCEPTANCE_ROWS = [
  "external_gsc_access_restored=satisfied",
  "dashboard_verify_local_verified=satisfied",
  "rendered_ui_smoke_current=satisfied",
  "dashboard_surface_current=satisfied",
  "recommendations_safe_to_act=satisfied",
  "mutation_boundary_clean=satisfied",
] as const;

export interface Site {
  id: string;
  name?: string;
  enabled?: boolean;
  platform?: string;
  url: string;
  wpRestBase?: string;
  ga4PropertyId?: string;
  gscSiteUrl?: string;
  sitemapUrls?: string[];
  monetization?: boolean;
  contentSource?: {
    type?: string;
    locationLabel?: string;
    localPath?: string;
    githubRepo?: string;
    localPaths?: Array<{
      locationLabel?: string;
      path: string;
    }>;
    wpPath?: string;
    sshHost?: string;
    sshUser?: string;
    sshPort?: number;
  };
}

interface SitesFile {
  sites?: Site[];
}

export interface MetricSet {
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  eventCount: number;
}

export interface GscMetricSet {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryMetric extends GscMetricSet {
  query: string;
}

export interface GscEmailAlert {
  source: "gmail-digest";
  site: string;
  issue: string;
  time?: string;
  detectedAt: string;
  url: string;
  severity: "high" | "medium" | "low";
}

export interface InsightQueryCandidate extends GscMetricSet {
  query: string;
}

export interface TrafficKeywordMetric {
  keyword: string;
  source: string;
  medium: string;
  sourceMedium: string;
  activeUsers: number;
  sessions: number;
  clicks?: number;
  impressions?: number;
  sourceType?: "ga4" | "gsc" | "external";
}

export interface TrafficBreakdownMetric {
  dimension: string;
  activeUsers: number;
  sessions: number;
  previousActiveUsers: number;
  previousSessions: number;
  activeUsersChange: number | null;
}

export interface SitemapDetail {
  path: string;
  lastDownloaded?: string;
  lastSubmitted?: string;
  warnings?: number;
  errors?: number;
  isPending?: boolean;
  indexed?: number;
  submitted?: number;
}

export type SearchIndexEngine = "google" | "naver" | "daum";

export type SearchIndexPresenceStatus =
  | "ok"
  | "blocked"
  | "fetch_error"
  | "parse_error"
  | "not_checked";

export interface SearchIndexPresenceEngine {
  engine: SearchIndexEngine;
  status: SearchIndexPresenceStatus;
  count?: number;
  queryUrl: string;
  checkedAt: string;
  error?: string;
}

export interface SiteSearchIndexPresence {
  siteId: string;
  siteName: string;
  url: string;
  host: string;
  query: string;
  checkedAt: string;
  engines: Record<SearchIndexEngine, SearchIndexPresenceEngine>;
}

interface SearchIndexPresenceSnapshot {
  generatedAt: string;
  queryPattern: "site:{host}";
  note: string;
  stats: SiteSearchIndexPresence[];
}

export interface MonetizationEvidence {
  type: "homepage" | "homepage_mediapartners" | "sample_page" | "ads_txt";
  url: string;
  checkedAt: string;
  httpStatus?: number;
  matchedSignal?: string;
  error?: string;
}

export type AdsenseExternalProofDecision =
  | "strongest_console_check_candidate"
  | "manual_external_review_needed"
  | "hold_for_fresh_external_proof"
  | "live_apply_state_needed"
  | "source_recovery_needed";

export interface AdsenseExternalProof {
  siteId: string;
  url: string;
  host: string;
  externalHomepageProof: string;
  externalHomepageEvidence: string;
  externalAdsTxtProof: string;
  externalLoaderProof: string;
  currentDecision: AdsenseExternalProofDecision;
  nextGate: string;
  endpointRetrySummary?: string;
  loaderRetrySummary?: string;
  networkVantageSummary?: string;
}

export type AdsenseProofFreshnessStatus =
  | "current"
  | "resolved"
  | "stale"
  | "missing"
  | "invalid";

export interface AdsenseProofFreshnessSummary {
  status: AdsenseProofFreshnessStatus;
  artifactPath?: string;
  generatedAt?: string;
  collectorSnapshot?: string;
  expectedStatsGeneratedAt?: string | null;
  candidateSiteIds: string[];
  candidateCount: number;
  reason: string;
  remediationCommand: string;
}

export interface AdsenseExternalProofActionMeta {
  label: string;
  priority: number;
}

interface AdsenseLocalSourceSupplementSite {
  siteId: string;
  host: string;
  localSourceStatus: string;
  evidence: string[];
  nextGate: string;
}

interface AdsenseEndpointRetryResult {
  siteId: string;
  endpoint: string;
  result: string;
}

interface AdsenseLoaderRetryResult {
  siteId: string;
  result: string;
}

interface AdsenseNetworkVantageResult {
  siteId: string;
  host?: string;
  addresses: string[];
  tcp80: string;
  tcp443: string;
}

interface AdsenseNetworkVantageSharedOrigin {
  address: string;
  hostCount: number;
  tcp80Pass: number;
  tcp443Pass: number;
  fullTcpBlocked: number;
}

export type AdsenseRemediationLaneKey =
  | "ordinary_adsense_proof"
  | "approved_root_subdomain_scope"
  | "gsc_auth_telemetry"
  | "ga4_config_telemetry";

export interface AdsenseRemediationQueueItem {
  siteId: string;
  host: string;
  name: string;
  lane: AdsenseRemediationLaneKey;
  priority: number;
  requiredEvidence: string[];
  stopCondition: string;
  notes: string[];
}

export interface AdsenseRemediationQueueSummary {
  generatedAt: string;
  collectorSnapshot: string;
  productionMutationPerformed: false;
  adsenseConsoleChecked: boolean;
  totalRows: number;
  reviewedRows: number;
  adsenseOkRows: number;
  problemRows: number;
  ordinaryAdsenseProof: number;
  approvedRootSubdomainScope: number;
  gscAuthTelemetry: number;
  ga4ConfigTelemetry: number;
  lanes: Record<AdsenseRemediationLaneKey, AdsenseRemediationQueueItem[]>;
}

export interface AdsenseProofGateBlocker {
  code: string;
  severity: "blocking" | "maintenance";
  count: number;
  siteIds: string[];
  requiredAction: string;
}

export interface AdsenseProofGateReadiness {
  technicalReadiness: string;
  consoleReadiness: string;
  scopeReadiness: string;
  telemetryReadiness: string;
}

export interface AdsenseProofGateSummary {
  generatedAt: string;
  collectorSnapshot: string;
  productionMutationPerformed: false;
  adsenseConsoleChecked: false;
  verdict: string;
  readiness: AdsenseProofGateReadiness;
  blockers: AdsenseProofGateBlocker[];
  summary: {
    ordinaryAdsenseProof: number;
    approvedRootSubdomainScope: number;
    gscAuthTelemetry: number;
    ga4ConfigTelemetry: number;
    endpointRetryResultCount: number;
    freshAdsTxtProofPass: number;
    freshRobotsProofPass: number;
    hostingLoaderResultCount: number;
    freshHostingLoaderProofPass: number;
    consoleStateResultCount?: number;
    consoleStatePass?: number;
    consoleStateBlocked?: number;
    approvedRootScopeConfirmed?: number;
  };
  stopCondition: string;
}

export interface GscPermissionAuditSummary {
  artifactPath: string;
  workOrderPath: string;
  generatedAt: string;
  collectorSnapshot: string;
  handoffStatus: "pending_external" | "pending_local_refresh" | "resolved";
  productionMutationPerformed: false;
  gscMutationPerformed: false;
  serviceAccountEmail: string | null;
  auditedRows: number;
  ownerAccess: number;
  restrictedAccess: number;
  unverified: number;
  notListed: number;
  results: GscPermissionAuditResult[];
}

export interface GscPermissionAuditResult {
  siteId: string;
  host: string;
  configuredGscSiteUrl: string;
  gscStatus: string;
  listedSiteUrl: string | null;
  permissionLevel: string | null;
  accessState: string;
  requiredAction: string;
}

export interface FleetOptimizationChainSummary {
  artifactPath: string;
  workOrderPath: string;
  generatedAt: string;
  date: string;
  statsSnapshot: string;
  planSnapshot: string;
  handoffSnapshot: string;
  refreshFailedSources: string[];
  readinessBlockingRefreshFailedSources: string[];
  maintenanceRefreshFailedSources: string[];
  refreshFailureCount: number;
  refreshFailuresBlockReadiness: boolean;
  commands: number;
  pass: number;
  fail: number;
  skipped: number;
  planMatchesStats: boolean;
  handoffMatchesStats: boolean;
  handoffMutationFlagsFalse: boolean;
  handoffSiteCount: number;
  titleHandoffCount: number;
  contentHandoffCount: number;
}

export interface DashboardPostRecoveryChainSummary {
  artifactPath: string;
  workOrderPath: string;
  generatedAt: string;
  date: string;
  statsSnapshot: string;
  verificationPath: string;
  verdict: string;
  actionabilityStatus: string;
  postRecoveryAcceptance: string[];
  postRecoveryAcceptanceSatisfied: boolean;
  readiness: "ready_to_act" | "external_recovery_required" | "failed" | "dry_run";
  artifactIntegrityStatus: "pass" | "fail" | "skipped" | "not_run";
  commands: number;
  pass: number;
  fail: number;
  skipped: number;
}

export type FleetOptimizationChainArtifactState =
  | "current"
  | "missing"
  | "snapshot_mismatch"
  | "invalid";

export interface FleetOptimizationChainArtifactStatus {
  state: FleetOptimizationChainArtifactState;
  reason: string;
  expectedStatsGeneratedAt: string | null;
  artifactPath?: string;
  workOrderPath?: string;
  generatedAt?: string;
  statsSnapshot?: string;
  date?: string;
}

export interface T3TitleContentHandoffSummary {
  artifactPath: string;
  workOrderPath: string;
  generatedAt: string;
  snapshotTimestamp: string;
  refreshFailedSources: string[];
  siteCount: number;
  titleHandoffCount: number;
  contentHandoffCount: number;
  sites: T3TitleContentHandoffSite[];
  hiddenSiteCount: number;
  cmsMutationPerformed: false;
  productionDeploymentPerformed: false;
  searchConsoleMutationPerformed: false;
  adsenseMutationPerformed: false;
  titleOrBodyMutationPerformed: false;
}

export interface T3TitleContentHandoffSite {
  host: string;
  url: string;
  localPath: string;
  actions: string[];
  planRanks: number[];
  gscImpressions30d: number;
  gscClicks30d: number;
  gscCtr30d: number;
  gscPosition30d: number;
  topQuery: string;
  recommendedNextAction: string;
  sitemapWarnings: number;
  sitemapErrors: number;
  adsenseStatus: string;
  adsTxtStatus: string;
}

export const ADSENSE_EXTERNAL_PROOF_DECISIONS = new Set<string>([
  "strongest_console_check_candidate",
  "manual_external_review_needed",
  "hold_for_fresh_external_proof",
  "live_apply_state_needed",
  "source_recovery_needed",
]);
const ADSENSE_REMEDIATION_LANES: AdsenseRemediationLaneKey[] = [
  "ordinary_adsense_proof",
  "approved_root_subdomain_scope",
  "gsc_auth_telemetry",
  "ga4_config_telemetry",
];

export type CollectionStatus =
  | "ok"
  | "auth_error"
  | "api_error"
  | "missing_config";
export type AdsenseInstallStatus = "installed" | "not_detected" | "unknown";
export type AdsTxtValidationStatus =
  | "valid"
  | "missing"
  | "wrong_publisher"
  | "unknown";
export type MonetizationCollectorStatus =
  | "ok"
  | "transient_error"
  | "not_checked";
export type ErrorKind =
  | "permission"
  | "not_found"
  | "quota"
  | "missing_config"
  | "api_error";
export type OperationalStatus =
  | "normal"
  | "needsPermission"
  | "apiError"
  | "processing"
  | "stale";
export type ActionKind =
  | "owner"
  | "permission"
  | "processing"
  | "decline"
  | "monetization"
  | "sitemap"
  | "gscAlert"
  | "seo"
  | "ranking"
  | "data";
export type SegmentKey = "growth" | "decline" | "seo" | "gsc" | "sitemap";
export type CollectionSourceKey =
  | "ga4"
  | "gsc"
  | "sitemap"
  | "adsense"
  | "adsTxt";
export type CollectionSourceState =
  | "ok"
  | "stale"
  | "error"
  | "missing"
  | "processing";

const SITEMAP_COLLECTION_LAG_DAYS = 5;
const MONETIZATION_LAST_GOOD_TTL_HOURS = 72;
const CTR_OPPORTUNITY_MIN_IMPRESSIONS = 20;
const CTR_OPPORTUNITY_MAX_CTR = 0.03;
const CTR_OPPORTUNITY_MIN_POSITION = 1;
const CTR_OPPORTUNITY_MAX_POSITION = 10;
const RANKING_OPPORTUNITY_MIN_IMPRESSIONS = 50;
const RANKING_OPPORTUNITY_MIN_POSITION = 4;
const RANKING_OPPORTUNITY_MAX_POSITION = 20;
const ADSENSE_APPROVED_EXACT_DOMAINS = new Set([
  "temon.kr",
  "ehon365.kr",
  "luckyday.kr",
  "klick.kr",
  "fastjob.kr",
  "haemongdream.com",
  "tennisfrens.com",
  "tasko.kr",
  "nexttech7.com",
  "kang4.com",
  "sellerpit.kr",
]);
const ADSENSE_NON_MONETIZATION_DOMAINS = new Set([
  "yesa.kr",
  "sorimate.com",
  "limsight.kr",
]);

// 급락 판정 임계 — 절대규모가 작으면 변동률(%)이 통계적 노이즈가 되므로
// 직전 기간 규모가 이 값 이상일 때만 "급락"으로 본다.
const SIGNIFICANT_DROP_RATE = -0.3;
const MIN_USERS_FOR_DROP = 50;
const MIN_CLICKS_FOR_DROP = 10;

// GA4 사용자 급락 여부 (변동률 + 절대규모 게이트). 호출부 전체가 이 기준을 공유한다.
// 술어가 참이면 change는 반드시 number이므로 `change is number`로 narrow한다.
export function isSignificantUserDrop(
  change: number | null | undefined,
  previousUsers: number | undefined,
): change is number {
  return (
    (change ?? 0) <= SIGNIFICANT_DROP_RATE &&
    (previousUsers ?? 0) >= MIN_USERS_FOR_DROP
  );
}

// GSC 클릭 급락 여부 (변동률 + 절대규모 게이트).
export function isSignificantClickDrop(
  change: number | null | undefined,
  previousClicks: number | undefined,
): change is number {
  return (
    (change ?? 0) <= SIGNIFICANT_DROP_RATE &&
    (previousClicks ?? 0) >= MIN_CLICKS_FOR_DROP
  );
}

export interface SiteStat {
  id: string;
  name: string;
  url: string;
  ga4PropertyId: string;
  gscSiteUrl?: string;
  last1Days?: MetricSet;
  last7Days: MetricSet;
  previous7Days?: MetricSet;
  last28Days?: MetricSet;
  last30Days?: MetricSet;
  gscLast7Days?: GscMetricSet;
  gscPrevious7Days?: GscMetricSet;
  gscLast28Days?: GscMetricSet;
  gscLast30Days?: GscMetricSet;
  gscTopQueries?: GscQueryMetric[];
  trafficKeywords?: TrafficKeywordMetric[];
  ga4SourceMedium?: TrafficBreakdownMetric[];
  ga4LandingPages?: TrafficBreakdownMetric[];
  ga4Status?: CollectionStatus;
  gscStatus?: CollectionStatus;
  adsenseStatus?: CollectionStatus;
  adsTxtStatus?: CollectionStatus;
  adsenseInstallStatus?: AdsenseInstallStatus;
  adsenseCollectorStatus?: MonetizationCollectorStatus;
  adsenseEvidence?: MonetizationEvidence[];
  adsenseLastKnownGoodAt?: string;
  adsTxtValidationStatus?: AdsTxtValidationStatus;
  adsTxtCollectorStatus?: MonetizationCollectorStatus;
  adsTxtEvidence?: MonetizationEvidence[];
  adsTxtLastKnownGoodAt?: string;
  monetization?: boolean;
  ga4LastSuccessfulFetchAt?: string;
  gscLastSuccessfulFetchAt?: string;
  adsenseLastSuccessfulFetchAt?: string;
  adsTxtLastSuccessfulFetchAt?: string;
  sitemapLastDownloadedAt?: string;
  sitemapLastSubmittedAt?: string;
  sitemapPath?: string;
  sitemapWarnings?: number;
  sitemapErrors?: number;
  sitemapIsPending?: boolean;
  sitemapCount?: number;
  sitemapDetails?: SitemapDetail[];
  googleIndexedCount?: number;
  googleSubmittedCount?: number;
  searchIndexPresence?: SiteSearchIndexPresence;
  ga4ErrorKind?: ErrorKind;
  gscErrorKind?: ErrorKind;
  adsenseErrorKind?: ErrorKind;
  adsTxtErrorKind?: ErrorKind;
  sitemapErrorKind?: ErrorKind;
  gscEmailAlerts?: GscEmailAlert[];
  error?: string;
  gscError?: string;
  adsenseError?: string;
  adsTxtError?: string;
  sitemapError?: string;
  lastPublishedAt?: string;
  lastScheduledAt?: string;
}

interface StatsSnapshot {
  generatedAt: string | null;
  rangeDays: number;
  previousRangeDays: number;
  longRangeDays?: number;
  dateRanges?: DateRangeSummary;
  stats: SiteStat[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DateRangeSummary {
  timezone: "Asia/Seoul";
  basis: "completed_days";
  last1Days: DateRange;
  last7Days: DateRange;
  previous7Days: DateRange;
  last30Days: DateRange;
}

export type InsightKind =
  | "growth"
  | "decline"
  | "seoOpportunity"
  | "rankingOpportunity"
  | "trafficMismatch"
  | "indexingOrPermissionIssue"
  | "duplicateProperty";

export type InsightSeverity = "high" | "medium" | "low";
export type InsightCause =
  | "ga4_drop"
  | "ga4_low_sample_channel_unknown"
  | "gsc_drop"
  | "mixed_decline"
  | "gsc_zero"
  | "gsc_error"
  | "ctr"
  | "ranking"
  | "growth"
  | "traffic_mismatch"
  | "duplicate";
export type InsightConfidence = "high" | "medium" | "low";
export type InsightSampleSize = "high" | "medium" | "low";

export interface SiteInsight {
  id: string;
  siteId: string;
  siteName: string;
  url: string;
  kind: InsightKind;
  severity: InsightSeverity;
  reason: string;
  recommendedAction: string;
  primaryValue: string;
  cause: InsightCause;
  confidence: InsightConfidence;
  sampleSize: InsightSampleSize;
  evidence: string[];
  operatorPrompt: string;
  verification: string;
  reviewNote: string;
  gscDiagnosis: string;
  relatedSignals: string[];
  topQueries: InsightQueryCandidate[];
}

export interface SiteTrend {
  activeUsersChange: number | null;
  sessionsChange: number | null;
  gscClicksChange: number | null;
}

export interface DuplicateSiteSummary {
  id: string;
  name: string;
  ga4PropertyId: string;
  activeUsers: number;
  healthScore: number;
  operationalStatus: OperationalStatus;
}

export interface SiteHealthScore {
  score: number;
  grade: "좋음" | "주의" | "위험";
  reason: string;
}

export interface EnrichedSiteStat extends Omit<
  SiteStat,
  | "last1Days"
  | "previous7Days"
  | "last30Days"
  | "gscPrevious7Days"
  | "gscLast30Days"
> {
  last1Days: MetricSet;
  previous7Days: MetricSet;
  last30Days: MetricSet;
  gscPrevious7Days: GscMetricSet;
  gscLast30Days: GscMetricSet;
  trend: SiteTrend;
  operationalStatus: OperationalStatus;
  statusLabel: string;
  statusReason: string;
  isStale: boolean;
  health: SiteHealthScore;
  seoOpportunityScore?: number;
  collectionSources: CollectionSourceStatus[];
  sparkline: (number | null)[];
  duplicateCount?: number;
  duplicateStats?: DuplicateSiteSummary[];
  developmentPath?: string;
  developmentPathLabel?: string;
  developmentPaths: Array<{
    label: string;
    path: string;
    kind: "local" | "remote" | "github";
  }>;
  developmentPathKind: "local" | "remote" | "github" | "missing";
  adsenseExternalProof?: AdsenseExternalProof;
  adsenseRemediationQueueItem?: AdsenseRemediationQueueItem;
  lastPublishedAt?: string;
  lastScheduledAt?: string;
  scheduledFutureCount?: number;
  daysSincePublished?: number;
}

export interface DashboardActionItem {
  id: string;
  siteId: string;
  siteName: string;
  url: string;
  kind: ActionKind;
  priority: number;
  label: string;
  value: string;
  reason: string;
  nextStep: string;
}

export interface DashboardSegment {
  key: SegmentKey;
  label: string;
  description: string;
  count: number;
  memberIds: string[];
  stats: EnrichedSiteStat[];
}

export interface HealthSummary {
  averageScore: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
}

export interface CollectionSourceStatus {
  key: CollectionSourceKey;
  label: string;
  state: CollectionSourceState;
  reason: string;
  checkedAt?: string;
}

export interface CollectionSourceSummary {
  key: CollectionSourceKey;
  label: string;
  ok: number;
  stale: number;
  error: number;
  missing: number;
  processing: number;
  total: number;
}

export type OpsMailKind =
  | "github-actions"
  | "gsc"
  | "adsense"
  | "ga4"
  | "vercel"
  | "other";
export type OpsMailSeverity = "critical" | "high" | "medium" | "low";
export type OpsCollectorKey = "githubActions" | "dashboardArtifacts" | "ga4";
export type OpsCollectorAvailabilityStatus = "ok" | "skipped" | "error" | "missing";

export interface OpsCollectorAvailability {
  key: OpsCollectorKey;
  label: string;
  status: OpsCollectorAvailabilityStatus;
  detail: string;
  checkedAt: string | null;
  count: number;
}

export interface OpsMailFinding {
  id: string;
  kind: OpsMailKind;
  severity: OpsMailSeverity;
  priority: number;
  title: string;
  recommendedAction: string;
  sourceLine: string;
  repo?: string;
  site?: string;
  workflow?: string;
  category?: string;
  count?: number;
  commit?: string;
  issueUrl?: string;
  reviewStatus: OpsMailReviewStatus;
  reviewNote: string;
  reviewUpdatedAt?: string;
}

export interface OpsMailReport {
  generatedAt: string | null;
  digestUrl: string | null;
  digestUpdatedAt?: string;
  owner?: string;
  path: string;
  reviewUpdatedAt: string | null;
  persistenceNote: string;
  totalCount: number;
  openCount: number;
  siteRelatedCount: number;
  summary: Record<OpsMailSeverity, number>;
  counts: Record<OpsMailKind, number>;
  collection: OpsCollectorAvailability[];
  findings: OpsMailFinding[];
}

export interface DashboardData {
  generatedAt: string | null;
  dateRanges: DateRangeSummary;
  sites: Site[];
  stats: EnrichedSiteStat[];
  insights: SiteInsight[];
  priorityInsights: SiteInsight[];
  seoInsights: SiteInsight[];
  growthInsights: SiteInsight[];
  declineInsights: SiteInsight[];
  actions: DashboardActionItem[];
  segments: DashboardSegment[];
  healthSummary: HealthSummary;
  collectionSummary: CollectionSourceSummary[];
  opsMailReport: OpsMailReport;
  adsenseRemediationQueue: AdsenseRemediationQueueSummary | null;
  adsenseProofGate: AdsenseProofGateSummary | null;
  adsenseProofFreshness: AdsenseProofFreshnessSummary;
  gscPermissionAudit: GscPermissionAuditSummary | null;
  fleetOptimizationChain: FleetOptimizationChainSummary | null;
  fleetOptimizationChainStatus: FleetOptimizationChainArtifactStatus;
  dashboardPostRecoveryChain: DashboardPostRecoveryChainSummary | null;
  t3TitleContentHandoff: T3TitleContentHandoffSummary | null;
  gscIssueStats: EnrichedSiteStat[];
  dailyIssueStats: EnrichedSiteStat[];
  trafficDropStats: EnrichedSiteStat[];
  monetizationIssueStats: EnrichedSiteStat[];
  monetizationIssueCount: number;
  wpStaleStats: EnrichedSiteStat[];
  siteCount: number;
  trackedCount: number;
  gscConnectedCount: number;
  adsenseConnectedCount: number;
  adsenseCheckedCount: number;
  adsTxtConnectedCount: number;
  adsTxtCheckedCount: number;
  failedCount: number;
  staleCount: number;
  collectionStaleCount: number;
  duplicateHostCount: number;
  hiddenDuplicateCount: number;
  processingCount: number;
  totalLast1Days: MetricSet;
  totalLast7Days: MetricSet;
  totalPrevious7Days: MetricSet;
  totalLast30Days: MetricSet;
  totalGscLast7Days: GscMetricSet;
  totalGscPrevious7Days: GscMetricSet;
  totalGscLast30Days: GscMetricSet;
  totalActiveUsersChange: number | null;
}

interface DedupeStatsResult {
  stats: EnrichedSiteStat[];
  duplicateHostCount: number;
  hiddenDuplicateCount: number;
}

export function getDashboardData(): DashboardData {
  const snapshot = readStats("data/site-stats.json");
  const configuredSites = readSites("scripts/setup/sites.yaml").filter(
    (site) => site.enabled !== false,
  );
  const sites =
    configuredSites.length > 0
      ? configuredSites
      : sitesFromStatsSnapshot(snapshot.stats);
  const statsById = new Map(snapshot.stats.map((stat) => [stat.id, stat]));
  const searchIndexPresenceById = loadSearchIndexPresence(
    "data/index-presence.json",
  );
  const sparklines = loadSparklines(sites.map((s) => s.id));
  const scheduledByHost = loadScheduledQueue();
  const adsenseProofFreshness = loadAdsenseProofFreshness(
    "data",
    snapshot.generatedAt,
  );
  const adsenseExternalProofById = loadAdsenseExternalProof(
    "data",
    snapshot.generatedAt,
  );
  const adsenseRemediationQueue = loadAdsenseRemediationQueue(
    "data",
    snapshot.generatedAt,
  );
  const adsenseProofGate = loadAdsenseProofGate("data", snapshot.generatedAt);
  const gscPermissionAudit = loadGscPermissionAudit("data", snapshot.generatedAt);
  const fleetOptimizationChain = loadFleetOptimizationChain(
    "data",
    snapshot.generatedAt,
  );
  const fleetOptimizationChainStatus = loadFleetOptimizationChainStatus(
    "data",
    snapshot.generatedAt,
    fleetOptimizationChain,
  );
  const dashboardPostRecoveryChain = loadDashboardPostRecoveryChain(
    "data",
    snapshot.generatedAt,
  );
  const t3TitleContentHandoff = loadT3TitleContentHandoff(
    "data",
    snapshot.generatedAt,
  );
  const opsMailReport = loadOpsMailReport("data/ops-triage.json");
  const adsenseRemediationQueueById = buildAdsenseRemediationQueueIndex(
    adsenseRemediationQueue,
  );
  const stats = sites.map((site) => {
    const base = statsById.get(site.id) ?? emptySiteStat(site);
    const displayBase = {
      ...base,
      name: formatSiteDisplayName(base.name, base.url, site.id),
    };
    const enriched = enrichSiteStat(displayBase, sparklines.get(site.id) ?? []);
    const searchIndexPresence = searchIndexPresenceById.get(site.id);
    if (searchIndexPresence) {
      enriched.searchIndexPresence = searchIndexPresence;
    }
    const adsenseExternalProof = adsenseExternalProofById.get(site.id);
    if (adsenseExternalProof) {
      enriched.adsenseExternalProof = adsenseExternalProof;
    }
    const adsenseRemediationQueueItem = adsenseRemediationQueueById.get(
      site.id,
    );
    if (adsenseRemediationQueueItem) {
      enriched.adsenseRemediationQueueItem = adsenseRemediationQueueItem;
    }
    const developmentPaths = getDevelopmentPaths(site);
    enriched.developmentPaths = developmentPaths.values;
    enriched.developmentPathKind = developmentPaths.kind;
    const firstDevelopmentPath = developmentPaths.values[0];
    if (firstDevelopmentPath) {
      enriched.developmentPathLabel = firstDevelopmentPath.label;
      enriched.developmentPath = firstDevelopmentPath.path;
    }
    // 예약글(future post)은 별도 SSH 수집(scheduled-queue)에서 host 매칭으로 병합한다.
    const scheduled = scheduledByHost.get(scheduledHost(base.url));
    if (scheduled) {
      enriched.scheduledFutureCount = scheduled.future;
      if (!enriched.lastScheduledAt && scheduled.lastScheduledAt) {
        enriched.lastScheduledAt = scheduled.lastScheduledAt;
      }
    }
    return enriched;
  });
  const dedupeResult = dedupeStatsByHost(stats);
  const displayStats = dedupeResult.stats;
  const insights = attachRelatedInsightSignals(buildInsights(displayStats));
  const actions = buildActionItems(
    displayStats,
    gscPermissionAudit,
    adsenseProofFreshness,
  ).slice(0, 16);
  const collectionSummary = buildCollectionSummary(displayStats);
  const totalLast1Days = sumMetrics(displayStats.map((stat) => stat.last1Days));
  const totalLast7Days = sumMetrics(displayStats.map((stat) => stat.last7Days));
  const totalPrevious7Days = sumMetrics(
    displayStats.map((stat) => stat.previous7Days),
  );
  const gscConnectedStats = displayStats.filter(
    (stat) => stat.gscStatus === "ok",
  );
  const adsenseCheckedStats = displayStats.filter((stat) => stat.adsenseStatus);
  const adsenseConnectedStats = displayStats.filter(
    (stat) => stat.adsenseStatus === "ok",
  );
  const adsTxtCheckedStats = displayStats.filter((stat) => stat.adsTxtStatus);
  const adsTxtConnectedStats = displayStats.filter(
    (stat) => stat.adsTxtStatus === "ok",
  );
  const monetizationIssueStats = displayStats
    .filter(hasMonetizationIssue)
    .sort((a, b) => b.last7Days.activeUsers - a.last7Days.activeUsers)
    .slice(0, 20);

  return {
    generatedAt: snapshot.generatedAt,
    dateRanges: snapshot.dateRanges ?? fallbackDateRanges(),
    sites,
    stats: displayStats,
    insights,
    priorityInsights: groupInsightsByDomain(
      insights.filter((insight) => insight.severity === "high"),
    ).slice(0, 10),
    seoInsights: groupInsightsByDomain(
      insights.filter(
        (insight) =>
          insight.kind === "seoOpportunity" ||
          insight.kind === "rankingOpportunity",
      ),
    ).slice(0, 10),
    growthInsights: groupInsightsByDomain(
      insights.filter((insight) => insight.kind === "growth"),
    ).slice(0, 8),
    declineInsights: groupInsightsByDomain(
      insights.filter((insight) => insight.kind === "decline"),
    ).slice(0, 8),
    actions,
    segments: buildSegments(displayStats),
    healthSummary: buildHealthSummary(displayStats),
    collectionSummary,
    opsMailReport,
    adsenseRemediationQueue,
    adsenseProofGate,
    adsenseProofFreshness,
    gscPermissionAudit,
    fleetOptimizationChain,
    fleetOptimizationChainStatus,
    dashboardPostRecoveryChain,
    t3TitleContentHandoff,
    gscIssueStats: displayStats.filter(
      (stat) => Boolean(stat.gscError) || (stat.gscEmailAlerts?.length ?? 0) > 0,
    ),
    dailyIssueStats: displayStats
      .filter((stat) => stat.operationalStatus !== "normal")
      .slice(0, 20),
    trafficDropStats: displayStats
      .filter((s) =>
        isSignificantUserDrop(
          s.trend.activeUsersChange,
          s.previous7Days.activeUsers,
        ),
      )
      .sort(
        (a, b) =>
          (a.trend.activeUsersChange ?? 0) - (b.trend.activeUsersChange ?? 0),
      )
      .slice(0, 20),
    monetizationIssueStats,
    monetizationIssueCount: displayStats.filter(hasMonetizationIssue).length,
    wpStaleStats: displayStats
      .filter(
        (s) => s.daysSincePublished !== undefined && s.daysSincePublished >= 7,
      )
      .sort((a, b) => (b.daysSincePublished ?? 0) - (a.daysSincePublished ?? 0))
      .slice(0, 20),
    siteCount: displayStats.length,
    trackedCount: displayStats.filter(
      (stat) => !stat.error && stat.ga4PropertyId,
    ).length,
    gscConnectedCount: gscConnectedStats.length,
    adsenseConnectedCount: adsenseConnectedStats.length,
    adsenseCheckedCount: adsenseCheckedStats.length,
    adsTxtConnectedCount: adsTxtConnectedStats.length,
    adsTxtCheckedCount: adsTxtCheckedStats.length,
    failedCount: displayStats.filter(
      (stat) => stat.operationalStatus !== "normal",
    ).length,
    staleCount: displayStats.filter((stat) => stat.isStale).length,
    collectionStaleCount: displayStats.filter(
      (stat) => hasCollectionLag(stat) || hasSitemapCollectionLag(stat),
    ).length,
    duplicateHostCount: dedupeResult.duplicateHostCount,
    hiddenDuplicateCount: dedupeResult.hiddenDuplicateCount,
    processingCount: displayStats.filter(
      (stat) => stat.operationalStatus === "processing",
    ).length,
    totalLast1Days,
    totalLast7Days,
    totalPrevious7Days,
    totalLast30Days: sumMetrics(displayStats.map((stat) => stat.last30Days)),
    totalGscLast7Days: sumGscMetrics(
      gscConnectedStats.map((stat) => stat.gscLast7Days ?? emptyGscMetrics()),
    ),
    totalGscPrevious7Days: sumGscMetrics(
      gscConnectedStats.map((stat) => stat.gscPrevious7Days),
    ),
    totalGscLast30Days: sumGscMetrics(
      gscConnectedStats.map((stat) => stat.gscLast30Days),
    ),
    totalActiveUsersChange: changeRate(
      totalLast7Days.activeUsers,
      totalPrevious7Days.activeUsers,
    ),
  };
}

function dedupeStatsByHost(stats: EnrichedSiteStat[]): DedupeStatsResult {
  const groups = new Map<string, EnrichedSiteStat[]>();

  for (const stat of stats) {
    const key = normalizeHost(stat.url);
    groups.set(key, [...(groups.get(key) ?? []), stat]);
  }

  let duplicateHostCount = 0;
  let hiddenDuplicateCount = 0;
  const representatives = [...groups.values()].map((group) => {
    const sorted = [...group].sort((a, b) => compareRepresentative(b, a));
    const representative = sorted[0];
    if (!representative) {
      return undefined;
    }

    const duplicates = sorted.slice(1);
    if (duplicates.length === 0) {
      return representative;
    }

    duplicateHostCount += 1;
    hiddenDuplicateCount += duplicates.length;

    return {
      ...representative,
      duplicateCount: duplicates.length,
      duplicateStats: duplicates.map(toDuplicateSiteSummary),
    };
  });

  return {
    stats: representatives.filter((stat): stat is EnrichedSiteStat =>
      Boolean(stat),
    ),
    duplicateHostCount,
    hiddenDuplicateCount,
  };
}

function toDuplicateSiteSummary(stat: EnrichedSiteStat): DuplicateSiteSummary {
  return {
    id: stat.id,
    name: stat.name,
    ga4PropertyId: stat.ga4PropertyId,
    activeUsers: stat.last7Days.activeUsers,
    healthScore: stat.health.score,
    operationalStatus: stat.operationalStatus,
  };
}

function compareRepresentative(
  candidate: EnrichedSiteStat,
  current: EnrichedSiteStat,
): number {
  const candidateStatusScore = candidate.operationalStatus === "normal" ? 1 : 0;
  const currentStatusScore = current.operationalStatus === "normal" ? 1 : 0;
  if (candidateStatusScore !== currentStatusScore) {
    return candidateStatusScore - currentStatusScore;
  }

  const candidateTraffic = candidate.last7Days.activeUsers;
  const currentTraffic = current.last7Days.activeUsers;
  if (candidateTraffic !== currentTraffic) {
    return candidateTraffic - currentTraffic;
  }

  if (candidate.health.score !== current.health.score) {
    return candidate.health.score - current.health.score;
  }

  return (
    getNamePreferenceScore(candidate.name) -
    getNamePreferenceScore(current.name)
  );
}

function getNamePreferenceScore(name: string): number {
  const normalized = name.toLowerCase();
  if (normalized.includes(" - ga4") || normalized.startsWith("http")) {
    return 0;
  }

  return 1;
}

function normalizeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .replace(/^www\./, "")
      .toLowerCase();
  }
}

function formatSiteDisplayName(
  name: string | undefined,
  url: string,
  fallback: string,
): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return normalizeHost(url) || fallback;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return normalizeHost(trimmed);
  }
  return trimmed;
}

function enrichSiteStat(
  stat: SiteStat,
  sparkline: (number | null)[] = [],
): EnrichedSiteStat {
  const last1Days = stat.last1Days ?? emptyMetrics();
  const previous7Days = stat.previous7Days ?? emptyMetrics();
  const last30Days = stat.last30Days ?? stat.last28Days ?? emptyMetrics();
  const gscPrevious7Days = stat.gscPrevious7Days ?? emptyGscMetrics();
  const gscLast7Days = stat.gscLast7Days ?? emptyGscMetrics();
  const gscLast30Days =
    stat.gscLast30Days ?? stat.gscLast28Days ?? emptyGscMetrics();
  const ga4Status = stat.ga4Status ?? (stat.error ? "api_error" : "ok");
  const gscStatus = stat.gscStatus ?? (stat.gscError ? "auth_error" : "ok");
  const operationalStatus = getOperationalStatus({
    ...stat,
    ga4Status,
    gscStatus,
  });
  const collectionSources = getCollectionSources({
    ...stat,
    ga4Status,
    gscStatus,
  });
  const isStale = operationalStatus === "stale";
  const trend = {
    activeUsersChange: changeRate(
      stat.last7Days.activeUsers,
      previous7Days.activeUsers,
    ),
    sessionsChange: changeRate(stat.last7Days.sessions, previous7Days.sessions),
    gscClicksChange: changeRate(gscLast7Days.clicks, gscPrevious7Days.clicks),
  };
  const normalizedStat = {
    ...stat,
    ga4Status,
    gscStatus,
    gscLast7Days,
    last30Days,
    previous7Days,
    trend,
  };

  const enriched: EnrichedSiteStat = {
    ...stat,
    ga4Status,
    gscStatus,
    last1Days,
    previous7Days,
    last30Days,
    gscPrevious7Days,
    gscLast30Days,
    operationalStatus,
    statusLabel: getStatusLabel(operationalStatus),
    statusReason: getStatusReason(
      { ...stat, ga4Status, gscStatus },
      operationalStatus,
    ),
    isStale,
    trend,
    health: getHealthScore(normalizedStat, operationalStatus),
    seoOpportunityScore: getSeoOpportunityScore(normalizedStat),
    collectionSources,
    sparkline,
    developmentPaths: [],
    developmentPathKind: "missing",
  };

  if (stat.lastPublishedAt) {
    enriched.lastPublishedAt = stat.lastPublishedAt;
    enriched.daysSincePublished = Math.floor(
      (Date.now() - Date.parse(stat.lastPublishedAt)) / 86400000,
    );
  }
  if (stat.lastScheduledAt) {
    enriched.lastScheduledAt = stat.lastScheduledAt;
  }

  return enriched;
}

export function getDevelopmentPaths(site: Site): {
  values: EnrichedSiteStat["developmentPaths"];
  kind: EnrichedSiteStat["developmentPathKind"];
} {
  const source = site.contentSource;
  if (!source) {
    return { values: [], kind: "missing" };
  }

  const values: EnrichedSiteStat["developmentPaths"] = [];

  if (source.localPath) {
    values.push({
      path: source.localPath,
      label: source.locationLabel ?? "local",
      kind: "local",
    });
  }

  for (const pathEntry of source.localPaths ?? []) {
    if (values.some((value) => value.path === pathEntry.path)) {
      continue;
    }
    values.push({
      path: pathEntry.path,
      label: pathEntry.locationLabel ?? "local",
      kind: "local",
    });
  }

  if (
    source.githubRepo &&
    !values.some((value) => value.path === source.githubRepo)
  ) {
    values.push({
      path: source.githubRepo,
      label: "GitHub",
      kind: "github",
    });
  }

  if (values.length > 0) {
    const kind = values.some((value) => value.kind === "local")
      ? "local"
      : values[0]?.kind ?? "missing";
    return { values, kind };
  }

  if (source.type === "wordpress-ssh" && source.wpPath) {
    const host = source.sshHost ? `${source.sshHost}:` : "";
    return {
      values: [
        {
          path: `${host}${source.wpPath}`,
          label: source.locationLabel ?? "remote",
          kind: "remote",
        },
      ],
      kind: "remote",
    };
  }

  return { values: [], kind: "missing" };
}

export function buildActionItems(
  stats: EnrichedSiteStat[],
  gscPermissionAudit?: GscPermissionAuditSummary | null,
  adsenseProofFreshness?: AdsenseProofFreshnessSummary | null,
): DashboardActionItem[] {
  const gscAuditBySite = buildGscPermissionAuditIndex(gscPermissionAudit);
  const staleAdsenseProofSiteIds = buildStaleAdsenseProofSiteIdSet(
    adsenseProofFreshness,
  );
  return stats
    .flatMap((stat) =>
      getActionItems(
        stat,
        gscAuditBySite.get(stat.id) ?? gscAuditBySite.get(normalizeHost(stat.url)),
        staleAdsenseProofSiteIds.has(stat.id)
          ? (adsenseProofFreshness ?? undefined)
          : undefined,
      ),
    )
    .sort((a, b) => b.priority - a.priority);
}

function buildStaleAdsenseProofSiteIdSet(
  freshness: AdsenseProofFreshnessSummary | null | undefined,
): Set<string> {
  if (!freshness || freshness.status !== "stale") {
    return new Set();
  }
  return new Set(freshness.candidateSiteIds);
}

function shouldSurfaceStaleAdsenseProofAction(
  stat: EnrichedSiteStat,
  freshness: AdsenseProofFreshnessSummary | undefined,
): boolean {
  if (!freshness) {
    return false;
  }
  return stat.adsenseRemediationQueueItem?.lane === "ordinary_adsense_proof";
}

function buildGscPermissionAuditIndex(
  audit: GscPermissionAuditSummary | null | undefined,
): Map<string, GscPermissionAuditResult> {
  const result = new Map<string, GscPermissionAuditResult>();
  if (audit?.handoffStatus !== "pending_external") {
    return result;
  }
  for (const item of audit?.results ?? []) {
    result.set(item.siteId, item);
    result.set(item.host, item);
  }
  return result;
}

function getActionItems(
  stat: EnrichedSiteStat,
  gscAuditResult?: GscPermissionAuditResult,
  staleAdsenseProof?: AdsenseProofFreshnessSummary,
): DashboardActionItem[] {
  const items: DashboardActionItem[] = [];
  const activeChange = stat.trend.activeUsersChange;
  const gscChange = stat.trend.gscClicksChange;
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  const skipAdsenseApprovalQueue = shouldSkipAdsenseApprovalQueue(stat);
  const needsAdsenseConsoleScopeReview =
    hasApprovedAdsenseRoot(stat) && hasMonetizationCollectionIssue(stat);

  if (stat.operationalStatus === "needsPermission" && gscAuditResult) {
    items.push(makeGscPermissionAuditAction(stat, gscAuditResult));
  }

  if (
    shouldSurfaceStaleAdsenseProofAction(stat, staleAdsenseProof) &&
    staleAdsenseProof
  ) {
    items.push(makeAdsenseProofFreshnessAction(stat, staleAdsenseProof));
  }

  if (stat.operationalStatus === "needsPermission") {
    const telemetryQueueItem = getTelemetryRemediationQueueItem(
      stat.adsenseRemediationQueueItem,
    );
    if (telemetryQueueItem && !gscAuditResult) {
      items.push(makeAdsenseRemediationQueueAction(stat, telemetryQueueItem));
    } else if (!gscAuditResult) {
      items.push(
        makeAction(
          stat,
          "permission",
          100,
          stat.statusLabel,
          stat.statusReason,
          "GSC/GA4 권한과 서비스 계정 접근을 먼저 복구하세요.",
        ),
      );
    }
  }

  if (
    !skipAdsenseApprovalQueue &&
    !needsAdsenseConsoleScopeReview &&
    hasOwnerRequiredPublicFetchIssue(stat)
  ) {
    items.push(makePublicFetchAction(stat));
  }

  if (isSignificantUserDrop(activeChange, stat.previous7Days.activeUsers)) {
    items.push(
      makeAction(
        stat,
        "decline",
        90,
        formatSignedPercent(activeChange),
        "GA4 사용자가 직전 7일 대비 크게 감소했습니다.",
        "최근 발행, 색인, 유입 채널 변경 여부를 확인하세요.",
      ),
    );
  }

  if (isSignificantClickDrop(gscChange, stat.gscPrevious7Days.clicks)) {
    items.push(
      makeAction(
        stat,
        "decline",
        85,
        formatSignedPercent(gscChange),
        "GSC 클릭이 직전 7일 대비 크게 감소했습니다.",
        "상위 쿼리와 CTR 하락 페이지를 점검하세요.",
      ),
    );
  }

  if (needsAdsenseConsoleScopeReview) {
    items.push(
      makeAction(
        stat,
        "owner",
        93,
        "AdSense scope review",
        "The root domain is already approved, so this subdomain needs an AdSense console inheritance/separate-site check before any local patch or resubmission.",
        "Check whether AdSense treats this subdomain as inherited, separate, or unnecessary; only patch or submit if the console requires a separate site.",
      ),
    );
  }

  if (
    stat.adsenseRemediationQueueItem &&
    shouldAddAdsenseRemediationQueueAction(
      stat.adsenseRemediationQueueItem,
      items,
    )
  ) {
    items.push(
      makeAdsenseRemediationQueueAction(
        stat,
        stat.adsenseRemediationQueueItem,
      ),
    );
  }

  if (!skipAdsenseApprovalQueue && stat.adsenseStatus === "missing_config") {
    items.push(
      makeAction(
        stat,
        "monetization",
        80,
        "코드 미탐지",
        "홈페이지 HTML에서 AdSense 코드가 감지되지 않았습니다.",
        "홈페이지, 글 상세, 조건부 광고 삽입, 캐시 반영 여부를 확인하세요.",
      ),
    );
  }

  if (!skipAdsenseApprovalQueue && stat.adsTxtStatus === "missing_config") {
    items.push(
      makeAction(
        stat,
        "monetization",
        78,
        "ads.txt 없음",
        "ads.txt에서 Google publisher 항목이 확인되지 않았습니다.",
        "/ads.txt에 google.com, pub-... 항목이 있는지 확인하세요.",
      ),
    );
  }

  if (
    !skipAdsenseApprovalQueue &&
    ((stat.adsenseStatus === "api_error" &&
      stat.adsenseCollectorStatus !== "transient_error") ||
      (stat.adsTxtStatus === "api_error" &&
        stat.adsTxtCollectorStatus !== "transient_error"))
  ) {
    items.push(
      makeAction(
        stat,
        "monetization",
        76,
        "상태 확인 실패",
        "AdSense 코드 또는 ads.txt 상태 확인에 실패했습니다.",
        "홈페이지와 /ads.txt 접근 상태, 리다이렉트, 방화벽을 확인하세요.",
      ),
    );
  }

  if (stat.operationalStatus === "apiError") {
    items.push(
      makeAction(
        stat,
        "data",
        98,
        stat.statusLabel,
        stat.statusReason,
        "API 응답, 속성 ID, 서비스 계정 권한을 확인하세요.",
      ),
    );
  }

  if (stat.operationalStatus === "stale" && !hasSitemapCollectionLag(stat)) {
    items.push(
      makeAction(
        stat,
        "data",
        95,
        stat.statusLabel,
        stat.statusReason,
        "수집 스케줄과 최근 성공 수집 시각을 확인하세요.",
      ),
    );
  }

  if (stat.operationalStatus === "processing") {
    items.push(
      makeAction(
        stat,
        "processing",
        72,
        stat.statusLabel,
        stat.statusReason,
        "Google 재다운로드가 끝난 뒤 상태를 다시 확인하세요.",
      ),
    );
  }

  if (hasSitemapCollectionLag(stat)) {
    items.push(
      makeAction(
        stat,
        "sitemap",
        hasCurrentSitemapIssue(stat) ? 96 : 74,
        getSitemapCollectionLabel(stat),
        getSitemapCollectionReason(stat),
        "Search Console에 sitemap을 재제출하고 sitemap lastmod와 robots.txt Sitemap 라인을 확인하세요.",
      ),
    );
  }

  for (const alert of (stat.gscEmailAlerts ?? []).slice(0, 3)) {
    items.push(
      makeAction(
        stat,
        "gscAlert",
        getGscEmailAlertPriority(alert),
        alert.issue,
        `Gmail digest GSC alert${alert.time ? ` at ${alert.time}` : ""}: ${alert.issue}`,
        "Check the affected indexed URL group in Search Console, then verify robots, noindex, canonical, redirect, and 404 handling.",
      ),
    );
  }

  if (hasCtrOpportunity(stat)) {
    items.push(
      makeAction(
        stat,
        "seo",
        70 + Math.min(12, Math.floor(getSeoOpportunityScore(stat) / 20)),
        formatPercent(gsc.ctr),
        formatSeoOpportunityReason(stat),
        "SEO title과 meta description을 상위 쿼리 기준으로 점검하세요.",
      ),
    );
  }

  if (hasRankingOpportunity(stat)) {
    items.push(
      makeAction(
        stat,
        "ranking",
        65,
        `${formatDecimal(gsc.position)}위`,
        "평균순위가 4~20위 구간입니다.",
        "상위 문서 보강과 내부링크 추가로 1페이지 진입을 노리세요.",
      ),
    );
  }

  return items;
}

function shouldAddAdsenseRemediationQueueAction(
  item: AdsenseRemediationQueueItem,
  items: DashboardActionItem[],
): boolean {
  if (item.lane === "ordinary_adsense_proof") {
    return !items.some((action) =>
      [
        "Public fetch blocked",
        "Console check candidate",
        "External proof partial",
        "Fresh proof needed",
        "Live apply check needed",
        "Source recovery needed",
        "AdSense proof snapshot stale",
      ].includes(action.value),
    );
  }

  if (item.lane === "gsc_auth_telemetry") {
    return !items.some((action) => action.value === "GSC permission audit");
  }

  if (item.lane === "approved_root_subdomain_scope") {
    return !items.some((action) => action.value === "AdSense scope review");
  }

  return !items.some(
    (action) =>
      action.value === getAdsenseRemediationQueueActionValue(item.lane),
  );
}

function getTelemetryRemediationQueueItem(
  item: AdsenseRemediationQueueItem | undefined,
): AdsenseRemediationQueueItem | undefined {
  if (
    item?.lane === "gsc_auth_telemetry" ||
    item?.lane === "ga4_config_telemetry"
  ) {
    return item;
  }
  return undefined;
}

function makeAdsenseRemediationQueueAction(
  stat: EnrichedSiteStat,
  item: AdsenseRemediationQueueItem,
): DashboardActionItem {
  return makeAction(
    stat,
    getAdsenseRemediationQueueActionKind(item.lane),
    getAdsenseRemediationQueueActionPriority(item.lane),
    getAdsenseRemediationQueueActionValue(item.lane),
    formatAdsenseRemediationQueueReason(item),
    item.stopCondition,
  );
}

function makeGscPermissionAuditAction(
  stat: EnrichedSiteStat,
  result: GscPermissionAuditResult,
): DashboardActionItem {
  return makeAction(
    stat,
    "permission",
    101,
    "GSC permission audit",
    `${result.host}: ${result.permissionLevel ?? "not_listed"} / ${result.accessState}. ${result.requiredAction}`,
    `${result.requiredAction} Then run: pnpm dashboard:post-recovery.`,
  );
}

function makeAdsenseProofFreshnessAction(
  stat: EnrichedSiteStat,
  freshness: AdsenseProofFreshnessSummary,
): DashboardActionItem {
  const artifact = freshness.artifactPath ?? "latest external proof artifact";
  return makeAction(
    stat,
    "owner",
    94,
    "AdSense proof snapshot stale",
    `${normalizeHost(stat.url)} proof artifact is stale: ${freshness.collectorSnapshot ?? "missing collectorSnapshot"} does not match current stats generatedAt=${freshness.expectedStatsGeneratedAt ?? "unknown"}.`,
    `Refresh local proof snapshots with ${freshness.remediationCommand}, then rerun pnpm adsense:proof:verify. Artifact: ${artifact}.`,
  );
}

function getAdsenseRemediationQueueActionKind(
  lane: AdsenseRemediationLaneKey,
): ActionKind {
  if (lane === "gsc_auth_telemetry") {
    return "permission";
  }
  if (lane === "ga4_config_telemetry") {
    return "data";
  }
  if (lane === "ordinary_adsense_proof") {
    return "owner";
  }
  return "owner";
}

function getAdsenseRemediationQueueActionPriority(
  lane: AdsenseRemediationLaneKey,
): number {
  if (lane === "ordinary_adsense_proof") {
    return 92;
  }
  if (lane === "approved_root_subdomain_scope") {
    return 93;
  }
  if (lane === "gsc_auth_telemetry") {
    return 100;
  }
  return 100;
}

function getAdsenseRemediationQueueActionValue(
  lane: AdsenseRemediationLaneKey,
): string {
  if (lane === "ordinary_adsense_proof") {
    return "AdSense proof queue";
  }
  if (lane === "approved_root_subdomain_scope") {
    return "AdSense scope review";
  }
  if (lane === "gsc_auth_telemetry") {
    return "GSC auth telemetry";
  }
  return "GA4 config telemetry";
}

function formatAdsenseRemediationQueueReason(
  item: AdsenseRemediationQueueItem,
): string {
  const evidence = item.requiredEvidence[0];
  return evidence
    ? `${item.host}: ${evidence}.`
    : `${item.host}: remediation queue item.`;
}

function makeAction(
  stat: EnrichedSiteStat,
  kind: ActionKind,
  priority: number,
  value: string,
  reason: string,
  nextStep: string,
): DashboardActionItem {
  return {
    id: `${stat.id}-${stat.ga4PropertyId}-${kind}-${reason}`,
    siteId: stat.id,
    siteName: stat.name,
    url: stat.url,
    kind,
    priority,
    label: getActionLabel(kind),
    value,
    reason,
    nextStep,
  };
}

function getActionLabel(kind: ActionKind): string {
  if (kind === "owner") return "Owner";
  if (kind === "permission") return "권한";
  if (kind === "processing") return "재처리";
  if (kind === "decline") return "급락";
  if (kind === "monetization") return "수익화";
  if (kind === "sitemap") return "사이트맵";
  if (kind === "seo") return "CTR";
  if (kind === "ranking") return "순위";
  return "데이터";
}

function getGscEmailAlertPriority(alert: GscEmailAlert): number {
  if (alert.severity === "high") {
    return 88;
  }
  if (alert.severity === "medium") {
    return 82;
  }
  return 68;
}

function hasMonetizationIssue(stat: EnrichedSiteStat): boolean {
  if (shouldSkipAdsenseApprovalQueue(stat)) {
    return false;
  }

  if (hasApprovedAdsenseRoot(stat)) {
    return hasMonetizationCollectionIssue(stat);
  }

  return hasMonetizationCollectionIssue(stat);
}

function hasMonetizationCollectionIssue(stat: EnrichedSiteStat): boolean {
  return (
    stat.adsenseStatus === "missing_config" ||
    stat.adsTxtStatus === "missing_config" ||
    stat.adsenseStatus === "api_error" ||
    stat.adsTxtStatus === "api_error"
  );
}

function shouldSkipAdsenseApprovalQueue(
  stat: Pick<SiteStat, "url" | "monetization">,
): boolean {
  const host = normalizeHost(stat.url);
  return (
    stat.monetization === false ||
    ADSENSE_APPROVED_EXACT_DOMAINS.has(host) ||
    ADSENSE_NON_MONETIZATION_DOMAINS.has(host)
  );
}

function hasApprovedAdsenseRoot(stat: Pick<SiteStat, "url">): boolean {
  const host = normalizeHost(stat.url);
  if (ADSENSE_APPROVED_EXACT_DOMAINS.has(host)) {
    return false;
  }

  return [...ADSENSE_APPROVED_EXACT_DOMAINS].some((domain) =>
    host.endsWith(`.${domain}`),
  );
}

function hasOwnerRequiredPublicFetchIssue(stat: EnrichedSiteStat): boolean {
  return (
    (stat.adsenseStatus === "api_error" &&
      stat.adsenseCollectorStatus === "transient_error") ||
    (stat.adsTxtStatus === "api_error" &&
      stat.adsTxtCollectorStatus === "transient_error")
  );
}

function makePublicFetchAction(stat: EnrichedSiteStat): DashboardActionItem {
  const proof = stat.adsenseExternalProof;
  if (proof) {
    const actionMeta = getAdsenseExternalProofActionMeta(
      proof.currentDecision,
    );
    return makeAction(
      stat,
      "owner",
      actionMeta.priority,
      actionMeta.label,
      formatAdsenseExternalProofReason(proof),
      proof.nextGate,
    );
  }

  return makeAction(
    stat,
    "owner",
    92,
    "Public fetch blocked",
    getOwnerRequiredPublicFetchReason(stat),
    "Restore public HTTP/HTTPS reachability or hosting/WAF access first, then rerun stats:update and adsense:readiness.",
  );
}

function formatAdsenseExternalProofReason(proof: AdsenseExternalProof): string {
  return [
    proof.externalHomepageEvidence,
    proof.endpointRetrySummary,
    proof.loaderRetrySummary,
    proof.networkVantageSummary,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" ");
}

export function getAdsenseExternalProofActionMeta(
  decision: AdsenseExternalProofDecision,
): AdsenseExternalProofActionMeta {
  switch (decision) {
    case "strongest_console_check_candidate":
      return { label: "Console check candidate", priority: 94 };
    case "manual_external_review_needed":
      return { label: "External proof partial", priority: 92 };
    case "hold_for_fresh_external_proof":
      return { label: "Fresh proof needed", priority: 91 };
    case "live_apply_state_needed":
      return { label: "Live apply check needed", priority: 92 };
    case "source_recovery_needed":
      return { label: "Source recovery needed", priority: 95 };
    default:
      return assertNever(decision);
  }
}

export function getAdsenseLocalSourceProofDecision(
  localSourceStatus: string,
): AdsenseExternalProofDecision | null {
  if (localSourceStatus === "source_missing_for_adsense_setup") {
    return "source_recovery_needed";
  }
  if (localSourceStatus === "local_hardening_package_ready_not_live_verified") {
    return "live_apply_state_needed";
  }
  return null;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported AdSense proof decision: ${String(value)}`);
}

function getOwnerRequiredPublicFetchReason(stat: EnrichedSiteStat): string {
  const reasons = [stat.adsenseError, stat.adsTxtError].filter(
    (reason): reason is string => Boolean(reason),
  );
  if (reasons.length === 0) {
    return "Public page or ads.txt fetch failed temporarily, so local code changes cannot prove the fix.";
  }
  return reasons.join(" ");
}

function hasCtrOpportunity(stat: Pick<SiteStat, "gscLast7Days">): boolean {
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  return (
    gsc.impressions >= CTR_OPPORTUNITY_MIN_IMPRESSIONS &&
    gsc.position >= CTR_OPPORTUNITY_MIN_POSITION &&
    gsc.position <= CTR_OPPORTUNITY_MAX_POSITION &&
    gsc.ctr < CTR_OPPORTUNITY_MAX_CTR
  );
}

function hasRankingOpportunity(stat: Pick<SiteStat, "gscLast7Days">): boolean {
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  return (
    gsc.impressions >= RANKING_OPPORTUNITY_MIN_IMPRESSIONS &&
    gsc.position >= RANKING_OPPORTUNITY_MIN_POSITION &&
    gsc.position <= RANKING_OPPORTUNITY_MAX_POSITION
  );
}

function hasSeoOpportunity(stat: Pick<SiteStat, "gscLast7Days">): boolean {
  return hasCtrOpportunity(stat) || hasRankingOpportunity(stat);
}

function getSeoOpportunityScore(stat: Pick<SiteStat, "gscLast7Days">): number {
  if (!hasSeoOpportunity(stat)) {
    return 0;
  }

  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  const impressionScore = Math.min(60, Math.log10(gsc.impressions + 1) * 24);
  const ctrGapScore = hasCtrOpportunity(stat)
    ? (Math.max(0, CTR_OPPORTUNITY_MAX_CTR - gsc.ctr) /
        CTR_OPPORTUNITY_MAX_CTR) *
      40
    : 0;
  const positionScore =
    gsc.position <= CTR_OPPORTUNITY_MAX_POSITION
      ? Math.max(0, CTR_OPPORTUNITY_MAX_POSITION + 1 - gsc.position) * 3
      : Math.max(0, RANKING_OPPORTUNITY_MAX_POSITION + 1 - gsc.position) * 1.5;

  return Math.round(impressionScore + ctrGapScore + positionScore);
}

function formatSeoOpportunityReason(
  stat: Pick<SiteStat, "gscLast7Days">,
): string {
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  return `최근 7일 GSC 노출 ${formatNumber(gsc.impressions)}, 평균순위 ${formatDecimal(
    gsc.position,
  )}, CTR ${formatPercent(gsc.ctr)}입니다.`;
}

function hasCollectionLag(stat: EnrichedSiteStat): boolean {
  return (
    isOlderThanHours(stat.ga4LastSuccessfulFetchAt, 48) ||
    isOlderThanHours(stat.gscLastSuccessfulFetchAt, 48) ||
    isOlderThanHours(stat.adsenseLastSuccessfulFetchAt, 48) ||
    isOlderThanHours(stat.adsTxtLastSuccessfulFetchAt, 48)
  );
}

function hasSitemapCollectionLag(stat: SiteStat): boolean {
  if (hasSitemapProcessing(stat)) {
    return false;
  }

  if (hasCleanPendingSitemap(stat)) {
    return false;
  }

  return (
    !stat.sitemapLastDownloadedAt ||
    isOlderThanDays(
      stat.sitemapLastDownloadedAt,
      SITEMAP_COLLECTION_LAG_DAYS,
    ) ||
    hasCurrentSitemapIssue(stat)
  );
}

function hasSitemapProcessing(stat: SiteStat): boolean {
  if (!hasCurrentSitemapIssue(stat)) {
    return false;
  }

  return hasUnprocessedSitemapSubmission(stat);
}

function hasCleanPendingSitemap(stat: SiteStat): boolean {
  return !hasCurrentSitemapIssue(stat) && hasUnprocessedSitemapSubmission(stat);
}

function hasCurrentSitemapIssue(stat: SiteStat): boolean {
  return (stat.sitemapErrors ?? 0) > 0 || (stat.sitemapWarnings ?? 0) > 0;
}

function hasUnprocessedSitemapSubmission(stat: SiteStat): boolean {
  if (stat.sitemapDetails?.length) {
    return stat.sitemapDetails.some((detail) => {
      if (detail.isPending) {
        return true;
      }

      if (!detail.lastSubmitted) {
        return false;
      }

      const submittedAt = Date.parse(detail.lastSubmitted);
      const downloadedAt = detail.lastDownloaded
        ? Date.parse(detail.lastDownloaded)
        : Number.NEGATIVE_INFINITY;

      if (Number.isNaN(submittedAt) || Number.isNaN(downloadedAt)) {
        return false;
      }

      return submittedAt > downloadedAt;
    });
  }

  if (stat.sitemapIsPending) {
    return true;
  }

  if (!stat.sitemapLastSubmittedAt) {
    return false;
  }

  const submittedAt = Date.parse(stat.sitemapLastSubmittedAt);
  const downloadedAt = stat.sitemapLastDownloadedAt
    ? Date.parse(stat.sitemapLastDownloadedAt)
    : Number.NEGATIVE_INFINITY;

  if (Number.isNaN(submittedAt) || Number.isNaN(downloadedAt)) {
    return false;
  }

  return submittedAt > downloadedAt;
}

function getSitemapCollectionAgeDays(stat: SiteStat): number {
  if (!stat.sitemapLastDownloadedAt) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = Date.parse(stat.sitemapLastDownloadedAt);
  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((Date.now() - timestamp) / 86400000);
}

function getSitemapCollectionLabel(stat: SiteStat): string {
  const ageDays = getSitemapCollectionAgeDays(stat);
  if (!Number.isFinite(ageDays)) {
    return "수집일 없음";
  }

  return `${formatNumber(ageDays)}일 전`;
}

function getSitemapCollectionReason(stat: SiteStat): string {
  const parts: string[] = [];
  if (!stat.sitemapLastDownloadedAt) {
    parts.push("GSC sitemap 마지막 수집일이 없습니다.");
  } else {
    parts.push(
      `GSC sitemap 마지막 수집일이 ${getSitemapCollectionLabel(stat)}입니다.`,
    );
  }
  if ((stat.sitemapErrors ?? 0) > 0) {
    parts.push(`오류 ${formatNumber(stat.sitemapErrors ?? 0)}개`);
  }
  if ((stat.sitemapWarnings ?? 0) > 0) {
    parts.push(`경고 ${formatNumber(stat.sitemapWarnings ?? 0)}개`);
  }

  return parts.join(" ");
}

function buildCollectionSummary(
  stats: EnrichedSiteStat[],
): CollectionSourceSummary[] {
  const summaries = COLLECTION_SOURCE_DEFINITIONS.map((source) => ({
    key: source.key,
    label: source.label,
    ok: 0,
    stale: 0,
    error: 0,
    missing: 0,
    processing: 0,
    total: 0,
  }));
  const byKey = new Map(summaries.map((summary) => [summary.key, summary]));

  for (const stat of stats) {
    for (const source of stat.collectionSources) {
      const summary = byKey.get(source.key);
      if (summary) {
        summary.total += 1;
        summary[source.state] += 1;
      }
    }
  }

  return summaries.sort(
    (a, b) =>
      getCollectionIssueCount(b) - getCollectionIssueCount(a) ||
      a.label.localeCompare(b.label, "ko-KR"),
  );
}

const COLLECTION_SOURCE_DEFINITIONS: Array<{
  key: CollectionSourceKey;
  label: string;
}> = [
  { key: "ga4", label: "GA4" },
  { key: "gsc", label: "GSC" },
  { key: "sitemap", label: "GSC sitemap" },
  { key: "adsense", label: "AdSense" },
  { key: "adsTxt", label: "ads.txt" },
];

function getCollectionIssueCount(summary: CollectionSourceSummary): number {
  return summary.stale + summary.error + summary.missing + summary.processing;
}

function getCollectionSources(stat: SiteStat): CollectionSourceStatus[] {
  const sources = [
    getApiCollectionSource(
      "ga4",
      "GA4",
      stat.ga4Status,
      stat.ga4LastSuccessfulFetchAt,
      stat.error,
    ),
    getApiCollectionSource(
      "gsc",
      "GSC",
      stat.gscStatus,
      stat.gscLastSuccessfulFetchAt,
      stat.gscError,
    ),
    getSitemapCollectionSource(stat),
  ];

  // AdSense 미적용 사이트(monetization=false, 예: 쇼핑몰)는 수익화 수집 항목에서 제외한다.
  if (stat.monetization !== false) {
    sources.push(
      getMonetizationCollectionSource(
        "adsense",
        "AdSense",
        stat.adsenseStatus,
        stat.adsenseCollectorStatus,
        stat.adsenseLastSuccessfulFetchAt,
        stat.adsenseLastKnownGoodAt,
        stat.adsenseError,
      ),
      getMonetizationCollectionSource(
        "adsTxt",
        "ads.txt",
        stat.adsTxtStatus,
        stat.adsTxtCollectorStatus,
        stat.adsTxtLastSuccessfulFetchAt,
        stat.adsTxtLastKnownGoodAt,
        stat.adsTxtError,
      ),
    );
  }

  return sources;
}

function getApiCollectionSource(
  key: CollectionSourceKey,
  label: string,
  status: CollectionStatus | undefined,
  checkedAt: string | undefined,
  error: string | undefined,
): CollectionSourceStatus {
  if (!status || status === "missing_config") {
    return {
      key,
      label,
      state: "missing",
      reason: `${label} 설정 또는 탐지 결과가 없습니다.`,
      ...(checkedAt ? { checkedAt } : {}),
    };
  }

  if (status === "auth_error" || status === "api_error") {
    return {
      key,
      label,
      state: "error",
      reason: error || `${label} 수집 또는 상태 확인에 실패했습니다.`,
      ...(checkedAt ? { checkedAt } : {}),
    };
  }

  if (!checkedAt || isOlderThanHours(checkedAt, 48)) {
    return {
      key,
      label,
      state: "stale",
      reason: checkedAt
        ? `${label} 마지막 성공 수집이 48시간을 넘었습니다.`
        : `${label} 마지막 성공 수집일이 없습니다.`,
      ...(checkedAt ? { checkedAt } : {}),
    };
  }

  return {
    key,
    label,
    state: "ok",
    reason: `${label} 수집 정상`,
    checkedAt,
  };
}

function getMonetizationCollectionSource(
  key: CollectionSourceKey,
  label: string,
  status: CollectionStatus | undefined,
  collectorStatus: MonetizationCollectorStatus | undefined,
  checkedAt: string | undefined,
  lastKnownGoodAt: string | undefined,
  error: string | undefined,
): CollectionSourceStatus {
  if (collectorStatus === "transient_error") {
    const preserved = isRecentIso(
      lastKnownGoodAt,
      MONETIZATION_LAST_GOOD_TTL_HOURS,
    );
    const lastCheckedAt = checkedAt ?? lastKnownGoodAt;
    return {
      key,
      label,
      state: preserved ? "stale" : "error",
      reason:
        error ??
        `${label} collection failed temporarily; last known good state was preserved when available.`,
      ...(lastCheckedAt ? { checkedAt: lastCheckedAt } : {}),
    };
  }

  return getApiCollectionSource(key, label, status, checkedAt, error);
}

function getSitemapCollectionSource(stat: SiteStat): CollectionSourceStatus {
  if (stat.sitemapError) {
    return {
      key: "sitemap",
      label: "GSC sitemap",
      state: "error",
      reason: stat.sitemapError,
      ...(stat.sitemapLastDownloadedAt
        ? { checkedAt: stat.sitemapLastDownloadedAt }
        : {}),
    };
  }

  if (hasSitemapProcessing(stat) || hasCleanPendingSitemap(stat)) {
    return {
      key: "sitemap",
      label: "GSC sitemap",
      state: "processing",
      reason:
        "Search Console에 제출됐고 Google 재다운로드를 기다리는 중입니다.",
      ...(stat.sitemapLastSubmittedAt
        ? { checkedAt: stat.sitemapLastSubmittedAt }
        : {}),
    };
  }

  if (hasCurrentSitemapIssue(stat)) {
    return {
      key: "sitemap",
      label: "GSC sitemap",
      state: "error",
      reason: getSitemapCollectionReason(stat),
      ...(stat.sitemapLastDownloadedAt
        ? { checkedAt: stat.sitemapLastDownloadedAt }
        : {}),
    };
  }

  if (!stat.sitemapLastDownloadedAt && !stat.sitemapLastSubmittedAt) {
    return {
      key: "sitemap",
      label: "GSC sitemap",
      state: "missing",
      reason: "GSC sitemap 수집 또는 제출 이력이 없습니다.",
    };
  }

  if (hasSitemapCollectionLag(stat)) {
    return {
      key: "sitemap",
      label: "GSC sitemap",
      state: "stale",
      reason: getSitemapCollectionReason(stat),
      ...(stat.sitemapLastDownloadedAt
        ? { checkedAt: stat.sitemapLastDownloadedAt }
        : {}),
    };
  }

  return {
    key: "sitemap",
    label: "GSC sitemap",
    state: "ok",
    reason: "GSC sitemap 수집 정상",
    ...(stat.sitemapLastDownloadedAt
      ? { checkedAt: stat.sitemapLastDownloadedAt }
      : {}),
  };
}

export function buildSegments(stats: EnrichedSiteStat[]): DashboardSegment[] {
  const segments: Omit<DashboardSegment, "memberIds">[] = [
    {
      key: "growth",
      label: "성장",
      description: "7일 사용자가 직전 기간보다 30% 이상 증가한 사이트",
      count: 0,
      stats: stats
        .filter((stat) => (stat.trend.activeUsersChange ?? 0) >= 0.3)
        .sort((a, b) => b.last7Days.activeUsers - a.last7Days.activeUsers),
    },
    {
      key: "decline",
      label: "하락",
      description: "7일 사용자 또는 GSC 클릭이 30% 이상 감소한 사이트",
      count: 0,
      stats: stats.filter(
        (stat) =>
          (stat.trend.activeUsersChange ?? 0) <= -0.3 ||
          (stat.trend.gscClicksChange ?? 0) <= -0.3,
      ),
    },
    {
      key: "seo",
      label: "SEO 기회",
      description: "CTR 또는 평균순위 개선 여지가 큰 사이트",
      count: 0,
      stats: stats
        .filter(hasSeoOpportunity)
        .sort(
          (a, b) => (b.seoOpportunityScore ?? 0) - (a.seoOpportunityScore ?? 0),
        ),
    },
    {
      key: "gsc",
      label: "GSC 문제",
      description: "권한 오류 또는 검색 데이터 확인이 필요한 사이트",
      count: 0,
      stats: stats.filter(
        (stat) => stat.gscStatus !== "ok" || Boolean(stat.gscError),
      ),
    },
    {
      key: "sitemap",
      label: "사이트맵 지연",
      description: `GSC의 sitemap 마지막 수집일이 ${SITEMAP_COLLECTION_LAG_DAYS}일 이상 지난 사이트`,
      count: 0,
      stats: stats
        .filter(hasSitemapCollectionLag)
        .sort(
          (a, b) =>
            getSitemapCollectionAgeDays(b) - getSitemapCollectionAgeDays(a),
        ),
    },
  ];

  return segments.map((segment) => ({
    ...segment,
    count: segment.stats.length,
    memberIds: segment.stats.map((stat) => stat.id),
    stats: segment.stats.slice(0, 8),
  }));
}

function buildHealthSummary(stats: EnrichedSiteStat[]): HealthSummary {
  const total = stats.reduce((sum, stat) => sum + stat.health.score, 0);

  return {
    averageScore: stats.length === 0 ? 0 : Math.round(total / stats.length),
    healthyCount: stats.filter((stat) => stat.health.grade === "좋음").length,
    warningCount: stats.filter((stat) => stat.health.grade === "주의").length,
    criticalCount: stats.filter((stat) => stat.health.grade === "위험").length,
  };
}

function getHealthScore(
  stat: SiteStat & {
    last30Days: MetricSet;
    gscLast7Days: GscMetricSet;
    trend: SiteTrend;
  },
  operationalStatus: OperationalStatus,
): SiteHealthScore {
  let score = 100;
  const reasons: string[] = [];

  if (operationalStatus !== "normal") {
    score -= operationalStatus === "needsPermission" ? 35 : 25;
    reasons.push("수집 상태 확인 필요");
  }

  if (
    isSignificantUserDrop(
      stat.trend.activeUsersChange,
      stat.previous7Days?.activeUsers,
    )
  ) {
    score -= 25;
    reasons.push("사용자 급락");
  }

  if (
    isSignificantClickDrop(
      stat.trend.gscClicksChange,
      stat.gscPrevious7Days?.clicks,
    )
  ) {
    score -= 15;
    reasons.push("검색 클릭 감소");
  }

  if (stat.gscStatus === "ok" && hasCtrOpportunity(stat)) {
    score -= 10;
    reasons.push("CTR 낮음");
  }

  if (hasCleanPendingSitemap(stat)) {
    score -= 8;
    reasons.push("GSC sitemap 처리 대기");
  } else if (hasSitemapCollectionLag(stat)) {
    score -= 12;
    reasons.push("GSC sitemap 수집 지연");
  }

  if (stat.last30Days.activeUsers === 0) {
    score -= 10;
    reasons.push("30일 사용자 없음");
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const grade =
    normalizedScore >= 80 ? "좋음" : normalizedScore >= 55 ? "주의" : "위험";

  return {
    score: normalizedScore,
    grade,
    reason: reasons.length > 0 ? reasons.join(", ") : "핵심 지표 정상",
  };
}

function groupInsightsByDomain(insights: SiteInsight[]): SiteInsight[] {
  const byDomain = new Map<string, SiteInsight[]>();
  for (const insight of insights) {
    const domain = normalizeUrl(insight.url);
    const existing = byDomain.get(domain) ?? [];
    byDomain.set(domain, [...existing, insight]);
  }
  const merged: SiteInsight[] = [];
  for (const group of byDomain.values()) {
    const primary = group[0];
    if (!primary) {
      continue;
    }
    if (group.length === 1) {
      merged.push(primary);
      continue;
    }
    const allReasons = group.map((i) => i.reason).join(" · ");
    const allValues = [...new Set(group.map((i) => i.primaryValue))].join(
      " / ",
    );
    merged.push({
      ...primary,
      reason: allReasons,
      primaryValue: allValues,
      evidence: [
        ...new Set(group.flatMap((insight) => insight.evidence)),
      ].slice(0, 7),
      relatedSignals: group
        .map(
          (insight) =>
            `${formatInsightKind(insight.kind)} ${insight.primaryValue}`,
        )
        .filter((signal, index, signals) => signals.indexOf(signal) === index),
    });
  }
  return merged;
}

function attachRelatedInsightSignals(insights: SiteInsight[]): SiteInsight[] {
  const byDomain = new Map<string, SiteInsight[]>();

  for (const insight of insights) {
    const domain = normalizeUrl(insight.url);
    byDomain.set(domain, [...(byDomain.get(domain) ?? []), insight]);
  }

  return insights.map((insight) => {
    const group = byDomain.get(normalizeUrl(insight.url)) ?? [];
    const relatedSignals = group
      .filter((candidate) => candidate.id !== insight.id)
      .map(
        (candidate) =>
          `${formatInsightKind(candidate.kind)} ${candidate.primaryValue}`,
      )
      .filter((signal, index, signals) => signals.indexOf(signal) === index)
      .slice(0, 5);

    return {
      ...insight,
      relatedSignals,
    };
  });
}

function buildInsights(stats: EnrichedSiteStat[]): SiteInsight[] {
  const insights: SiteInsight[] = [];
  const urlCounts = countBy(stats.map((stat) => normalizeUrl(stat.url)));

  for (const stat of stats) {
    const gsc = stat.gscLast7Days ?? emptyGscMetrics();
    const activeUsersChange = stat.trend.activeUsersChange;
    const gscClicksChange = stat.trend.gscClicksChange;

    if (stat.gscError) {
      insights.push(
        makeInsight(
          stat,
          "indexingOrPermissionIssue",
          "high",
          "GSC 데이터가 없거나 권한 오류가 있습니다.",
          "Search Console 소유권과 서비스 계정 권한을 확인하세요.",
          "GSC 0",
        ),
      );
    }

    if (
      !stat.gscError &&
      gsc.clicks === 0 &&
      gsc.impressions === 0 &&
      stat.last7Days.activeUsers >= 50
    ) {
      insights.push(
        makeInsight(
          stat,
          "indexingOrPermissionIssue",
          "high",
          "GSC 검색 노출 데이터가 아직 없습니다.",
          "권한 오류로 단정하지 말고 sitemap, canonical, 색인 상태, 검색 노출 시작 여부를 확인하세요.",
          "GSC 0",
        ),
      );
    }

    const highPriorityGscEmailAlert = stat.gscEmailAlerts?.find(
      (alert) => alert.severity === "high" || alert.severity === "medium",
    );
    if (highPriorityGscEmailAlert) {
      insights.push(
        makeInsight(
          stat,
          "indexingOrPermissionIssue",
          highPriorityGscEmailAlert.severity === "high" ? "high" : "medium",
          `Gmail digest GSC alert: ${highPriorityGscEmailAlert.issue}`,
          "Open the matching Search Console issue and verify robots, noindex, canonical, redirect, or 404 handling.",
          highPriorityGscEmailAlert.issue,
        ),
      );
    }

    if (
      isSignificantUserDrop(activeUsersChange, stat.previous7Days.activeUsers)
    ) {
      insights.push(
        makeInsight(
          stat,
          "decline",
          "high",
          `GA4 사용자가 직전 7일 대비 ${formatSignedPercent(activeUsersChange)} 변했습니다.`,
          "최근 발행, 색인, 유입 채널 변화를 먼저 확인하세요.",
          formatSignedPercent(activeUsersChange),
        ),
      );
    }

    if (isSignificantClickDrop(gscClicksChange, stat.gscPrevious7Days.clicks)) {
      insights.push(
        makeInsight(
          stat,
          "decline",
          "high",
          `GSC 클릭이 직전 7일 대비 ${formatSignedPercent(gscClicksChange)} 변했습니다.`,
          "상위 쿼리 순위와 CTR 하락 페이지를 점검하세요.",
          formatSignedPercent(gscClicksChange),
        ),
      );
    }

    if (
      activeUsersChange !== null &&
      activeUsersChange >= 0.3 &&
      stat.last7Days.activeUsers >= 10
    ) {
      insights.push(
        makeInsight(
          stat,
          "growth",
          "medium",
          `GA4 사용자가 직전 7일 대비 ${formatSignedPercent(activeUsersChange)} 증가했습니다.`,
          "증가 원인을 찾고 비슷한 콘텐츠나 내부링크를 확장하세요.",
          formatSignedPercent(activeUsersChange),
        ),
      );
    }

    if (hasCtrOpportunity(stat)) {
      insights.push(
        makeInsight(
          stat,
          "seoOpportunity",
          "medium",
          `노출 ${formatNumber(gsc.impressions)}회 대비 CTR이 ${formatPercent(gsc.ctr)}로 낮습니다.`,
          "제목과 메타 설명을 검색 의도에 맞춰 개선하세요.",
          formatPercent(gsc.ctr),
        ),
      );
    }

    if (hasRankingOpportunity(stat)) {
      insights.push(
        makeInsight(
          stat,
          "rankingOpportunity",
          "medium",
          `평균순위 ${formatDecimal(gsc.position)}위로 추가 개선 여지가 있습니다.`,
          "상위 문서 보강, FAQ, 내부링크, 최신성 업데이트를 우선 적용하세요.",
          `${formatDecimal(gsc.position)}위`,
        ),
      );
    }

    if (stat.last7Days.activeUsers >= 50 && gsc.clicks <= 2 && !stat.gscError) {
      insights.push(
        makeInsight(
          stat,
          "trafficMismatch",
          "low",
          "GA4 유입은 있지만 GSC 검색 클릭은 낮습니다.",
          "검색 외 유입 채널 비중과 자연검색 확장 가능성을 확인하세요.",
          `GA4 ${formatNumber(stat.last7Days.activeUsers)}`,
        ),
      );
    }

    if ((urlCounts.get(normalizeUrl(stat.url)) ?? 0) > 1) {
      insights.push(
        makeInsight(
          stat,
          "duplicateProperty",
          "low",
          "같은 URL이 여러 GA4 속성 또는 스트림으로 등록되어 있습니다.",
          "중복 property가 의도된 것인지 확인하고 대시보드 그룹 기준을 정하세요.",
          "중복",
        ),
      );
    }
  }

  return insights.sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );
}

function makeInsight(
  stat: EnrichedSiteStat,
  kind: InsightKind,
  severity: InsightSeverity,
  reason: string,
  recommendedAction: string,
  primaryValue: string,
): SiteInsight {
  const actionGuide = buildInsightActionGuide(stat, kind);
  return {
    id: `${stat.id}-${kind}-${reason}`,
    siteId: stat.id,
    siteName: stat.name,
    url: stat.url,
    kind,
    severity,
    reason,
    recommendedAction,
    primaryValue,
    cause: buildInsightCause(stat, kind),
    confidence: buildInsightConfidence(stat, kind, severity),
    sampleSize: buildInsightSampleSize(stat, kind),
    evidence: buildInsightEvidence(stat, kind, primaryValue),
    operatorPrompt: actionGuide.operatorPrompt,
    verification: actionGuide.verification,
    reviewNote: buildInsightReviewNote(stat, kind),
    gscDiagnosis: buildGscDiagnosis(stat),
    relatedSignals: [],
    topQueries: buildInsightQueryCandidates(stat, kind),
  };
}

function buildInsightCause(
  stat: EnrichedSiteStat,
  kind: InsightKind,
): InsightCause {
  const ga4Drop = (stat.trend.activeUsersChange ?? 0) <= -0.3;
  const gscDrop =
    (stat.trend.gscClicksChange ?? 0) <= -0.3 &&
    stat.gscPrevious7Days.clicks >= 10;

  switch (kind) {
    case "indexingOrPermissionIssue":
      if (stat.gscError) {
        return "gsc_error";
      }
      return "gsc_zero";
    case "decline":
      if (ga4Drop && (stat.trend.gscClicksChange ?? 0) <= -0.3 && !gscDrop) {
        return "ga4_low_sample_channel_unknown";
      }
      if (ga4Drop && gscDrop) {
        return "mixed_decline";
      }
      if (gscDrop) {
        return "gsc_drop";
      }
      return "ga4_drop";
    case "seoOpportunity":
      return "ctr";
    case "rankingOpportunity":
      return "ranking";
    case "growth":
      return "growth";
    case "trafficMismatch":
      return "traffic_mismatch";
    case "duplicateProperty":
      return "duplicate";
  }
}

function buildInsightSampleSize(
  stat: EnrichedSiteStat,
  kind: InsightKind,
): InsightSampleSize {
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  const previousGsc = stat.gscPrevious7Days ?? emptyGscMetrics();
  const userSample =
    stat.last7Days.activeUsers + stat.previous7Days.activeUsers;
  const searchSample = gsc.impressions + previousGsc.impressions;
  const clickSample = gsc.clicks + previousGsc.clicks;

  if (
    kind === "seoOpportunity" ||
    kind === "rankingOpportunity" ||
    (kind === "decline" &&
      (stat.trend.gscClicksChange ?? 0) <= -0.3 &&
      previousGsc.clicks >= 10)
  ) {
    if (searchSample >= 500 || clickSample >= 40) {
      return "high";
    }
    if (searchSample >= 100 || clickSample >= 10) {
      return "medium";
    }
    return "low";
  }

  if (kind === "indexingOrPermissionIssue") {
    if ((stat.googleSubmittedCount ?? 0) >= 1000 || userSample >= 500) {
      return "high";
    }
    if ((stat.googleSubmittedCount ?? 0) >= 100 || userSample >= 100) {
      return "medium";
    }
    return "low";
  }

  if (userSample >= 500) {
    return "high";
  }
  if (userSample >= 100) {
    return "medium";
  }
  return "low";
}

function buildInsightConfidence(
  stat: EnrichedSiteStat,
  kind: InsightKind,
  severity: InsightSeverity,
): InsightConfidence {
  if (stat.gscError) {
    return severity === "high" ? "high" : "medium";
  }

  const sampleSize = buildInsightSampleSize(stat, kind);
  if (sampleSize === "low") {
    return "low";
  }
  if (severity === "high" && sampleSize === "high") {
    return "high";
  }
  return "medium";
}

function buildInsightEvidence(
  stat: EnrichedSiteStat,
  kind: InsightKind,
  primaryValue: string,
): string[] {
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  const evidence = [
    `핵심 지표: ${primaryValue}`,
    `대상: siteId ${stat.id}, URL ${stat.url}`,
    `GA4 최근 7일 사용자 ${formatNumber(stat.last7Days.activeUsers)}명, 직전 7일 ${formatNumber(stat.previous7Days.activeUsers)}명`,
    `GSC 최근 7일 클릭 ${formatNumber(gsc.clicks)}회, 노출 ${formatNumber(gsc.impressions)}회, CTR ${formatPercent(gsc.ctr)}`,
  ];

  if (stat.gscSiteUrl) {
    evidence.push(`GSC 속성: ${stat.gscSiteUrl}`);
  }
  if (stat.sitemapPath) {
    evidence.push(`Sitemap: ${stat.sitemapPath}`);
  }
  if (stat.googleSubmittedCount !== undefined) {
    evidence.push(
      `Google 제출 ${formatNumber(stat.googleSubmittedCount)}개, 색인 ${formatNumber(stat.googleIndexedCount ?? 0)}개`,
    );
  }
  if (stat.sitemapLastDownloadedAt) {
    evidence.push(`Sitemap 마지막 읽음: ${stat.sitemapLastDownloadedAt}`);
  }
  if (stat.trend.activeUsersChange !== null) {
    evidence.push(
      `GA4 변화율 ${formatSignedPercent(stat.trend.activeUsersChange)}`,
    );
  }
  if (stat.trend.gscClicksChange !== null) {
    evidence.push(
      `GSC 클릭 변화율 ${formatSignedPercent(stat.trend.gscClicksChange)}`,
    );
  }
  if (stat.gscError) {
    evidence.push(`GSC 오류: ${stat.gscError}`);
  }
  if (kind === "rankingOpportunity") {
    evidence.push(`평균 순위 ${formatDecimal(gsc.position)}`);
  }
  if (kind === "duplicateProperty" && stat.duplicateCount) {
    evidence.push(
      `동일 도메인 대시보드 항목 ${formatNumber(stat.duplicateCount)}개`,
    );
  }

  return evidence.slice(0, 7);
}

function buildInsightReviewNote(
  stat: EnrichedSiteStat,
  kind: InsightKind,
): string {
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  const notes: string[] = [];

  if (stat.last7Days.activeUsers < 30) {
    notes.push(
      "표본이 작아 퍼센트 변화가 크게 흔들릴 수 있으므로 실제 페이지/쿼리 수를 먼저 확인하세요.",
    );
  }

  if (
    kind === "indexingOrPermissionIssue" &&
    !stat.gscError &&
    gsc.clicks === 0 &&
    gsc.impressions === 0
  ) {
    notes.push(
      "GSC 0은 권한 오류로 단정하지 말고 속성 불일치, 검색 노출 없음, sitemap/canonical 문제를 분리해서 봐야 합니다.",
    );
  }

  if (
    kind === "growth" &&
    gsc.clicks === 0 &&
    gsc.impressions === 0 &&
    stat.last7Days.activeUsers >= 50
  ) {
    notes.push(
      "GA4 성장은 확인되지만 GSC 검색 신호가 없어 검색 확장보다 유입 채널과 GSC 속성 정합성 확인이 우선입니다.",
    );
  }

  if (
    kind === "decline" &&
    (stat.trend.activeUsersChange ?? 0) > 0 &&
    (stat.trend.gscClicksChange ?? 0) < 0
  ) {
    notes.push(
      "GA4 사용자는 늘고 검색 클릭만 줄어든 케이스라 전체 트래픽 하락보다 검색 쿼리/CTR 하락으로 좁혀 보세요.",
    );
  }

  if (
    (kind === "seoOpportunity" || kind === "rankingOpportunity") &&
    gsc.impressions < 300
  ) {
    notes.push(
      "노출 규모가 아직 작아 사이트 전체 결론보다 상위 쿼리와 URL 단위 후보 선별이 먼저입니다.",
    );
  }

  if (notes.length === 0) {
    return "현재 신호는 작업 후보로 볼 수 있으나, 변경 전 상위 페이지와 쿼리 단위 근거를 한 번 더 확인하세요.";
  }

  return notes.slice(0, 2).join(" ");
}

function buildGscDiagnosis(stat: EnrichedSiteStat): string {
  const gsc = stat.gscLast7Days ?? emptyGscMetrics();
  const sitemapHost = stat.sitemapPath ? hostnameOf(stat.sitemapPath) : null;
  const siteHost = hostnameOf(stat.url);

  if (stat.gscError) {
    return `GSC API 오류가 있어 Search Console 권한 또는 속성 등록을 먼저 확인해야 합니다: ${stat.gscError}`;
  }

  if (gsc.clicks === 0 && gsc.impressions === 0) {
    if (
      stat.googleSubmittedCount !== undefined &&
      stat.googleSubmittedCount > 0 &&
      (stat.googleIndexedCount ?? 0) === 0
    ) {
      return "sitemap 제출 수는 있지만 색인 수가 0입니다. canonical, robots, noindex, sitemap URL의 실제 응답을 먼저 점검하세요.";
    }

    if (sitemapHost && siteHost && sitemapHost !== siteHost) {
      return `대표 URL(${siteHost})과 sitemap 호스트(${sitemapHost})가 다릅니다. 의도한 서브도메인 추적인지 확인하세요.`;
    }

    if (stat.last7Days.activeUsers >= 50) {
      return "GA4 유입은 있는데 GSC 노출이 0입니다. GSC 속성 불일치, 검색 유입 없음, 색인/canonical 문제를 분리해서 확인하세요.";
    }

    return "GSC 노출과 클릭이 모두 0입니다. 저유입 사이트라면 정상일 수 있어 색인 상태와 쿼리 발생 여부를 함께 확인하세요.";
  }

  if (gsc.impressions > 0 && gsc.clicks === 0) {
    return "GSC 노출은 있으나 클릭이 없습니다. 제목, 메타 설명, 검색 의도 일치도를 우선 점검하세요.";
  }

  return "GSC 데이터가 수집되고 있습니다. 상위 쿼리와 URL 단위로 수정 후보를 좁혀 진행하세요.";
}

function buildInsightQueryCandidates(
  stat: EnrichedSiteStat,
  kind: InsightKind,
): InsightQueryCandidate[] {
  const queries = stat.gscTopQueries ?? [];

  if (queries.length === 0) {
    return [];
  }

  const filtered = queries.filter((query) => {
    if (kind === "seoOpportunity") {
      return query.impressions >= 20 && query.ctr <= 0.03;
    }
    if (kind === "rankingOpportunity") {
      return query.position >= 4 && query.position <= 20;
    }
    return query.impressions > 0;
  });

  return filtered
    .sort((a, b) => {
      if (kind === "seoOpportunity") {
        return b.impressions - a.impressions || a.ctr - b.ctr;
      }
      if (kind === "rankingOpportunity") {
        return b.impressions - a.impressions || a.position - b.position;
      }
      return b.clicks - a.clicks || b.impressions - a.impressions;
    })
    .slice(0, 3)
    .map((query) => ({
      query: query.query,
      clicks: query.clicks,
      impressions: query.impressions,
      ctr: query.ctr,
      position: query.position,
    }));
}

function formatInsightKind(kind: InsightKind): string {
  switch (kind) {
    case "growth":
      return "성장";
    case "decline":
      return "하락";
    case "seoOpportunity":
      return "CTR";
    case "rankingOpportunity":
      return "순위";
    case "trafficMismatch":
      return "유입불일치";
    case "indexingOrPermissionIssue":
      return "GSC확인";
    case "duplicateProperty":
      return "중복";
  }
}

function buildInsightActionGuide(
  stat: EnrichedSiteStat,
  kind: InsightKind,
): Pick<SiteInsight, "operatorPrompt" | "verification"> {
  const host = normalizeUrl(stat.url);
  const base = `${stat.name}(${host})`;
  const context = buildOperatorContext(stat);

  switch (kind) {
    case "indexingOrPermissionIssue":
      return {
        operatorPrompt: `Codex: ${base}의 GSC 소유권, sitemap 제출 URL, robots.txt, canonical을 점검하고 데이터가 0으로 잡히는 원인을 수정 계획으로 정리해줘. ${context}`,
        verification:
          "Search Console 속성 권한이 정상이고 sitemap 마지막 읽은 날짜가 최신이며, 다음 갱신 후 GSC 오류가 사라지는지 확인합니다.",
      };
    case "decline":
      return {
        operatorPrompt: `Codex: ${base}의 최근 발행물, 유입 채널, 상위 쿼리/페이지 변동을 비교해 트래픽 하락 원인과 복구 작업을 우선순위로 제안해줘. ${context}`,
        verification:
          "수정 후 7일 사용자, GSC 클릭, 상위 쿼리 CTR이 직전 갱신 대비 회복되는지 대시보드에서 비교합니다.",
      };
    case "growth":
      return {
        operatorPrompt: `Codex: ${base}의 성장 원인을 찾고, 성과가 좋은 페이지의 내부링크, 관련 글, 제목 패턴을 확장하는 작업안을 만들어줘. ${context}`,
        verification:
          "확장 후 성장 페이지의 세션, 내부 이동, 관련 글 노출이 유지 또는 증가하는지 확인합니다.",
      };
    case "seoOpportunity":
      return {
        operatorPrompt: `Codex: ${base}에서 노출은 있지만 CTR이 낮은 페이지의 제목, 메타 설명, 검색 의도 일치도를 개선할 후보를 찾아줘. ${context}`,
        verification:
          "개선 대상 페이지의 CTR과 평균 순위를 다음 GSC 갱신에서 기존 값과 비교합니다.",
      };
    case "rankingOpportunity":
      return {
        operatorPrompt: `Codex: ${base}의 평균 순위 5-20위권 페이지를 찾아 본문 보강, FAQ, 내부링크, 최신성 업데이트 계획을 작성해줘. ${context}`,
        verification:
          "보강 페이지의 평균 순위, 노출, 클릭이 다음 1-2회 갱신에서 개선되는지 추적합니다.",
      };
    case "trafficMismatch":
      return {
        operatorPrompt: `Codex: ${base}의 GA4 유입 대비 GSC 클릭이 낮은 이유를 채널별로 분리하고 검색 유입 확대 가능 페이지를 골라줘. ${context}`,
        verification:
          "검색 유입 대상 페이지의 색인 상태, GSC 클릭, GA4 organic 유입을 함께 확인합니다.",
      };
    case "duplicateProperty":
      return {
        operatorPrompt: `Codex: ${base}와 중복 등록된 GA4/GSC 속성을 찾아 canonical 기준으로 유지할 항목과 정리할 항목을 제안해줘. ${context}`,
        verification:
          "대시보드에 같은 도메인이 중복 표시되지 않고 대표 속성의 수집 지표만 남는지 확인합니다.",
      };
  }
}

function buildOperatorContext(stat: EnrichedSiteStat): string {
  const parts = [`siteId=${stat.id}`, `url=${stat.url}`];

  if (stat.gscSiteUrl) {
    parts.push(`gscSiteUrl=${stat.gscSiteUrl}`);
  }
  if (stat.sitemapPath) {
    parts.push(`sitemap=${stat.sitemapPath}`);
  }
  if (stat.developmentPath) {
    parts.push(`developmentPath=${stat.developmentPath}`);
  }
  if (stat.googleSubmittedCount !== undefined) {
    parts.push(`submitted=${stat.googleSubmittedCount}`);
  }
  if (stat.googleIndexedCount !== undefined) {
    parts.push(`indexed=${stat.googleIndexedCount}`);
  }

  return `기준 정보: ${parts.join(", ")}.`;
}

function readSites(path: string): Site[] {
  if (!existsSync(path)) {
    return [];
  }

  const raw = readFileSync(path, "utf8");
  const parsed = (YAML.parse(raw) ?? {}) as SitesFile;
  return parsed.sites ?? [];
}

function sitesFromStatsSnapshot(stats: SiteStat[]): Site[] {
  return stats.map((stat) => ({
    id: stat.id,
    name: stat.name,
    url: stat.url,
    ga4PropertyId: stat.ga4PropertyId,
    ...(stat.gscSiteUrl !== undefined && { gscSiteUrl: stat.gscSiteUrl }),
    ...(stat.monetization !== undefined && { monetization: stat.monetization }),
  }));
}

// 최근 7일 일별 활성 사용자 스파크라인. 각 history 파일은 사이트 수와 무관하게 한 번만 파싱한다.
// 수집이 없었던 날(파일 없음/손상)은 0이 아니라 null(끊김)으로 둬서 "가짜 급락"으로 보이지 않게 한다.
// 파일은 있는데 해당 사이트가 없으면 실제 0(무트래픽)으로 본다.
function loadSparklines(siteIds: string[]): Map<string, (number | null)[]> {
  const days: number[] = [6, 5, 4, 3, 2, 1, 0];
  const idSet = new Set(siteIds);

  const perDay = days.map((daysAgo) => {
    const historyPath = `data/history/${seoulDateDaysAgo(daysAgo)}.json`;
    if (!existsSync(historyPath)) {
      return null;
    }
    try {
      const snap = JSON.parse(
        readFileSync(historyPath, "utf8"),
      ) as StatsSnapshot;
      const byId = new Map<string, number>();
      for (const stat of snap.stats) {
        if (idSet.has(stat.id)) {
          byId.set(stat.id, stat.last1Days?.activeUsers ?? 0);
        }
      }
      return byId;
    } catch {
      return null;
    }
  });

  const result = new Map<string, (number | null)[]>();
  for (const siteId of siteIds) {
    result.set(
      siteId,
      perDay.map((day) => (day === null ? null : (day.get(siteId) ?? 0))),
    );
  }
  return result;
}

interface ScheduledQueueInfo {
  future: number;
  lastScheduledAt?: string;
}

// URL/사이트명을 host 키로 정규화 (scheduled-queue와 site-stats 매칭용)
function scheduledHost(value: string | undefined): string {
  return (value ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "");
}

// 예약글은 정기 stats 파이프라인이 아닌 별도 SSH 수집(scheduled-queue-*.json)으로 들어온다.
// data/ 의 최신 scheduled-queue 파일을 읽어 host별 예약글 수/마지막 예약일을 반환한다.
function loadScheduledQueue(): Map<string, ScheduledQueueInfo> {
  const result = new Map<string, ScheduledQueueInfo>();
  let entries: string[];
  try {
    entries = readdirSync("data");
  } catch {
    return result;
  }
  const latest = entries
    .filter((f) => /^scheduled-queue-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .at(-1);
  if (!latest) {
    return result;
  }
  try {
    const parsed = JSON.parse(readFileSync(`data/${latest}`, "utf8")) as {
      sites?: Array<{
        site?: string;
        future?: number;
        lastSched?: string;
        error?: string;
      }>;
    };
    for (const entry of parsed.sites ?? []) {
      if (!entry.site || entry.error) {
        continue;
      }
      let lastScheduledAt: string | undefined;
      if (entry.lastSched) {
        const parsedDate = new Date(
          `${entry.lastSched.replace(" ", "T")}+09:00`,
        );
        if (!Number.isNaN(parsedDate.getTime())) {
          lastScheduledAt = parsedDate.toISOString();
        }
      }
      result.set(scheduledHost(entry.site), {
        future: entry.future ?? 0,
        ...(lastScheduledAt !== undefined && { lastScheduledAt }),
      });
    }
  } catch {
    return result;
  }
  return result;
}

function readStats(path: string): StatsSnapshot {
  if (!existsSync(path)) {
    return {
      generatedAt: null,
      rangeDays: 7,
      previousRangeDays: 7,
      longRangeDays: 30,
      dateRanges: fallbackDateRanges(),
      stats: [],
    };
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as StatsSnapshot;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`통계 스냅샷(${path}) 파싱에 실패했습니다: ${reason}`);
  }
}

function loadOpsMailReport(path: string): OpsMailReport {
  const empty = emptyOpsMailReport(path);
  if (!existsSync(path)) {
    return empty;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      generatedAt?: unknown;
      sourcePath?: unknown;
      sourceUpdatedAt?: unknown;
      digestUrl?: unknown;
      digestUpdatedAt?: unknown;
      owner?: unknown;
      summary?: Partial<Record<OpsMailSeverity, unknown>>;
      counts?: Partial<Record<OpsMailKind, unknown>>;
      collection?: unknown;
      findings?: unknown[];
    };
    const reviewState = getOpsMailReviewState();
    const findings = (parsed.findings ?? [])
      .map((finding) => normalizeOpsMailFinding(finding, reviewState.entries))
      .filter((finding): finding is OpsMailFinding => Boolean(finding))
      .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
    const summary = summarizeOpsMailFindings(findings);
    const counts = countOpsMailKinds(findings);

    return {
      generatedAt:
        typeof parsed.generatedAt === "string" ? parsed.generatedAt : null,
      digestUrl:
        typeof parsed.sourcePath === "string"
          ? parsed.sourcePath
          : typeof parsed.digestUrl === "string"
            ? parsed.digestUrl
            : null,
      ...(typeof parsed.sourceUpdatedAt === "string"
        ? { digestUpdatedAt: parsed.sourceUpdatedAt }
        : typeof parsed.digestUpdatedAt === "string"
          ? { digestUpdatedAt: parsed.digestUpdatedAt }
        : {}),
      ...(typeof parsed.owner === "string" ? { owner: parsed.owner } : {}),
      path,
      reviewUpdatedAt: reviewState.updatedAt,
      persistenceNote: getOpsMailPersistenceNote(),
      totalCount: findings.length,
      openCount: findings.filter(
        (finding) =>
          finding.reviewStatus === "open" ||
          finding.reviewStatus === "reviewing",
      ).length,
      siteRelatedCount: findings.filter(isSiteRelatedOpsMailFinding).length,
      summary,
      counts,
      collection: normalizeOpsCollectorAvailability(parsed.collection),
      findings,
    };
  } catch {
    return empty;
  }
}

function emptyOpsMailReport(path: string): OpsMailReport {
  return {
    generatedAt: null,
    digestUrl: null,
    path,
    reviewUpdatedAt: getOpsMailReviewState().updatedAt,
    persistenceNote: getOpsMailPersistenceNote(),
    totalCount: 0,
    openCount: 0,
    siteRelatedCount: 0,
    summary: { critical: 0, high: 0, medium: 0, low: 0 },
    counts: {
      "github-actions": 0,
      gsc: 0,
      adsense: 0,
      ga4: 0,
      vercel: 0,
      other: 0,
    },
    collection: normalizeOpsCollectorAvailability(undefined),
    findings: [],
  };
}

const OPS_COLLECTOR_DEFINITIONS: Array<{ key: OpsCollectorKey; label: string }> = [
  { key: "githubActions", label: "GitHub Actions" },
  { key: "dashboardArtifacts", label: "Dashboard artifacts" },
  { key: "ga4", label: "GA4" },
];

export function normalizeOpsCollectorAvailability(value: unknown): OpsCollectorAvailability[] {
  const collection = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return OPS_COLLECTOR_DEFINITIONS.map(({ key, label }) => {
    const candidate = collection[key];
    if (!candidate || typeof candidate !== "object") {
      return {
        key,
        label,
        status: "missing",
        detail: "Collector availability was not recorded in this report.",
        checkedAt: null,
        count: 0,
      };
    }
    const state = candidate as Record<string, unknown>;
    return {
      key,
      label,
      status: normalizeOpsCollectorAvailabilityStatus(state.status),
      detail: cleanString(state.detail) || "Collector did not provide a status detail.",
      checkedAt: cleanString(state.checkedAt) || null,
      count: typeof state.count === "number" && Number.isFinite(state.count) ? state.count : 0,
    };
  });
}

function normalizeOpsCollectorAvailabilityStatus(value: unknown): OpsCollectorAvailabilityStatus {
  return value === "ok" || value === "skipped" || value === "error" ? value : "missing";
}

function normalizeOpsMailFinding(
  value: unknown,
  reviewEntries: Record<string, { status: OpsMailReviewStatus; note: string; updatedAt: string }>,
): OpsMailFinding | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const id = cleanString(candidate.id);
  const kind = normalizeOpsMailKind(candidate.kind);
  const severity = normalizeOpsMailSeverity(candidate.severity);
  const title = cleanString(candidate.title);
  const recommendedAction = cleanString(candidate.recommendedAction);
  const sourceLine = cleanString(candidate.sourceLine);
  if (!id || !kind || !severity || !title || !recommendedAction) {
    return null;
  }

  const review = reviewEntries[id];
  return {
    id,
    kind,
    severity,
    priority: typeof candidate.priority === "number" ? candidate.priority : 0,
    title,
    recommendedAction,
    sourceLine,
    ...(cleanString(candidate.repo) ? { repo: cleanString(candidate.repo) } : {}),
    ...(cleanString(candidate.site) ? { site: cleanString(candidate.site) } : {}),
    ...(cleanString(candidate.workflow)
      ? { workflow: cleanString(candidate.workflow) }
      : {}),
    ...(cleanString(candidate.category)
      ? { category: cleanString(candidate.category) }
      : {}),
    ...(typeof candidate.count === "number" ? { count: candidate.count } : {}),
    ...(cleanString(candidate.commit)
      ? { commit: cleanString(candidate.commit) }
      : {}),
    ...(cleanString(candidate.issueUrl)
      ? { issueUrl: cleanString(candidate.issueUrl) }
      : {}),
    reviewStatus: review?.status ?? "open",
    reviewNote: review?.note ?? "",
    ...(review?.updatedAt ? { reviewUpdatedAt: review.updatedAt } : {}),
  };
}

function normalizeOpsMailKind(value: unknown): OpsMailKind | null {
  if (
    value === "github-actions" ||
    value === "gsc" ||
    value === "adsense" ||
    value === "ga4" ||
    value === "vercel" ||
    value === "other"
  ) {
    return value;
  }
  return null;
}

function normalizeOpsMailSeverity(value: unknown): OpsMailSeverity | null {
  if (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low"
  ) {
    return value;
  }
  return null;
}

function summarizeOpsMailFindings(
  findings: OpsMailFinding[],
): Record<OpsMailSeverity, number> {
  return findings.reduce<Record<OpsMailSeverity, number>>(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
}

function countOpsMailKinds(
  findings: OpsMailFinding[],
): Record<OpsMailKind, number> {
  return findings.reduce<Record<OpsMailKind, number>>(
    (counts, finding) => {
      counts[finding.kind] += 1;
      return counts;
    },
    {
      "github-actions": 0,
      gsc: 0,
      adsense: 0,
      ga4: 0,
      vercel: 0,
      other: 0,
    },
  );
}

function isSiteRelatedOpsMailFinding(finding: OpsMailFinding): boolean {
  return (
    Boolean(finding.site) ||
    finding.kind === "gsc" ||
    finding.kind === "adsense" ||
    finding.kind === "ga4" ||
    finding.kind === "vercel"
  );
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function loadSearchIndexPresence(
  path: string,
): Map<string, SiteSearchIndexPresence> {
  if (!existsSync(path)) {
    return new Map();
  }

  try {
    const parsed = JSON.parse(
      readFileSync(path, "utf8"),
    ) as Partial<SearchIndexPresenceSnapshot>;
    return new Map(
      (parsed.stats ?? [])
        .filter(isSiteSearchIndexPresence)
        .map((stat) => [stat.siteId, stat] as const),
    );
  } catch {
    return new Map();
  }
}

function isSiteSearchIndexPresence(
  value: unknown,
): value is SiteSearchIndexPresence {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<SiteSearchIndexPresence>;
  return (
    typeof candidate.siteId === "string" &&
    typeof candidate.host === "string" &&
    typeof candidate.query === "string" &&
    typeof candidate.checkedAt === "string" &&
    Boolean(candidate.engines)
  );
}

export function loadAdsenseRemediationQueue(
  dataDirectory = "data",
  expectedStatsGeneratedAt?: string | null,
): AdsenseRemediationQueueSummary | null {
  let entries: string[];
  try {
    entries = readdirSync(dataDirectory);
  } catch {
    return null;
  }

  const latest = findLatestDatedArtifact(
    entries,
    /^adsense-remediation-queue-\d{4}-\d{2}-\d{2}\.json$/,
  );
  if (!latest) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      readFileSync(`${dataDirectory}/${latest}`, "utf8"),
    );
    if (!isAdsenseRemediationQueueArtifact(parsed)) {
      return null;
    }
    if (
      expectedStatsGeneratedAt &&
      !isMatchingCollectorSnapshot(
        parsed.collectorSnapshot,
        expectedStatsGeneratedAt,
      )
    ) {
      return null;
    }

    return {
      generatedAt: parsed.generatedAt,
      collectorSnapshot: parsed.collectorSnapshot,
      productionMutationPerformed: parsed.productionMutationPerformed,
      adsenseConsoleChecked: parsed.adsenseConsoleChecked,
      totalRows: parsed.summary.totalRows,
      reviewedRows: parsed.summary.reviewedRows,
      adsenseOkRows: parsed.summary.adsenseOkRows,
      problemRows: parsed.summary.problemRows,
      ordinaryAdsenseProof: parsed.summary.ordinaryAdsenseProof,
      approvedRootSubdomainScope: parsed.summary.approvedRootSubdomainScope,
      gscAuthTelemetry: parsed.summary.gscAuthTelemetry,
      ga4ConfigTelemetry: parsed.summary.ga4ConfigTelemetry,
      lanes: parsed.lanes,
    };
  } catch {
    return null;
  }
}

export function loadAdsenseProofGate(
  dataDirectory = "data",
  expectedStatsGeneratedAt?: string | null,
): AdsenseProofGateSummary | null {
  let entries: string[];
  try {
    entries = readdirSync(dataDirectory);
  } catch {
    return null;
  }

  const latest = findLatestDatedArtifact(
    entries,
    /^adsense-proof-gate-\d{4}-\d{2}-\d{2}\.json$/,
  );
  if (!latest) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      readFileSync(`${dataDirectory}/${latest}`, "utf8"),
    );
    if (!isAdsenseProofGateArtifact(parsed)) {
      return null;
    }
    if (
      expectedStatsGeneratedAt &&
      !isMatchingCollectorSnapshot(
        parsed.collectorSnapshot,
        expectedStatsGeneratedAt,
      )
    ) {
      return null;
    }

    return {
      generatedAt: parsed.generatedAt,
      collectorSnapshot: parsed.collectorSnapshot,
      productionMutationPerformed: parsed.productionMutationPerformed,
      adsenseConsoleChecked: parsed.adsenseConsoleChecked,
      verdict: parsed.verdict,
      readiness: parsed.readiness,
      blockers: parsed.blockers,
      summary: parsed.summary,
      stopCondition: parsed.stopCondition,
    };
  } catch {
    return null;
  }
}

export function loadAdsenseProofFreshness(
  dataDirectory = "data",
  expectedStatsGeneratedAt?: string | null,
): AdsenseProofFreshnessSummary {
  let entries: string[];
  try {
    entries = readdirSync(dataDirectory);
  } catch {
    return makeAdsenseProofFreshnessSummary({
      status: "missing",
      expectedStatsGeneratedAt,
      candidateSiteIds: [],
      reason: `Cannot read ${dataDirectory}.`,
    });
  }

  const latest = findLatestDatedArtifact(
    entries,
    /^adsense-external-proof-continuation-\d{4}-\d{2}-\d{2}\.json$/,
  );
  if (!latest) {
    return makeAdsenseProofFreshnessSummary({
      status: "missing",
      expectedStatsGeneratedAt,
      candidateSiteIds: [],
      reason: "No external proof continuation artifact exists.",
    });
  }

  const artifactPath = `${dataDirectory}/${latest}`;
  try {
    const parsed = JSON.parse(readFileSync(artifactPath, "utf8")) as {
      generatedAt?: unknown;
      collectorSnapshot?: unknown;
      candidates?: unknown[];
    };
    const candidateSiteIds = collectAdsenseProofCandidateSiteIds(
      parsed.candidates,
    );
    const collectorSnapshot =
      typeof parsed.collectorSnapshot === "string"
        ? parsed.collectorSnapshot
        : undefined;
    const generatedAt =
      typeof parsed.generatedAt === "string" ? parsed.generatedAt : undefined;

    if (!collectorSnapshot) {
      return makeAdsenseProofFreshnessSummary({
        status: "invalid",
        artifactPath,
        generatedAt,
        expectedStatsGeneratedAt,
        candidateSiteIds,
        reason: "External proof artifact is missing collectorSnapshot.",
      });
    }

    if (
      expectedStatsGeneratedAt &&
      !isMatchingCollectorSnapshot(collectorSnapshot, expectedStatsGeneratedAt)
    ) {
      if (
        isResolvedAdsenseProofFreshness(
          dataDirectory,
          expectedStatsGeneratedAt,
          candidateSiteIds,
        )
      ) {
        return makeAdsenseProofFreshnessSummary({
          status: "resolved",
          artifactPath,
          generatedAt,
          collectorSnapshot,
          expectedStatsGeneratedAt,
          candidateSiteIds,
          reason:
            "External proof artifact is older than the current snapshot, but all candidate sites are resolved in the current AdSense remediation queue.",
        });
      }
      return makeAdsenseProofFreshnessSummary({
        status: "stale",
        artifactPath,
        generatedAt,
        collectorSnapshot,
        expectedStatsGeneratedAt,
        candidateSiteIds,
        reason: `External proof collectorSnapshot does not match current stats generatedAt=${expectedStatsGeneratedAt}.`,
      });
    }

    return makeAdsenseProofFreshnessSummary({
      status: "current",
      artifactPath,
      generatedAt,
      collectorSnapshot,
      expectedStatsGeneratedAt,
      candidateSiteIds,
      reason: "External proof artifact matches the current dashboard snapshot.",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return makeAdsenseProofFreshnessSummary({
      status: "invalid",
      artifactPath,
      expectedStatsGeneratedAt,
      candidateSiteIds: [],
      reason: `Cannot parse external proof artifact: ${reason}`,
    });
  }
}

function isResolvedAdsenseProofFreshness(
  dataDirectory: string,
  expectedStatsGeneratedAt: string,
  candidateSiteIds: string[],
): boolean {
  if (candidateSiteIds.length === 0) {
    return false;
  }
  const queue = loadAdsenseRemediationQueue(
    dataDirectory,
    expectedStatsGeneratedAt,
  );
  if (!queue) {
    return false;
  }
  const activeProofSiteIds = new Set([
    ...queue.lanes.ordinary_adsense_proof.map((item) => item.siteId),
    ...queue.lanes.approved_root_subdomain_scope.map((item) => item.siteId),
  ]);
  return candidateSiteIds.every((siteId) => !activeProofSiteIds.has(siteId));
}

function makeAdsenseProofFreshnessSummary(input: {
  status: AdsenseProofFreshnessStatus;
  artifactPath?: string | undefined;
  generatedAt?: string | undefined;
  collectorSnapshot?: string | undefined;
  expectedStatsGeneratedAt?: string | null | undefined;
  candidateSiteIds: string[];
  reason: string;
}): AdsenseProofFreshnessSummary {
  return {
    status: input.status,
    ...(input.artifactPath ? { artifactPath: input.artifactPath } : {}),
    ...(input.generatedAt ? { generatedAt: input.generatedAt } : {}),
    ...(input.collectorSnapshot
      ? { collectorSnapshot: input.collectorSnapshot }
      : {}),
    expectedStatsGeneratedAt: input.expectedStatsGeneratedAt ?? null,
    candidateSiteIds: input.candidateSiteIds,
    candidateCount: input.candidateSiteIds.length,
    reason: input.reason,
    remediationCommand: "pnpm adsense:proof:refresh-snapshot",
  };
}

function collectAdsenseProofCandidateSiteIds(candidates: unknown): string[] {
  if (!Array.isArray(candidates)) {
    return [];
  }
  return [
    ...new Set(
      candidates
        .map((candidate) =>
          candidate &&
          typeof candidate === "object" &&
          typeof (candidate as { siteId?: unknown }).siteId === "string"
            ? (candidate as { siteId: string }).siteId
            : undefined,
        )
        .filter((siteId): siteId is string => Boolean(siteId)),
    ),
  ].sort();
}

export function loadGscPermissionAudit(
  dataDirectory = "data",
  expectedStatsGeneratedAt?: string | null,
): GscPermissionAuditSummary | null {
  let entries: string[];
  try {
    entries = readdirSync(dataDirectory);
  } catch {
    return null;
  }

  const candidates = findDatedArtifactsNewestFirst(
    entries,
    /^gsc-permission-audit-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const candidate = candidates[0];
  if (!candidate) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      readFileSync(`${dataDirectory}/${candidate}`, "utf8"),
    );
    if (!isGscPermissionAuditArtifact(parsed)) {
      return null;
    }
    if (
      expectedStatsGeneratedAt &&
      !isMatchingCollectorSnapshot(
        parsed.collectorSnapshot,
        expectedStatsGeneratedAt,
      )
    ) {
      return null;
    }

    const date = candidate.slice(
      "gsc-permission-audit-".length,
      -".json".length,
    );
    return {
      artifactPath: `${dataDirectory}/${candidate}`,
      workOrderPath: `docs/work-orders/gsc-permission-audit-${date}.md`,
      generatedAt: parsed.generatedAt,
      collectorSnapshot: parsed.collectorSnapshot,
      handoffStatus: parsed.handoffStatus,
      productionMutationPerformed: parsed.productionMutationPerformed,
      gscMutationPerformed: parsed.gscMutationPerformed,
      serviceAccountEmail: parsed.serviceAccountEmail,
      auditedRows: parsed.summary.auditedRows,
      ownerAccess: parsed.summary.ownerAccess,
      restrictedAccess: parsed.summary.restrictedAccess,
      unverified: parsed.summary.unverified,
      notListed: parsed.summary.notListed,
      results: parsed.results,
    };
  } catch {
    return null;
  }
}

export function loadFleetOptimizationChain(
  dataDirectory = "data",
  expectedStatsGeneratedAt?: string | null,
): FleetOptimizationChainSummary | null {
  let entries: string[];
  try {
    entries = readdirSync(dataDirectory);
  } catch {
    return null;
  }

  const candidates = findDatedArtifactsNewestFirst(
    entries,
    /^fleet-optimization-chain-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const candidate = candidates[0];
  if (!candidate) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      readFileSync(`${dataDirectory}/${candidate}`, "utf8"),
    );
    if (!isFleetOptimizationChainArtifact(parsed)) {
      return null;
    }
    if (
      expectedStatsGeneratedAt &&
      parsed.verification.statsSnapshot !== expectedStatsGeneratedAt
    ) {
      return null;
    }

    return {
      artifactPath: `${dataDirectory}/${candidate}`,
      workOrderPath: `docs/work-orders/fleet-optimization-chain-${parsed.date}.md`,
      generatedAt: parsed.generatedAt,
      date: parsed.date,
      statsSnapshot: parsed.verification.statsSnapshot,
      planSnapshot: parsed.verification.planSnapshot,
      handoffSnapshot: parsed.verification.handoffSnapshot,
      refreshFailedSources: parsed.verification.refreshFailedSources,
      readinessBlockingRefreshFailedSources: readinessBlockingRefreshFailureSources(
        parsed.verification.refreshFailedSources,
      ),
      maintenanceRefreshFailedSources:
        parsed.verification.refreshFailedSources.filter(
          isMaintenanceRefreshFailure,
        ),
      refreshFailureCount: parsed.verification.refreshFailureCount,
      refreshFailuresBlockReadiness:
        parsed.verification.refreshFailuresBlockReadiness,
      commands: parsed.summary.commands,
      pass: parsed.summary.pass,
      fail: parsed.summary.fail,
      skipped: parsed.summary.skipped,
      planMatchesStats: parsed.verification.planMatchesStats,
      handoffMatchesStats: parsed.verification.handoffMatchesStats,
      handoffMutationFlagsFalse:
        parsed.verification.handoffMutationFlagsFalse,
      handoffSiteCount: parsed.verification.handoffSiteCount,
      titleHandoffCount: parsed.verification.titleHandoffCount,
      contentHandoffCount: parsed.verification.contentHandoffCount,
    };
  } catch {
    return null;
  }
}

export function loadDashboardPostRecoveryChain(
  dataDirectory = "data",
  expectedStatsGeneratedAt?: string | null,
): DashboardPostRecoveryChainSummary | null {
  let entries: string[];
  try {
    entries = readdirSync(dataDirectory);
  } catch {
    return null;
  }

  const candidate = findDatedArtifactsNewestFirst(
    entries,
    /^dashboard-post-recovery-chain-\d{4}-\d{2}-\d{2}\.json$/,
  )[0];
  if (!candidate) {
    return null;
  }

  const artifactPath = `${dataDirectory}/${candidate}`;
  try {
    const parsed = JSON.parse(readFileSync(artifactPath, "utf8"));
    if (!isDashboardPostRecoveryChainArtifact(parsed)) {
      return null;
    }
    if (
      expectedStatsGeneratedAt &&
      parsed.dashboardVerification.statsSnapshot !== expectedStatsGeneratedAt
    ) {
      return null;
    }

    const date = candidate.slice(
      "dashboard-post-recovery-chain-".length,
      -".json".length,
    );
    return {
      artifactPath,
      workOrderPath: `docs/work-orders/dashboard-post-recovery-chain-${date}.md`,
      generatedAt: parsed.generatedAt,
      date: parsed.date,
      statsSnapshot: parsed.dashboardVerification.statsSnapshot,
      verificationPath: parsed.dashboardVerification.path,
      verdict: parsed.dashboardVerification.verdict,
      actionabilityStatus: parsed.dashboardVerification.actionabilityStatus,
      postRecoveryAcceptance: parsed.dashboardVerification.postRecoveryAcceptance,
      postRecoveryAcceptanceSatisfied: dashboardPostRecoveryAcceptanceSatisfied(
        parsed.dashboardVerification.postRecoveryAcceptance,
      ),
      readiness: parsed.readiness,
      artifactIntegrityStatus: parsed.artifactIntegrity?.status ?? "not_run",
      commands: parsed.summary.commands,
      pass: parsed.summary.pass,
      fail: parsed.summary.fail,
      skipped: parsed.summary.skipped,
    };
  } catch {
    return null;
  }
}

export function loadFleetOptimizationChainStatus(
  dataDirectory = "data",
  expectedStatsGeneratedAt?: string | null,
  currentChain?: FleetOptimizationChainSummary | null,
): FleetOptimizationChainArtifactStatus {
  const expected = expectedStatsGeneratedAt ?? null;
  if (currentChain) {
    return {
      state: "current",
      reason: "Current fleet chain artifact matches the latest stats snapshot.",
      expectedStatsGeneratedAt: expected,
      artifactPath: currentChain.artifactPath,
      workOrderPath: currentChain.workOrderPath,
      generatedAt: currentChain.generatedAt,
      statsSnapshot: currentChain.statsSnapshot,
      date: currentChain.date,
    };
  }

  let entries: string[];
  try {
    entries = readdirSync(dataDirectory);
  } catch {
    return {
      state: "missing",
      reason: "Fleet chain artifact directory is not readable.",
      expectedStatsGeneratedAt: expected,
    };
  }

  const candidate = findDatedArtifactsNewestFirst(
    entries,
    /^fleet-optimization-chain-\d{4}-\d{2}-\d{2}\.json$/,
  )[0];
  if (!candidate) {
    return {
      state: "missing",
      reason: "No fleet chain artifact exists for the dashboard snapshot.",
      expectedStatsGeneratedAt: expected,
    };
  }
  const artifactPath = `${dataDirectory}/${candidate}`;
  try {
    const parsed = JSON.parse(readFileSync(artifactPath, "utf8"));
    if (!isFleetOptimizationChainArtifact(parsed)) {
      return {
        state: "invalid",
        reason:
          "Newest fleet chain artifact is malformed or missing required verification fields.",
        expectedStatsGeneratedAt: expected,
        artifactPath,
      };
    }

    const date = candidate.slice(
      "fleet-optimization-chain-".length,
      -".json".length,
    );
    const base = {
      expectedStatsGeneratedAt: expected,
      artifactPath,
      workOrderPath: `docs/work-orders/fleet-optimization-chain-${date}.md`,
      generatedAt: parsed.generatedAt,
      statsSnapshot: parsed.verification.statsSnapshot,
      date: parsed.date,
    };
    if (
      expectedStatsGeneratedAt &&
      parsed.verification.statsSnapshot !== expectedStatsGeneratedAt
    ) {
      return {
        ...base,
        state: "snapshot_mismatch",
        reason:
          "Newest fleet chain artifact exists, but it was generated from a different stats snapshot.",
      };
    }

    return {
      ...base,
      state: "invalid",
      reason:
        "Newest fleet chain artifact exists but was not accepted by the strict loader.",
    };
  } catch {
    return {
      state: "invalid",
      reason: "Newest fleet chain artifact cannot be parsed as JSON.",
      expectedStatsGeneratedAt: expected,
      artifactPath,
    };
  }
}

function isMaintenanceRefreshFailure(source: string): boolean {
  return isMaintenanceRefreshFailureSource(source);
}

export function loadT3TitleContentHandoff(
  dataDirectory = "data",
  expectedStatsGeneratedAt?: string | null,
): T3TitleContentHandoffSummary | null {
  let entries: string[];
  try {
    entries = readdirSync(dataDirectory);
  } catch {
    return null;
  }

  const candidates = findDatedArtifactsNewestFirst(
    entries,
    /^t3-title-content-handoff-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const candidate = candidates[0];
  if (!candidate) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      readFileSync(`${dataDirectory}/${candidate}`, "utf8"),
    );
    if (!isT3TitleContentHandoffArtifact(parsed)) {
      return null;
    }
    if (
      expectedStatsGeneratedAt &&
      parsed.dashboardEvidence.snapshotTimestamp !== expectedStatsGeneratedAt
    ) {
      return null;
    }

    return {
      artifactPath: `${dataDirectory}/${candidate}`,
      workOrderPath: `docs/work-orders/t3-title-content-handoff-${candidate.slice("t3-title-content-handoff-".length, -".json".length)}.md`,
      generatedAt: parsed.generatedAt,
      snapshotTimestamp: parsed.dashboardEvidence.snapshotTimestamp,
      refreshFailedSources: parsed.dashboardEvidence.refreshFailedSources,
      siteCount: parsed.summary.siteCount,
      titleHandoffCount: parsed.summary.titleHandoffCount,
      contentHandoffCount: parsed.summary.contentHandoffCount,
      sites: parsed.sites.slice(0, 6).map((site) => ({
        host: site.host,
        url: site.url,
        localPath: site.localPath,
        actions: site.actions,
        planRanks: site.planRanks,
        gscImpressions30d: site.metrics.gscImpressions30d,
        gscClicks30d: site.metrics.gscClicks30d,
        gscCtr30d: site.metrics.gscCtr30d,
        gscPosition30d: site.metrics.gscPosition30d,
        topQuery: site.topQueries[0]?.query ?? "",
        recommendedNextAction: site.recommendedNextAction,
        sitemapWarnings: site.technicalStatus.sitemapWarnings,
        sitemapErrors: site.technicalStatus.sitemapErrors,
        adsenseStatus: site.technicalStatus.adsenseStatus,
        adsTxtStatus: site.technicalStatus.adsTxtStatus,
      })),
      hiddenSiteCount: Math.max(0, parsed.sites.length - 6),
      cmsMutationPerformed: parsed.mutationStatus.cmsMutationPerformed,
      productionDeploymentPerformed:
        parsed.mutationStatus.productionDeploymentPerformed,
      searchConsoleMutationPerformed:
        parsed.mutationStatus.searchConsoleMutationPerformed,
      adsenseMutationPerformed: parsed.mutationStatus.adsenseMutationPerformed,
      titleOrBodyMutationPerformed:
        parsed.mutationStatus.titleOrBodyMutationPerformed,
    };
  } catch {
    return null;
  }
}

function buildAdsenseRemediationQueueIndex(
  queue: AdsenseRemediationQueueSummary | null,
): Map<string, AdsenseRemediationQueueItem> {
  const result = new Map<string, AdsenseRemediationQueueItem>();
  if (!queue) {
    return result;
  }

  for (const lane of Object.values(queue.lanes)) {
    for (const item of lane) {
      result.set(item.siteId, item);
    }
  }
  return result;
}

export function loadAdsenseExternalProof(
  dataDirectory = "data",
  expectedStatsGeneratedAt?: string | null,
): Map<string, AdsenseExternalProof> {
  const result = new Map<string, AdsenseExternalProof>();
  let entries: string[];
  try {
    entries = readdirSync(dataDirectory);
  } catch {
    return result;
  }

  const latest = findLatestDatedArtifact(
    entries,
    /^adsense-external-proof-continuation-\d{4}-\d{2}-\d{2}\.json$/,
  );
  if (!latest) {
    return result;
  }

  try {
    const parsed = JSON.parse(
      readFileSync(`${dataDirectory}/${latest}`, "utf8"),
    ) as {
      candidates?: unknown[];
      collectorSnapshot?: unknown;
    };
    if (
      expectedStatsGeneratedAt &&
      !isMatchingCollectorSnapshot(
        parsed.collectorSnapshot,
        expectedStatsGeneratedAt,
      )
    ) {
      return result;
    }
    for (const candidate of parsed.candidates ?? []) {
      if (isAdsenseExternalProof(candidate)) {
        result.set(candidate.siteId, candidate);
      }
    }
    applyAdsenseLocalSourceSupplement(
      result,
      dataDirectory,
      entries,
      expectedStatsGeneratedAt,
    );
    applyAdsenseEndpointRetrySummary(
      result,
      dataDirectory,
      entries,
      expectedStatsGeneratedAt,
    );
    applyAdsenseLoaderRetrySummary(
      result,
      dataDirectory,
      entries,
      expectedStatsGeneratedAt,
    );
    applyAdsenseNetworkVantageSummary(
      result,
      dataDirectory,
      entries,
      expectedStatsGeneratedAt,
    );
  } catch {
    return result;
  }

  return result;
}

function applyAdsenseNetworkVantageSummary(
  proofById: Map<string, AdsenseExternalProof>,
  dataDirectory: string,
  entries: string[],
  expectedStatsGeneratedAt?: string | null,
) {
  const latest = findLatestDatedArtifact(
    entries,
    /^adsense-network-vantage-\d{4}-\d{2}-\d{2}\.json$/,
  );
  if (!latest) {
    return;
  }

  try {
    const parsed = JSON.parse(
      readFileSync(`${dataDirectory}/${latest}`, "utf8"),
    ) as {
      results?: unknown[];
      summary?: {
        sharedOrigins?: unknown;
      };
      collectorSnapshot?: unknown;
    };
    if (
      expectedStatsGeneratedAt &&
      !isMatchingCollectorSnapshot(
        parsed.collectorSnapshot,
        expectedStatsGeneratedAt,
      )
    ) {
      return;
    }

    for (const vantageResult of parsed.results ?? []) {
      if (!isAdsenseNetworkVantageResult(vantageResult)) {
        continue;
      }
      const proof = proofById.get(vantageResult.siteId);
      if (!proof) {
        continue;
      }
      proofById.set(vantageResult.siteId, {
        ...proof,
        networkVantageSummary: formatNetworkVantageSummary(
          vantageResult,
          findNetworkSharedOrigin(vantageResult, parsed.summary?.sharedOrigins),
        ),
      });
    }
  } catch {
    return;
  }
}

function formatNetworkVantageSummary(
  result: AdsenseNetworkVantageResult,
  sharedOrigin?: AdsenseNetworkVantageSharedOrigin,
): string {
  const addressText =
    result.addresses.length > 0 ? result.addresses.join(",") : "unresolved";
  const sharedOriginText = sharedOrigin
    ? ` sharedOrigin=${sharedOrigin.address}/${sharedOrigin.hostCount}, originTcp80Pass=${sharedOrigin.tcp80Pass}, originTcp443Pass=${sharedOrigin.tcp443Pass}, originFullTcpBlocked=${sharedOrigin.fullTcpBlocked}.`
    : "";
  return `Latest network vantage: dns=${addressText}, tcp80=${result.tcp80}, tcp443=${result.tcp443}.${sharedOriginText}`;
}

function findNetworkSharedOrigin(
  result: AdsenseNetworkVantageResult,
  sharedOrigins: unknown,
): AdsenseNetworkVantageSharedOrigin | undefined {
  if (!Array.isArray(sharedOrigins)) {
    return undefined;
  }

  for (const sharedOrigin of sharedOrigins) {
    if (!isAdsenseNetworkVantageSharedOrigin(sharedOrigin)) {
      continue;
    }
    if (result.addresses.includes(sharedOrigin.address)) {
      return sharedOrigin;
    }
  }
  return undefined;
}

function applyAdsenseEndpointRetrySummary(
  proofById: Map<string, AdsenseExternalProof>,
  dataDirectory: string,
  entries: string[],
  expectedStatsGeneratedAt?: string | null,
) {
  const latest = findLatestDatedArtifact(
    entries,
    /^adsense-proof-endpoint-retry-\d{4}-\d{2}-\d{2}\.json$/,
  );
  if (!latest) {
    return;
  }

  try {
    const parsed = JSON.parse(
      readFileSync(`${dataDirectory}/${latest}`, "utf8"),
    ) as {
      results?: unknown[];
      collectorSnapshot?: unknown;
    };
    if (
      expectedStatsGeneratedAt &&
      !isMatchingCollectorSnapshot(
        parsed.collectorSnapshot,
        expectedStatsGeneratedAt,
      )
    ) {
      return;
    }

    const endpointResultsBySite = new Map<string, AdsenseEndpointRetryResult[]>();
    for (const retryResult of parsed.results ?? []) {
      if (!isAdsenseEndpointRetryResult(retryResult)) {
        continue;
      }
      endpointResultsBySite.set(retryResult.siteId, [
        ...(endpointResultsBySite.get(retryResult.siteId) ?? []),
        retryResult,
      ]);
    }

    for (const [siteId, retryResults] of endpointResultsBySite) {
      const proof = proofById.get(siteId);
      if (!proof) {
        continue;
      }
      proofById.set(siteId, {
        ...proof,
        endpointRetrySummary: formatEndpointRetrySummary(retryResults),
      });
    }
  } catch {
    return;
  }
}

function applyAdsenseLoaderRetrySummary(
  proofById: Map<string, AdsenseExternalProof>,
  dataDirectory: string,
  entries: string[],
  expectedStatsGeneratedAt?: string | null,
) {
  const latest = findLatestDatedArtifact(
    entries,
    /^adsense-loader-proof-retry-\d{4}-\d{2}-\d{2}\.json$/,
  );
  if (!latest) {
    return;
  }

  try {
    const parsed = JSON.parse(
      readFileSync(`${dataDirectory}/${latest}`, "utf8"),
    ) as {
      results?: unknown[];
      collectorSnapshot?: unknown;
    };
    if (
      expectedStatsGeneratedAt &&
      !isMatchingCollectorSnapshot(
        parsed.collectorSnapshot,
        expectedStatsGeneratedAt,
      )
    ) {
      return;
    }

    for (const retryResult of parsed.results ?? []) {
      if (!isAdsenseLoaderRetryResult(retryResult)) {
        continue;
      }
      const proof = proofById.get(retryResult.siteId);
      if (!proof) {
        continue;
      }
      proofById.set(retryResult.siteId, {
        ...proof,
        loaderRetrySummary: `Latest raw loader retry: ${retryResult.result}.`,
      });
    }
  } catch {
    return;
  }
}

function formatEndpointRetrySummary(
  retryResults: AdsenseEndpointRetryResult[],
): string {
  const endpointStatuses = retryResults
    .map((retryResult) => `${retryResult.endpoint}=${retryResult.result}`)
    .sort()
    .join(", ");
  return `Latest endpoint retry: ${endpointStatuses}.`;
}

function applyAdsenseLocalSourceSupplement(
  proofById: Map<string, AdsenseExternalProof>,
  dataDirectory: string,
  entries: string[],
  expectedStatsGeneratedAt?: string | null,
) {
  const latest = findLatestDatedArtifact(
    entries,
    /^adsense-local-source-proof-supplement-\d{4}-\d{2}-\d{2}\.json$/,
  );
  if (!latest) {
    return;
  }

  try {
    const parsed = JSON.parse(
      readFileSync(`${dataDirectory}/${latest}`, "utf8"),
    ) as {
      sites?: unknown[];
      collectorSnapshot?: unknown;
    };
    if (
      expectedStatsGeneratedAt &&
      !isMatchingCollectorSnapshot(
        parsed.collectorSnapshot,
        expectedStatsGeneratedAt,
      )
    ) {
      return;
    }

    for (const site of parsed.sites ?? []) {
      if (isAdsenseLocalSourceSupplementSite(site)) {
        const sourceDecision = getAdsenseLocalSourceProofDecision(
          site.localSourceStatus,
        );
        if (sourceDecision) {
          proofById.set(site.siteId, {
            ...(proofById.get(site.siteId) ?? makeLocalSourceOnlyProof(site)),
            externalHomepageEvidence: site.evidence.join(" "),
            externalLoaderProof: site.localSourceStatus,
            currentDecision: sourceDecision,
            nextGate: site.nextGate,
          });
        }
      }
    }
  } catch {
    return;
  }
}

function findLatestDatedArtifact(entries: string[], pattern: RegExp) {
  return entries.filter((entry) => pattern.test(entry)).sort().at(-1);
}

function findDatedArtifactsNewestFirst(entries: string[], pattern: RegExp) {
  return entries.filter((entry) => pattern.test(entry)).sort().reverse();
}

function isMatchingCollectorSnapshot(
  collectorSnapshot: unknown,
  expectedStatsGeneratedAt: string,
): boolean {
  return (
    typeof collectorSnapshot === "string" &&
    collectorSnapshot === `data/site-stats.json generatedAt=${expectedStatsGeneratedAt}`
  );
}

function isAdsenseRemediationQueueArtifact(value: unknown): value is {
  generatedAt: string;
  collectorSnapshot: string;
  productionMutationPerformed: false;
  adsenseConsoleChecked: false;
  summary: {
    totalRows: number;
    reviewedRows: number;
    adsenseOkRows: number;
    problemRows: number;
    ordinaryAdsenseProof: number;
    approvedRootSubdomainScope: number;
    gscAuthTelemetry: number;
    ga4ConfigTelemetry: number;
  };
  lanes: Record<AdsenseRemediationLaneKey, AdsenseRemediationQueueItem[]>;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const artifact = value as Record<string, unknown>;
  const summary = artifact.summary as Record<string, unknown> | undefined;
  const lanes = artifact.lanes as Record<string, unknown> | undefined;
  return (
    typeof artifact.generatedAt === "string" &&
    typeof artifact.collectorSnapshot === "string" &&
    artifact.productionMutationPerformed === false &&
    typeof artifact.adsenseConsoleChecked === "boolean" &&
    Boolean(summary) &&
    typeof summary?.totalRows === "number" &&
    typeof summary.reviewedRows === "number" &&
    typeof summary.adsenseOkRows === "number" &&
    typeof summary.problemRows === "number" &&
    typeof summary.ordinaryAdsenseProof === "number" &&
    typeof summary.approvedRootSubdomainScope === "number" &&
    typeof summary.gscAuthTelemetry === "number" &&
    typeof summary.ga4ConfigTelemetry === "number" &&
    Boolean(lanes) &&
    ADSENSE_REMEDIATION_LANES.every((lane) =>
      Array.isArray(lanes?.[lane])
        ? (lanes[lane] as unknown[]).every(isAdsenseRemediationQueueItem)
        : false,
    )
  );
}

function isAdsenseProofGateArtifact(value: unknown): value is AdsenseProofGateSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const artifact = value as Record<string, unknown>;
  const readiness = artifact.readiness as Record<string, unknown> | undefined;
  const summary = artifact.summary as Record<string, unknown> | undefined;
  return (
    typeof artifact.generatedAt === "string" &&
    typeof artifact.collectorSnapshot === "string" &&
    artifact.productionMutationPerformed === false &&
    artifact.adsenseConsoleChecked === false &&
    typeof artifact.verdict === "string" &&
    Boolean(readiness) &&
    typeof readiness?.technicalReadiness === "string" &&
    typeof readiness.consoleReadiness === "string" &&
    typeof readiness.scopeReadiness === "string" &&
    typeof readiness.telemetryReadiness === "string" &&
    Array.isArray(artifact.blockers) &&
    artifact.blockers.every(isAdsenseProofGateBlocker) &&
    Boolean(summary) &&
    typeof summary?.ordinaryAdsenseProof === "number" &&
    typeof summary.approvedRootSubdomainScope === "number" &&
    typeof summary.gscAuthTelemetry === "number" &&
    typeof summary.ga4ConfigTelemetry === "number" &&
    typeof summary.endpointRetryResultCount === "number" &&
    typeof summary.freshAdsTxtProofPass === "number" &&
    typeof summary.freshRobotsProofPass === "number" &&
    typeof summary.hostingLoaderResultCount === "number" &&
    typeof summary.freshHostingLoaderProofPass === "number" &&
    typeof artifact.stopCondition === "string"
  );
}

function isAdsenseProofGateBlocker(
  value: unknown,
): value is AdsenseProofGateBlocker {
  if (!value || typeof value !== "object") {
    return false;
  }

  const blocker = value as Record<string, unknown>;
  return (
    typeof blocker.code === "string" &&
    (blocker.severity === "blocking" || blocker.severity === "maintenance") &&
    typeof blocker.count === "number" &&
    Array.isArray(blocker.siteIds) &&
    blocker.siteIds.every((siteId) => typeof siteId === "string") &&
    typeof blocker.requiredAction === "string"
  );
}

function isGscPermissionAuditArtifact(value: unknown): value is {
  generatedAt: string;
  collectorSnapshot: string;
  handoffStatus: GscPermissionAuditSummary["handoffStatus"];
  productionMutationPerformed: false;
  gscMutationPerformed: false;
  serviceAccountEmail: string | null;
  summary: {
    auditedRows: number;
    ownerAccess: number;
    restrictedAccess: number;
    unverified: number;
    notListed: number;
  };
  results: GscPermissionAuditResult[];
} {
  if (!value || typeof value !== "object") {
    return false;
  }
  const artifact = value as Record<string, unknown>;
  const summary = artifact.summary as Record<string, unknown> | undefined;
  return (
    typeof artifact.generatedAt === "string" &&
    typeof artifact.collectorSnapshot === "string" &&
    isGscPermissionAuditHandoffStatus(artifact.handoffStatus) &&
    artifact.productionMutationPerformed === false &&
    artifact.gscMutationPerformed === false &&
    (artifact.serviceAccountEmail === null ||
      typeof artifact.serviceAccountEmail === "string") &&
    Boolean(summary) &&
    typeof summary?.auditedRows === "number" &&
    typeof summary.ownerAccess === "number" &&
    typeof summary.restrictedAccess === "number" &&
    typeof summary.unverified === "number" &&
    typeof summary.notListed === "number" &&
    Array.isArray(artifact.results) &&
    artifact.results.every(isGscPermissionAuditResult) &&
    isGscPermissionAuditHandoffStatusConsistent(
      artifact.handoffStatus,
      artifact.results,
    )
  );
}

function isGscPermissionAuditHandoffStatus(
  value: unknown,
): value is GscPermissionAuditSummary["handoffStatus"] {
  return (
    value === "pending_external" ||
    value === "pending_local_refresh" ||
    value === "resolved"
  );
}

function isGscPermissionAuditHandoffStatusConsistent(
  handoffStatus: GscPermissionAuditSummary["handoffStatus"],
  results: GscPermissionAuditResult[],
): boolean {
  if (handoffStatus === "resolved") {
    return results.length === 0;
  }
  if (handoffStatus === "pending_local_refresh") {
    return (
      results.length > 0 &&
      results.every((result) => result.accessState === "owner_access")
    );
  }
  return (
    results.length > 0 &&
    results.some((result) => result.accessState !== "owner_access")
  );
}

function isGscPermissionAuditResult(
  value: unknown,
): value is GscPermissionAuditResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const result = value as Record<string, unknown>;
  return (
    typeof result.siteId === "string" &&
    typeof result.host === "string" &&
    typeof result.configuredGscSiteUrl === "string" &&
    typeof result.gscStatus === "string" &&
    (result.listedSiteUrl === null ||
      typeof result.listedSiteUrl === "string") &&
    (result.permissionLevel === null ||
      typeof result.permissionLevel === "string") &&
    typeof result.accessState === "string" &&
    typeof result.requiredAction === "string"
  );
}

function isFleetOptimizationChainArtifact(value: unknown): value is {
  generatedAt: string;
  date: string;
  productionMutationPerformed: false;
  cmsMutationPerformed: false;
  searchConsoleMutationPerformed: false;
  adsenseMutationPerformed: false;
  titleOrBodyMutationPerformed: false;
  summary: {
    commands: number;
    pass: number;
    fail: number;
    skipped: number;
  };
  verification: {
    statsSnapshot: string;
    planSnapshot: string;
    handoffSnapshot: string;
    refreshFailedSources: string[];
    refreshFailureCount: number;
    refreshFailuresBlockReadiness: boolean;
    planMatchesStats: boolean;
    handoffMatchesStats: boolean;
    handoffMutationFlagsFalse: boolean;
    handoffSiteCount: number;
    titleHandoffCount: number;
    contentHandoffCount: number;
  };
} {
  if (!value || typeof value !== "object") {
    return false;
  }
  const artifact = value as Record<string, unknown>;
  const summary = artifact.summary as Record<string, unknown> | undefined;
  const verification = artifact.verification as
    | Record<string, unknown>
    | undefined;
  return (
    typeof artifact.generatedAt === "string" &&
    typeof artifact.date === "string" &&
    artifact.productionMutationPerformed === false &&
    artifact.cmsMutationPerformed === false &&
    artifact.searchConsoleMutationPerformed === false &&
    artifact.adsenseMutationPerformed === false &&
    artifact.titleOrBodyMutationPerformed === false &&
    Boolean(summary) &&
    typeof summary?.commands === "number" &&
    typeof summary.pass === "number" &&
    typeof summary.fail === "number" &&
    typeof summary.skipped === "number" &&
    Boolean(verification) &&
    typeof verification?.statsSnapshot === "string" &&
    typeof verification.planSnapshot === "string" &&
    typeof verification.handoffSnapshot === "string" &&
    Array.isArray(verification.refreshFailedSources) &&
    verification.refreshFailedSources.every(
      (source) => typeof source === "string",
    ) &&
    typeof verification.refreshFailureCount === "number" &&
    typeof verification.refreshFailuresBlockReadiness === "boolean" &&
    typeof verification.planMatchesStats === "boolean" &&
    typeof verification.handoffMatchesStats === "boolean" &&
    typeof verification.handoffMutationFlagsFalse === "boolean" &&
    typeof verification.handoffSiteCount === "number" &&
    typeof verification.titleHandoffCount === "number" &&
    typeof verification.contentHandoffCount === "number"
  );
}

function isDashboardPostRecoveryChainArtifact(value: unknown): value is {
  generatedAt: string;
  date: string;
  productionMutationPerformed: false;
  cmsMutationPerformed: false;
  searchConsoleMutationPerformed: false;
  adsenseMutationPerformed: false;
  titleOrBodyMutationPerformed: false;
  dashboardVerification: {
    path: string;
    statsSnapshot: string;
    verdict: string;
    actionabilityStatus: string;
    postRecoveryAcceptance: string[];
  };
  artifactIntegrity: { status: "pass" | "fail" | "skipped" } | null;
  summary: {
    commands: number;
    pass: number;
    fail: number;
    skipped: number;
  };
  readiness: "ready_to_act" | "external_recovery_required" | "failed" | "dry_run";
} {
  if (!value || typeof value !== "object") {
    return false;
  }
  const artifact = value as Record<string, unknown>;
  const verification = artifact.dashboardVerification as
    | Record<string, unknown>
    | undefined;
  const artifactIntegrity = artifact.artifactIntegrity as
    | Record<string, unknown>
    | null
    | undefined;
  const summary = artifact.summary as Record<string, unknown> | undefined;
  return (
    typeof artifact.generatedAt === "string" &&
    typeof artifact.date === "string" &&
    artifact.productionMutationPerformed === false &&
    artifact.cmsMutationPerformed === false &&
    artifact.searchConsoleMutationPerformed === false &&
    artifact.adsenseMutationPerformed === false &&
    artifact.titleOrBodyMutationPerformed === false &&
    Boolean(verification) &&
    typeof verification?.path === "string" &&
    typeof verification.statsSnapshot === "string" &&
    typeof verification.verdict === "string" &&
    typeof verification.actionabilityStatus === "string" &&
    Array.isArray(verification.postRecoveryAcceptance) &&
    verification.postRecoveryAcceptance.every((row) => typeof row === "string") &&
    (artifactIntegrity === null ||
      (Boolean(artifactIntegrity) &&
        (artifactIntegrity?.status === "pass" ||
          artifactIntegrity?.status === "fail" ||
          artifactIntegrity?.status === "skipped"))) &&
    Boolean(summary) &&
    typeof summary?.commands === "number" &&
    typeof summary.pass === "number" &&
    typeof summary.fail === "number" &&
    typeof summary.skipped === "number" &&
    (artifact.readiness === "ready_to_act" ||
      artifact.readiness === "external_recovery_required" ||
      artifact.readiness === "failed" ||
      artifact.readiness === "dry_run") &&
    (artifact.readiness !== "ready_to_act" ||
      dashboardPostRecoveryAcceptanceSatisfied(verification.postRecoveryAcceptance))
  );
}

function dashboardPostRecoveryAcceptanceSatisfied(rows: string[]): boolean {
  return (
    rows.length === REQUIRED_DASHBOARD_POST_RECOVERY_ACCEPTANCE_ROWS.length &&
    new Set(rows).size === rows.length &&
    REQUIRED_DASHBOARD_POST_RECOVERY_ACCEPTANCE_ROWS.every((row) => rows.includes(row))
  );
}

function isT3TitleContentHandoffArtifact(value: unknown): value is {
  generatedAt: string;
  dashboardEvidence: {
    snapshotTimestamp: string;
    refreshFailedSources: string[];
  };
  summary: {
    siteCount: number;
    titleHandoffCount: number;
    contentHandoffCount: number;
  };
  sites: Array<{
    host: string;
    url: string;
    localPath: string;
    actions: string[];
    planRanks: number[];
    metrics: {
      gscImpressions30d: number;
      gscClicks30d: number;
      gscCtr30d: number;
      gscPosition30d: number;
    };
    topQueries: Array<{ query: string }>;
    recommendedNextAction: string;
    technicalStatus: {
      sitemapWarnings: number;
      sitemapErrors: number;
      adsenseStatus: string;
      adsTxtStatus: string;
    };
  }>;
  mutationStatus: {
    cmsMutationPerformed: false;
    productionDeploymentPerformed: false;
    searchConsoleMutationPerformed: false;
    adsenseMutationPerformed: false;
    titleOrBodyMutationPerformed: false;
  };
} {
  if (!value || typeof value !== "object") {
    return false;
  }
  const artifact = value as Record<string, unknown>;
  const dashboardEvidence = artifact.dashboardEvidence as
    | Record<string, unknown>
    | undefined;
  const summary = artifact.summary as Record<string, unknown> | undefined;
  const mutationStatus = artifact.mutationStatus as
    | Record<string, unknown>
    | undefined;
  return (
    typeof artifact.generatedAt === "string" &&
    Boolean(dashboardEvidence) &&
    typeof dashboardEvidence?.snapshotTimestamp === "string" &&
    Array.isArray(dashboardEvidence.refreshFailedSources) &&
    dashboardEvidence.refreshFailedSources.every(
      (source) => typeof source === "string",
    ) &&
    Boolean(summary) &&
    typeof summary?.siteCount === "number" &&
    typeof summary.titleHandoffCount === "number" &&
    typeof summary.contentHandoffCount === "number" &&
    Array.isArray(artifact.sites) &&
    artifact.sites.every(isT3TitleContentHandoffSite) &&
    Boolean(mutationStatus) &&
    mutationStatus?.cmsMutationPerformed === false &&
    mutationStatus.productionDeploymentPerformed === false &&
    mutationStatus.searchConsoleMutationPerformed === false &&
    mutationStatus.adsenseMutationPerformed === false &&
    mutationStatus.titleOrBodyMutationPerformed === false
  );
}

function isT3TitleContentHandoffSite(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const site = value as Record<string, unknown>;
  const metrics = site.metrics as Record<string, unknown> | undefined;
  const technicalStatus = site.technicalStatus as
    | Record<string, unknown>
    | undefined;
  return (
    typeof site.host === "string" &&
    typeof site.url === "string" &&
    typeof site.localPath === "string" &&
    Array.isArray(site.actions) &&
    site.actions.every((action) => typeof action === "string") &&
    Array.isArray(site.planRanks) &&
    site.planRanks.every((rank) => typeof rank === "number") &&
    Boolean(metrics) &&
    typeof metrics?.gscImpressions30d === "number" &&
    typeof metrics.gscClicks30d === "number" &&
    typeof metrics.gscCtr30d === "number" &&
    typeof metrics.gscPosition30d === "number" &&
    Array.isArray(site.topQueries) &&
    site.topQueries.every(
      (query) =>
        Boolean(query) &&
        typeof query === "object" &&
        typeof (query as { query?: unknown }).query === "string",
    ) &&
    typeof site.recommendedNextAction === "string" &&
    Boolean(technicalStatus) &&
    typeof technicalStatus?.sitemapWarnings === "number" &&
    typeof technicalStatus.sitemapErrors === "number" &&
    typeof technicalStatus.adsenseStatus === "string" &&
    typeof technicalStatus.adsTxtStatus === "string"
  );
}

function isAdsenseRemediationQueueItem(
  value: unknown,
): value is AdsenseRemediationQueueItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.siteId === "string" &&
    typeof item.host === "string" &&
    typeof item.name === "string" &&
    typeof item.lane === "string" &&
    isAdsenseRemediationLane(item.lane) &&
    typeof item.priority === "number" &&
    Array.isArray(item.requiredEvidence) &&
    item.requiredEvidence.every((entry) => typeof entry === "string") &&
    typeof item.stopCondition === "string" &&
    Array.isArray(item.notes) &&
    item.notes.every((entry) => typeof entry === "string")
  );
}

function isAdsenseRemediationLane(
  value: string,
): value is AdsenseRemediationLaneKey {
  return ADSENSE_REMEDIATION_LANES.includes(
    value as AdsenseRemediationLaneKey,
  );
}

function isAdsenseLocalSourceSupplementSite(
  value: unknown,
): value is AdsenseLocalSourceSupplementSite {
  if (!value || typeof value !== "object") {
    return false;
  }

  const site = value as Record<string, unknown>;
  return (
    typeof site.siteId === "string" &&
    typeof site.host === "string" &&
    typeof site.localSourceStatus === "string" &&
    Array.isArray(site.evidence) &&
    site.evidence.every((entry) => typeof entry === "string") &&
    typeof site.nextGate === "string"
  );
}

function isAdsenseEndpointRetryResult(
  value: unknown,
): value is AdsenseEndpointRetryResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Record<string, unknown>;
  return (
    typeof result.siteId === "string" &&
    typeof result.endpoint === "string" &&
    typeof result.result === "string"
  );
}

function isAdsenseLoaderRetryResult(
  value: unknown,
): value is AdsenseLoaderRetryResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Record<string, unknown>;
  return typeof result.siteId === "string" && typeof result.result === "string";
}

function isAdsenseNetworkVantageResult(
  value: unknown,
): value is AdsenseNetworkVantageResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Record<string, unknown>;
  return (
    typeof result.siteId === "string" &&
    (result.host === undefined || typeof result.host === "string") &&
    Array.isArray(result.addresses) &&
    result.addresses.every((address) => typeof address === "string") &&
    typeof result.tcp80 === "string" &&
    typeof result.tcp443 === "string"
  );
}

function isAdsenseNetworkVantageSharedOrigin(
  value: unknown,
): value is AdsenseNetworkVantageSharedOrigin {
  if (!value || typeof value !== "object") {
    return false;
  }

  const origin = value as Record<string, unknown>;
  return (
    typeof origin.address === "string" &&
    typeof origin.hostCount === "number" &&
    typeof origin.tcp80Pass === "number" &&
    typeof origin.tcp443Pass === "number" &&
    typeof origin.fullTcpBlocked === "number"
  );
}

function makeLocalSourceOnlyProof(
  site: AdsenseLocalSourceSupplementSite,
): AdsenseExternalProof {
  return {
    siteId: site.siteId,
    url: `https://${site.host}/`,
    host: site.host,
    externalHomepageProof: "not_proven_in_this_pass",
    externalHomepageEvidence: site.evidence.join(" "),
    externalAdsTxtProof: "not_proven_in_this_pass",
    externalLoaderProof: site.localSourceStatus,
    currentDecision: "hold_for_fresh_external_proof",
    nextGate: site.nextGate,
  };
}

function isAdsenseExternalProof(value: unknown): value is AdsenseExternalProof {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.siteId === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.host === "string" &&
    typeof candidate.externalHomepageProof === "string" &&
    typeof candidate.externalHomepageEvidence === "string" &&
    typeof candidate.externalAdsTxtProof === "string" &&
    typeof candidate.externalLoaderProof === "string" &&
    typeof candidate.currentDecision === "string" &&
    ADSENSE_EXTERNAL_PROOF_DECISIONS.has(candidate.currentDecision) &&
    typeof candidate.nextGate === "string"
  );
}

function fallbackDateRanges(): DateRangeSummary {
  return {
    timezone: "Asia/Seoul",
    basis: "completed_days",
    last1Days: { startDate: seoulDateDaysAgo(1), endDate: seoulDateDaysAgo(1) },
    last7Days: { startDate: seoulDateDaysAgo(7), endDate: seoulDateDaysAgo(1) },
    previous7Days: {
      startDate: seoulDateDaysAgo(14),
      endDate: seoulDateDaysAgo(8),
    },
    last30Days: {
      startDate: seoulDateDaysAgo(30),
      endDate: seoulDateDaysAgo(1),
    },
  };
}

function seoulDateDaysAgo(days: number): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  const date = new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      12,
    ),
  );
  date.setUTCDate(date.getUTCDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function emptySiteStat(site: Site): SiteStat {
  const monetizationEnabled = site.monetization !== false;
  return {
    id: site.id,
    name: site.name ?? site.id,
    url: site.url,
    ga4PropertyId: site.ga4PropertyId ?? "",
    gscSiteUrl: site.gscSiteUrl ?? site.url,
    last1Days: emptyMetrics(),
    last7Days: emptyMetrics(),
    previous7Days: emptyMetrics(),
    last30Days: emptyMetrics(),
    gscLast7Days: emptyGscMetrics(),
    gscPrevious7Days: emptyGscMetrics(),
    gscLast30Days: emptyGscMetrics(),
    ga4Status: site.ga4PropertyId ? "api_error" : "missing_config",
    gscStatus: "api_error",
    ...(monetizationEnabled
      ? {
          adsenseStatus: "missing_config" as const,
          adsTxtStatus: "missing_config" as const,
          adsenseInstallStatus: "unknown" as const,
          adsenseCollectorStatus: "not_checked" as const,
          adsTxtValidationStatus: "unknown" as const,
          adsTxtCollectorStatus: "not_checked" as const,
        }
      : { monetization: false as const }),
    ga4ErrorKind: site.ga4PropertyId ? "api_error" : "missing_config",
    error: site.ga4PropertyId ? "통계 스냅샷 없음" : "GA4 속성 없음",
  };
}

export function getOperationalStatus(stat: SiteStat): OperationalStatus {
  if (
    isOlderThanHours(stat.ga4LastSuccessfulFetchAt, 48) ||
    isOlderThanHours(stat.gscLastSuccessfulFetchAt, 48)
  ) {
    return "stale";
  }

  if (stat.ga4Status && stat.ga4Status !== "ok") {
    return stat.ga4Status === "auth_error" ||
      stat.ga4Status === "missing_config"
      ? "needsPermission"
      : "apiError";
  }

  if (stat.gscStatus && stat.gscStatus !== "ok") {
    return stat.gscStatus === "auth_error" ||
      stat.gscStatus === "missing_config"
      ? "needsPermission"
      : "apiError";
  }

  if (hasSitemapProcessing(stat)) {
    return "processing";
  }

  // sitemap 수집 지연(lastDownloaded)은 Google 크롤링 타이밍에 의존하므로
  // 운영자가 손쓸 수 없다. 운영 상태(stale)로 표시하면 정상 사이트가
  // 대량 오탐으로 잡힌다. 점수 감점(getHealthScore)으로만 약하게 반영한다.
  // GA4/GSC 수집(fetch) 48h+ 지연은 위에서 여전히 stale로 잡힌다.

  return "normal";
}

function getStatusLabel(status: OperationalStatus): string {
  if (status === "needsPermission") return "권한 필요";
  if (status === "apiError") return "API 실패";
  if (status === "processing") return "재처리중";
  if (status === "stale") return "오래된 데이터";
  return "정상";
}

function getStatusReason(stat: SiteStat, status: OperationalStatus): string {
  if (status === "processing") {
    return "GSC sitemap을 다시 제출했고 Google 재다운로드를 기다리는 중입니다.";
  }

  if (status === "stale") {
    const staleSources = getCollectionSources(stat)
      .filter((source) => source.state === "stale")
      .map((source) => source.label);
    return staleSources.length > 0
      ? `${staleSources.join(", ")} 수집이 지연됐습니다.`
      : "최근 성공 수집이 48시간을 넘었습니다.";
  }

  if (status === "needsPermission") {
    if (stat.gscError)
      return "GSC 권한 또는 Search Console 속성 확인이 필요합니다.";
    return "GA4 속성 또는 서비스 계정 권한 확인이 필요합니다.";
  }

  if (status === "apiError") {
    const errorSources = getCollectionSources(stat)
      .filter((source) => source.state === "error")
      .map((source) => source.label);
    return errorSources.length > 0
      ? `${errorSources.join(", ")} 상태 확인이 실패했습니다.`
      : "API 호출이 실패했습니다.";
  }

  return "GA4/GSC 수집 정상";
}

function isOlderThanHours(value: string | undefined, hours: number): boolean {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > hours * 60 * 60 * 1000;
}

function isRecentIso(value: string | undefined, maxAgeHours: number): boolean {
  if (!value) {
    return false;
  }

  return !isOlderThanHours(value, maxAgeHours);
}

function isOlderThanDays(value: string | undefined, days: number): boolean {
  if (!value) {
    return true;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > days * 24 * 60 * 60 * 1000;
}

function emptyMetrics(): MetricSet {
  return {
    activeUsers: 0,
    sessions: 0,
    screenPageViews: 0,
    eventCount: 0,
  };
}

function emptyGscMetrics(): GscMetricSet {
  return {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
  };
}

function sumMetrics(metrics: MetricSet[]): MetricSet {
  return metrics.reduce(
    (total, metric) => ({
      activeUsers: total.activeUsers + metric.activeUsers,
      sessions: total.sessions + metric.sessions,
      screenPageViews: total.screenPageViews + metric.screenPageViews,
      eventCount: total.eventCount + metric.eventCount,
    }),
    emptyMetrics(),
  );
}

export function sumGscMetrics(metrics: GscMetricSet[]): GscMetricSet {
  const totals = metrics.reduce(
    (total, metric) => ({
      clicks: total.clicks + metric.clicks,
      impressions: total.impressions + metric.impressions,
      weightedCtr: total.weightedCtr + metric.ctr * metric.impressions,
      weightedPosition:
        total.weightedPosition + metric.position * metric.impressions,
    }),
    { clicks: 0, impressions: 0, weightedCtr: 0, weightedPosition: 0 },
  );

  return {
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr: totals.impressions === 0 ? 0 : totals.weightedCtr / totals.impressions,
    position:
      totals.impressions === 0
        ? 0
        : totals.weightedPosition / totals.impressions,
  };
}

export function changeRate(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return (current - previous) / previous;
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function severityRank(severity: InsightSeverity): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatPercent(value)}`;
}

function formatDecimal(value: number): string {
  return value.toFixed(1);
}
