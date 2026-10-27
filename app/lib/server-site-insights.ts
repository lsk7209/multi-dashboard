import type { ServerSiteRow } from "./server-site-metrics";

export function serverSiteMatchesHost(site: Pick<ServerSiteRow, "host" | "hostStatus">, id: string): boolean {
  const knownHosts = ["ovh", "contabo", "turbo1", "turbo2", "vercel"];
  return id === "all" || (id === "unknown" ? !knownHosts.includes(site.host) : site.host === id);
}

export type ServerSiteFocus = "all" | "access" | "decline" | "search" | "migration" | "attention";

const PUBLIC_HOSTS = new Set(["ovh", "contabo", "turbo1", "turbo2", "vercel"]);
const COLLECTION_ISSUE_LABELS: Record<string, string> = {
  auth_error: "권한 오류", permission_denied: "권한 오류",
  binding_unknown: "연결 미확인", binding_mismatch: "연결 불일치",
  api_error: "수집 오류", error: "수집 오류", missing_config: "설정 없음",
};

const isMeasured = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const accessIssue = (row: ServerSiteRow): boolean =>
  row.httpStatus == null || row.httpStatus >= 400 && row.httpStatus <= 599;

const declineIssue = (row: ServerSiteRow): boolean => row.ga4Status === "ok" && isMeasured(row.weeklyChange)
  && row.weeklyChange <= -30 && isMeasured(row.previousWeeklyUsers) && row.previousWeeklyUsers >= 50;

const searchIssue = (row: ServerSiteRow): boolean => row.gscStatus === "ok" && isMeasured(row.impressions)
  && row.impressions >= 100 && isMeasured(row.position) && row.position > 0 && row.position <= 20
  && isMeasured(row.ctr) && row.ctr >= 0 && row.ctr < 0.02;

const migrationIssue = (row: ServerSiteRow): boolean => Boolean(row.stagingTargets?.length)
  || !PUBLIC_HOSTS.has(row.host) || row.hostStatus !== "public_route_verified";

export function getServerSiteIssues(row: ServerSiteRow): string[] {
  const issues = [...(row.issues ?? [])];
  if (row.httpStatus == null) issues.push("HTTPS 확인 불가");
  else if (row.httpStatus >= 400 && row.httpStatus <= 599) issues.push(`HTTPS ${row.httpStatus} 응답`);
  if (row.ga4Status !== "ok" && row.ga4Status !== "not_collected") issues.push(`GA4 ${COLLECTION_ISSUE_LABELS[row.ga4Status] ?? "수집 확인 필요"}`);
  if (row.gscStatus !== "ok" && row.gscStatus !== "not_collected") issues.push(`GSC ${COLLECTION_ISSUE_LABELS[row.gscStatus] ?? "수집 확인 필요"}`);
  if (declineIssue(row)) issues.push("최근 7일 사용자 30% 이상 감소");
  if (searchIssue(row)) issues.push("검색 노출 대비 클릭률 2% 미만");
  if (row.stagingTargets?.length) issues.push("이전 준비 대상 있음");
  if (!PUBLIC_HOSTS.has(row.host) || row.hostStatus !== "public_route_verified") issues.push("현재 호스팅 확인 필요");
  if (row.approval === "NEEDS_ATTENTION" || row.approval === "REQUIRES_REVIEW") issues.push("애드센스 계정 상태 검토 필요");
  return [...new Set(issues)];
}

export function serverSiteMatchesFocus(row: ServerSiteRow, focus: ServerSiteFocus): boolean {
  switch (focus) {
    case "all": return true;
    case "access": return accessIssue(row);
    case "decline": return declineIssue(row);
    case "search": return searchIssue(row);
    case "migration": return migrationIssue(row);
    case "attention": return getServerSiteIssues(row).length > 0;
  }
}
