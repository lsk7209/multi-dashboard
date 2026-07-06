import { describe, expect, it } from "vitest";

import { formatDisplayPath } from "./display-path.js";

describe("formatDisplayPath", () => {
  it("renders Windows paths with slash separators for dashboard display", () => {
    expect(formatDisplayPath("D:\\web\\multi-dashboard\\data\\monetization\\ad-manage.db")).toBe(
      "D:/web/multi-dashboard/data/monetization/ad-manage.db",
    );
  });

  it("keeps existing slash paths unchanged", () => {
    expect(formatDisplayPath("data/monetization/ad-manage.db")).toBe("data/monetization/ad-manage.db");
  });
});
