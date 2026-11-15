import { domainWarnings, ownedDomains, remainingDays, renewalLabel, type DomainPortfolio as Portfolio, type DomainRecord } from "../lib/domain-portfolio";

const time = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("ko-KR", {timeZone:"Asia/Seoul"}) + " KST" : "미확인";
const date = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString("ko-KR", {timeZone:"Asia/Seoul"}) : "미확인";

function DomainTable({records, label}: {records: DomainRecord[]; label: string}) {
  return <div className="server-table-wrap" role="region" aria-label={label} tabIndex={0}><table className="server-table workspace-table" aria-label={label}>
    <thead><tr><th scope="col">도메인</th><th scope="col">등록기관</th><th scope="col">만료일</th><th scope="col">남은 일수</th><th scope="col">자동연장</th><th scope="col">등록 상태 / 확인 사항</th></tr></thead>
    <tbody>{records.map(record => <tr key={`${record.registrar}-${record.domain}`}><th scope="row">{record.domain}</th><td>{record.registrar}</td><td>{date(record.expiresAt)}</td><td>{remainingDays(record) ?? "미확인"}</td><td>{renewalLabel(record.autoRenew)}</td><td>{record.status === "registered" ? "등록 유지" : record.status}{domainWarnings(record).map(warning => <p key={warning}>{warning}</p>)}</td></tr>)}</tbody>
  </table></div>;
}

export function DomainPortfolio({portfolio, coreDomains}: {portfolio: Portfolio | null; coreDomains: string[]}) {
  if (!portfolio) return <section className="workspace-sites" aria-label="도메인 등록 현황"><h2>도메인 등록 현황</h2><p role="status">등록기관 조회 자료가 없어 만료일과 자동연장 상태는 미확인입니다.</p></section>;
  const records = ownedDomains(portfolio);
  const core = new Set(coreDomains);
  const coreRoots = new Set(portfolio.sites.filter(site => core.has(site.domain)).map(site => site.registrationDomain));
  const urgent = records.filter(record => { const days = remainingDays(record); return days !== null && days <= 30 && coreRoots.has(record.domain); });
  const missing = coreDomains.filter(domain => !portfolio.sites.find(site => site.domain === domain)?.registrationDomain && !domain.endsWith(".vercel.app"));
  return <section id="domains" className="workspace-sites" aria-label="도메인 등록 현황">
    <div className="workspace-section-heading"><h2>도메인 등록 현황</h2><p>보유 {records.length}개 · 30일 이내 만료되는 핵심 도메인 {urgent.length}개</p></div>
    <p>취합 시각 {time(portfolio.checkedAt)} · 조회한 계정 범위의 스냅샷입니다. 갱신·DNS 설정은 변경하지 않았습니다.</p>
    {portfolio.sources.map(source => <p key={source.registrar}>{source.registrar}: 보유 {source.ownedCount}개 {source.ownedComplete ? "전체 조회" : "부분 조회"}{source.deletedTotal !== undefined ? ` · 삭제 이력 ${source.deletedObserved ?? 0}/${source.deletedTotal}개 ${source.deletedComplete ? "전체" : "부분 확인"}` : ""}</p>)}
    <p>서브도메인은 등록 도메인의 만료일을 공유합니다. 사이트의 핵심 운영·보류 결정은 각각 별도입니다. 자동연장 꺼짐은 만료·삭제 상태를 뜻하지 않습니다.</p>
    {urgent.length > 0 && <><h3>30일 이내 만료 · 핵심 운영</h3><DomainTable records={urgent} label="핵심 도메인 만료 예정" /></>}
    {missing.length > 0 && <p role="status">현재 조회 계정에서 등록 상태 미확인: {missing.join(", ")}. 미등록 판정이 아닙니다.</p>}
    <details><summary>보유 도메인 {records.length}개 전체 보기</summary><DomainTable records={records} label="보유 도메인 전체" /></details>
    <p>‘등록자 확인 필요’와 hold·비활성은 별도 상태입니다. 등록자 미확인 표시만으로 정지를 단정하지 않습니다. 각 등록기관의 실제 확인 시각은 사이트 상세 정보에 표시합니다.</p>
  </section>;
}
