import type { Metadata } from "next";
import { AppHeader } from "../components/app-header";
import { AffiliateMarketingSettings } from "../components/affiliate-marketing-settings";

export const metadata: Metadata = {
  title: "제휴마케팅 | 멀티 대시보드",
  description: "Affiliate OS 관리자 접속과 사이트별 제휴마케팅 적용 준비를 관리합니다.",
};

export default function AffiliateMarketingPage() {
  return (
    <main className="dashboard-shell servers-page affiliate-marketing-page">
      <AppHeader active="affiliate-marketing" eyebrow="AFFILIATE MARKETING" title="제휴마케팅" />
      <p className="servers-intro">Affiliate OS에서 제휴 상품을 검토하고, 승인한 링크부터 사이트에 적용하세요.</p>
      <AffiliateMarketingSettings />
      <section className="affiliate-readiness" aria-labelledby="affiliate-readiness-title">
        <h2 id="affiliate-readiness-title">연결과 운영 준비</h2>
        <div className="affiliate-readiness-grid">
          <article className="panel"><span className="affiliate-card-label">대시보드 연결</span><h3>관리자 바로가기</h3><p>이 페이지는 접속 주소를 관리합니다. 원장·승인·클릭·정산 데이터의 API 동기화는 아직 연결하지 않았습니다.</p></article>
          <article className="panel"><span className="affiliate-card-label">현재 서비스 상태</span><h3>실시간 상태 미확인</h3><p>서버 가동 여부와 최신 데이터는 관리자에 접속해 확인하세요. 주소 저장은 연결 성공이나 게재 승인을 뜻하지 않습니다.</p></article>
          <article className="panel"><span className="affiliate-card-label">사이트 적용</span><h3>검토와 승인 후 적용</h3><p>대상 사이트, 상품정보, 원본 제휴 링크를 검토하고 해당 사이트의 게재를 승인한 뒤 표시·클릭·중지 동작을 확인하세요.</p></article>
        </div>
      </section>
      <section className="panel affiliate-workflow" aria-labelledby="affiliate-workflow-title">
        <h2 id="affiliate-workflow-title">설정 순서</h2>
        <ol><li><strong>관리자 접속</strong><span>비공개 접속 환경을 열고 관리자 계정으로 로그인합니다.</span></li><li><strong>원장·상품 검토</strong><span>원본 링크와 상품정보의 출처를 확인하고 사용할 항목을 검토합니다.</span></li><li><strong>사이트별 승인</strong><span>적용할 사이트와 허용 범위를 지정하고 게재를 승인합니다.</span></li><li><strong>표시·측정 확인</strong><span>사이트 연결 후 상품 표시, 클릭 기록과 게재 중지를 검증합니다.</span></li></ol>
      </section>
    </main>
  );
}
