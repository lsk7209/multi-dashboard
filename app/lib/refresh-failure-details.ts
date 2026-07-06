export type RefreshFailureSeverity = "blocking" | "maintenance";

export interface RefreshFailureDetail {
  source: string;
  category:
    | "gsc_auth"
    | "ga4_config"
    | "adsense_collector_transient"
    | "ads_txt_collector_transient"
    | "sitemap"
    | "unknown";
  severity: RefreshFailureSeverity;
  label: string;
  description: string;
  nextStep: string;
}

export function describeRefreshFailureSource(source: string): RefreshFailureDetail {
  if (source.includes("gsc:auth_error")) {
    return {
      source,
      category: "gsc_auth",
      severity: "blocking",
      label: "Search Console access blocked",
      description:
        "Fresh GSC collection is blocked by a Search Console permission or ownership problem.",
      nextStep:
        "Confirm Search Console property ownership or grant owner access to the dashboard service account, then rerun dashboard:verify.",
    };
  }

  if (source.includes("ga4:missing_config")) {
    return {
      source,
      category: "ga4_config",
      severity: "maintenance",
      label: "GA4 config missing",
      description: "The site is missing a GA4 property binding, so traffic data may be stale.",
      nextStep:
        "Connect the GA4 property/web stream using the bare domain naming rule, then rerun stats:update.",
    };
  }

  if (source.includes("adsense_collector:transient_error")) {
    return {
      source,
      category: "adsense_collector_transient",
      severity: "maintenance",
      label: "AdSense collector transient failure",
      description:
        "AdSense evidence collection failed transiently and is treated as telemetry maintenance, not a hard readiness blocker.",
      nextStep:
        "Rerun dashboard:verify after the network or source endpoint stabilizes and check whether the source repeats.",
    };
  }

  if (source.includes("ads_txt_collector:transient_error")) {
    return {
      source,
      category: "ads_txt_collector_transient",
      severity: "maintenance",
      label: "ads.txt collector transient failure",
      description:
        "ads.txt collection failed transiently and is treated as telemetry maintenance when valid evidence already exists.",
      nextStep: "Check the source /ads.txt response and cache state, then rerun dashboard:verify.",
    };
  }

  if (source.includes("sitemap")) {
    return {
      source,
      category: "sitemap",
      severity: "blocking",
      label: "Sitemap collection blocked",
      description: "Sitemap collection or validation is blocking the fresh readiness chain.",
      nextStep:
        "Check robots.txt Sitemap lines, sitemap URL status, and Search Console submission state, then rerun fleet:optimize.",
    };
  }

  return {
    source,
    category: "unknown",
    severity: "blocking",
    label: "Unclassified refresh failure",
    description: "An unclassified refresh failure is kept fail-closed until it is classified.",
    nextStep:
      "Inspect the raw source, classify it as blocker or maintenance explicitly, then rerun dashboard:verify.",
  };
}

export function describeRefreshFailureSources(sources: string[]): RefreshFailureDetail[] {
  return sources.map(describeRefreshFailureSource);
}

export function isMaintenanceRefreshFailureSource(source: string): boolean {
  return describeRefreshFailureSource(source).severity === "maintenance";
}
