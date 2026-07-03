import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", id: "dashboard", label: "대시보드" },
  { href: "/affiliate", id: "affiliate", label: "제휴" },
  { href: "/banner-management", id: "banner-management", label: "배너 콘솔" },
] as const;

type NavItemId = (typeof NAV_ITEMS)[number]["id"];

interface AppHeaderProps {
  active: NavItemId;
  eyebrow: string;
  status?: string;
  title: string;
}

export function AppHeader({ active, eyebrow, status, title }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <nav className="header-menu" aria-label="주 메뉴">
          {NAV_ITEMS.map((item) => (
            <Link
              aria-current={active === item.id ? "page" : undefined}
              className={active === item.id ? "active" : undefined}
              href={item.href}
              key={item.id}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {status ? (
          <div className="status-pill" aria-label="생성 시각">
            {status}
          </div>
        ) : null}
      </div>
    </header>
  );
}
