import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { getDashboardActionability } from "../../app/lib/dashboard-actionability.js";
import { getReadOnlyActionPresentation } from "../../app/lib/dashboard-action-readonly.js";
import {
  createDashboardLocalEvidenceToken,
  DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH,
  hasValidDashboardLocalEvidenceToken,
  removeDashboardLocalEvidenceToken,
} from "../../app/lib/dashboard-local-evidence-token.js";
import {
  getDashboardData,
  type DashboardData,
} from "../../app/lib/dashboard-data.js";
import { looksGarbledText } from "../../app/lib/text-readability.js";

const DEFAULT_DASHBOARD_URL = "http://127.0.0.1:3000/";
const DATA_DIR = "data";
const DOCS_DIR = join("docs", "work-orders");
export const LOCAL_EVIDENCE_TOKEN_PATH = DASHBOARD_LOCAL_EVIDENCE_TOKEN_PATH;
const ACTIONABILITY_HOLD_TEXT = "실행 보류";
const ACTIONABILITY_READ_ONLY_TEXT = "원인 확인과 우선순위 정리";
const BLOCKED_ACTION_ROW_NOTE = "post-recovery";
const BLOCKED_INSIGHT_PROMPT_FORBIDDEN_PATTERNS = [
  "Codex:",
  "Claude",
  "sitemap",
  "robots.txt",
  "canonical",
  "title",
  "meta",
  "publish",
  "deploy",
  "Search Console",
  "AdSense",
] as const;
const BLOCKED_FLEET_FORBIDDEN_PATTERNS = [
  "pnpm",
  "fleet:optimize",
  "dashboard:verify",
  "title",
  "meta",
  "publish",
  "deploy",
  "CMS",
  "Search Console",
  "AdSense",
  "GA4 property",
] as const;
const BLOCKED_FLEET_COMMAND_ROW_FORBIDDEN_PATTERNS = [
  "pnpm",
  "fleet:optimize",
  "dashboard:verify",
  "publish",
  "deploy",
  "CMS",
] as const;
const BLOCKED_SUPPORT_COMMAND_FORBIDDEN_PATTERNS = [
  "pnpm stats:update",
  "pnpm sitemaps:refresh-stale",
  "pnpm setup:import-ga4-sites",
  "pnpm ops:monetization",
  "재제출",
  "재등록",
] as const;
const BLOCKED_SITE_TABLE_TITLE_FORBIDDEN_PATTERNS = [
  "pnpm stats:update",
  "pnpm index-presence:update",
] as const;
const BLOCKED_ALLOWED_USE =
  "Read-only triage only. Do not execute dashboard recommendations until post-recovery verification passes.";

interface RenderedDashboardUiExpectations {
  generatedAt: string;
  siteCount: number;
  blockingSources: string[];
  maintenanceSources: string[];
  blockerHosts: string[];
  actionabilityStatus: "safe_to_act" | "blocked_for_action_until_post_recovery_verify";
  actionabilityCommand: string;
  actionabilityAllowedUse: string;
  actionabilityReason: string;
  blockedActionReason: string | null;
  hasSuppressedBlockedAction: boolean;
  fleetChainArtifactPath: string;
  gscPermissionAuditArtifactPath: string | null;
  gscPermissionAuditWorkOrderPath: string | null;
  gscPermissionAuditHandoffStatus: string | null;
  collectorAvailability: Array<{ key: string; status: string; detail: string }>;
}

interface RenderedDashboardUiSmokeResult extends RenderedDashboardUiExpectations {
  url: string;
  checks: string[];
}

interface RenderedDashboardUiSmokeArtifact extends RenderedDashboardUiSmokeResult {
  artifactGeneratedAt: string;
  date: string;
  productionMutationPerformed: false;
  cmsMutationPerformed: false;
  searchConsoleMutationPerformed: false;
  adsenseMutationPerformed: false;
  titleOrBodyMutationPerformed: false;
  stopCondition: string;
}

function main(): void {
  const requestedUrl = getArgValue("--url") ?? process.env.DASHBOARD_URL ?? DEFAULT_DASHBOARD_URL;
  const tokenizedUrl = prepareDashboardSmokeUrl(requestedUrl);
  verifyDashboardRenderedUiSmoke(tokenizedUrl.url, getDashboardData())
    .then((result) => {
      const artifact = buildRenderedDashboardUiSmokeArtifact(result);
      const paths = writeRenderedDashboardUiSmokeArtifact(artifact);
      console.log(
        [
          "Dashboard rendered UI smoke passed.",
          `url=${artifact.url}`,
          `snapshot=${result.generatedAt}`,
          `sites=${result.siteCount}`,
          `blocking=${result.blockingSources.length}`,
          `maintenance=${result.maintenanceSources.length}`,
          `blockers=${result.blockerHosts.length > 0 ? result.blockerHosts.join(",") : "none"}`,
          `checks=${result.checks.length}`,
          `artifact=${paths.jsonPath}`,
        ].join(" "),
      );
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    })
    .finally(() => {
      tokenizedUrl.cleanup();
    });
}

export async function verifyDashboardRenderedUiSmoke(
  url: string,
  data: DashboardData,
): Promise<RenderedDashboardUiSmokeResult> {
  const expectations = buildRenderedDashboardUiExpectations(data, {
    requirePostRecoveryChain: !isLocalEvidenceActionabilityUrl(url),
  });
  const checks: string[] = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    const response = await page.goto(url, { waitUntil: "networkidle" });
    assert(response?.ok(), `Dashboard URL did not return HTTP 2xx: ${response?.status() ?? "none"}`);
    checks.push("http-2xx");

    const fleetPanel = page.locator("article.fleet-workflow-panel");
    await assertVisible(fleetPanel.locator("h2"), "Fleet panel heading is not visible.");
    checks.push("fleet-panel");

    await assertVisible(
      page.locator("#tab-sites strong", { hasText: formatNumber(expectations.siteCount) }),
      `Rendered site count does not match current snapshot site count ${expectations.siteCount}.`,
    );
    checks.push("site-count");

    const splitText = `${formatNumber(expectations.blockingSources.length)} blocking · ${formatNumber(expectations.maintenanceSources.length)} maintenance`;
    await assertVisible(
      fleetPanel.locator("code", { hasText: splitText }),
      `Fleet blocker/maintenance split is not rendered as "${splitText}".`,
    );
    checks.push("blocker-maintenance-split");

    await assertVisible(
      fleetPanel.locator(".command-row", {
        hasText: expectations.gscPermissionAuditHandoffStatus ?? "missing",
      }),
      `Fleet GSC handoff command row is not visible: ${expectations.gscPermissionAuditHandoffStatus ?? "missing"}.`,
    );
    checks.push("gsc-handoff-status-visible");

    if (expectations.blockingSources.length > 0) {
      await assertVisible(fleetPanel.locator(".fleet-blocker"), "Fleet hard blocker block is not visible.");
      for (const source of expectations.blockingSources) {
        await assertVisible(
          fleetPanel.locator("code", { hasText: source }),
          `Fleet hard blocker source is not visible: ${source}`,
        );
      }
      for (const host of expectations.blockerHosts) {
        await assertVisible(
          fleetPanel.locator(".issue-row", { hasText: host }),
          `Fleet GSC blocker host is not visible: ${host}`,
        );
      }
      await assertVisible(
        fleetPanel.locator("code", {
          hasText: `gsc handoff ${expectations.gscPermissionAuditHandoffStatus ?? "missing"}`,
        }),
        "Fleet GSC handoff status is not visible in the hard-blocker evidence block.",
      );
      checks.push("hard-blocker-visible");
    }

    if (expectations.actionabilityStatus === "blocked_for_action_until_post_recovery_verify") {
      const actionPanel = page.locator("article.action-panel");
      await assertVisible(
        actionPanel.locator(".actionability-notice", { hasText: ACTIONABILITY_HOLD_TEXT }),
        "Dashboard action actionability hold notice is not visible.",
      );
      await assertVisible(
        actionPanel.locator(".actionability-notice", { hasText: ACTIONABILITY_READ_ONLY_TEXT }),
        "Dashboard actionability read-only copy is not visible.",
      );
      await assertVisible(
        actionPanel.locator(".actionability-notice", { hasText: expectations.actionabilityCommand }),
        "Dashboard actionability post-recovery command is not visible.",
      );
      await assertVisible(
        actionPanel.locator(".actionability-notice", { hasText: expectations.actionabilityStatus }),
        "Dashboard actionability status is not visible.",
      );
      await assertVisible(
        actionPanel.locator(".actionability-notice", { hasText: expectations.actionabilityCommand }),
        "Dashboard actionability post-recovery command is not visible.",
      );
      await assertVisible(
        page.locator('.action-list[data-actionability="read-only-blocked"]'),
        "Action list read-only actionability attribute is not rendered.",
      );
      await assertVisible(
        actionPanel.locator("h2", { hasText: "읽기 전용 점검 후보" }),
        "Blocked action panel does not use read-only heading copy.",
      );
      await assertCount(
        actionPanel.locator(".panel-heading", { hasText: "실제 조치" }),
        0,
        "Blocked action panel still describes rows as actual actions.",
      );
      await assertVisible(
        actionPanel.locator(".action-row .action-readonly-note", { hasText: BLOCKED_ACTION_ROW_NOTE }).first(),
        "Blocked action rows do not show the read-only boundary.",
      );
      if (expectations.blockedActionReason) {
        await assertVisible(
          actionPanel.locator(".action-row p", { hasText: expectations.blockedActionReason }).first(),
          "Blocked action rows do not preserve current action evidence.",
        );
      }
      if (expectations.hasSuppressedBlockedAction) {
        await assertVisible(
          actionPanel.locator('[data-readonly-mutation-suppressed="true"]'),
          "Blocked action rows do not suppress mutation instructions.",
        );
      }
      await assertVisible(
        fleetPanel.locator(".fleet-handoff-list .issue-row", { hasText: "읽기 전용 검토 후보" }),
        "Blocked fleet handoff rows do not use read-only copy.",
      );
      await assertVisible(
        fleetPanel.locator(".fleet-handoff-list .issue-row span", { hasText: "read-only" }),
        "Blocked fleet handoff rows do not expose read-only tags.",
      );
      await assertNoBlockedTextLeaks(
        fleetPanel.locator(".fleet-blocker code, .fleet-blocker em, .fleet-blocker .issue-row p"),
        BLOCKED_FLEET_FORBIDDEN_PATTERNS,
        "Blocked fleet panel still exposes executable text",
      );
      await assertNoBlockedTextLeaks(
        fleetPanel.locator(".command-row code"),
        BLOCKED_FLEET_COMMAND_ROW_FORBIDDEN_PATTERNS,
        "Blocked fleet command summary still exposes executable text",
      );
      await page.locator("#tab-insights").click();
      const insightPanel = page.locator("#panel-insights");
      await assertVisible(
        insightPanel.locator(".actionability-notice", { hasText: ACTIONABILITY_HOLD_TEXT }),
        "Insights actionability hold notice is not visible.",
      );
      await assertVisible(
        insightPanel.locator(".actionability-notice", { hasText: ACTIONABILITY_READ_ONLY_TEXT }),
        "Insights actionability read-only copy is not visible.",
      );
      await assertVisible(
        insightPanel.locator(".actionability-notice", { hasText: expectations.actionabilityCommand }),
        "Insights actionability post-recovery command is not visible.",
      );
      await assertVisible(
        insightPanel.locator('.insight-grid[data-actionability="read-only-blocked"]'),
        "Insight grid read-only actionability attribute is not rendered.",
      );
      await assertVisible(
        insightPanel.locator(".insight-action", { hasText: "읽기 전용 권고 검토" }),
        "Blocked insight cards do not use read-only action copy.",
      );
      await assertVisible(
        insightPanel.locator(".insight-detail", { hasText: "읽기 전용 검토 메모" }),
        "Blocked insight cards do not relabel operator prompts as read-only review notes.",
      );
      await assertCount(
        insightPanel.locator(".insight-detail", { hasText: "Codex/Claude 작업 지시" }),
        0,
        "Blocked insight cards still expose executable work-instruction labels.",
      );
      await assertNoBlockedInsightPromptLeaks(insightPanel);
      await page.locator("#tab-sites").click();
      const sitesPanel = page.locator("#panel-sites");
      await assertNoBlockedTitleLeaks(
        sitesPanel.locator("[title]"),
        BLOCKED_SITE_TABLE_TITLE_FORBIDDEN_PATTERNS,
        "Blocked sites panel still exposes executable tooltip text",
      );
      await page.locator("#tab-banners").click();
      const bannersPanel = page.locator("#panel-banners");
      await assertVisible(
        bannersPanel.locator(".command-row", {
          hasText: "read-only until post-recovery passes",
        }),
        "Blocked banner panel does not show read-only hold copy.",
      );
      await assertNoBlockedTextLeaks(
        bannersPanel.locator(".command-row"),
        BLOCKED_SUPPORT_COMMAND_FORBIDDEN_PATTERNS,
        "Blocked banner panel still exposes external commands",
      );
      const affiliatePage = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
      try {
        const affiliateResponse = await affiliatePage.goto(affiliateUrl(url), {
          waitUntil: "networkidle",
        });
        assert(
          affiliateResponse?.ok(),
          `Affiliate URL did not return HTTP 2xx: ${affiliateResponse?.status() ?? "none"}`,
        );
        await assertVisible(
          affiliatePage.locator(".command-row", {
            hasText: "read-only until post-recovery passes",
          }),
          "Blocked affiliate page does not show read-only hold copy.",
        );
        await assertNoBlockedTextLeaks(
          affiliatePage.locator(".command-row"),
          BLOCKED_SUPPORT_COMMAND_FORBIDDEN_PATTERNS,
          "Blocked affiliate page still exposes external commands",
        );
        checks.push("affiliate-command-suppressed");
      } finally {
        await affiliatePage.close();
      }
      await page.locator("#tab-settings").click();
      const settingsPanel = page.locator("#panel-settings");
      const refreshCommandPanel = settingsPanel.locator("article.panel", {
        hasText: "갱신 명령",
      });
      await assertVisible(
        refreshCommandPanel.locator(".command-row", {
          hasText: "read-only until post-recovery passes",
        }),
        "Blocked refresh command panel does not show read-only hold copy.",
      );
      await assertVisible(
        refreshCommandPanel.locator(".command-row", {
          hasText: expectations.actionabilityCommand,
        }),
        "Blocked refresh command panel does not show the post-recovery command.",
      );
      await assertNoBlockedTextLeaks(
        refreshCommandPanel.locator(".command-row"),
        BLOCKED_SUPPORT_COMMAND_FORBIDDEN_PATTERNS,
        "Blocked refresh command panel still exposes external commands",
      );
      checks.push("actionability-read-only-visible");
    }

    const maintenanceBlock = fleetPanel.locator(".fleet-maintenance");
    if (expectations.maintenanceSources.length === 0) {
      await assertCount(maintenanceBlock, 0, "Telemetry maintenance block should not render for the current no-maintenance snapshot.");
    } else {
      await assertVisible(maintenanceBlock, "Telemetry maintenance block is not visible.");
      for (const source of expectations.maintenanceSources) {
        await assertVisible(
          maintenanceBlock.locator("code", { hasText: source }),
          `Telemetry maintenance source is not visible: ${source}`,
        );
      }
    }
    checks.push("maintenance-visibility");

    await page.locator("#tab-mail").click();
    const mailPanel = page.locator("#panel-mail");
    for (const collector of expectations.collectorAvailability) {
      const collectorStatus = mailPanel.locator(
        `[data-collector-key="${collector.key}"][data-collector-status="${collector.status}"]`,
      );
      await assertVisible(
        collectorStatus,
        `Direct collector availability is not visible for ${collector.key}: ${collector.status}.`,
      );
      await assertVisible(
        collectorStatus.locator("span", { hasText: collector.detail }),
        `Direct collector detail is not visible for ${collector.key}.`,
      );
    }
    checks.push("collector-availability-visible");

    const bodyText = await page.locator("body").innerText();
    assert(!bodyText.includes("\uFFFD"), "Rendered dashboard contains replacement characters.");
    assert(!looksGarbledText(bodyText), "Rendered dashboard contains mojibake text.");
    checks.push("readable-rendered-text");

    if (isLocalEvidenceActionabilityUrl(url)) {
      await assertUnauthorizedLocalEvidenceUrlBlocked(page, url);
      checks.push("unauthorized-local-evidence-blocked");
    }

    return {
      url,
      ...expectations,
      checks,
    };
  } finally {
    await browser.close();
  }
}

async function assertUnauthorizedLocalEvidenceUrlBlocked(
  page: {
    goto(url: string, options: { waitUntil: "networkidle" }): Promise<{ ok(): boolean; status(): number } | null>;
    locator(selector: string, options?: { hasText?: string }): { count(): Promise<number> };
  },
  authorizedUrl: string,
): Promise<void> {
  const unauthorizedUrl = unauthorizedLocalEvidenceUrl(authorizedUrl);
  const response = await page.goto(unauthorizedUrl, { waitUntil: "networkidle" });
  assert(response?.ok(), `Unauthorized local-evidence URL did not return HTTP 2xx: ${response?.status() ?? "none"}`);
  await assertVisible(
    page.locator("article.action-panel .actionability-notice", { hasText: ACTIONABILITY_HOLD_TEXT }),
    "Unauthorized local-evidence URL did not render blocked actionability notice.",
  );
  await assertVisible(
    page.locator('.action-list[data-actionability="read-only-blocked"]'),
    "Unauthorized local-evidence URL did not keep action rows read-only blocked.",
  );
}

export function buildRenderedDashboardUiExpectations(
  data: DashboardData,
  actionabilityOptions: { requirePostRecoveryChain?: boolean } = {},
): RenderedDashboardUiExpectations {
  assert(data.generatedAt, "Dashboard snapshot generatedAt is missing.");
  assert(data.siteCount > 0, "Dashboard has no sites.");
  assert(data.stats.length === data.siteCount, "Dashboard stats count does not match siteCount.");
  assert(
    data.fleetOptimizationChainStatus.state === "current",
    `Fleet chain status is ${data.fleetOptimizationChainStatus.state}, expected current.`,
  );
  const chain = data.fleetOptimizationChain;
  assert(chain, "Current snapshot has no strict-matching fleet optimization chain.");

  const blockingSources = chain.readinessBlockingRefreshFailedSources;
  const maintenanceSources = chain.maintenanceRefreshFailedSources;
  assert(
    blockingSources.length + maintenanceSources.length === chain.refreshFailureCount,
    "Fleet refresh split does not add up to refreshFailureCount.",
  );

  const blockerHosts = getGscBlockerHosts(data);
  const hasGscReadinessBlocker = blockingSources.some((source) => source.includes(":gsc:"));
  if (chain.refreshFailuresBlockReadiness) {
    assert(blockingSources.length > 0, "Readiness is blocked but no blocking source exists.");
  }
  if (hasGscReadinessBlocker) {
    assert(blockerHosts.length > 0, "Readiness is blocked but no GSC blocker host exists.");
  }
  const actionability = getDashboardActionability(data, actionabilityOptions);
  if (
    actionability.status === "blocked_for_action_until_post_recovery_verify" &&
    hasGscReadinessBlocker
  ) {
    assert(
      actionability.blockerHosts.length > 0 &&
        actionability.blockerHosts.every((host) => blockerHosts.includes(host)),
      "Dashboard actionability blocker hosts do not match concrete GSC blockers.",
    );
  }

  return {
    generatedAt: data.generatedAt,
    siteCount: data.siteCount,
    blockingSources,
    maintenanceSources,
    blockerHosts,
    actionabilityStatus: actionability.status,
    actionabilityCommand: actionability.command,
    actionabilityAllowedUse:
      actionability.status === "safe_to_act"
        ? "Dashboard recommendations may be used as executable local work after standard verification."
        : BLOCKED_ALLOWED_USE,
    actionabilityReason:
      actionability.status === "safe_to_act"
        ? "All dashboard readiness evidence is current and unblocked."
        : `Blocked until ${actionability.command} passes for ${actionability.blockerHosts.join(", ") || "external readiness evidence"}.`,
    blockedActionReason: data.actions?.[0]?.reason ?? null,
    hasSuppressedBlockedAction: (data.actions ?? []).some(
      (action) => getReadOnlyActionPresentation(action).mutatingInstructionSuppressed,
    ),
    fleetChainArtifactPath: chain.artifactPath,
    gscPermissionAuditArtifactPath: data.gscPermissionAudit?.artifactPath ?? null,
    gscPermissionAuditWorkOrderPath: data.gscPermissionAudit?.workOrderPath ?? null,
    gscPermissionAuditHandoffStatus: data.gscPermissionAudit?.handoffStatus ?? null,
    collectorAvailability: (data.opsMailReport?.collection ?? []).map((collector) => ({
      key: collector.key,
      status: collector.status,
      detail: collector.detail,
    })),
  };
}

export function isLocalEvidenceActionabilityUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("actionabilityMode") === "local-evidence" &&
      hasValidDashboardLocalEvidenceToken(parsed.searchParams.get("actionabilityToken") ?? undefined)
    );
  } catch {
    return false;
  }
}

export function prepareDashboardSmokeUrl(url: string): { url: string; cleanup: () => void } {
  if (!requestsLocalEvidenceMode(url)) {
    return { url, cleanup: () => undefined };
  }
  const { token } = createDashboardLocalEvidenceToken();
  const parsed = new URL(url);
  parsed.searchParams.set("actionabilityToken", token);
  return {
    url: parsed.toString(),
    cleanup: removeDashboardLocalEvidenceToken,
  };
}

export function requestsLocalEvidenceMode(url: string): boolean {
  try {
    return new URL(url).searchParams.get("actionabilityMode") === "local-evidence";
  } catch {
    return false;
  }
}

export function buildRenderedDashboardUiSmokeArtifact(
  result: RenderedDashboardUiSmokeResult,
  artifactGeneratedAt = new Date().toISOString(),
): RenderedDashboardUiSmokeArtifact {
  return {
    ...result,
    url: redactActionabilityToken(result.url),
    artifactGeneratedAt,
    date: seoulDate(new Date(artifactGeneratedAt)),
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    stopCondition:
      "This rendered UI smoke is local and non-mutating. It opens the dashboard in a browser and records evidence only; it does not authorize CMS edits, Search Console mutation, AdSense mutation, publishing, DNS changes, or deployment.",
  };
}

export function hasValidLocalEvidenceToken(token: string | undefined): boolean {
  return hasValidDashboardLocalEvidenceToken(token);
}

export function redactActionabilityToken(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("actionabilityToken")) {
      parsed.searchParams.set("actionabilityToken", "redacted");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function unauthorizedLocalEvidenceUrl(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("actionabilityMode", "local-evidence");
  parsed.searchParams.set("actionabilityToken", "bogus");
  return parsed.toString();
}

export function affiliateUrl(url: string): string {
  return new URL("/affiliate", url).toString();
}

function writeRenderedDashboardUiSmokeArtifact(
  artifact: RenderedDashboardUiSmokeArtifact,
): { jsonPath: string; markdownPath: string } {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(DOCS_DIR, { recursive: true });
  const jsonPath = join(DATA_DIR, `dashboard-ui-smoke-${artifact.date}.json`);
  const markdownPath = join(DOCS_DIR, `dashboard-ui-smoke-${artifact.date}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(markdownPath, renderRenderedDashboardUiSmokeMarkdown(artifact));
  return { jsonPath, markdownPath };
}

export function renderRenderedDashboardUiSmokeMarkdown(
  artifact: RenderedDashboardUiSmokeArtifact,
): string {
  return [
    `# Dashboard UI Smoke - ${artifact.date}`,
    "",
    "This is a local browser-rendered smoke artifact. It does not mutate production or external systems.",
    "",
    "## Summary",
    "",
    `- URL: \`${artifact.url}\``,
    `- Stats snapshot: \`${artifact.generatedAt}\``,
    `- Sites: ${formatNumber(artifact.siteCount)}`,
    `- Blocking sources: ${formatNumber(artifact.blockingSources.length)}`,
    `- Maintenance sources: ${formatNumber(artifact.maintenanceSources.length)}`,
    `- Blocker hosts: ${artifact.blockerHosts.length > 0 ? artifact.blockerHosts.map((host) => `\`${host}\``).join(", ") : "`none`"}`,
    `- Actionability: \`${artifact.actionabilityStatus}\``,
    `- Checks: ${formatNumber(artifact.checks.length)}`,
    "",
    "## Refresh Sources",
    "",
    `- Blocking: ${artifact.blockingSources.length > 0 ? artifact.blockingSources.map((source) => `\`${source}\``).join(", ") : "`none`"}`,
    `- Maintenance: ${artifact.maintenanceSources.length > 0 ? artifact.maintenanceSources.map((source) => `\`${source}\``).join(", ") : "`none`"}`,
    "",
    "## Actionability",
    "",
    `- Status: \`${artifact.actionabilityStatus}\``,
    `- Required command: \`${artifact.actionabilityCommand}\``,
    `- Allowed use: ${artifact.actionabilityAllowedUse}`,
    `- Reason: ${artifact.actionabilityReason}`,
    "",
    "## Evidence Paths",
    "",
    `- Fleet chain: \`${artifact.fleetChainArtifactPath}\``,
    `- GSC audit: \`${artifact.gscPermissionAuditArtifactPath ?? "none"}\``,
    `- GSC work order: \`${artifact.gscPermissionAuditWorkOrderPath ?? "none"}\``,
    `- GSC handoff status: \`${artifact.gscPermissionAuditHandoffStatus ?? "none"}\``,
    "",
    "## Stop Condition",
    "",
    artifact.stopCondition,
    "",
  ].join("\n");
}

function getGscBlockerHosts(data: DashboardData): string[] {
  if (data.gscPermissionAudit?.handoffStatus !== "pending_external") {
    return [];
  }
  return (
    data.gscPermissionAudit?.results
      .filter(
        (result) =>
          result.gscStatus === "auth_error" ||
          result.accessState === "unverified" ||
          result.accessState === "not_listed" ||
          result.permissionLevel === "siteUnverifiedUser",
      )
      .map((result) => result.host) ?? []
  );
}

async function assertVisible(locator: { count(): Promise<number> }, message: string): Promise<void> {
  const count = await locator.count();
  assert(count > 0, message);
}

async function assertCount(
  locator: { count(): Promise<number> },
  expected: number,
  message: string,
): Promise<void> {
  const count = await locator.count();
  assert(count === expected, `${message} Found ${count}.`);
}

async function assertNoBlockedInsightPromptLeaks(panel: {
  locator(selector: string): {
    evaluateAll<T>(callback: (elements: Element[]) => T): Promise<T>;
  };
}): Promise<void> {
  const promptTexts = await panel
    .locator(".insight-prompt")
    .evaluateAll((elements) => elements.map((element) => element.textContent ?? ""));
  assert(promptTexts.length > 0, "Blocked insight cards do not render review prompt placeholders.");
  for (const text of promptTexts) {
    for (const pattern of BLOCKED_INSIGHT_PROMPT_FORBIDDEN_PATTERNS) {
      assert(
        !text.includes(pattern),
        `Blocked insight prompt still exposes executable operator text: ${pattern}`,
      );
    }
  }
}

async function assertNoBlockedTextLeaks(
  locator: {
    evaluateAll<T>(callback: (elements: Element[]) => T): Promise<T>;
  },
  forbiddenPatterns: readonly string[],
  message: string,
): Promise<void> {
  const texts = await locator.evaluateAll((elements) =>
    elements.map((element) => element.textContent ?? ""),
  );
  for (const text of texts) {
    for (const pattern of forbiddenPatterns) {
      assert(!text.includes(pattern), `${message}: ${pattern}`);
    }
  }
}

async function assertNoBlockedTitleLeaks(
  locator: {
    evaluateAll<T>(callback: (elements: Element[]) => T): Promise<T>;
  },
  forbiddenPatterns: readonly string[],
  message: string,
): Promise<void> {
  const titles = await locator.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("title") ?? ""),
  );
  for (const title of titles) {
    for (const pattern of forbiddenPatterns) {
      assert(!title.includes(pattern), `${message}: ${pattern}`);
    }
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function seoulDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getArgValue(name: string, args: readonly string[] = process.argv): string | null {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 && typeof args[index + 1] === "string" ? args[index + 1] : null;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
