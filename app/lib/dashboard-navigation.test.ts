import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (name: string) => readFileSync(`app/${name}`, "utf8");

describe("two-menu dashboard contract", () => {
  it("provides only the server workspace and the new affiliate marketing menu", () => {
    const header = source("components/app-header.tsx");
    expect(header).toContain('label: "서버별 사이트"');
    expect(header).toContain('label: "제휴마케팅"');
    expect(header.match(/label: /g)).toHaveLength(2);
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
