"use client";

import { useEffect, useState } from "react";
import { AFFILIATE_ADMIN_STORAGE_KEY, DEFAULT_AFFILIATE_ADMIN_URL, LEGACY_AFFILIATE_ADMIN_URL, validateAffiliateAdminUrl } from "../lib/affiliate-admin-url";

export function AffiliateMarketingSettings() {
  const [address, setAddress] = useState(DEFAULT_AFFILIATE_ADMIN_URL);
  const [savedAddress, setSavedAddress] = useState(DEFAULT_AFFILIATE_ADMIN_URL);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AFFILIATE_ADMIN_STORAGE_KEY);
      const valid = stored === LEGACY_AFFILIATE_ADMIN_URL ? DEFAULT_AFFILIATE_ADMIN_URL : stored ? validateAffiliateAdminUrl(stored) : null;
      if (valid) { setAddress(valid); setSavedAddress(valid); }
      else if (stored) setMessage("저장된 주소가 올바르지 않아 기본 접속 주소를 사용합니다.");
    } catch { setMessage("브라우저 저장소를 사용할 수 없어 기본 접속 주소를 사용합니다."); }
    setReady(true);
  }, []);

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valid = validateAffiliateAdminUrl(address);
    if (!valid) { setMessage("HTTPS 주소 또는 이 PC의 로컬 주소를 입력하세요. 경로는 /admin이며 로그인 정보·쿼리·해시는 넣을 수 없습니다."); return; }
    try {
      localStorage.setItem(AFFILIATE_ADMIN_STORAGE_KEY, valid);
      setSavedAddress(valid); setAddress(valid);
      setMessage("이 브라우저에 접속 주소를 저장했습니다. 서비스 연결 여부는 관리자 화면에서 확인하세요.");
    } catch { setMessage("주소를 저장하지 못했습니다. 브라우저의 저장소 설정을 확인하세요."); }
  };

  const reset = () => {
    try {
      localStorage.removeItem(AFFILIATE_ADMIN_STORAGE_KEY);
      setAddress(DEFAULT_AFFILIATE_ADMIN_URL); setSavedAddress(DEFAULT_AFFILIATE_ADMIN_URL);
      setMessage("이 대시보드의 관리자 주소로 되돌렸습니다.");
    } catch { setMessage("초기화하지 못했습니다. 브라우저의 저장소 설정을 확인하세요."); }
  };

  const privateAccess = savedAddress.startsWith("http:");
  return (
    <section className="panel affiliate-connection" aria-labelledby="affiliate-connection-title">
      <div className="affiliate-section-heading">
        <div><p className="eyebrow">AFFILIATE OS</p><h2 id="affiliate-connection-title">관리자 접속</h2></div>
        <span className="affiliate-connection-badge">{privateAccess ? "로컬 접속 주소" : savedAddress === DEFAULT_AFFILIATE_ADMIN_URL ? "대시보드 내 관리자" : "사용자 지정 접속 주소"}</span>
      </div>
      <p>상품과 링크 검토, 사이트별 게재 승인, 추천 실험과 클릭·정산 관리는 Affiliate OS 관리자에서 진행합니다.</p>
      <div className="affiliate-open-actions">
        {ready ? <a className="affiliate-primary-action" href={savedAddress} target="_blank" rel="noopener noreferrer">Affiliate OS 관리자 열기 <span aria-hidden="true">↗</span></a> : <span role="status">접속 설정을 불러오는 중입니다.</span>}
        <span>{savedAddress === DEFAULT_AFFILIATE_ADMIN_URL ? "같은 브라우저의 Affiliate OS 로그인 세션으로 관리자 작업실을 엽니다." : "사용자 지정 주소에서는 별도 로그인이 필요할 수 있습니다."}</span>
      </div>
      {privateAccess && <p className="affiliate-access-note">이 사용자 지정 주소는 이 PC의 로컬 접속 환경이 필요합니다.</p>}
      <details className="affiliate-settings">
        <summary>접속 주소 설정</summary>
        <form onSubmit={save}>
          <label htmlFor="affiliate-admin-url">Affiliate OS 관리자 주소</label>
          <input id="affiliate-admin-url" type="url" value={address} onChange={event => setAddress(event.target.value)} required
            autoComplete="off" spellCheck={false} aria-describedby="affiliate-url-help" disabled={!ready} />
          <p id="affiliate-url-help">기본 주소 /admin 또는 사용자 지정 HTTPS·로컬 /admin 주소를 사용합니다. 주소는 이 브라우저에만 저장됩니다.</p>
          <div className="affiliate-form-actions"><button type="submit" disabled={!ready}>접속 주소 저장</button><button type="button" onClick={reset} disabled={!ready}>기본 주소로 복원</button></div>
        </form>
      </details>
      <p className="affiliate-setting-feedback" role="status" aria-live="polite">{message}</p>
    </section>
  );
}
