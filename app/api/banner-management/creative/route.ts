export const dynamic = "force-dynamic";

type CreativeCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

const COPY_BY_SITE: Record<string, CreativeCopy> = {
  smallhomepick: { eyebrow: "COUPANG PARTNERS", title: "\uc790\ucde8 \uc0b4\ub9bc\uc6a9\ud488 \ucd94\ucc9c", subtitle: "\uc791\uc740\uc9d1 \uc815\ub9ac\uc640 \uc0dd\ud65c\uc5d0 \ud544\uc694\ud55c \uc0c1\ud488 \ubcf4\uae30" },
  nexttech7: { eyebrow: "COUPANG PARTNERS", title: "\ube54\ud504\ub85c\uc81d\ud130 \ucd94\ucc9c", subtitle: "\uae30\uc220 \uc81c\ud488 \uc120\ud0dd\uc5d0 \uc720\uc6a9\ud55c \uc0c1\ud488 \ubcf4\uae30" },
  "petinsuer-2": { eyebrow: "COUPANG PARTNERS", title: "\ubc18\ub824\ub3d9\ubb3c \uc6a9\ud488 \ucd94\ucc9c", subtitle: "\ubc18\ub824\ub3d9\ubb3c \uad00\ub9ac\uc5d0 \ud544\uc694\ud55c \uc0c1\ud488 \ubcf4\uae30" },
  "healfood-2": { eyebrow: "COUPANG PARTNERS", title: "\uac74\uac15\uc2dd\ud488 \ucd94\ucc9c", subtitle: "\uc77c\uc0c1 \uac74\uac15 \uad00\ub9ac\uc5d0 \ud544\uc694\ud55c \uc0c1\ud488 \ubcf4\uae30" },
  yungyanggogo: { eyebrow: "COUPANG PARTNERS", title: "\uc601\uc591\uc81c \ucd94\ucc9c", subtitle: "\uc601\uc591 \uad00\ub9ac\uc5d0 \ucc38\uace0\ud560 \uc0c1\ud488 \ubcf4\uae30" },
  "estat-2": { eyebrow: "COUPANG PARTNERS", title: "\uc11c\ub958 \uc815\ub9ac\ud568 \ucd94\ucc9c", subtitle: "\uc5c5\ubb34\uc640 \uc790\ub8cc \uc815\ub9ac\uc5d0 \uc720\uc6a9\ud55c \uc0c1\ud488 \ubcf4\uae30" },
  "pregnancy-ehon365": { eyebrow: "COUPANG PARTNERS", title: "\uc784\uc0b0\ubd80 \uc6a9\ud488 \ucd94\ucc9c", subtitle: "\uc784\uc2e0 \uae30\uac04 \uc900\ube44\uc5d0 \ud544\uc694\ud55c \uc0c1\ud488 \ubcf4\uae30" },
  plategogo: { eyebrow: "COUPANG PARTNERS", title: "\uc8fc\ubc29\uc6a9\ud488 \ucd94\ucc9c", subtitle: "\uc2dd\uae30\uc640 \ud14c\uc774\ube14\uc6e8\uc5b4 \uc120\ud0dd\uc5d0 \uc720\uc6a9\ud55c \uc0c1\ud488 \ubcf4\uae30" },
  "autoscares-2": { eyebrow: "COUPANG PARTNERS", title: "자동차 세차용품 추천", subtitle: "차량 관리에 필요한 인기 상품 보기" },
  campgogo: { eyebrow: "COUPANG PARTNERS", title: "캠핑 랜턴 추천", subtitle: "야외 활동에 어울리는 캠핑 장비 보기" },
  "cartain-2": { eyebrow: "COUPANG PARTNERS", title: "차량용 거치대 추천", subtitle: "운전 중 편리한 자동차 용품 보기" },
  dogspang: { eyebrow: "COUPANG PARTNERS", title: "강아지 간식 추천", subtitle: "반려견을 위한 인기 상품 보기" },
  "dogspang-2": { eyebrow: "COUPANG PARTNERS", title: "강아지 간식 추천", subtitle: "반려견을 위한 인기 상품 보기" },
  dogswhere: { eyebrow: "COUPANG PARTNERS", title: "강아지 이동가방 추천", subtitle: "외출과 여행에 필요한 반려견 용품 보기" },
  dullegilgogo: { eyebrow: "COUPANG PARTNERS", title: "등산 스틱 추천", subtitle: "산행 준비에 필요한 장비 보기" },
  "notebook-klick-2": { eyebrow: "COUPANG PARTNERS", title: "노트북 거치대 추천", subtitle: "작업 환경을 정리하는 인기 상품 보기" },
  picklefriend: { eyebrow: "COUPANG PARTNERS", title: "피클볼 패들 추천", subtitle: "입문자와 동호인을 위한 장비 보기" },
  roadways: { eyebrow: "COUPANG PARTNERS", title: "차량용 여행용품 추천", subtitle: "장거리 이동에 필요한 인기 상품 보기" },
  softwa: { eyebrow: "COUPANG PARTNERS", title: "무선 마우스 추천", subtitle: "업무와 학습에 쓰기 좋은 기기 보기" },
  temon: { eyebrow: "COUPANG PARTNERS", title: "생활용품 추천", subtitle: "일상에 필요한 인기 상품 보기" },
  tennisfrens: { eyebrow: "COUPANG PARTNERS", title: "테니스 라켓 추천", subtitle: "연습과 경기에 필요한 장비 보기" },
  todaypharm: { eyebrow: "COUPANG PARTNERS", title: "건강기능식품 추천", subtitle: "건강 관리에 필요한 인기 상품 보기" },
};

const DEFAULT_COPY: CreativeCopy = {
  eyebrow: "COUPANG PARTNERS",
  title: "쿠팡 추천 상품",
  subtitle: "필요한 상품을 쿠팡에서 확인해 보세요",
};

export function GET(request: Request) {
  const url = new URL(request.url);
  const siteKey = normalizeSiteKey(url.searchParams.get("siteKey"));
  const copy = siteKey ? COPY_BY_SITE[siteKey] ?? DEFAULT_COPY : DEFAULT_COPY;

  return new Response(renderSvg(copy), {
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

function renderSvg(copy: CreativeCopy): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="728" height="90" viewBox="0 0 728 90" role="img" aria-label="${escapeXml(copy.title)}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fff7d6"/>
      <stop offset="1" stop-color="#ffe8a3"/>
    </linearGradient>
  </defs>
  <rect width="728" height="90" rx="14" fill="url(#bg)"/>
  <rect x="1" y="1" width="726" height="88" rx="13" fill="none" stroke="#f4b64a" stroke-width="2"/>
  <text x="32" y="28" fill="#9a4f00" font-family="Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="12" font-weight="700" letter-spacing="1.5">${escapeXml(copy.eyebrow)}</text>
  <text x="32" y="58" fill="#111827" font-family="Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="24" font-weight="800">${escapeXml(copy.title)}</text>
  <text x="314" y="57" fill="#374151" font-family="Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="15" font-weight="600">${escapeXml(copy.subtitle)}</text>
  <rect x="596" y="24" width="100" height="42" rx="21" fill="#111827"/>
  <text x="646" y="51" fill="#ffffff" text-anchor="middle" font-family="Arial, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="15" font-weight="800">자세히 보기</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
