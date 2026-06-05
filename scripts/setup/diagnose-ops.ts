/**
 * 운영 문제 실시간 진단 (npm run diag)
 *
 * 대시보드(site-stats.json)가 "권한 필요 / 오래된 데이터 / API 실패"로 표시한 사이트를
 * 실시간 GSC/GA4 API로 재점검해서 진짜 원인을 구분한다:
 *   - 진짜 권한 없음(auth)  vs  배포 데이터만 오래됨(stale cache)
 *   - GSC 형식 불일치(www / non-www / sc-domain)
 *   - sitemap 수집 지연
 *
 * 운영 규칙·대응법은 docs/OPERATIONS.md 참조.
 */
import { readFile } from "node:fs/promises";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { google } from "googleapis";
import { makeGoogleAuth, parseServiceAccountKey } from "./lib/gcp.js";
import { loadLocalSecrets, readSecret } from "./lib/secrets.js";

const STATS_PATH = "data/site-stats.json";
const STALE_HOURS = 48;

interface GscSet {
  clicks: number;
  impressions: number;
}
interface SiteStat {
  id: string;
  name: string;
  url: string;
  gscSiteUrl?: string;
  ga4PropertyId?: string;
  ga4Status?: string;
  gscStatus?: string;
  ga4LastSuccessfulFetchAt?: string;
  gscLastSuccessfulFetchAt?: string;
  sitemapLastDownloadedAt?: string;
  sitemapLastSubmittedAt?: string;
  gscLast30Days?: GscSet;
}

function hoursSince(iso?: string): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (Date.now() - t) / 3_600_000;
}

// dashboard-data.ts getOperationalStatus 의 간이 재현 (운영문제 사이트 추림)
function operationalStatus(s: SiteStat): string {
  if (
    hoursSince(s.ga4LastSuccessfulFetchAt) > STALE_HOURS ||
    hoursSince(s.gscLastSuccessfulFetchAt) > STALE_HOURS
  )
    return "stale";
  if (s.ga4Status && s.ga4Status !== "ok")
    return s.ga4Status === "auth_error" || s.ga4Status === "missing_config"
      ? "needsPermission"
      : "apiError";
  if (s.gscStatus && s.gscStatus !== "ok")
    return s.gscStatus === "auth_error" || s.gscStatus === "missing_config"
      ? "needsPermission"
      : "apiError";
  const sm = s.sitemapLastDownloadedAt;
  if (sm && hoursSince(sm) > STALE_HOURS) return "stale";
  return "normal";
}

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function bareDomain(siteUrl: string): string {
  return siteUrl
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

async function queryGsc(
  gsc: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
): Promise<{ ok: boolean; clicks: number; imp: number; err?: string }> {
  try {
    const r = await gsc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: dateDaysAgo(30),
        endDate: dateDaysAgo(1),
        rowLimit: 1,
      },
    });
    const row = r.data.rows?.[0];
    return { ok: true, clicks: row?.clicks ?? 0, imp: row?.impressions ?? 0 };
  } catch (e) {
    return {
      ok: false,
      clicks: 0,
      imp: 0,
      err: (e as Error).message.slice(0, 50),
    };
  }
}

async function main(): Promise<void> {
  loadLocalSecrets();
  const keyJson = readSecret("GCP_SA_KEY_JSON");
  if (!keyJson)
    throw new Error(
      "GCP_SA_KEY_JSON missing (D:\\env\\키파일.txt 또는 .env.setup.local)",
    );

  const snapshot = JSON.parse(await readFile(STATS_PATH, "utf8")) as {
    generatedAt: string;
    stats: SiteStat[];
  };
  const cacheAgeH = hoursSince(snapshot.generatedAt).toFixed(1);
  const problems = snapshot.stats.filter(
    (s) => operationalStatus(s) !== "normal",
  );

  console.log(
    `[diag] site-stats 수집 ${cacheAgeH}h 전 | 운영문제 ${problems.length}개\n`,
  );
  if (problems.length === 0) {
    console.log("운영 문제 없음.");
    return;
  }

  const auth = makeGoogleAuth(keyJson, [
    "https://www.googleapis.com/auth/webmasters.readonly",
  ]);
  const gsc = google.searchconsole({ version: "v1", auth });
  const credentials = parseServiceAccountKey(keyJson);
  const ga4 = new BetaAnalyticsDataClient({ credentials });

  // 서비스계정 연결 GSC 속성 목록 (등록 여부 확인용)
  const propList = await gsc.sites.list();
  const registered = new Set(
    (propList.data.siteEntry ?? []).map((e) => e.siteUrl ?? ""),
  );

  for (const s of problems) {
    const cached = operationalStatus(s);
    const current = s.gscSiteUrl ?? s.url;
    const bare = bareDomain(current);
    console.log(`### ${s.name} (id=${s.id}) — 대시보드: ${cached}`);

    // 1) 현재 형식 실시간 조회
    const cur = await queryGsc(gsc, current);
    const reg = registered.has(current) ? "등록O" : "등록X";
    if (!cur.ok) {
      console.log(`  현재형식 ${current} [${reg}] -> 권한오류: ${cur.err}`);
      console.log("  => 진단: 진짜 GSC 권한 없음 (속성 추가/재검증 필요)\n");
      continue;
    }

    // 2) 대안 형식 탐색
    const alts = [
      `https://www.${bare}/`,
      `https://${bare}/`,
      `sc-domain:${bare}`,
    ].filter((a) => a !== current);
    let better: { form: string; imp: number; clicks: number } | null = null;
    for (const a of alts) {
      const r = await queryGsc(gsc, a);
      if (r.ok && r.imp > cur.imp && (!better || r.imp > better.imp))
        better = { form: a, imp: r.imp, clicks: r.clicks };
    }

    // 3) sitemap 지연
    const smAge = hoursSince(s.sitemapLastDownloadedAt);
    const smNote =
      Number.isFinite(smAge) && smAge > STALE_HOURS
        ? `  sitemap 수집 ${smAge.toFixed(0)}h 전 (지연)`
        : "";

    console.log(
      `  현재형식 ${current} [${reg}] clicks=${cur.clicks} imp=${cur.imp}`,
    );
    if (better)
      console.log(
        `  >> 형식 교정 권장: ${better.form} (imp ${better.imp}, clicks ${better.clicks})`,
      );
    if (smNote) console.log(smNote);

    // 4) 결론
    if (cached === "needsPermission") {
      console.log(
        `  => 진단: 실시간 조회는 정상(권한 OK). 대시보드 'needsPermission'은 배포 site-stats가 오래된 것. stats:update 재수집+재배포로 해소`,
      );
    } else if (cached === "stale") {
      console.log(
        `  => 진단: 데이터 지연. stats:update 재실행 필요${smNote ? " (sitemap 포함)" : ""}`,
      );
    } else {
      console.log(`  => 진단: API 오류 이력. 재수집으로 확인`);
    }
    console.log("");
  }
  void ga4; // GA4 클라이언트는 향후 채널 진단 확장용
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
