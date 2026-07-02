import { pathToFileURL } from "node:url";
import { getWpAdmin, loadLocalSecrets } from "./lib/secrets.js";
import { loadSites, requireWordPressRestBase, type Site } from "./lib/sites.js";
import { getWordpressSshSource, runWordpressSshCommand } from "./lib/ssh-probe.js";

type PageKind = "about" | "contact" | "privacy" | "terms";

interface PatchTarget {
  siteId: string;
  pages: PageKind[];
  note?: string;
}

interface WpPage {
  id: number;
  slug: string;
  status: string;
  link?: string;
  title?: { rendered?: string };
  content?: { rendered?: string; raw?: string };
}

interface PatchResult {
  siteId: string;
  domain: string;
  page: PageKind;
  action: "created" | "updated" | "published-existing" | "skipped" | "failed";
  publicUrl: string;
  status?: number;
  detail?: string;
}

interface BackupResult {
  status: "created" | "confirmed" | "skipped_dry_run" | "failed";
  detail: string;
}

export interface PatchCliOptions {
  dryRun: boolean;
  apply: boolean;
  targetSiteIds: Set<string>;
  all: boolean;
  backupConfirmed?: string;
}

export function parsePatchArgs(args: string[]): PatchCliOptions {
  const backupConfirmed = args
    .find((arg) => arg.startsWith("--backup-confirmed="))
    ?.slice("--backup-confirmed=".length);
  return {
    dryRun: args.includes("--dry-run"),
    apply: args.includes("--apply"),
    all: args.includes("--all"),
    targetSiteIds: new Set(
      args
        .filter((arg) => arg.startsWith("--site="))
        .map((arg) => arg.slice("--site=".length))
        .filter(Boolean),
    ),
    ...(backupConfirmed ? { backupConfirmed } : {}),
  };
}

const cliOptions = parsePatchArgs(process.argv.slice(2));

export const approvalTargets: PatchTarget[] = [
  { siteId: "gong365", pages: ["about", "contact", "privacy", "terms"] },
  { siteId: "homeimer", pages: ["about", "contact", "terms"] },
  { siteId: "gpt-nexttech7", pages: ["privacy", "terms"] },
  { siteId: "dog-klick", pages: ["about", "contact", "privacy", "terms"] },
  { siteId: "webtoon-klick", pages: ["about", "contact", "privacy", "terms"] },
  { siteId: "smart-sellerpit", pages: ["about", "contact", "privacy", "terms"] },
  { siteId: "jasamall-sellerpit", pages: ["about", "contact", "privacy", "terms"] },
  { siteId: "travel-sellerpit", pages: ["about", "contact", "privacy", "terms"] },
  { siteId: "gong-luckyday", pages: ["privacy", "terms"] },
  { siteId: "ai-tasko", pages: ["contact", "terms"], note: "ads.txt and starter content still need separate follow-up." },

  { siteId: "todayshops", pages: ["terms"] },
  { siteId: "softwa", pages: ["terms"] },
  { siteId: "etique", pages: ["terms"] },
  { siteId: "richyou", pages: ["terms"] },
  { siteId: "2mlab-2", pages: ["terms"] },
  { siteId: "discparty", pages: ["terms"] },
  { siteId: "nicewomen", pages: ["terms"] },
  { siteId: "esgyo", pages: ["terms"] },
  { siteId: "finan", pages: ["terms"] },
  { siteId: "insupang", pages: ["terms"] },
  { siteId: "gover", pages: ["terms"] },
  { siteId: "chatgipt", pages: ["terms"] },
  { siteId: "sssaass", pages: ["terms"] },
  { siteId: "autoscares", pages: ["terms"] },
  { siteId: "trave", pages: ["terms"] },
  { siteId: "lawer", pages: ["terms"] },
  { siteId: "healfood", pages: ["terms"] },
  { siteId: "ezfunnel", pages: ["terms"] },
  { siteId: "educaer", pages: ["terms"] },
  { siteId: "mbti-tasko", pages: ["terms"] },
  { siteId: "notebook-klick", pages: ["terms"] },
  { siteId: "saju-tasko", pages: ["terms"] },
  { siteId: "certifi", pages: ["terms"] },
  { siteId: "car-luckyday", pages: ["terms"] },

  { siteId: "picklefriend", pages: ["contact"] },
  { siteId: "dolbomjigi-ehon365", pages: ["contact"] },
  { siteId: "dullegilgogo", pages: ["contact"] },
  { siteId: "pregnancy-ehon365", pages: ["contact"] },
  { siteId: "workgogo", pages: ["about", "contact"] },
];

const pageMeta: Record<PageKind, { slug: string; title: string }> = {
  about: { slug: "about", title: "소개" },
  contact: { slug: "contact", title: "문의" },
  privacy: { slug: "privacy", title: "개인정보처리방침" },
  terms: { slug: "terms", title: "이용약관" },
};

class WordpressPagesClient {
  private readonly base: string;
  private readonly authHeader: string;

  constructor(site: Site, auth: { user: string; password: string }) {
    this.base = requireWordPressRestBase(site);
    this.authHeader = `Basic ${Buffer.from(`${auth.user}:${auth.password}`).toString("base64")}`;
  }

  async findPageBySlug(slug: string): Promise<WpPage | undefined> {
    const pages = await this.request<WpPage[]>(`/pages?slug=${encodeURIComponent(slug)}&context=edit&per_page=1`);
    return pages[0];
  }

  async createPage(payload: { slug: string; title: string; content: string }): Promise<WpPage> {
    return this.request<WpPage>("/pages", {
      method: "POST",
      body: {
        slug: payload.slug,
        title: payload.title,
        content: payload.content,
        status: "publish",
        comment_status: "closed",
        ping_status: "closed",
      },
    });
  }

  async updatePage(pageId: number, payload: { status?: string; content?: string; title?: string }): Promise<WpPage> {
    return this.request<WpPage>(`/pages/${pageId}`, {
      method: "POST",
      body: payload,
    });
  }

  private async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: "application/json",
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers,
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${this.base}${path}`, init);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`WordPress API ${response.status}: ${body.slice(0, 300)}`);
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

function pageContent(site: Site, page: PageKind): string {
  const domain = domainOf(site);
  const siteName = site.name && !site.name.includes("GA4") ? site.name : domain;
  const marker = `<!-- adsense-approval-page:v1 ${pageMeta[page].slug} -->`;

  if (page === "about") {
    return `${marker}
<h1>${escapeHtml(siteName)} 소개</h1>
<p>${escapeHtml(siteName)}는 독자가 주제별 정보를 빠르게 이해하고 실제 의사결정에 활용할 수 있도록 정리하는 정보형 웹사이트입니다.</p>
<p>게시물은 명확한 제목, 단계별 설명, 확인 가능한 기준을 중심으로 작성하며, 오래된 정보는 주기적으로 점검해 최신성과 정확성을 높이는 것을 목표로 합니다.</p>
<p>이 사이트는 자동 수집된 단편 정보만 제공하는 것을 지양하고, 방문자가 한 페이지 안에서 핵심 내용을 충분히 파악할 수 있도록 본문 구성과 내부 탐색을 개선하고 있습니다.</p>`;
  }

  if (page === "contact") {
    return `${marker}
<h1>문의</h1>
<p>${escapeHtml(siteName)} 이용 중 오류, 정정 요청, 제휴 및 운영 관련 문의가 있으면 아래 연락처로 보내 주세요.</p>
<p><strong>이메일:</strong> contact@${escapeHtml(domain)}</p>
<p>문의 시 관련 페이지 주소와 확인이 필요한 내용을 함께 적어 주시면 더 정확하게 검토할 수 있습니다.</p>
<p>광고, 개인정보, 저작권, 콘텐츠 정정 요청은 접수 후 합리적인 기간 안에 확인합니다.</p>`;
  }

  if (page === "privacy") {
    return `${marker}
<h1>개인정보처리방침</h1>
<p>${escapeHtml(siteName)}는 방문자의 개인정보 보호를 중요하게 생각하며, 사이트 운영과 서비스 개선에 필요한 범위에서만 정보를 처리합니다.</p>
<h2>수집하는 정보</h2>
<p>사이트 접속 과정에서 IP 주소, 브라우저 정보, 방문 일시, 참조 URL, 쿠키 정보와 같은 기술적 정보가 서버 로그 또는 분석 도구를 통해 처리될 수 있습니다.</p>
<h2>쿠키와 광고</h2>
<p>Google을 포함한 제3자 광고 사업자는 쿠키를 사용해 사용자의 이전 방문 기록을 바탕으로 광고를 게재할 수 있습니다. Google의 광고 쿠키 사용은 사용자가 이 사이트와 다른 사이트를 방문한 정보를 바탕으로 더 관련성 높은 광고를 제공하는 데 사용될 수 있습니다.</p>
<p>사용자는 Google 광고 설정 페이지에서 개인 맞춤 광고를 관리하거나 선택 해제할 수 있습니다. 제3자 광고 네트워크의 쿠키 사용에 대해서도 해당 사업자가 제공하는 선택 해제 기능을 이용할 수 있습니다.</p>
<h2>정보 이용 목적</h2>
<p>수집된 정보는 사이트 보안, 오류 분석, 콘텐츠 품질 개선, 방문 통계 확인, 광고 운영을 위해 사용됩니다.</p>
<h2>문의</h2>
<p>개인정보 관련 문의는 contact@${escapeHtml(domain)} 으로 접수할 수 있습니다.</p>`;
  }

  return `${marker}
<h1>이용약관</h1>
<p>본 약관은 ${escapeHtml(siteName)} 이용과 관련해 사이트 운영자와 방문자 사이의 기본 사항을 정합니다.</p>
<h2>서비스 이용</h2>
<p>방문자는 이 사이트의 콘텐츠를 개인적인 정보 확인 목적으로 이용할 수 있습니다. 사이트의 콘텐츠를 무단 복제, 대량 수집, 재배포하거나 서비스 운영을 방해하는 행위는 제한됩니다.</p>
<h2>콘텐츠 안내</h2>
<p>이 사이트의 글은 일반 정보 제공을 목적으로 하며, 법률, 의료, 금융, 투자 등 전문적인 판단이 필요한 영역에서는 관련 전문가 또는 공식 기관의 최신 안내를 함께 확인해야 합니다.</p>
<h2>광고와 외부 링크</h2>
<p>사이트에는 광고와 외부 링크가 포함될 수 있습니다. 외부 사이트의 콘텐츠, 정책, 거래 조건은 해당 사이트의 책임과 기준에 따릅니다.</p>
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

function isManagedPage(page: WpPage): boolean {
  const content = page.content?.raw ?? page.content?.rendered ?? "";
  return content.includes("adsense-approval-page:v1");
}

async function verifyPublicPage(url: string): Promise<{ ok: boolean; status: number; chars: number }> {
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

  return { ok: response.ok && text.length >= 250, status: response.status, chars: text.length };
}

export async function patchPage(
  site: Site,
  page: PageKind,
  options: Pick<PatchCliOptions, "apply" | "dryRun"> = cliOptions,
): Promise<PatchResult> {
  const domain = domainOf(site);
  const url = publicUrl(site, page);
  const meta = pageMeta[page];

  if (!options.apply || options.dryRun) {
    return { siteId: site.id, domain, page, action: "skipped", publicUrl: url, detail: "dry-run; pass --apply after backup gate" };
  }

  const admin = getWpAdmin(site.id);
  const client = new WordpressPagesClient(site, { user: admin.username, password: admin.password });
  const existing = await client.findPageBySlug(meta.slug);

  let action: PatchResult["action"];
  if (!existing) {
    await client.createPage({ slug: meta.slug, title: meta.title, content: pageContent(site, page) });
    action = "created";
  } else if (isManagedPage(existing)) {
    await client.updatePage(existing.id, {
      status: "publish",
      title: meta.title,
      content: pageContent(site, page),
    });
    action = "updated";
  } else if (existing.status !== "publish") {
    await client.updatePage(existing.id, { status: "publish" });
    action = "published-existing";
  } else {
    action = "skipped";
  }

  const verified = await verifyPublicPage(url);
  return {
    siteId: site.id,
    domain,
    page,
    action,
    publicUrl: url,
    status: verified.status,
    detail: verified.ok ? `public ok, ${verified.chars} chars` : `public check weak, ${verified.chars} chars`,
  };
}

export function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export async function ensureBackup(
  site: Site,
  options: Pick<PatchCliOptions, "apply" | "dryRun" | "backupConfirmed"> = cliOptions,
): Promise<BackupResult> {
  if (!options.apply || options.dryRun) {
    return { status: "skipped_dry_run", detail: "dry-run" };
  }

  if (options.backupConfirmed) {
    return { status: "confirmed", detail: options.backupConfirmed };
  }

  const source = getWordpressSshSource(site);
  if (!source) {
    return {
      status: "failed",
      detail: "missing wordpress-ssh contentSource; rerun with --backup-confirmed=<path> after manual backup",
    };
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const wpPath = source.wpPath.replace(/\/$/, "");
  const remoteDir = `${wpPath}/_codex-backups/adsense-pages-${stamp}`;
  const remoteScript = [
    "set -e",
    `mkdir -p ${shellSingleQuote(remoteDir)}`,
    `cd ${shellSingleQuote(wpPath)}`,
    `wp db export ${shellSingleQuote(`${remoteDir}/db-before.sql`)} --allow-root`,
    `wp post list --post_type=page --post_status=any --fields=ID,post_name,post_status,post_title --format=json --allow-root > ${shellSingleQuote(`${remoteDir}/pages-before.json`)}`,
    `echo ${shellSingleQuote(remoteDir)}`,
  ].join(" && ");

  const probe = await runWordpressSshCommand(site, remoteScript, {
    timeoutMs: 120_000,
    connectTimeoutSeconds: 15,
  });
  if (probe.ok) {
    return {
      status: "created",
      detail: probe.stdout.trim().split(/\r?\n/).at(-1) ?? remoteDir,
    };
  }
  return { status: "failed", detail: probe.detail };
}

export function validateApplyTargetSelection(
  options: Pick<PatchCliOptions, "apply" | "dryRun" | "targetSiteIds" | "all">,
  knownTargetIds = new Set(approvalTargets.map((target) => target.siteId)),
): { ok: boolean; detail: string } {
  if (!options.apply || options.dryRun) {
    return { ok: true, detail: "not live apply mode" };
  }
  if (options.all) {
    return { ok: true, detail: "explicit --all provided" };
  }
  if (options.targetSiteIds.size !== 1) {
    return {
      ok: false,
      detail:
        "apply mode requires exactly one --site=<id>; use --all only for an intentional bulk apply",
    };
  }
  const [siteId] = [...options.targetSiteIds];
  if (!siteId) {
    return {
      ok: false,
      detail: "apply mode requires exactly one --site=<id>",
    };
  }
  if (!knownTargetIds.has(siteId)) {
    return {
      ok: false,
      detail: `apply mode target is not in approvalTargets: ${siteId}`,
    };
  }
  return { ok: true, detail: "single site apply target" };
}

async function main(): Promise<void> {
  loadLocalSecrets();
  const sites = await loadSites();
  const sitesById = new Map(sites.map((site) => [site.id, site]));
  const selection = validateApplyTargetSelection(cliOptions);
  if (!selection.ok) {
    console.error(selection.detail);
    process.exit(1);
  }
  const selectedTargets = approvalTargets.filter((target) => cliOptions.targetSiteIds.size === 0 || cliOptions.targetSiteIds.has(target.siteId));
  const results: PatchResult[] = [];

  for (const target of selectedTargets) {
    const site = sitesById.get(target.siteId);
    if (!site) {
      for (const page of target.pages) {
        results.push({
          siteId: target.siteId,
          domain: "-",
          page,
          action: "failed",
          publicUrl: "-",
          detail: "site id not found in sites.yaml",
        });
      }
      continue;
    }

    const backup = await ensureBackup(site, cliOptions);
    if (backup.status === "failed") {
      for (const page of target.pages) {
        results.push({
          siteId: target.siteId,
          domain: domainOf(site),
          page,
          action: "failed",
          publicUrl: publicUrl(site, page),
          detail: `backup gate failed: ${backup.detail}`,
        });
      }
      continue;
    }
    console.log(`BACKUP ${target.siteId}: ${backup.status} ${backup.detail}`);

    for (const page of target.pages) {
      try {
        results.push(await patchPage(site, page, cliOptions));
      } catch (error) {
        results.push({
          siteId: target.siteId,
          domain: domainOf(site),
          page,
          action: "failed",
          publicUrl: publicUrl(site, page),
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  for (const result of results) {
    const status = result.status === undefined ? "" : ` status=${result.status}`;
    const detail = result.detail ? ` ${result.detail}` : "";
    console.log(`${result.action.toUpperCase()} ${result.siteId}/${result.page} ${result.publicUrl}${status}${detail}`);
  }

  const failed = results.filter((result) => result.action === "failed");
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
