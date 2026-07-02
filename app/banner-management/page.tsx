import type { Metadata } from "next";

import { AppHeader } from "../components/app-header.js";
import { BannerManagementConsole } from "../components/banner-management-console.js";
import { getMonetizationWorkspaceData } from "../lib/monetization-workspace.js";

export const metadata: Metadata = {
  title: "제휴 배너 관리 | 멀티 대시보드",
  description: "수십, 수백 개 사이트의 제휴마케팅 배너 슬롯과 링크를 중앙에서 관리합니다.",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-static";

export default function BannerManagementPage() {
  const monetization = getMonetizationWorkspaceData();
  const banner = monetization.bannerManagement;

  return (
    <main className="dashboard-shell">
      <AppHeader
        active="banner-management"
        eyebrow="Central Affiliate Banner Operations"
        status={formatShortDateTime(banner.generatedAt ?? "")}
        title="제휴 배너 관리 시스템"
      />

      <section className="workspace-stack">
        <article className="panel banner-page-intro">
          <div>
            <h2>중앙 광고 슬롯 운영</h2>
            <p>
              사이트별 코드에는 슬롯 호출만 설치하고, 배너 이미지와 제휴 링크는 이 화면에서 교체합니다.
              예: <code>temon.quiz-bottom</code> 슬롯에 어떤 배너를 노출할지 중앙에서 결정합니다.
            </p>
          </div>
          <div className="ops-install">
            <strong>공통 호출 방식</strong>
            <code>/api/banner-management/image?slot=site.slot</code>
            <code>/api/banner-management/click?slot=site.slot</code>
          </div>
        </article>

        <div className="summary-grid" aria-label="제휴 배너 관리 요약">
          <SummaryCard
            label="사이트 슬롯"
            value={formatNumber(banner.counts.placements)}
            hint={`활성 ${formatNumber(banner.counts.activePlacements)}개`}
          />
          <SummaryCard
            label="배너 소재"
            value={formatNumber(banner.counts.creatives)}
            hint={`활성 ${formatNumber(banner.counts.activeCreatives)}개`}
          />
          <SummaryCard
            label="제휴 링크"
            value={formatNumber(banner.counts.trackingLinks)}
            hint={`활성 ${formatNumber(banner.counts.activeTrackingLinks)}개`}
          />
          <SummaryCard
            label="활성 할당"
            value={formatNumber(banner.counts.activeAssignments)}
            hint={`전체 ${formatNumber(banner.counts.assignments)}개`}
          />
        </div>

        <BannerManagementConsole />
      </section>
    </main>
  );
}

function SummaryCard({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: string;
}) {
  return (
    <article className="status-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatShortDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(date);
}
