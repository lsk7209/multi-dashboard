# AdSense 승인 검토·보완 이력 (SSOT)

> 단일 출처. 사이트 검증/보완 1건마다 해당 행을 갱신하고 커밋한다.
> 우선순위: 거부확정 → GSC 노출 높은순. 보완: 안전항목 자동 / 본문 수동.
> 계획: .omc/plans/adsense-approval-pipeline.md | 최종 갱신: 2026-06-07

## 상태 정의
미신청 → 검토중 → 거부(사유) → 진단완료 → 보완완료 → 재신청 → 승인 / (본문보강필요)

## ✅ 승인 완료 (11)

| 도메인 | 승인일 |
|---|---|
| temon.kr | 2025-06-20 |
| ehon365.kr | 2025-07-24 |
| luckyday.kr | 2025-07-11 |
| klick.kr | 2025-07-11 |
| fastjob.kr | 2025-06-05 |
| haemongdream.com | 2025-06-19 |
| tennisfrens.com | 2025-07-24 |
| tasko.kr | 2025-06-03 |
| nexttech7.com | 2026-02-25 |
| kang4.com | 2025-02-21 |
| sellerpit.kr | 2026-02-13 |

수익화 제외: sorimate.com (쇼핑몰, monetization=false)

## 🔧 미승인 대상 (65) — GSC 노출 높은순

| # | 도메인 | 플랫폼(등록값/실측) | GA4 30d | GSC노출 30d | 상태 | 거부사유 | 진단일 | 보완조치 | 재신청 | 결과 |
|---|---|---|--:|--:|---|---|---|---|---|---|
| 1 | askore.kr | nextjs/Vercel | 55 | 1254 | 보완완료 | thin content | 2026-06-09 | 홈·about·FAQ 콘텐츠 추가. audit verdict→review score=90 | 미신청 | |
| 2 | texturb.com | nextjs/Vercel | 43 | 704 | 보완완료 | thin content | 2026-06-09 | 홈·about·FAQ 콘텐츠 추가. audit verdict→review score=89 | 미신청 | |
| 3 | todayshops.kr | wordpress | 10 | 456 | 보완완료 | 씬 콘텐츠(front/home) | 2026-06-10 | SSH 패치 4회: front(ID=3153)→wc=547, home(ID=776)→wc=538. audit verdict→review score=90 | 미신청 | |
| 4 | softwa.kr | wordpress | 84 | 455 | 검토중 |  |  |  | | |
| 5 | etique.kr | wordpress | 64 | 440 | 보완완료 | Terms 404 | 2026-06-09 | /terms 페이지 생성(ID=2759), codex-adsense-trust-footer MU플러그인 Terms링크 확인, Googlebot 200 검증 | 미신청 | |
| 6 | estat.kr | wordpress | 6 | 334 | 진단완료 | - | 2026-06-09 | About/Contact/Privacy(301)/Terms 모두 200, trust 페이지 완비 | 미신청 | |
| 7 | gong365.kr | nextjs | 16 | 325 | 보완완료 | /check 씬 콘텐츠(86토큰) | 2026-06-09 | About/Contact/Privacy/Terms 모두 200 정상. /check noindex+sitemap제외(d7b4a91). 홈·/check·/regions title/desc에 gong365.kr 키워드 앞배치. /check 콘텐츠 200+토큰(4051a6a). /regions FAQ+콘텐츠 526토큰(091e5ae). canonical www통일(338fddf). audit verdict→review score=96 | 미신청 | |
| 8 | cartain.kr | wordpress/**Vite SPA** | 483 | 284 | 보완완료→재심사대기 | 가치없는 콘텐츠(빈 SPA·404) | 2026-06-07 | 봇 SSR(Edge Middleware) 작동확인: Googlebot/Mediapartners-Google 글 본문 1504자·JSON-LD·about 200, 사람 SPA 유지. SPA fallback로 404 해소. sitemap non-www 통일 | 대기(콘텐츠양산 30일+) | |
| 9 | today2424.kr | wordpress | 44 | 256 | 보완완료 | 콘텐츠 충분 | 2026-06-10 | bot 11,410토큰 — 패치 불필요 | | |
| 10 | petinsuer.com | wordpress | 21 | 249 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=87 (별도 패치 불필요) | | |
| 11 | discparty.com | wordpress | 46 | 174 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=87 (별도 패치 불필요) | | |
| 12 | bojo24.kr | wordpress | 2709 | 161 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=88 (별도 패치 불필요) | | |
| 13 | finan.kr | wordpress | 0 | 161 | 보완완료 | Terms 404 | 2026-06-09 | /terms 페이지(ID=24601) rewrite flush로 200 복구, codex-adsense-trust-footer MU플러그인 Terms링크 확인 | 미신청 | |
| 14 | picklefriend.kr | wordpress | 163 | 125 | 보완완료 | 콘텐츠 충분 | 2026-06-10 | bot 21,876토큰 — 패치 불필요 | | |
| 15 | dogspang.kr | wordpress | 104 | 119 | 진단완료 | 플레이스홀더포스트(post-3) | 2026-06-09 | post-3 이미 draft·404·sitemap제외 확인, About/Contact/Privacy(301)/Terms/Terms-of-service 모두 200 | 미신청 | |
| 16 | dogswhere.com | nextjs/Vercel | 32 | 100 | 보완완료 | thin content(홈 375·mung-bti 383) | 2026-06-10 | 홈 나들이가이드 4카드 추가(506토큰)·mung-bti 안내 섹션 추가(523토큰) | 미신청 | |
| 17 | travelpang.kr | wordpress | 19 | 89 | 보완완료 | thin content 점검 | 2026-06-09 | 홈(433→16620토큰)·services(228→20388토큰) SSH PHP패치. audit verdict→review | | |
| 18 | goesku.com | wordpress | 20 | 79 | 검토중 |  |  |  | | |
| 19 | insupang.com | wordpress | 17 | 63 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=93 (별도 패치 불필요) | | |
| 20 | gover.kr | wordpress | 73 | 59 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=90 (별도 패치 불필요) | | |
| 21 | legalser.com | wordpress | 24 | 43 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=93 (별도 패치 불필요) | | |
| 22 | chatgipt.kr | wordpress | 24 | 40 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=87 (별도 패치 불필요) | | |
| 23 | homeimer.com | wordpress | 3 | 27 | 보완완료 | 씬 콘텐츠(about/contact/terms) | 2026-06-10 | SSH 패치 3회: home(ID=24)→wc=568, about(ID=10239)→wc=575, contact(ID=10241)→wc=523, terms(ID=10243)→wc=646. audit verdict→review score=93 | 미신청 | |
| 24 | sssaass.com | wordpress | 14 | 20 | 보완완료 | 씬 콘텐츠(front) | 2026-06-10 | SSH 패치 2회: front(ID=317)→wc=591. audit verdict→review score=92 | 미신청 | |
| 25 | knewstory.kr | wordpress | 55 | 18 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=87 (별도 패치 불필요) | | |
| 26 | autoscares.com | wordpress | 26 | 17 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=87 (별도 패치 불필요) | | |
| 27 | trave.kr | wordpress | 111 | 11 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=87 (별도 패치 불필요) | | |
| 28 | richyou.kr | wordpress | 32 | 9 | 보완완료 | 콘텐츠 충분 | 2026-06-10 | bot 8,585토큰 — 패치 불필요 (1번서버 nexttech) | | |
| 29 | lawer.kr | wordpress | 8 | 8 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=88 (별도 패치 불필요) | | |
| 30 | healfood.kr | wordpress | 19 | 7 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=87 (별도 패치 불필요) | | |
| 31 | luxurytraver.com | wordpress | 0 | 7 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=89 (별도 패치 불필요) | | |
| 32 | spinkorea.kr | wordpress | 298 | 5 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=96 (별도 패치 불필요) | | |
| 33 | ezfunnel.kr | wordpress | 25 | 5 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=87 (별도 패치 불필요) | | |
| 34 | todaypharm.kr | **Next.js**/Vercel | 2024 | 3 | 보완완료 | thin content(ai_summary없는 24k 페이지) | 2026-06-07 | generateTemplateContent() 추가(nutrition_facts·tags·additives로 자동본문), isThin noindex | 미신청 | |
| 35 | 2mlab.kr | wordpress | 185 | 3 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=87 (별도 패치 불필요) | | |
| 36 | petjigi.kr | wordpress | 91 | 3 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=92 (별도 패치 불필요) | | |
| 37 | healthgotoo.com | wordpress | 103 | 2 | 보완완료 | thin content | 2026-06-09 | 홈(512)·disclaimer(508) PHP패치 5회→500+토큰. audit verdict→review score=88 | 미신청 | |
| 38 | roadways.kr | wordpress | 46 | 2 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=92 (별도 패치 불필요) | | |
| 39 | dolbomjigi.ehon365.kr | wordpress | 0 | 2 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=92 (별도 패치 불필요) | | |
| 40 | yesa.kr | wordpress | 51 | 1 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=88 (별도 패치 불필요) | | |
| 41 | runmania.kr | wordpress | 48 | 1 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=86 (별도 패치 불필요) | | |
| 42 | gpt.nexttech7.com | wordpress | 4 | 1 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=95 (별도 패치 불필요) | | |
| 43 | educaer.com | wordpress | 9 | 1 | 보완완료 | thin content | 2026-06-09 | home(515)·disclaimer(506)·editorial-policy(508) PHP패치 4회→500+토큰. audit verdict→review score=96 | 미신청 | |
| 44 | mbti.tasko.kr | wordpress | 238 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=87 (별도 패치 불필요) | | |
| 45 | dog.klick.kr | wordpress | 40 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=92 (별도 패치 불필요) | | |
| 46 | notebook.klick.kr | wordpress | 56 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=89 (별도 패치 불필요) | | |
| 47 | webtoon.klick.kr | wordpress | 19 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=90 (별도 패치 불필요) | | |
| 48 | campgogo.kr | wordpress | 19 | 0 | 검토중 |  |  |  | | |
| 49 | crepika.com | vite | 197 | 0 | 보완완료 | 콘텐츠 충분 | 2026-06-10 | bot 943토큰(home·tools 동일) — 패치 불필요 | | |
| 50 | dullegilgogo.kr | wordpress | 14 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=93 (별도 패치 불필요) | | |
| 51 | smart.sellerpit.kr | wordpress | 12 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=97 (별도 패치 불필요) | | |
| 52 | nicewomen.kr | wordpress | 79 | 0 | 보완완료 | 콘텐츠 충분 | 2026-06-10 | bot 19,158토큰 — 패치 불필요 (1번서버 nexttech) | | |
| 53 | saju.tasko.kr | wordpress | 26 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=86 (별도 패치 불필요) | | |
| 54 | sinhonjigi.ehon365.kr | nextjs | 6 | 0 | 보완완료 | 콘텐츠 충분(SSR) | 2026-06-10 | Next.js SSR → bot 4,882토큰 — 패치 불필요 | | |
| 55 | jasamall.sellerpit.kr | wordpress | 5 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=92 (별도 패치 불필요) | | |
| 56 | travel.sellerpit.kr | wordpress | 4 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=92 (별도 패치 불필요) | | |
| 57 | certifi.kr | wordpress | 17 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=89 (별도 패치 불필요) | | |
| 58 | car.luckyday.kr | wordpress | 42 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=92 (별도 패치 불필요) | | |
| 59 | coinyo.kr | wordpress | 12 | 0 | 보완완료 | 씬 콘텐츠(front) | 2026-06-10 | SSH 패치 2회: front(ID=296)→wc=535. audit verdict→review score=88 | 미신청 | |
| 60 | pregnancy.ehon365.kr | nextjs | 2 | 0 | 보완완료 | 콘텐츠 충분(SSR) | 2026-06-10 | Next.js SSR → bot 2,937토큰 — 패치 불필요 | | |
| 61 | phone.luckyday.kr | wordpress | 18 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=94 (별도 패치 불필요) | | |
| 62 | gong.luckyday.kr | wordpress | 7 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=89 (별도 패치 불필요) | | |
| 63 | esgyo.kr | wordpress | 0 | 0 | 검토중 |  |  |  | | |
| 64 | ai.tasko.kr | wordpress | 5 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=94 (별도 패치 불필요) | | |
| 65 | workgogo.kr | wordpress | 0 | 0 | 보완완료 | thin content 점검 | 2026-06-09 | audit verdict→review score=94 (별도 패치 불필요) | | |
| 66 | doseogogo.kr | nextjs/Vercel | - | - | 보완완료 | thin content | 2026-06-09 | /recommend·FAQ 콘텐츠 추가. audit verdict→review score=90 | 미신청 | |
| 67 | yungyanggogo.kr | nextjs/Vercel | - | - | 보완완료 | thin content(홈 222토큰·Turbopack 빌드 실패) | 2026-06-10 | Unicode 따옴표(U+201D)→ASCII 치환으로 빌드 복구. trust/guide/FAQ/nutrition 섹션 추가. audit verdict→review score=90 | 미신청 | |

## 색인 진입 필요 (GSC 노출 0 — AdSense 이전 선결)
Tier3: sitemap·Indexing API·콘텐츠로 색인부터. 위 표에서 GSC노출 0인 행들.
