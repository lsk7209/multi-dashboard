import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "node:fs";
import { AppHeader } from "../components/app-header";
import { ServerSites } from "../components/server-sites";
import { getSiteInventory } from "../lib/site-inventory-store";
import { serverSiteMetrics } from "../lib/server-site-metrics";
import { HOST_LABELS } from "../lib/site-inventory";
import type { DateRangeSummary, SiteStat } from "../lib/dashboard-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "서버별 사이트 | 멀티 대시보드" };

export default function ServersPage() {
  const inventory = getSiteInventory();
  const sites = inventory?.sites ?? [];
  const pending = sites.filter(site => site.host === "turbo_pending").length;
  const publicSites = sites.filter(site => ["ovh", "contabo", "turbo1", "turbo2", "vercel"].includes(site.host) && site.hostStatus === "public_route_verified");
  const staged = sites.filter(site => site.stagingTargets?.length);
  const snapshot = JSON.parse(readFileSync("data/site-stats.json", "utf8")) as { generatedAt: string; dateRanges?: DateRangeSummary; stats: SiteStat[] };
  const range = snapshot.dateRanges?.last7Days;
  return <main className="dashboard-shell servers-page">
    <AppHeader active="servers" eyebrow="서버별 사이트" title="어느 서버에 있는지 한눈에" />
    <p className="servers-intro">OVH·Contabo·ChemiCloud Turbo1·2와 Vercel의 현재 공개 호스팅을 모았습니다. 비공개 이전 준비본은 운영 사이트로 집계하지 않습니다.</p>
    {inventory ? <>
      <p className="server-period">통계 {range ? `${range.startDate} ~ ${range.endDate}` : "최근 완료된 7일"} · 어제 사용자 수는 완료된 전일 기준입니다.</p>
      <ServerSites sites={publicSites.map(site => serverSiteMetrics(site, snapshot.stats))} />
      {staged.length > 0 && <details className="servers-footnote">
        <summary>비공개 이전 준비본 확인: {staged.length}개 도메인</summary>
        <p>검증용 복사본이 있으며, 공개 이전 완료 수에는 포함하지 않습니다.</p>
        <ul>{staged.map(site => <li key={site.domain}>{site.domain} · 현재 {HOST_LABELS[site.host] ?? "미확인"} → 준비 {site.stagingTargets?.map(stage => HOST_LABELS[stage.host] ?? stage.host).join(", ")}</li>)}</ul>
      </details>}
      <footer className="servers-footnote">
        <p>확인 시각: {new Date(inventory.generatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST</p>
        <p>통계 갱신: {new Date(snapshot.generatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST · 애드센스 확인: {inventory.adsenseCheckedAt ? new Date(inventory.adsenseCheckedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "미확인"}</p>
        <p>애드센스는 공식 계정의 정확한 도메인 기준입니다. 계정 목록 없음은 거절 상태가 아닙니다.</p>
        {pending > 0 && <p>Turbo1·2로 이전한 {pending}개는 세부 서버 확인 후 해당 목록에 표시합니다.</p>}
        {sites.length > publicSites.length && <p>공개 서버 미확인·DNS 불일치 등 {sites.length - publicSites.length}개는 전체 서버·연결 상세에서 확인할 수 있습니다.</p>}
        <Link href="/#inventory">전체 서버·연결 상세 보기 →</Link>
      </footer>
    </> : <p className="panel">서버 현황을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>}
  </main>;
}
