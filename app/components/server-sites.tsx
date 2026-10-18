"use client";

import { useState } from "react";
import { APPROVAL_LABELS } from "../lib/site-inventory";
import type { ServerSiteRow } from "../lib/server-site-metrics";

const number = (value: number | null) => value === null ? "미확인" : value.toLocaleString("ko-KR");
const status = (value: string) => ({ auth_error: "권한 오류", permission_denied: "권한 오류", binding_mismatch: "연결 확인 필요", binding_unknown: "연결 미확인", not_collected: "미수집", missing_config: "설정 없음", api_error: "수집 오류", error: "수집 오류" })[value] ?? (value === "ok" ? "미확인" : "수집 확인 필요");

const SERVERS = [
  { id: "ovh", label: "OVHcloud" },
  { id: "turbo1", label: "Turbo1" },
  { id: "turbo2", label: "Turbo2" },
] as const;

export function ServerSites({ sites }: { sites: ServerSiteRow[] }) {
  const [query, setQuery] = useState("");
  const [server, setServer] = useState("all");
  const filtered = sites.filter(site =>
    (server === "all" || site.host === server) &&
    site.domain.toLowerCase().includes(query.trim().toLowerCase())
  );
  const filters = [{ id: "all", label: "전체" }, ...SERVERS];
  return <>
    <div className="server-filters" role="group" aria-label="서버 필터">
      {filters.map(filter => <button type="button" key={filter.id} aria-pressed={server === filter.id} onClick={() => setServer(filter.id)}>
        {filter.label} <span>{filter.id === "all" ? sites.length : sites.filter(site => site.host === filter.id).length}</span>
      </button>)}
    </div>
    <div className="server-search">
      <label htmlFor="server-site-search">사이트 검색</label>
      <input id="server-site-search" type="search" placeholder="도메인을 입력하세요" value={query} onChange={event => setQuery(event.target.value)} />
      <span role="status">{filtered.length}개 사이트 표시 / 전체 {sites.length}개</span>
    </div>
    <div className="server-table-wrap" role="region" aria-label="서버별 사이트 통계 표, 가로 스크롤 가능" tabIndex={0}>
      <table className="server-table" aria-label="서버별 사이트 통계">
        <thead><tr><th scope="col">사이트</th><th scope="col">서버</th><th scope="col">GA4 어제 사용자</th><th scope="col">GA4 7일 사용자</th><th scope="col">GSC 7일 클릭</th><th scope="col">GSC 7일 노출</th><th scope="col">애드센스</th></tr></thead>
        <tbody>
          {filtered.map(site => <tr key={site.domain}>
            <th scope="row"><a href={site.url} target="_blank" rel="noreferrer">{site.domain} <span aria-hidden="true">↗</span></a></th>
            <td><span className={`server-badge server-${site.host}`}>{SERVERS.find(item => item.id === site.host)?.label ?? site.host}</span></td>
            {site.ga4Status === "ok" ? <><td className="server-number">{number(site.dailyUsers)}</td><td className="server-number">{number(site.weeklyUsers)}</td></> : <td className="server-metric-status" colSpan={2}>{status(site.ga4Status)}</td>}
            {site.gscStatus === "ok" ? <><td className="server-number">{number(site.clicks)}</td><td className="server-number">{number(site.impressions)}</td></> : <td className="server-metric-status" colSpan={2}>{status(site.gscStatus)}</td>}
            <td><span className={`server-approval approval-${site.approval.toLowerCase()}`}>{APPROVAL_LABELS[site.approval] ?? "미확인"}</span></td>
          </tr>)}
          {!filtered.length && <tr><td colSpan={7} className="server-empty">조건에 맞는 사이트가 없습니다.</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}
