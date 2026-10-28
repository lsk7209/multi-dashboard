import type { Metadata } from "next";
import { AppHeader } from "../components/app-header";
import { AffiliateMarketingSettings } from "../components/affiliate-marketing-settings";
import { AffiliateOsWorkspace } from "../components/affiliate-os-workspace";

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
      <AffiliateOsWorkspace />
      <section className="panel affiliate-workflow" aria-labelledby="affiliate-workflow-title">
        <h2 id="affiliate-workflow-title">설정 순서</h2>
        <ol><li><strong>관리자 접속</strong><span>이 대시보드의 관리자 작업실에서 로그인합니다.</span></li><li><strong>원장·상품 검토</strong><span>원본 링크와 상품정보의 출처를 확인하고 사용할 항목을 검토합니다.</span></li><li><strong>사이트별 승인</strong><span>적용할 사이트와 허용 범위를 지정하고 게재를 승인합니다.</span></li><li><strong>표시·측정 확인</strong><span>사이트 연결 후 상품 표시, 클릭 기록과 게재 중지를 검증합니다.</span></li></ol>
      </section>
    </main>
  );
}
