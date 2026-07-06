import type { Metadata } from "next";

import { AffiliateWorkspace } from "../components/affiliate-workspace.js";
import { AppHeader } from "../components/app-header.js";
import { getDashboardActionability } from "../lib/dashboard-actionability.js";
import { getDashboardData } from "../lib/dashboard-data.js";
import { getMonetizationWorkspaceData } from "../lib/monetization-workspace.js";

export const metadata: Metadata = {
  title: "제휴 | 멀티 대시보드",
  description:
    "수집한 어필리에이트 프로그램과 제휴 항목을 우선순위, 배너 적합도, API/Feed/MCP/CLI 연동 여부, 다음 액션 기준으로 정리합니다.",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

export default function AffiliatePage() {
  const { affiliateInventory, coupangChannelRegistry } =
    getMonetizationWorkspaceData();
  const dashboardData = getDashboardData();
  const isReadOnlyBlocked =
    getDashboardActionability(dashboardData).status ===
    "blocked_for_action_until_post_recovery_verify";

  return (
    <main className="dashboard-shell">
      <AppHeader
        active="affiliate"
        eyebrow="제휴 인벤토리"
        status={formatShortDateTime(affiliateInventory.generatedAt)}
        title="제휴"
      />

      <AffiliateWorkspace
        coupangRegistry={coupangChannelRegistry}
        data={affiliateInventory}
        isReadOnlyBlocked={isReadOnlyBlocked}
      />
    </main>
  );
}

function formatShortDateTime(value: string | null): string {
  if (!value) {
    return "미수집";
  }

  return `${new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))} KST`;
}
