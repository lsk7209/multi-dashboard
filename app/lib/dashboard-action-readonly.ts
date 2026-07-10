import type { DashboardActionItem } from "./dashboard-data";

const SITEMAP_RESUBMISSION_PATTERN = /Search Console에 sitemap을 재제출/i;

export interface ReadOnlyActionPresentation {
  reason: string;
  nextStep: string;
  note: string;
  mutatingInstructionSuppressed: boolean;
}

export function getReadOnlyActionPresentation(
  action: DashboardActionItem,
): ReadOnlyActionPresentation {
  const mutatingInstructionSuppressed = SITEMAP_RESUBMISSION_PATTERN.test(action.nextStep);
  return {
    reason: action.reason,
    nextStep: mutatingInstructionSuppressed
      ? "Search Console 제출 상태, sitemap lastmod, robots.txt Sitemap 라인을 읽기 전용으로 확인하세요."
      : action.nextStep,
    note: "읽기 전용: 실행 또는 외부 변경은 post-recovery 통과 후에만 수행하세요.",
    mutatingInstructionSuppressed,
  };
}
