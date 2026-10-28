import { readFileSync } from "node:fs";
import { AppHeader } from "./app-header";
import { ServerSites } from "./server-sites";
import { getSiteInventory } from "../lib/site-inventory-store";
import { serverSiteMetrics } from "../lib/server-site-metrics";
import type { DateRangeSummary, SiteStat } from "../lib/dashboard-data";
const time = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? `${new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST` : "미확인";
export function ServerWorkspace() {
  const inventory = getSiteInventory();
  let snapshot: { generatedAt: string; dateRanges?: DateRangeSummary; stats: SiteStat[] } | null = null;
  try { const data = JSON.parse(readFileSync("data/site-stats.json", "utf8")); if(Array.isArray(data.stats)) snapshot = data; } catch { /* Missing source is displayed below. */ }
  const sites = inventory?.sites ?? [];
  const known = sites.filter(site => ["ovh", "contabo", "turbo1", "turbo2", "vercel"].includes(site.host) && site.hostStatus === "public_route_verified").length;
  const staged = sites.filter(site => site.stagingTargets?.length).length;
  const age = Date.now() - Date.parse(snapshot?.generatedAt ?? "");
  const fresh = Number.isFinite(age) && age >= -300000 && age < 36 * 3600000;
  return <main className="dashboard-shell servers-page workspace-page">
    <AppHeader active="servers" eyebrow="SITE OPERATIONS" title="사이트 운영 현황" status={`통계 갱신 ${time(snapshot?.generatedAt)}`} />
    <p className="servers-intro">어느 서버에서 운영 중인지, 무엇을 먼저 확인할지 한눈에 살펴보세요.</p>
    <section className="workspace-overview" aria-label="운영 현황 요약">
      {[{label:"관리 도메인",value:sites.length,note:"중복 도메인 제외"},{label:"공개 호스팅 확인",value:known,note:"현재 공개 경로 기준"},{label:"서버 확인 필요",value:sites.length-known,note:"원본·DNS·목적지 확인"},{label:"비공개 준비본",value:staged,note:"공개 이전 완료와 별도"}].map(item => <article key={item.label}><span>{item.label}</span><strong>{item.value.toLocaleString("ko-KR")}</strong><small>{item.note}</small></article>)}
    </section>
    {!fresh && <p className="workspace-notice" role="status">통계가 없거나 갱신 후 36시간이 지났습니다. 표시된 수집 시각을 확인해 주세요.</p>}
    {!snapshot && <p className="workspace-notice">통계 원본을 읽지 못했습니다. 수치는 미확인으로 표시합니다.</p>}
    <section id="sites" className="workspace-sites" aria-label="사이트 탐색">
      <div className="workspace-section-heading"><h2>사이트 탐색</h2><p>기간을 선택해 GA4와 GSC를 비교하세요.</p></div>
      {inventory ? <ServerSites sites={sites.map(site => serverSiteMetrics(site, snapshot?.stats ?? []))} /> : <p role="status">호스팅 현황을 불러오지 못했습니다.</p>}
    </section>
    <footer id="data-notes" className="workspace-notes">
      <h2>데이터를 읽는 기준</h2>
      <p>호스팅 확인 {time(inventory?.generatedAt)} · AdSense 계정 확인 {time(inventory?.adsenseCheckedAt)}</p>
      <p>매일 오전 6시(KST) 예약 수집하며 실행은 지연될 수 있습니다. 통계·공개 경로를 갱신하고, 서버 내부 계정·비공개 준비본·AdSense 공식 상태는 별도 점검합니다.</p>
      <p>7일 증감은 직전 7일과 비교합니다. 이전 사용자가 0이면 양수 증가는 비교 불가로 표시합니다. 급감은 직전 50명 이상이면서 30% 이상 감소한 경우입니다.</p>
      <p>검색 개선 후보는 7일 노출 100회 이상, 평균 순위 20위 이내, CTR 2% 미만입니다. 개선 성과를 보장하지 않습니다.</p>
      <p>공개 경로 확인은 서비스 전체 기능의 정상 여부를 뜻하지 않습니다. HTTPS 404·410 등의 응답은 관측 결과이며 운영 의도는 별도 확인이 필요합니다.</p>
      <p>AdSense는 정확한 도메인으로 조회합니다. ‘조회 계정에 도메인 없음’은 거절 판정이 아니며, 코드 설치·ads.txt 상태와 별개입니다. 공식 근거가 24시간을 넘으면 미확인으로 표시합니다.</p>
    </footer>
  </main>;
}
