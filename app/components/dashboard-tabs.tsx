"use client";

import { useEffect, useState, type ReactNode } from "react";

export interface DashboardTabItem {
  id: string;
  label: string;
  panelLabel: string;
  content: ReactNode;
  count?: string;
}

export function DashboardTabs({ items }: { items: DashboardTabItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  useEffect(() => {
    const syncFromHash = () => {
      const hashId = window.location.hash.replace("#", "");
      const nextId = items.some((item) => item.id === hashId) ? hashId : items[0]?.id;
      setActiveId(nextId ?? "");
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [items]);

  function selectTab(id: string) {
    setActiveId(id);

    if (window.location.hash !== `#${id}`) {
      window.history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <div className="dashboard-tabs">
      <nav className="main-tabs" aria-label="대시보드 메뉴" role="tablist">
        {items.map((item) => (
          <button
            aria-controls={`panel-${item.id}`}
            aria-selected={activeItem?.id === item.id}
            className={activeItem?.id === item.id ? "active" : ""}
            id={`tab-${item.id}`}
            key={item.id}
            onClick={() => selectTab(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
            {item.count ? <strong>{item.count}</strong> : null}
          </button>
        ))}
      </nav>

      <div className="dashboard-panels">
        {items.map((item) => (
          <section
            aria-label={item.panelLabel}
            aria-labelledby={`tab-${item.id}`}
            className={`tab-panel ${activeItem?.id === item.id ? "active" : ""}`}
            hidden={activeItem?.id !== item.id}
            id={`panel-${item.id}`}
            key={item.id}
            role="tabpanel"
          >
            {item.content}
          </section>
        ))}
      </div>
    </div>
  );
}
