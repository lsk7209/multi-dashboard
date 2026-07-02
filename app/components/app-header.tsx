interface AppHeaderProps {
  active: "dashboard" | "banner-management";
  eyebrow: string;
  status?: string;
  title: string;
}

const NAV_ITEMS = [
  { href: "/", id: "dashboard", label: "운영 대시보드" },
  { href: "/banner-management", id: "banner-management", label: "제휴 배너 관리" },
] as const;

export function AppHeader({ active, eyebrow, status, title }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <nav className="header-menu" aria-label="상단 메뉴">
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
          <div className="status-pill" aria-label="스냅샷 생성 시각">
            {status}
          </div>
        ) : null}
      </div>
    </header>
  );
}
