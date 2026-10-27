import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", id: "servers", label: "서버별 사이트" },
  { href: "/affiliate-marketing", id: "affiliate-marketing", label: "제휴마케팅" },
] as const;

interface AppHeaderProps {
  active: (typeof NAV_ITEMS)[number]["id"];
  eyebrow: string;
  status?: string;
  title: string;
}

export function AppHeader({ active, eyebrow, status, title }: AppHeaderProps) {
  return (
    <header className="topbar workspace-header">
      <div className="topbar-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
      <div className="topbar-actions">
        <nav className="header-menu" aria-label="주 메뉴">
          {NAV_ITEMS.map(item => (
            <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined}
              className={active === item.id ? "active" : undefined}>{item.label}</Link>
          ))}
        </nav>
        {status && <div className="status-pill">{status}</div>}
      </div>
    </header>
  );
}
