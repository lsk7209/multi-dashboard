import { getDashboardData } from "./lib/dashboard-data.js";

const REQUIRED_SECRETS = [
  "GCP_SA_KEY_JSON",
  "GCP_SA_EMAIL",
  "GH_TOKEN",
  "VERCEL_TOKEN",
  "VERCEL_PROJECT_ID",
  "TURSO_URL_WRITE",
  "TURSO_TOKEN_WRITE",
  "NAVER_API_KEY",
  "BOK_API_KEY",
  "AUTH_SECRET",
  "CRON_SECRET",
  "INTERNAL_KEY",
  "APP_URL",
];

const COMMANDS = [
  { label: "사전 점검", command: "pnpm setup:preflight" },
  { label: "전체 실행", command: "pnpm setup:all" },
  { label: "재개", command: "pnpm setup:resume" },
  { label: "검증", command: "pnpm setup:verify" },
];

export default function DashboardPage() {
  const data = getDashboardData();
  const configuredRate = data.enabledCount === 0 ? 0 : Math.round((data.configuredCount / data.enabledCount) * 100);

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Multi Dashboard</p>
          <h1>멀티 사이트 준비 자동화</h1>
        </div>
        <div className="status-pill" aria-label="현재 운영 준비 상태">
          {data.missingSiteConfig ? "사이트 입력 필요" : "구성 확인 가능"}
        </div>
      </header>

      <section className="summary-grid" aria-label="요약 상태">
        <StatusCard label="등록 사이트" value={`${data.enabledCount}`} hint="enabled 기준" />
        <StatusCard label="WordPress" value={`${data.wordpressCount}`} hint="봇 계정 자동화 대상" />
        <StatusCard label="구성률" value={`${configuredRate}%`} hint="필수 사이트 필드 기준" />
        <StatusCard label="Secret 항목" value={`${REQUIRED_SECRETS.length}`} hint="preflight 확인 대상" />
      </section>

      <section className="content-grid">
        <article className="panel wide-panel">
          <div className="panel-heading">
            <h2>사이트 구성</h2>
            <span>{data.generatedAt.slice(0, 10)}</span>
          </div>
          {data.sites.length === 0 ? (
            <div className="empty-state">
              <strong>아직 등록된 사이트가 없습니다.</strong>
              <p>
                `scripts/setup/sites.example.yaml`을 참고해 `scripts/setup/sites.yaml`에 운영 사이트를 추가하면
                대시보드와 preflight가 함께 동작합니다.
              </p>
            </div>
          ) : (
            <div className="site-list">
              {data.sites.map((site) => (
                <div className="site-row" key={site.id}>
                  <div>
                    <strong>{site.name ?? site.id}</strong>
                    <span>{site.url}</span>
                  </div>
                  <em>{site.platform}</em>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>실행 순서</h2>
          </div>
          <ol className="step-list">
            <li>사이트 목록 입력</li>
            <li>로컬 secret 입력</li>
            <li>preflight 통과</li>
            <li>setup:all 실행</li>
          </ol>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>명령어</h2>
          </div>
          <div className="command-list">
            {COMMANDS.map((item) => (
              <div className="command-row" key={item.command}>
                <span>{item.label}</span>
                <code>{item.command}</code>
              </div>
            ))}
          </div>
        </article>

        <article className="panel wide-panel">
          <div className="panel-heading">
            <h2>Secret 체크</h2>
            <span>값은 화면에 표시하지 않음</span>
          </div>
          <div className="secret-grid">
            {REQUIRED_SECRETS.map((secret) => (
              <span key={secret}>{secret}</span>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function StatusCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="status-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}
