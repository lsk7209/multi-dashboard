import { APPROVAL_LABELS } from "../lib/site-inventory";
import type { AdSenseEvidence } from "../lib/adsense-evidence";

const time = (value: string | null) => value
  ? `${new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST`
  : "미확인";
const sectionStyle = { marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", lineHeight: 1.6 };
const noteStyle = { display: "block", marginTop: 4 };

export function AdSenseStatus({ state, evidence }: { state: string; evidence?: AdSenseEvidence | undefined }) {
  const observation = evidence?.consoleObservation;
  const source = evidence?.source === "adsense_management_api_v2"
    ? "공식 Sites API"
    : evidence?.source === "operator_console_screenshot" ? "운영자 제공 콘솔 화면" : "현재 상태 미확인";

  return <div className="adsense-status" style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
    <strong>사이트: {APPROVAL_LABELS[state] ?? "미확인"}</strong>
    <small style={noteStyle}>
      {evidence?.accounts.length ? evidence.accounts.map(account => account.publisherId).join(" · ") : "등록 계정 미확인"}
    </small>
    <details style={{ marginTop: 8 }}>
      <summary style={{ color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>상세 정보</summary>
      <section aria-label="계정별 상태" style={sectionStyle}>
        <strong style={{ fontSize: 12 }}>계정별 상태</strong>
        {evidence?.accounts.length ? evidence.accounts.map(account => <small key={account.publisherId} style={noteStyle}>
          {account.publisherId}<br />
          {APPROVAL_LABELS[account.rawState] ?? "미확인"} · 계정 확인 {time(account.checkedAt)}
        </small>) : <small style={noteStyle}>등록 계정 미확인</small>}
      </section>
      <section aria-label="조회 근거" style={sectionStyle}>
        <strong style={{ fontSize: 12 }}>조회 근거</strong>
        <small style={noteStyle}>{source}<br />조회 시각 {time(evidence?.checkedAt ?? null)}</small>
        <small style={noteStyle}>{evidence?.coverage === "configured_accounts_complete" ? "설정된 계정 조회 완료" : "계정 조회 일부 미확인"}</small>
      </section>
      <section aria-label="Ads.txt 콘솔 상태" style={sectionStyle}>
        <strong style={{ fontSize: 12 }}>Ads.txt 콘솔 상태</strong>
        {observation ? <small style={noteStyle}>
          Ads.txt: {observation.adsTxtState === "AUTHORIZED" ? "승인됨" : "미확인"} · 콘솔 화면 기준<br />
          화면 확인 {time(observation.observedAt)}<br />
          콘솔 최종 업데이트 {time(observation.consoleUpdatedAt)}
        </small> : <small style={noteStyle}>미확인</small>}
      </section>
    </details>
  </div>;
}
