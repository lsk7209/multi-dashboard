"use client";

import { useState } from "react";
import { APPROVAL_LABELS, HOST_LABELS, type SiteInventory } from "../lib/site-inventory";

const time = (value: string | null) => value ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "미확인";
const status = (value: string) => ({ ok: "정상", not_collected: "미수집", missing_config: "설정 없음", permission_denied: "권한 없음", api_error: "수집 오류", binding_mismatch: "도메인 연결 확인 필요", binding_unknown: "연결 미확인" })[value] ?? value;

export function SiteInventoryPanel({ inventory }: { inventory: SiteInventory | null }) {
  const [query, setQuery] = useState("");
  const [host, setHost] = useState("all");
  const [approval, setApproval] = useState("all");
  if (!inventory) return <article className="panel"><h2>서버·연결 현황</h2><p>현황 수집 결과가 없습니다.</p></article>;
  const sites = inventory.sites.filter(site => (host === "all" || site.host === host)
    && (approval === "all" || site.approval === approval)
    && `${site.domain} ${site.bindings.map(binding => `${binding.ga4PropertyId} ${binding.gscSiteUrl}`).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <article className="panel wide-panel inventory-panel">
    <div className="panel-heading"><div><h2>서버·연결 현황</h2><p>도메인별 현재 공개 경로, GA4·GSC 연결과 공식 애드센스 승인 상태</p></div><strong>{sites.length} / {inventory.sites.length}개</strong></div>
    <p>호스팅 확인 {time(inventory.generatedAt)} · 통계 {time(inventory.statsGeneratedAt)} · 애드센스 {time(inventory.adsenseCheckedAt)} {inventory.adsenseListComplete ? "(전체 목록 대조)" : "(목록 미확인)"}</p>
    <p>Google 연결 목록 {time(inventory.googleBindingsCheckedAt)} · {inventory.googleBindingsComplete ? "GA4·GSC 전체 조회 완료" : "연결 목록 일부 미확인"}</p>
    {inventory.adsenseListComplete && inventory.adsenseAccountSummary && <p>공식 계정 전체 {inventory.adsenseAccountSummary.total}개: 승인됨 {inventory.adsenseAccountSummary.ready}개 · 준비 중 {inventory.adsenseAccountSummary.gettingReady}개. 아래 목록은 관리 도메인과 운영자 수익화 제외 설정을 적용합니다.</p>}
    <div className="inventory-summary">{Object.entries(HOST_LABELS).map(([key, label]) => <button type="button" key={key} aria-pressed={host === key} onClick={() => setHost(host === key ? "all" : key)}>{label} <strong>{inventory.sites.filter(site => site.host === key).length}</strong></button>)}</div>
    <div className="inventory-filters">
      <label>도메인·속성 검색<input value={query} onChange={event => setQuery(event.target.value)} placeholder="도메인, GA4 속성, GSC" /></label>
      <label>현재 서버<select value={host} onChange={event => setHost(event.target.value)}><option value="all">전체 서버</option>{Object.entries(HOST_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label>애드센스 승인<select value={approval} onChange={event => setApproval(event.target.value)}><option value="all">전체 승인 상태</option>{Object.entries(APPROVAL_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
    </div>
    <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>도메인</th><th>현재 서버</th><th>GA4 연결·1일 사용자</th><th>GSC 연결</th><th>공식 애드센스 승인</th></tr></thead><tbody>
      {sites.map(site => <tr key={site.domain}>
        <td><a href={site.url} target="_blank" rel="noreferrer">{site.domain}</a><small>{site.bindings.every(binding => binding.id.startsWith("discovered:")) ? "구현 미확인" : site.platform} · {site.enabled ? "수집 대상" : "수집 비활성"}</small><small>HTTPS {site.httpStatus ?? "미확인"}</small>{site.issues.map(issue => <small key={issue}>{issue}</small>)}</td>
        <td><strong>{HOST_LABELS[site.host] ?? "미확인"}</strong><small>{site.addresses.join(", ") || "DNS 응답 없음"}</small><small>{site.evidence.join(" · ")}</small>{site.accountHosts.map(account => <small key={account.host}>서버 계정 확인: {HOST_LABELS[account.host]} · {time(account.checkedAt)}</small>)}{site.configuredLocations.length > 0 && <small>기존 설정: {site.configuredLocations.join(", ")}</small>}</td>
        <td>{site.bindings.map(binding => <div key={binding.id}><span>{binding.ga4PropertyId ?? "수집 설정 없음"} · {status(binding.ga4Status)}</span><small>{binding.id}{binding.enabled ? "" : " (비활성)"} · 1일 {binding.dailyUsers === null ? "미확인" : `${binding.dailyUsers}명`}</small></div>)}<small>계정 웹 스트림: {site.discoveredGa4.map(stream => `${stream.propertyId} (${stream.measurementId})`).join(", ") || "미확인"}</small></td>
        <td>{site.bindings.map(binding => <div key={binding.id}><span>{binding.gscSiteUrl ?? "수집 설정 없음"}</span><small>{status(binding.gscStatus)}</small></div>)}{site.discoveredGsc.map(entry => <small key={entry.siteUrl}>조회 확인: {entry.siteUrl} · {entry.permission}</small>)}</td>
        <td><strong>{APPROVAL_LABELS[site.approval] ?? "미확인"}</strong><small>{site.approval === "NOT_LISTED" ? "현재 계정의 정확한 도메인 없음" : site.approval === "EXCLUDED" ? "운영자 수익화 제외 설정" : "공식 Sites API 기준"}</small></td>
      </tr>)}
    </tbody></table></div>
    {sites.length === 0 && <p>조건에 맞는 사이트가 없습니다.</p>}
    <ul>{inventory.notes.map(note => <li key={note}>{note}</li>)}</ul>
  </article>;
}
