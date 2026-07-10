import { describe, expect, it } from "vitest";

import { getReadOnlyActionPresentation } from "./dashboard-action-readonly.js";
import type { DashboardActionItem } from "./dashboard-data.js";

function makeAction(overrides: Partial<DashboardActionItem> = {}): DashboardActionItem {
  return {
    id: "site-action",
    siteId: "site",
    siteName: "site.example",
    url: "https://site.example/",
    kind: "sitemap",
    priority: 100,
    label: "사이트맵",
    value: "warning",
    reason: "GSC sitemap 경고가 있습니다.",
    nextStep: "Search Console에 sitemap을 재제출하고 sitemap lastmod와 robots.txt Sitemap 라인을 확인하세요.",
    ...overrides,
  };
}

describe("getReadOnlyActionPresentation", () => {
  it("keeps evidence while replacing sitemap resubmission with a read-only inspection", () => {
    const presentation = getReadOnlyActionPresentation(makeAction());

    expect(presentation.reason).toBe("GSC sitemap 경고가 있습니다.");
    expect(presentation.nextStep).toContain("읽기 전용");
    expect(presentation.nextStep).not.toContain("재제출");
    expect(presentation.note).toContain("post-recovery");
    expect(presentation.mutatingInstructionSuppressed).toBe(true);
  });

  it("keeps non-mutating inspection steps unchanged", () => {
    const presentation = getReadOnlyActionPresentation(
      makeAction({
        kind: "traffic_drop",
        nextStep: "최근 발행, 색인, 유입 채널 변경 여부를 확인하세요.",
      }),
    );

    expect(presentation.nextStep).toBe("최근 발행, 색인, 유입 채널 변경 여부를 확인하세요.");
    expect(presentation.mutatingInstructionSuppressed).toBe(false);
  });
});
