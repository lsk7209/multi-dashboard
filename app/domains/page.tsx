import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "../components/app-header";
import { getSiteInventory } from "../lib/site-inventory-store";
import { domainUsage } from "../lib/domain-usage";
import { compareExpiration, domainWarnings, renewalLabel } from "../lib/domain-portfolio";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {title:"미사용·확인 필요 도메인 | 멀티 대시보드", alternates:{canonical:"/domains"}};
const date = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString("sv-SE", {timeZone:"Asia/Seoul"}) : "미확인";
const labels = {unlinked:"사이트 목록 미연결 · 사용 여부 미확인", paused:"운영 보류 사이트만 연결", unknown:"운영 기준 확인 필요", core:"핵심 운영 사이트 연결"};

export default async function DomainsPage({searchParams}: {searchParams: Promise<{order?: string}>}) {
  const direction = (await searchParams).order === "desc" ? "desc" : "asc";
  const inventory = getSiteInventory();
  const portfolio = inventory?.domainPortfolio;
  const rows = portfolio ? domainUsage(portfolio, inventory?.sites ?? [], inventory?.operationsPolicyAvailable === true) : [];
  const candidates = rows.filter(row => row.usage !== "core").sort((a,b) => compareExpiration(a.record.expiresAt,b.record.expiresAt,direction) || a.record.domain.localeCompare(b.record.domain));
  return <main className="dashboard-shell servers-page workspace-page">
    <AppHeader active="domains" eyebrow="DOMAIN PORTFOLIO" title="미사용·확인 필요 도메인" />
    <p className="servers-intro">보유 도메인 중 핵심 운영 사이트와 연결되지 않은 도메인을 모았습니다. 사이트 목록에 없다는 이유만으로 미사용을 확정하지 않습니다.</p>
    {!portfolio ? <p role="status">등록기관 자료를 읽지 못했습니다. 보유·사용 여부는 미확인입니다.</p> : <>
      <section className="workspace-overview" aria-label="도메인 활용 요약">{[
        {label:"보유 도메인",value:rows.length},
        {label:"사이트 목록 미연결",value:rows.filter(row => row.usage === "unlinked").length},
        {label:"운영 보류만 연결",value:rows.filter(row => row.usage === "paused").length},
        {label:"핵심 운영 연결",value:rows.filter(row => row.usage === "core").length},
      ].map(item => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}</section>
      <p>등록기관 자료 취합: {date(portfolio.checkedAt)} · 운영 기준: {date(inventory?.operationsDecidedAt)} · 날짜는 KST 기준입니다.</p>
      {portfolio.sources.map(source => <p key={source.registrar}>{source.registrar}: {source.ownedCount}개 · {source.ownedComplete ? "보유 목록 전체 조회" : "일부 확인 · 전체 계정 조회 아님"}</p>)}
      {!inventory?.operationsPolicyAvailable && <p role="status">운영 기준을 읽지 못해 사용 상태를 분류할 수 없습니다.</p>}
      <p>이메일·외부 서비스·판매용으로 사용 중일 수 있습니다. 아래 표시는 현재 사이트 목록과의 연결 기준이며, 삭제·해지·갱신 여부를 결정한 것이 아닙니다.</p>
      <h2>미사용 후보·확인 필요 {candidates.length}개</h2>
      <div className="server-table-wrap" role="region" aria-label="미사용·확인 필요 도메인 표, 가로 스크롤 가능" tabIndex={0}>
        <table className="server-table workspace-table" aria-label="미사용·확인 필요 도메인">
          <thead><tr>{["도메인","등록기관","분류","연결된 사이트","만료일 (KST)","자동연장","확인 사항","정보 출처 / 확인일"].map(label => label === "만료일 (KST)" ? <th scope="col" key={label} aria-sort={direction === "asc" ? "ascending" : "descending"}><Link href={`/domains?order=${direction === "asc" ? "desc" : "asc"}`}>{label} {direction === "asc" ? "↑" : "↓"}</Link></th> : <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{candidates.map(({record,usage,sites}) => <tr key={`${record.registrar}-${record.domain}`}>
            <th scope="row">{record.domain}</th><td>{record.registrar}</td><td>{labels[usage]}</td><td>{sites.length ? sites.map(site => <div key={site}>{site}</div>) : "등록된 사이트 연결 없음"}</td>
            <td>{date(record.expiresAt)}</td><td>{renewalLabel(record.autoRenew)}</td><td>{domainWarnings(record).join(" · ") || "수집된 항목 내 없음"}</td><td>{record.source}<br />{date(record.checkedAt)}</td>
          </tr>)}{!candidates.length && <tr><td colSpan={8}>현재 자료에서 확인 필요 도메인이 없습니다.</td></tr>}</tbody>
        </table>
      </div>
      <p>핵심 운영 사이트가 하나라도 연결된 등록 도메인은 이 목록에서 제외합니다. 핵심 사이트의 접속 오류는 사용 여부 분류를 바꾸지 않습니다. 삭제 이력은 보유 목록에 포함하지 않습니다.</p>
    </>}
  </main>;
}
