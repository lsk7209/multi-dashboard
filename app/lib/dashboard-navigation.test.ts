import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (name: string) => readFileSync(`app/${name}`, "utf8");

describe("dashboard navigation contract", () => {
  it("provides server workspace, domain review and affiliate marketing menus", () => {
    const header = source("components/app-header.tsx");
    expect(header).toContain('label: "서버별 사이트"');
    expect(header).toContain('label: "제휴마케팅"');
    expect(header).toContain('href: "/domains"');
    expect(header).toContain('label: "미사용·확인 필요 도메인"');
    expect(header.match(/label: /g)).toHaveLength(3);
    expect(header).not.toContain("banner-management");
  });
  it("retires the old affiliate and banner console routes", () => {
    for (const route of ["affiliate", "banner-management"]) {
      expect(source(`${route}/page.tsx`)).toContain('redirect("/affiliate-marketing")');
    }
  });
  it("keeps the server workspace on the home page and removes old tabbed content", () => {
    expect(source("page.tsx")).toContain("ServerWorkspace");
    expect(source("page.tsx")).not.toContain("DashboardTabs");
  });
});
