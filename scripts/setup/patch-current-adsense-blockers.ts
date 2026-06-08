import { getWpAdmin, loadLocalSecrets } from "./lib/secrets.js";
import { loadSites, requireWordPressRestBase, type Site } from "./lib/sites.js";

type PageKind = "about" | "contact" | "privacy" | "terms";

interface WpPage {
  id: number;
  slug: string;
  status: string;
  content?: { rendered?: string; raw?: string };
}

const dryRun = process.argv.includes("--dry-run");
const selected = new Set(
  process.argv
    .filter((arg) => arg.startsWith("--site="))
    .map((arg) => arg.slice("--site=".length))
    .filter(Boolean),
);

const targets: Array<{ siteId: string; pages: PageKind[] }> = [
  { siteId: "doseogogo", pages: ["terms"] },
  { siteId: "nexttech7", pages: ["privacy"] },
  { siteId: "haemongdream", pages: ["privacy"] },
  { siteId: "klick-2", pages: ["privacy"] },
  { siteId: "yesa", pages: ["about", "contact", "privacy", "terms"] },
];

const pageMeta: Record<PageKind, { slug: string; title: string }> = {
  about: { slug: "about", title: "소개" },
  contact: { slug: "contact", title: "문의" },
  privacy: { slug: "privacy", title: "개인정보처리방침" },
  terms: { slug: "terms", title: "이용약관" },
};

class WpClient {
  private readonly base: string;
  private readonly authHeader: string;

  constructor(site: Site, auth: { username: string; password: string }) {
    this.base = requireWordPressRestBase(site);
    this.authHeader = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;
  }

  async findPage(slug: string): Promise<WpPage | undefined> {
    const pages = await this.request<WpPage[]>(`/pages?slug=${encodeURIComponent(slug)}&context=edit&per_page=1`);
    return pages[0];
  }

  async createPage(page: PageKind, content: string): Promise<void> {
    const meta = pageMeta[page];
    await this.request<WpPage>("/pages", {
      method: "POST",
      body: {
        slug: meta.slug,
        title: meta.title,
        content,
        status: "publish",
        comment_status: "closed",
        ping_status: "closed",
      },
    });
  }

  async updatePage(id: number, page: PageKind, content: string): Promise<void> {
    await this.request<WpPage>(`/pages/${id}`, {
      method: "POST",
      body: {
        title: pageMeta[page].title,
        content,
        status: "publish",
        comment_status: "closed",
        ping_status: "closed",
      },
    });
  }

  private async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const response = await fetch(`${this.base}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`WordPress API ${response.status}: ${body.slice(0, 240)}`);
    }

    return response.json() as Promise<T>;
  }
}

function domainOf(site: Site): string {
  return new URL(site.url).hostname.replace(/^www\./, "");
}

function publicUrl(site: Site, page: PageKind): string {
  return new URL(`/${pageMeta[page].slug}/`, site.url).toString();
}

function cleanSiteName(site: Site): string {
  const domain = domainOf(site);
  if (!site.name || site.name.includes("GA4") || /[�]/.test(site.name)) {
    return domain;
  }
  return site.name;
}

function pageContent(site: Site, page: PageKind): string {
  const domain = domainOf(site);
  const siteName = cleanSiteName(site);
  const marker = `<!-- adsense-approval-page:v2 ${pageMeta[page].slug} -->`;

  if (page === "about") {
    return `${marker}
<h1>${escapeHtml(siteName)} 소개</h1>
<p>${escapeHtml(siteName)}은 방문자가 주제별 정보를 빠르게 이해하고 실제 의사결정에 참고할 수 있도록 정리하는 정보형 웹사이트입니다.</p>
<p>게시물은 명확한 제목, 단계별 설명, 확인 가능한 기준을 중심으로 작성하며 오래된 정보는 주기적으로 점검해 최신성과 정확성을 높이는 것을 목표로 합니다.</p>
<p>자동으로 수집한 단편 정보만 제공하는 방식은 지양하고, 방문자가 한 페이지 안에서 핵심 내용을 충분히 파악할 수 있도록 본문 구조와 내부 탐색을 계속 개선합니다.</p>`;
  }

  if (page === "contact") {
    return `${marker}
<h1>문의</h1>
<p>${escapeHtml(siteName)}의 내용 오류, 정정 요청, 제휴, 운영 관련 문의가 있으면 아래 연락처로 보내 주세요.</p>
<p><strong>이메일:</strong> contact@${escapeHtml(domain)}</p>
<p>문의할 때 관련 페이지 주소와 확인이 필요한 내용을 함께 적어 주시면 더 정확하게 검토할 수 있습니다.</p>
<p>광고, 개인정보, 저작권, 콘텐츠 정정 요청은 접수 후 합리적인 기간 안에 확인합니다.</p>`;
  }

  if (page === "privacy") {
    return `${marker}
<h1>개인정보처리방침</h1>
<p>${escapeHtml(siteName)}은 방문자의 개인정보 보호를 중요하게 생각하며, 사이트 운영과 서비스 개선에 필요한 범위에서만 정보를 처리합니다.</p>
<h2>수집하는 정보</h2>
<p>사이트 접속 과정에서 IP 주소, 브라우저 정보, 방문 일시, 참조 URL, 쿠키와 같은 기술 정보가 서버 로그 또는 분석 도구를 통해 처리될 수 있습니다.</p>
<h2>쿠키와 광고</h2>
<p>Google을 포함한 광고 사업자는 쿠키를 사용해 사용자의 이전 방문 기록을 바탕으로 광고를 게재할 수 있습니다. Google의 광고 쿠키 사용은 사용자가 이 사이트와 다른 사이트를 방문한 정보를 바탕으로 관련성 높은 광고를 제공하는 데 사용될 수 있습니다.</p>
<p>사용자는 Google 광고 설정 페이지에서 개인 맞춤 광고를 관리하거나 선택 해제할 수 있습니다.</p>
<h2>정보 이용 목적</h2>
<p>수집된 정보는 사이트 보안, 오류 분석, 콘텐츠 품질 개선, 방문 통계 확인, 광고 운영을 위해 사용합니다.</p>
<h2>문의</h2>
<p>개인정보 관련 문의는 contact@${escapeHtml(domain)} 으로 접수할 수 있습니다.</p>`;
  }

  return `${marker}
<h1>이용약관</h1>
<p>본 약관은 ${escapeHtml(siteName)} 이용과 관련해 사이트 운영자와 방문자 사이의 기본 사항을 정합니다.</p>
<h2>서비스 이용</h2>
<p>방문자는 이 사이트의 콘텐츠를 개인적인 정보 확인 목적으로 이용할 수 있습니다. 사이트 콘텐츠를 무단 복제, 재배포, 자동 수집하거나 서비스 운영을 방해하는 행위는 제한됩니다.</p>
<h2>콘텐츠 안내</h2>
<p>이 사이트의 글은 일반 정보 제공을 목적으로 하며, 법률, 의료, 금융, 투자 등 전문적인 판단이 필요한 영역에서는 관련 전문가 또는 공식 기관의 최신 안내를 함께 확인해야 합니다.</p>
<h2>광고와 외부 링크</h2>
<p>사이트에는 광고와 외부 링크가 포함될 수 있습니다. 외부 사이트의 콘텐츠, 정책, 거래 조건은 해당 사이트의 책임과 기준을 따릅니다.</p>
<h2>면책</h2>
<p>운영자는 콘텐츠의 정확성과 최신성을 높이기 위해 노력하지만, 정보 이용 결과에 대해 법적으로 허용되는 범위를 넘어 보증하지 않습니다.</p>
<h2>문의</h2>
<p>약관 관련 문의는 contact@${escapeHtml(domain)} 으로 접수할 수 있습니다.</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isManaged(page: WpPage): boolean {
  const content = page.content?.raw ?? page.content?.rendered ?? "";
  return content.includes("adsense-approval-page:v");
}

async function verify(url: string): Promise<string> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  const html = await response.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `status=${response.status} chars=${text.length}`;
}

async function patch(site: Site, page: PageKind): Promise<string> {
  const url = publicUrl(site, page);
  if (dryRun) {
    return `DRY ${site.id}/${page} ${url}`;
  }

  const admin = getWpAdmin(site.id);
  const client = new WpClient(site, admin);
  const existing = await client.findPage(pageMeta[page].slug);
  const content = pageContent(site, page);

  let action = "skipped-existing";
  if (!existing) {
    await client.createPage(page, content);
    action = "created";
  } else if (isManaged(existing) || existing.status !== "publish") {
    await client.updatePage(existing.id, page, content);
    action = "updated";
  }

  return `${action.toUpperCase()} ${site.id}/${page} ${url} ${await verify(url)}`;
}

async function main(): Promise<void> {
  loadLocalSecrets();
  const sites = await loadSites();
  const byId = new Map(sites.map((site) => [site.id, site]));
  const activeTargets = selected.size ? targets.filter((target) => selected.has(target.siteId)) : targets;
  let failed = 0;

  for (const target of activeTargets) {
    const site = byId.get(target.siteId);
    if (!site) {
      failed += 1;
      console.log(`FAILED ${target.siteId}: site not found`);
      continue;
    }

    for (const page of target.pages) {
      try {
        console.log(await patch(site, page));
      } catch (error) {
        failed += 1;
        console.log(`FAILED ${target.siteId}/${page}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
