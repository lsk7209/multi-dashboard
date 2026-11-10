import { APPROVAL_LABELS } from "../lib/site-inventory";
import type { AdSenseEvidence } from "../lib/adsense-evidence";
const time = (value: string | null) => value ? `${new Date(value).toLocaleString("ko-KR", {timeZone:"Asia/Seoul"})} KST` : "미확인";
export function AdSenseStatus({state, evidence}: {state:string; evidence?:AdSenseEvidence | undefined}) {
  const console = evidence?.consoleObservation;
  return <div className="adsense-status">
    <strong>사이트: {APPROVAL_LABELS[state] ?? "미확인"}</strong>
    {evidence?.accounts.length ? evidence.accounts.map(account => <small key={account.publisherId} style={{display:"block"}}>
      {account.publisherId} · {APPROVAL_LABELS[account.rawState] ?? "미확인"}<br/>계정 확인 {time(account.checkedAt)}
    </small>) : <small style={{display:"block"}}>등록 계정 미확인</small>}
    <small style={{display:"block"}}>{evidence?.source === "adsense_management_api_v2" ? "공식 Sites API" : evidence?.source === "operator_console_screenshot" ? "운영자 제공 콘솔 화면" : "현재 상태 미확인"} · {time(evidence?.checkedAt ?? null)}</small>
    <small style={{display:"block"}}>{evidence?.coverage === "configured_accounts_complete" ? "설정된 계정 조회 완료" : "계정 조회 일부 미확인"}</small>
    {console ? <small style={{display:"block"}}>Ads.txt: {console.adsTxtState === "AUTHORIZED" ? "승인됨" : "미확인"} · 콘솔 화면 기준<br/>화면 확인 {time(console.observedAt)}<br/>콘솔 최종 업데이트 {time(console.consoleUpdatedAt)}</small> : <small style={{display:"block"}}>Ads.txt 콘솔 상태: 미확인</small>}
  </div>;
}
