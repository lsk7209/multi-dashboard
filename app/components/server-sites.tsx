"use client";

import { useState } from "react";

const SERVERS = [
  { id: "ovh", label: "OVHcloud", description: "OVH 서버" },
  { id: "turbo1", label: "Turbo1", description: "ChemiCloud" },
  { id: "turbo2", label: "Turbo2", description: "ChemiCloud" },
] as const;

export function ServerSites({ sites }: { sites: Array<{ domain: string; url: string; host: string }> }) {
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
          {rows.length ? <ul>{rows.map(site => <li key={site.domain}><a href={site.url} target="_blank" rel="noreferrer"><span>{site.domain}</span><span aria-hidden="true">↗</span></a></li>)}</ul>
            : <p className="server-empty">{query.trim() ? "검색 결과가 없습니다." : "등록된 사이트가 없습니다."}</p>}
        </section>;
      })}
    </div>
  </>;
}
