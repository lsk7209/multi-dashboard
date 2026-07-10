/* global IntersectionObserver, URL, document, fetch, window */

(() => {
  const selector = "[data-banner-measurement]";
  const sessionKey = "multi-dashboard.banner-measurement.session.v1";

  const getSessionId = () => {
    try {
      const existing = window.sessionStorage.getItem(sessionKey);
      if (existing) return existing;
      const generated = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(sessionKey, generated);
      return generated;
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  };

  const sessionId = getSessionId();
  const sendImpression = (element) => {
    const baseUrl = element.dataset.bannerMeasurementBase;
    const siteKey = element.dataset.bannerSiteKey;
    const slotKey = element.dataset.bannerSlotKey;
    if (!baseUrl || !siteKey || !slotKey) return;
    fetch(`${baseUrl.replace(/\/$/, "")}/api/banner-management/event`, {
      body: JSON.stringify({ eventType: "impression", sessionId, siteKey, slotKey }),
      headers: { "content-type": "application/json" },
      keepalive: true,
      method: "POST",
      mode: "cors",
    }).catch(() => undefined);
  };

  const decorateClickLinks = (element) => {
    element.querySelectorAll('a[data-banner-click], a[href*="/api/banner-management/click"]').forEach((link) => {
      try {
        const target = new URL(link.href, window.location.href);
        target.searchParams.set("sid", sessionId);
        link.href = target.toString();
      } catch {
        // Keep the original destination available if a malformed third-party URL is supplied.
      }
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
      const element = entry.target;
      if (element.dataset.bannerMeasured === "pending" || element.dataset.bannerMeasured === "true") return;
      element.dataset.bannerMeasured = "pending";
      window.setTimeout(() => {
        if (element.dataset.bannerMeasured !== "pending") return;
        const rect = element.getBoundingClientRect();
        const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        if (rect.height > 0 && visibleHeight / rect.height >= 0.5) {
          element.dataset.bannerMeasured = "true";
          sendImpression(element);
          observer.unobserve(element);
        } else {
          element.dataset.bannerMeasured = "";
        }
      }, 1000);
    });
  }, { threshold: [0.5] });

  document.querySelectorAll(selector).forEach((element) => {
    decorateClickLinks(element);
    observer.observe(element);
  });
})();
