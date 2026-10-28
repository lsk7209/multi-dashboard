"use client";

import { useEffect, useState } from "react";
import { affiliateAnalytics, affiliateItems, affiliateLogin, affiliatePublications, affiliateSession, affiliateSites, affiliateSummary, type AffiliateSnapshot } from "../lib/affiliate-os-data";

class ApiError extends Error { constructor(public status: number, public sessionCleared = false) { super("Affiliate OS request failed"); } }
async function request(operation: string, signal: AbortSignal, init?: RequestInit) {
  const response = await fetch(`/api/affiliate-os/${operation}`, { ...init, credentials: "same-origin", cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
  if (!response.ok) throw new ApiError(response.status, response.headers.get("x-affiliate-session-cleared") === "1");
  return response.json() as Promise<unknown>;
}
function message(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 503) return "안전한 API 연결이 아직 설정되지 않았습니다. 관리자 바로가기를 이용하세요.";
    if (error.status === 401) return "로그인이 필요하거나 세션이 만료되었습니다.";
    if (error.status === 403) return "접속 권한 또는 요청 인증을 확인하지 못했습니다. 페이지를 새로 열어 로그인하세요.";
    if (error.status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  }
  return "데이터를 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도하세요.";
}
const number = (value: number) => value.toLocaleString("ko-KR");
const statusLabel: Record<string, string> = { approved: "승인", pending: "검토 대기", rejected: "거절", paused: "중지", reviewed: "검토 완료", draft: "초안", none: "미검토", stale_source_url: "원본 변경·재검토 필요", matched_click: "클릭 일치", operator_assigned: "운영자 지정", unattributed: "미귀속" };
const label = (value: string) => statusLabel[value] ?? value;

export function AffiliateOsWorkspace() {
  const [session, setSession] = useState<ReturnType<typeof affiliateSession.parse> | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [authBusy, setAuthBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [snapshot, setSnapshot] = useState<AffiliateSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    request("session", controller.signal).then(data => { setSession(affiliateSession.parse(data)); setFeedback(""); })
      .catch(error => { if (!controller.signal.aborted && (!(error instanceof ApiError) || error.status !== 401)) setFeedback(message(error)); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [sessionRevision]);

  useEffect(() => {
    if (!session) { setSnapshot(null); return; }
    const controller = new AbortController();
    setLoading(true); setSnapshot(null); setFeedback("");
    const parameters = new URLSearchParams({ q: query, limit: "20", offset: String(offset) });
    Promise.all([
      request("summary", controller.signal).then(data => affiliateSummary.parse(data)),
      request(`items?${parameters}`, controller.signal).then(data => affiliateItems.parse(data)),
      request("publications", controller.signal).then(data => affiliatePublications.parse(data)),
      request("analytics", controller.signal).then(data => affiliateAnalytics.parse(data)),
      request("sites", controller.signal).then(data => affiliateSites.parse(data)),
    ]).then(([summary, catalog, publications, analytics, sites]) => {
      if (!controller.signal.aborted) setSnapshot({ summary, catalog, publications, analytics, sites });
    }).catch(error => {
      if (!controller.signal.aborted) { setFeedback(message(error)); if (error instanceof ApiError && error.status === 401) setSession(null); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, query, offset, revision]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setAuthBusy(true); setFeedback("");
    try {
      const data = affiliateLogin.parse(await request("login", new AbortController().signal, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: fields.get("username"), password: fields.get("password") }) }));
      setSession({ authenticated: true, ...data }); setOffset(0); setQuery(""); setSearch("");
    } catch (error) { setFeedback(message(error)); }
    finally { form.reset(); setAuthBusy(false); }
  }
  async function logout() {
    if (!session) return;
    setAuthBusy(true);
    let discard = false;
    try {
      await request("logout", new AbortController().signal, { method: "POST", headers: { "X-CSRF-Token": session.csrf } });
      discard = true;
      setFeedback("로그아웃했습니다.");
    } catch (error) {
      discard = error instanceof ApiError && error.sessionCleared;
      setFeedback(discard
        ? "이 브라우저의 로그인 쿠키를 지웠습니다. 서버의 세션 종료 응답은 확인하지 못했습니다. 다른 창의 세션은 관리자에서 확인하세요."
        : "로그아웃 응답을 받지 못했습니다. 로그인 상태가 남아 있을 수 있습니다. 다시 시도하세요.");
    } finally {
      if (discard) { setSession(null); setSnapshot(null); }
      setAuthBusy(false);
    }
  }

  return <section className="panel affiliate-live" aria-labelledby="affiliate-live-title">
    <div className="affiliate-section-heading"><div><p className="eyebrow">LIVE DATA</p><h2 id="affiliate-live-title">원장과 운영 현황</h2></div>
      {session && <div className="affiliate-form-actions"><span>{session.user.username} · {session.user.role === "admin" ? "관리자" : "조회 계정"}</span><button onClick={() => setRevision(value => value + 1)} disabled={loading}>새로고침</button><button onClick={logout} disabled={authBusy}>로그아웃</button></div>}
    </div>
    <p>로그인 후 현재 원장·사이트별 승인·최근 30일 클릭·정산 기록을 조회합니다. 검토와 게재 변경은 관리자에서 진행하세요.</p>
    {checking ? <p role="status">접속 상태를 확인하고 있습니다.</p> : !session && <form className="affiliate-login" onSubmit={login}>
      <label>계정<input name="username" autoComplete="username" required maxLength={80} disabled={authBusy} /></label>
      <label>비밀번호<input name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={authBusy} /></label>
      <button type="submit" disabled={authBusy}>{authBusy ? "로그인 중…" : "Affiliate OS 로그인"}</button>
      <button type="button" onClick={() => setSessionRevision(value => value + 1)} disabled={authBusy}>연결 다시 확인</button>
    </form>}
    {feedback && <p className="affiliate-access-note" role="alert">{feedback}</p>}
    {session && loading && <p role="status">최신 운영 데이터를 불러오고 있습니다.</p>}
    {session && snapshot && <>
      <div className="workspace-overview affiliate-live-metrics">
        <article><span>수집 원장</span><strong>{number(snapshot.summary.total)}</strong><small>상품정보 검토 완료 {number(snapshot.summary.metadata.reviewed)}건</small></article>
        <article><span>활성 게재 링크</span><strong>{number(snapshot.summary.published_links)}</strong><small>등록 사이트 {number(snapshot.sites.sites.length)}곳 · 승인과 활성 상태 반영</small></article>
        <article><span>동의 후 표시</span><strong>{number(snapshot.analytics.events.impressions)}</strong><small>페이지 조회수와 별도 집계</small></article>
        <article><span>기록된 클릭</span><strong>{number(snapshot.analytics.events.clicks)}</strong><small>클릭률 {snapshot.analytics.events.ctr === null ? "미확인" : `${(snapshot.analytics.events.ctr * 100).toFixed(2)}%`}</small></article>
      </div>
      <p className="affiliate-data-note">집계 기간 {snapshot.analytics.period.from} ~ {snapshot.analytics.period.to} (UTC) · 최근 원장 동기화 {snapshot.summary.latest?.synced_at ?? "기록 없음"}</p>
      <p className="affiliate-data-note">작은 화면에서는 표를 좌우로 스크롤해 모든 항목을 확인하세요.</p>
      <div className="affiliate-section-heading"><h3>원장 검색</h3><form className="affiliate-search" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setOffset(0); setRevision(value => value + 1); }}><label htmlFor="affiliate-catalog-search">상품명·판매처·분류</label><input id="affiliate-catalog-search" value={search} onChange={event => setSearch(event.target.value)} maxLength={100} /><button type="submit">검색</button></form></div>
      <div className="affiliate-data-table" tabIndex={0} aria-label="원장 검색 결과"><table><thead><tr><th>상품·항목</th><th>제휴사</th><th>판매처</th><th>상품정보 검토</th><th>자료 상태</th></tr></thead><tbody>{snapshot.catalog.items.map(item => <tr key={`${item.source_network}:${item.source_item_id}`}><td>{item.title || "상품명 미확인"}<small>{item.source_item_id}</small></td><td>{item.source_network}</td><td>{item.merchant || "미확인"}</td><td>{label(item.metadata_status)}</td><td>{label(item.quality_state)}</td></tr>)}</tbody></table>{!snapshot.catalog.items.length && <p>검색 결과가 없습니다.</p>}</div>
      <div className="affiliate-form-actions affiliate-pagination"><span>전체 {number(snapshot.catalog.total)}건{snapshot.catalog.items.length > 0 && ` · ${number(snapshot.catalog.offset + 1)}–${number(snapshot.catalog.offset + snapshot.catalog.items.length)}`}</span><button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>이전</button><button disabled={offset + snapshot.catalog.items.length >= snapshot.catalog.total} onClick={() => setOffset(offset + 20)}>다음</button></div>
      <h3>사이트별 게재 승인</h3><p className="affiliate-data-note">승인 기록은 {number(snapshot.publications.items.length)}건입니다. 승인만으로 실제 사이트 설치나 클릭 측정이 확인되지는 않습니다.</p>
      <div className="affiliate-data-table" tabIndex={0} aria-label="사이트별 게재 승인"><table><thead><tr><th>사이트</th><th>제휴사·항목</th><th>승인 상태</th><th>원본 확인</th></tr></thead><tbody>{snapshot.publications.items.slice(0, 50).map(item => <tr key={`${item.site_key}:${item.source_network}:${item.source_item_id}`}><td>{item.site_key}</td><td>{item.source_network}<small>{item.source_item_id}</small></td><td>{label(item.status)}</td><td>{item.source_present && item.version_matched ? "현재 원본과 일치" : "재검토 필요"}</td></tr>)}</tbody></table>{!snapshot.publications.items.length && <p>아직 사이트별 승인 기록이 없습니다.</p>}</div>
      {snapshot.publications.items.length > 50 && <p className="affiliate-data-note">처음 50건을 표시합니다. 전체 기록은 관리자에서 확인하세요.</p>}
      <h3>정산 기록</h3><p className="affiliate-data-note">전환일 기준 원장 금액이며 실제 입금액과 다를 수 있습니다. 통화별로 표시하고 합산하지 않습니다.</p>
      <div className="affiliate-data-table" tabIndex={0} aria-label="정산 기록"><table><thead><tr><th>통화</th><th>상태</th><th>귀속</th><th>주문 수</th><th>기록 금액</th></tr></thead><tbody>{snapshot.analytics.revenue.map(item => <tr key={`${item.currency}:${item.status}:${item.attribution}`}><td>{item.currency}</td><td>{label(item.status)}</td><td>{label(item.attribution)}</td><td>{number(item.orders)}</td><td>{item.amount_decimal ?? "미확인"}{item.unknown_amount_orders > 0 && <small>금액 미확인 {number(item.unknown_amount_orders)}건 포함</small>}{item.legacy_orders > 0 && <small>기존 근사 금액 {number(item.legacy_orders)}건 포함</small>}</td></tr>)}</tbody></table>{!snapshot.analytics.revenue.length && <p>이 기간에 기록된 정산이 없습니다.</p>}</div>
    </>}
  </section>;
}
