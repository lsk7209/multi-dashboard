"use client";

import { useState } from "react";
import { APPROVAL_LABELS } from "../lib/site-inventory";
import type { ServerSiteRow } from "../lib/server-site-metrics";

const number = (value: number | null) => value === null ? "미확인" : value.toLocaleString("ko-KR");
const status = (value: string) => ({ auth_error: "권한 오류", permission_denied: "권한 오류", binding_mismatch: "연결 확인 필요", binding_unknown: "연결 미확인", not_collected: "미수집", missing_config: "설정 없음", api_error: "수집 오류", error: "수집 오류" })[value] ?? (value === "ok" ? "미확인" : "수집 확인 필요");

const SERVERS = [
  { id: "ovh", label: "OVHcloud", description: "OVH 서버" },
  { id: "turbo1", label: "Turbo1", description: "ChemiCloud" },
  { id: "turbo2", label: "Turbo2", description: "ChemiCloud" },
] as const;

export function ServerSites({ sites }: { sites: ServerSiteRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = sites.filter(site => site.domain.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <div className="server-search">
      <label htmlFor="server-site-search">사이트 검색</label>
      <input id="server-site-search" type="search" placeholder="도메인을 입력하세요" value={query} onChange={event => setQuery(event.target.value)} />
      <span role="status">{query.trim() ? `${filtered.length}개 검색됨` : `총 ${sites.length}개 사이트`}</span>
    </div>
    <div className="server-columns">
      {SERVERS.map(server => {
        const rows = filtered.filter(site => site.host === server.id);
        const total = sites.filter(site => site.host === server.id).length;
        return <section className={`server-card server-${server.id}`} key={server.id} aria-labelledby={`server-${server.id}`}>
          <header><div><p>{server.description}</p><h2 id={`server-${server.id}`}>{server.label}</h2></div><strong>{query.trim() ? `${rows.length} / ${total}` : total}<small>사이트</small></strong></header>
          {rows.length ? <ul>{rows.map(site => <li key={site.domain}>
            <a href={site.url} target="_blank" rel="noreferrer"><span>{site.domain}</span><span aria-hidden="true">↗</span></a>
            <dl className="server-site-metrics">
              <div><dt>GA4 사용자</dt><dd>{site.ga4Status === "ok" ? <>어제 <b>{number(site.dailyUsers)}</b> · 7일 <b>{number(site.weeklyUsers)}</b></> : status(site.ga4Status)}</dd></div>
              <div><dt>GSC · 7일</dt><dd>{site.gscStatus === "ok" ? <>클릭 <b>{number(site.clicks)}</b> · 노출 <b>{number(site.impressions)}</b></> : status(site.gscStatus)}</dd></div>
              <div><dt>애드센스</dt><dd><span className={`server-approval approval-${site.approval.toLowerCase()}`}>{APPROVAL_LABELS[site.approval] ?? "미확인"}</span></dd></div>
            </dl>
          </li>)}</ul>
            : <p className="server-empty">{query.trim() ? "검색 결과가 없습니다." : "등록된 사이트가 없습니다."}</p>}
        </section>;
      })}
    </div>
  </>;
}
