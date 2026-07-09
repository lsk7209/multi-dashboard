import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CreativeTheme = "household" | "pet" | "carOutdoor" | "techWork";
type CreativeVariant = "a" | "b" | "c";

type CreativeCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cue: string;
  hooks: Record<CreativeVariant, string>;
  theme: CreativeTheme;
};

const BANNER_DATA_URI_BY_THEME: Record<CreativeTheme, string> = {
  household: readBannerDataUri("coupang-theme-household-728x90.png"),
  pet: readBannerDataUri("coupang-theme-pet-728x90.png"),
  carOutdoor: readBannerDataUri("coupang-theme-car-outdoor-728x90.png"),
  techWork: readBannerDataUri("coupang-theme-tech-work-728x90.png"),
};

const COPY_BY_SITE: Record<string, CreativeCopy> = {
  smallhomepick: buildCopy(
    "작은집 수납 실패 줄이기",
    "좁은 공간에서 먼저 바꿀 살림템만 추렸어요",
    "살림 체크",
    ["좁은 집, 이거 하나로 정리감이 달라져요", "안 버리고도 넓어 보이는 수납템", "작은집에서 재구매 많은 정리템"],
    "household",
  ),
  nexttech7: buildCopy(
    "회의실이 흐릿하면 장비부터 점검",
    "밝기와 투사거리 기준으로 빔프로젝터 후보를 좁혀요",
    "스펙 비교",
    ["흐릿한 화면, 장비 하나로 바뀝니다", "회의실 화면이 답답하면 먼저 보세요", "투사거리 맞는 프로젝터만 골랐어요"],
    "techWork",
  ),
  "petinsuer-2": buildCopy(
    "반려동물 용품, 잘못 사면 계속 쌓입니다",
    "관리 루틴에 맞는 소모품과 기본템만 먼저 확인해요",
    "용품 기준",
    ["안 쓰는 반려템 쌓이기 전에 보세요", "매일 쓰는 반려용품 기준만 모았어요", "집사가 다시 사는 기본템부터"],
    "pet",
  ),
  "healfood-2": buildCopy(
    "매일 먹는 건강식품은 기준이 먼저",
    "성분표를 보기 전에 생활 패턴에 맞는 후보를 좁혀요",
    "건강 루틴",
    ["매일 먹을 거면 기준부터 보세요", "건강템, 습관에 맞아야 오래 갑니다", "루틴에 넣기 쉬운 후보만 확인"],
    "household",
  ),
  yungyanggogo: buildCopy(
    "영양제는 많이보다 맞게 고르기",
    "복용 목적과 생활 리듬에 맞는 후보만 확인해요",
    "영양제 기준",
    ["영양제, 많이보다 맞게 고르세요", "내 루틴에 맞는 영양제부터", "매일 먹는 제품은 기준이 먼저"],
    "household",
  ),
  "estat-2": buildCopy(
    "서류가 쌓이면 찾는 시간이 먼저 낭비됩니다",
    "업무용 보관함과 파일 정리템을 용도별로 좁혔어요",
    "정리 기준",
    ["서류 찾는 시간부터 줄여보세요", "책상 위 서류, 이걸로 먼저 정리", "업무 정리템은 손 닿는 곳부터"],
    "techWork",
  ),
  "pregnancy-ehon365": buildCopy(
    "임신 준비물은 시기별로 달라집니다",
    "지금 필요한 기본템부터 과한 구매를 줄여요",
    "준비물 체크",
    ["지금 필요한 준비물만 먼저 보세요", "출산 전 과소비 줄이는 체크템", "시기별로 필요한 기본템부터"],
    "household",
  ),
  plategogo: buildCopy(
    "매일 쓰는 그릇은 예쁜 것보다 손이 가야죠",
    "식탁 빈도와 보관 방식에 맞는 주방템을 골라요",
    "주방 기준",
    ["매일 손 가는 주방템만 골랐어요", "식탁에서 자주 쓰는 것부터 바꾸세요", "예쁜데 안 쓰는 그릇은 그만"],
    "household",
  ),
  "autoscares-2": buildCopy(
    "세차용품은 한 번에 다 살 필요 없습니다",
    "차량 상태별로 먼저 필요한 관리템만 확인해요",
    "세차 루틴",
    ["세차템, 처음엔 이것부터 충분해요", "차 관리 시작템만 빠르게 확인", "한 번 사면 자주 쓰는 세차템"],
    "carOutdoor",
  ),
  campgogo: buildCopy(
    "캠핑 랜턴은 밝기보다 상황이 먼저",
    "차박, 텐트, 테이블용으로 필요한 후보를 나눠 봐요",
    "랜턴 기준",
    ["밤 캠핑이 편해지는 랜턴 기준", "캠핑 밤 분위기는 조명에서 갈립니다", "테이블 위에 바로 쓰는 랜턴 후보"],
    "carOutdoor",
  ),
  "cartain-2": buildCopy(
    "운전 중 흔들리면 거치대부터 바꾸세요",
    "송풍구, 대시보드, 충전형 후보를 빠르게 좁혀요",
    "거치대 비교",
    ["운전 중 흔들리면 이걸 보세요", "폰이 흔들리면 피로가 커집니다", "차 안에서 제일 자주 쓰는 거치대"],
    "carOutdoor",
  ),
  dogspang: buildCopy(
    "간식도 성향 안 맞으면 그대로 남습니다",
    "크기, 식감, 급여 상황에 맞는 후보를 먼저 봐요",
    "간식 기준",
    ["남기는 간식 말고 잘 먹는 기준", "입맛 까다로운 강아지도 기준부터", "산책 후 바로 꺼내기 좋은 간식"],
    "pet",
  ),
  "dogspang-2": buildCopy(
    "간식도 성향 안 맞으면 그대로 남습니다",
    "크기, 식감, 급여 상황에 맞는 후보를 먼저 봐요",
    "간식 기준",
    ["남기는 간식 말고 잘 먹는 기준", "입맛 까다로운 강아지도 기준부터", "산책 후 바로 꺼내기 좋은 간식"],
    "pet",
  ),
  dogswhere: buildCopy(
    "강아지 이동가방은 무게보다 착용감",
    "외출 거리와 체형에 맞는 후보만 먼저 확인해요",
    "이동가방 기준",
    ["외출 스트레스 줄이는 가방 기준", "병원 갈 때 덜 힘든 이동가방", "체형 맞는 이동가방만 먼저 보세요"],
    "pet",
  ),
  dullegilgogo: buildCopy(
    "등산 스틱은 무릎 부담을 줄이는 장비입니다",
    "접이식, 길이 조절, 손잡이 기준으로 후보를 좁혀요",
    "산행 장비",
    ["무릎 부담 줄이는 산행 준비", "오르막보다 하산 때 필요한 장비", "등산 전 먼저 챙길 스틱 기준"],
    "carOutdoor",
  ),
  "notebook-klick-2": buildCopy(
    "목이 뻐근하면 노트북 높이부터 보세요",
    "책상 높이와 휴대성에 맞는 거치대 후보를 추렸어요",
    "작업환경 개선",
    ["목 뻐근하면 높이부터 바꾸세요", "노트북 자세, 거치대 하나로 달라집니다", "책상 위 체감 큰 작업템"],
    "techWork",
  ),
  picklefriend: buildCopy(
    "피클볼 패들은 무게감이 첫 기준입니다",
    "입문자와 동호회용 후보를 플레이 성향별로 나눠요",
    "패들 비교",
    ["패들 무게감부터 비교하세요", "손목에 맞는 패들부터 고르세요", "입문용 패들, 무게부터 보면 쉽습니다"],
    "carOutdoor",
  ),
  roadways: buildCopy(
    "장거리 운전은 작은 준비물이 피로를 줄입니다",
    "차량 여행 전에 챙길 용품 후보를 빠르게 확인해요",
    "여행 준비",
    ["장거리 운전 피로 줄이는 준비물", "차 안에 두면 바로 쓰는 여행템", "출발 전에 챙길 차량템만"],
    "carOutdoor",
  ),
  softwa: buildCopy(
    "손목이 피곤하면 마우스부터 의심하세요",
    "업무 시간과 그립감에 맞는 무선 마우스를 좁혀요",
    "작업템 비교",
    ["손목 피곤하면 마우스부터 보세요", "오래 쓰는 마우스는 그립감이 먼저", "책상 위 체감 큰 무선 마우스"],
    "techWork",
  ),
  temon: buildCopy(
    "집에서 자주 쓰는 물건만 바꿔도 편해집니다",
    "청소, 정리, 소모품 중 재구매 많은 생활템을 추렸어요",
    "생활템 보기",
    ["생활템 3개만 바꿔도 집이 편해져요", "매일 쓰는 물건부터 바꿔보세요", "집안일 줄이는 생활템만 모았어요"],
    "household",
  ),
  tennisfrens: buildCopy(
    "테니스 라켓은 실력보다 손맛이 먼저입니다",
    "입문, 연습, 경기용 후보를 무게와 밸런스로 나눠요",
    "라켓 기준",
    ["라켓은 손맛부터 맞아야 합니다", "무게와 밸런스부터 비교하세요", "입문 라켓, 손목 부담부터 보세요"],
    "carOutdoor",
  ),
  todaypharm: buildCopy(
    "건강기능식품은 목적부터 좁혀야 합니다",
    "성분보다 먼저 생활 루틴에 맞는 후보를 확인해요",
    "건강 기준",
    ["건강템은 목적부터 좁혀보세요", "매일 챙길 제품은 루틴이 먼저", "내 생활패턴에 맞는 건강템"],
    "household",
  ),
};

const DEFAULT_COPY: CreativeCopy = buildCopy(
  "지금 필요한 상품 후보만 빠르게 보기",
  "글에서 다룬 기준에 맞춰 살 만한 후보를 좁혔어요",
  "구매 전 체크",
  ["필요한 후보만 빠르게 좁혀보세요", "살 만한 후보부터 먼저 확인", "기준에 맞는 상품만 추렸어요"],
  "household",
);

function readBannerDataUri(fileName: string): string {
  return `data:image/png;base64,${readFileSync(
    join(process.cwd(), "public", "assets", "affiliate", fileName),
  ).toString("base64")}`;
}

function buildCopy(
  title: string,
  subtitle: string,
  cue: string,
  hooks: [string, string, string],
  theme: CreativeTheme,
): CreativeCopy {
  return {
    eyebrow: "제휴 추천",
    title,
    subtitle,
    cue,
    hooks: {
      a: hooks[0],
      b: hooks[1],
      c: hooks[2],
    },
    theme,
  };
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const siteKey = normalizeSiteKey(url.searchParams.get("siteKey"));
  const variant = normalizeVariant(url.searchParams.get("variant"));
  const copy = siteKey ? COPY_BY_SITE[siteKey] ?? DEFAULT_COPY : DEFAULT_COPY;

  return new Response(renderSvg(copy, variant), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}

function normalizeSiteKey(value: string | null): string | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(/[^a-z0-9-]/g, "");
}

function normalizeVariant(value: string | null): CreativeVariant {
  return value === "b" || value === "c" ? value : "a";
}

function renderSvg(copy: CreativeCopy, variant: CreativeVariant): string {
  const hook = copy.hooks[variant];
  const ariaLabel = `${copy.title}. ${copy.subtitle}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="728" height="90" viewBox="0 0 728 90" role="img" aria-label="${escapeXml(ariaLabel)}">
  <defs>
    <linearGradient id="readability" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#020617" stop-opacity="0.74"/>
      <stop offset="0.38" stop-color="#020617" stop-opacity="0.48"/>
      <stop offset="0.58" stop-color="#020617" stop-opacity="0.08"/>
      <stop offset="0.72" stop-color="#f8fafc" stop-opacity="0.1"/>
      <stop offset="1" stop-color="#f8fafc" stop-opacity="0.82"/>
    </linearGradient>
  </defs>
  <image href="${BANNER_DATA_URI_BY_THEME[copy.theme]}" x="0" y="0" width="728" height="90" preserveAspectRatio="xMidYMid slice"/>
  <rect width="728" height="90" fill="url(#readability)"/>
  <rect x="1" y="1" width="726" height="88" rx="10" fill="none" stroke="#ffffff" stroke-opacity="0.72"/>
  <rect x="18" y="48" width="352" height="31" rx="15.5" fill="#020617" fill-opacity="0.44"/>
  <rect x="18" y="16" width="112" height="26" rx="13" fill="#ffffff" fill-opacity="0.88"/>
  <text x="33" y="33" fill="#334155" font-family="Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="11" font-weight="800">${escapeXml(copy.eyebrow)}</text>
  <text x="34" y="65" fill="#ffffff" stroke="#020617" stroke-opacity="0.45" stroke-width="0.7" paint-order="stroke" font-family="Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="18" font-weight="900">${escapeXml(hook)}</text>
  <text x="34" y="80" fill="#e2e8f0" stroke="#020617" stroke-opacity="0.35" stroke-width="0.35" paint-order="stroke" font-family="Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="12" font-weight="800">${escapeXml(copy.cue)}</text>
  <circle cx="674" cy="45" r="27" fill="#ffffff" fill-opacity="0.9"/>
  <path d="M666 35l10 10-10 10" fill="none" stroke="#1d4ed8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
