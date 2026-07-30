import { describe, expect, it } from "vitest";
import { isAdsenseTelemetryHealthy } from "./create-adsense-remediation-queue.js";

const healthySupportingTelemetry = {
  adsenseCollectorStatus: "ok",
  adsTxtStatus: "ok",
  adsTxtCollectorStatus: "ok",
};

describe("isAdsenseTelemetryHealthy", () => {
  it.each(["editorial_hold", "launch_hold"])(
    "treats intentional %s as healthy remediation telemetry",
    (adsenseStatus) => {
      expect(
        isAdsenseTelemetryHealthy({
          ...healthySupportingTelemetry,
          adsenseStatus,
        }),
      ).toBe(true);
    },
  );

  it("keeps a real missing loader in the remediation queue", () => {
    expect(
      isAdsenseTelemetryHealthy({
        ...healthySupportingTelemetry,
        adsenseStatus: "missing_config",
      }),
    ).toBe(false);
  });
});
