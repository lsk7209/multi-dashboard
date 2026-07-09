import { describe, expect, it } from "vitest";

import { GET } from "./route.js";

describe("banner-management creative route", () => {
  it("renders a contextual affiliate recommendation instead of an obvious ad banner", async () => {
    const response = GET(new Request("https://dashboard.local/api/banner-management/creative?siteKey=temon"));
    const svg = await response.text();

    expect(response.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(svg).toContain("집에서 자주 쓰는 물건만 바꿔도 편해집니다");
    expect(svg).toContain("data:image/png;base64");
    expect(svg).toContain("제휴 추천");
    expect(svg).toContain("생활템 3개만 바꿔도 집이 편해져요");
    expect(svg).toContain("생활템 보기");
    expect(svg).not.toContain("COUPANG PARTNERS");
    expect(svg).not.toContain("자세히 보기");
  });

  it("serves different image themes for different site concepts", async () => {
    const household = await GET(
      new Request("https://dashboard.local/api/banner-management/creative?siteKey=temon"),
    ).text();
    const pet = await GET(
      new Request("https://dashboard.local/api/banner-management/creative?siteKey=dogspang-2"),
    ).text();
    const tech = await GET(
      new Request("https://dashboard.local/api/banner-management/creative?siteKey=softwa"),
    ).text();

    expect(pet).toContain("남기는 간식 말고 잘 먹는 기준");
    expect(tech).toContain("손목 피곤하면 마우스부터 보세요");
    expect(pet).not.toBe(household);
    expect(tech).not.toBe(household);
  });

  it("supports A/B/C hook variants for the same site", async () => {
    const a = await GET(
      new Request("https://dashboard.local/api/banner-management/creative?siteKey=temon&variant=a"),
    ).text();
    const b = await GET(
      new Request("https://dashboard.local/api/banner-management/creative?siteKey=temon&variant=b"),
    ).text();
    const c = await GET(
      new Request("https://dashboard.local/api/banner-management/creative?siteKey=temon&variant=c"),
    ).text();

    expect(a).toContain("생활템 3개만 바꿔도 집이 편해져요");
    expect(b).toContain("매일 쓰는 물건부터 바꿔보세요");
    expect(c).toContain("집안일 줄이는 생활템만 모았어요");
  });

  it("falls back to readable Korean copy for unknown sites", async () => {
    const response = GET(
      new Request("https://dashboard.local/api/banner-management/creative?siteKey=unknown-site"),
    );
    const svg = await response.text();

    expect(svg).toContain("지금 필요한 상품 후보만 빠르게 보기");
    expect(svg).toContain("구매 전 체크");
  });
});
