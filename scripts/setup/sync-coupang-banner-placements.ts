import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

type SiteOffer = {
  domain: string;
  label: string;
  query: string;
  siteId: string;
};

const OFFERS: SiteOffer[] = [
  { domain: "todaypharm.kr", label: "건강식품", query: "건강기능식품", siteId: "todaypharm" },
  { domain: "tennisfrens.com", label: "테니스 용품", query: "테니스 라켓", siteId: "tennisfrens" },
  { domain: "picklefriend.kr", label: "피클볼 용품", query: "피클볼 패들", siteId: "picklefriend" },
  { domain: "dogswhere.com", label: "반려견 외출용품", query: "강아지 이동가방", siteId: "dogswhere" },
  { domain: "cartain.kr", label: "차량용품", query: "차량용 거치대", siteId: "cartain-2" },
  { domain: "temon.kr", label: "생활용품", query: "생활용품", siteId: "temon" },
  { domain: "notebook.klick.kr", label: "노트북 주변기기", query: "노트북 거치대", siteId: "notebook-klick-2" },
  { domain: "softwa.kr", label: "전자기기", query: "무선 마우스", siteId: "softwa" },
  { domain: "dogspang.kr", label: "반려견 용품", query: "강아지 간식", siteId: "dogspang-2" },
  { domain: "autoscares.com", label: "자동차용품", query: "자동차 세차용품", siteId: "autoscares-2" },
  { domain: "roadways.kr", label: "여행용품", query: "차량용 여행용품", siteId: "roadways" },
  { domain: "dullegilgogo.kr", label: "등산용품", query: "등산 스틱", siteId: "dullegilgogo" },
  { domain: "campgogo.kr", label: "캠핑용품", query: "캠핑 랜턴", siteId: "campgogo" },
];

const DISCLOSURE =
  "이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";
const DB_PATH = "data/monetization/ad-manage.db";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function hmac(method: string, uri: string, secretKey: string, accessKey: string): string {
  const [path, query = ""] = uri.split("?");
  const date = new Date();
  const yy = String(date.getUTCFullYear()).slice(-2);
  const MM = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const signedDate = `${yy}${MM}${dd}T${hh}${mm}${ss}Z`;
  const signature = createHmac("sha256", secretKey)
    .update(`${signedDate}${method}${path}${query}`)
    .digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

async function makeDeepLinks(urls: string[]): Promise<Map<string, string>> {
  loadEnvFile(".env.local");
  const accessKey = process.env.COUPANG_PARTNERS_ACCESS_KEY;
  const secretKey = process.env.COUPANG_PARTNERS_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error("Coupang Partners API keys are missing.");
  }

  const method = "POST";
  const uri = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";
  const response = await fetch(`https://api-gateway.coupang.com${uri}`, {
    body: JSON.stringify({ coupangUrls: urls }),
    headers: {
      Authorization: hmac(method, uri, secretKey, accessKey),
      "content-type": "application/json",
    },
    method,
  });
  const json = (await response.json()) as {
    data?: Array<{ originalUrl: string; shortenUrl: string }>;
    rCode?: string;
    rMessage?: string;
  };
  if (!response.ok || json.rCode !== "0" || !Array.isArray(json.data)) {
    throw new Error(`Coupang deeplink failed: ${response.status} ${json.rCode ?? ""} ${json.rMessage ?? ""}`);
  }
  return new Map(json.data.map((item) => [item.originalUrl, item.shortenUrl]));
}

function upsert(db: DatabaseSync, table: string, row: Record<string, string | number>): void {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => "?").join(", ");
  const updates = keys.filter((key) => key !== "id").map((key) => `${key}=excluded.${key}`).join(", ");
  db.prepare(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
  ).run(...keys.map((key) => row[key]));
}

async function main(): Promise<void> {
  const originalUrls = OFFERS.map(
    (offer) => `https://www.coupang.com/np/search?q=${encodeURIComponent(offer.query)}&channel=user`,
  );
  const deepLinks = await makeDeepLinks(originalUrls);
  const db = new DatabaseSync(DB_PATH);
  const now = new Date().toISOString();
  try {
    for (const offer of OFFERS) {
      const originalUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(offer.query)}&channel=user`;
      const shortUrl = deepLinks.get(originalUrl);
      if (!shortUrl) throw new Error(`Missing deeplink for ${offer.siteId}`);
      const trackingId = `link_coupang_${offer.siteId.replace(/[^a-z0-9]+/gi, "_")}`;
      const creativeId = `creative_coupang_${offer.siteId.replace(/[^a-z0-9]+/gi, "_")}`;
      const placementId = `placement_coupang_${offer.siteId.replace(/[^a-z0-9]+/gi, "_")}_inline`;
      const assignmentId = `assignment_coupang_${offer.siteId.replace(/[^a-z0-9]+/gi, "_")}_inline`;
      const slug = `coupang-${offer.siteId}`;
      const title = `${offer.label} 추천`;
      const imageText = encodeURIComponent(`${title} | 쿠팡 파트너스`);

      upsert(db, "tracking_links", {
        id: trackingId,
        slug,
        public_url: shortUrl,
        offer_id: "coupang-partners-primary",
        offer_name: `Coupang ${offer.label}`,
        status: "active",
        created_at: now,
        updated_at: now,
      });
      upsert(db, "creatives", {
        id: creativeId,
        offer_id: "coupang-partners-primary",
        name: `Coupang ${offer.domain} ${offer.label}`,
        image_url: `https://placehold.co/728x90/fef3c7/111827/png?text=${imageText}`,
        width: 728,
        height: 90,
        status: "active",
        policy_status: "approved",
        created_at: now,
        updated_at: now,
      });
      upsert(db, "placements", {
        id: placementId,
        name: `Coupang inline ${offer.domain}`,
        type: "image_link",
        no_ad_policy: "collapse",
        status: "active",
        created_at: now,
        updated_at: now,
        site_key: offer.siteId,
        slot_key: "coupang-inline",
        site_url: `https://${offer.domain}`,
      });
      upsert(db, "assignments", {
        id: assignmentId,
        placement_id: placementId,
        creative_id: creativeId,
        tracking_link_id: trackingId,
        weight: 100,
        status: "active",
        created_at: now,
        updated_at: now,
      });
    }
  } finally {
    db.close();
  }

  console.log(`synced=${OFFERS.length} disclosure="${DISCLOSURE}"`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
