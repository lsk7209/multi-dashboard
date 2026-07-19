import { describe, expect, it } from "vitest";
import { getGscPageQueryOutputPath } from "./gsc-page-query-output.js";

describe("getGscPageQueryOutputPath", () => {
  it("keeps same-day collection artifacts distinct by target set", () => {
    const date = "2026-07-19";

    expect(getGscPageQueryOutputPath("data", date, ["cartain-2"]))
      .toBe("data\\gsc-page-query-opportunities-2026-07-19-cartain-2.json");
    expect(getGscPageQueryOutputPath("data", date, ["estat-2", "texturb", "tennisfrens"]))
      .toBe("data\\gsc-page-query-opportunities-2026-07-19-estat-2-texturb-tennisfrens.json");
  });

  it("rejects an empty target set", () => {
    expect(() => getGscPageQueryOutputPath("data", "2026-07-19", [])).toThrow(/target/i);
  });
});
