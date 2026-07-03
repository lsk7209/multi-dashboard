interface AppHeaderProps {
  active: "dashboard" | "banner-management" | "affiliate-items" | "banner-ops";
  eyebrow: string;
  status?: string;
  title: string;
}

const NAV_ITEMS = [
  { href: "/", id: "dashboard", label: "Dashboard" },
  { href: "/#affiliates", id: "affiliate-items", label: "Affiliate Items" },
  { href: "/#banners", id: "banner-ops", label: "Banner Ops" },
  { href: "/banner-management", id: "banner-management", label: "Banner Console" },
] as const;

export function AppHeader({ active, eyebrow, status, title }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <nav className="header-menu" aria-label="Primary menu">
          {NAV_ITEMS.map((item) => (
            <a
              aria-current={active === item.id ? "page" : undefined}
              className={active === item.id ? "active" : undefined}
              href={item.href}
              key={item.id}
            >
              {item.label}
            </a>
          ))}
        </nav>
        {status ? (
          <div className="status-pill" aria-label="Generated timestamp">
            {status}
          </div>
        ) : null}
      </div>
    </header>
  );
}
