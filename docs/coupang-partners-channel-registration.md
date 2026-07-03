# Coupang Partners Channel Registration

Updated: 2026-07-03

## Purpose

Before publishing Coupang Partners links or banners, register every active blog, website, mobile app, SNS page, or YouTube channel that will display the ads in Coupang Partners account management.

Unregistered-channel promotion can be treated as invalid or abusive activity, so do not enable Coupang creatives on a site until that domain is registered.

## Approval Screenshot

For final approval, publish a visible page containing a Coupang Partners link or banner, then upload a screenshot from My Page after signup.

The 2026-06-11 Coupang Partners guide says final approval is a review of whether the registered activity page follows Partners terms and policy. The guide also says cumulative sales of 150,000 KRW trigger final approval review, performance can be tracked before final approval, but settlement and Partners API use require final approval.

Screenshot checklist:

- Page URL is visible or clearly attributable to the registered domain.
- Coupang Partners link, product card, or banner is visible.
- The affiliate disclosure is close to the link or banner.
- The screenshot shows the link/widget/banner and economic relationship disclosure together.
- The page is publicly reachable and not blocked by login, robots, or draft mode.
- Do not use screenshots from unregistered domains.

Required Korean disclosure:

```text
이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
```

## First Registration Batch

Register these first because they have the strongest domestic product intent and current dashboard signals.

| Priority | Domain | Site ID | First Coupang use |
| --- | --- | --- | --- |
| P0 | todaypharm.kr | todaypharm | 생활건강, 위생용품, 건강기능식품. 의약품/치료 효능 문구 금지 |
| P0 | tennisfrens.com | tennisfrens | 테니스 라켓, 신발, 공, 보호대 |
| P0 | picklefriend.kr | picklefriend | 피클볼 패들, 공, 운동화, 보호대 |
| P0 | dogswhere.com | dogswhere | 반려동물 용품, 이동가방, 배변/사료/간식 |
| P0 | cartain.kr | cartain-2 | 차량용품, 세차용품, 거치대 |
| P1 | temon.kr | temon | 쇼핑/딜/생활용품 |
| P1 | notebook.klick.kr | notebook-klick-2 | 노트북, 전자기기, 주변기기 |
| P1 | softwa.kr | softwa | 소프트웨어 글의 전자기기/주변기기 보조 CTA |
| P1 | dogspang.kr | dogspang-2 | 반려동물 용품 |
| P1 | autoscares.com | autoscares-2 | 차량용품 |
| P1 | roadways.kr | roadways | 여행용품, 차량/이동 용품 |
| P1 | dullegilgogo.kr | dullegilgogo | 여행/등산/걷기 용품 |
| P1 | campgogo.kr | campgogo | 캠핑용품 |

## Channels To Register Before Broad Rollout

The current dashboard snapshot contains these live domains. Register only domains where Coupang links or banners will actually be shown.

```text
2mlab.kr
ai.tasko.kr
askore.kr
autoscares.com
bojo24.kr
campgogo.kr
car.luckyday.kr
caregos.com
cartain.kr
certifi.kr
chatgipt.kr
coinyo.kr
coverclarityhealth.com
crepika.com
discparty.com
dog.klick.kr
dogspang.kr
dogswhere.com
dolbomjigi.ehon365.kr
doseogogo.kr
dullegilgogo.kr
educaer.com
ehon365.kr
esgyo.kr
estat.kr
etique.kr
ezfunnel.kr
fastjob.kr
finan.kr
goesku.com
gong.luckyday.kr
gong365.kr
gover.kr
gpt.nexttech7.com
gradienttrail.com
haemongdream.com
healfood.kr
healthgotoo.com
insupang.com
jasamall.sellerpit.kr
kang4.com
kapti.kr
klick.kr
knewstory.kr
lawer.kr
legalser.com
limsight.kr
localgeo.app
luckyday.kr
luxurytraver.com
mbti.tasko.kr
nexttech7.com
nicewomen.kr
nongsusangogo.kr
notebook.klick.kr
patentgogo.com
petinsuer.com
petjigi.kr
phone.luckyday.kr
picklefriend.kr
pregnancy.ehon365.kr
richyou.kr
rndatlas.com
roadways.kr
runmania.kr
saju.tasko.kr
sellerpit.kr
sinhonjigi.ehon365.kr
smart.sellerpit.kr
softwa.kr
solarpaybackmap.com
sorimate.com
spinkorea.kr
sssaass.com
tasko.kr
temon.kr
tennisfrens.com
texturb.com
today2424.kr
todaypharm.kr
todayshops.kr
trave.kr
travel.sellerpit.kr
travelpang.kr
wattbenchs.com
webtoon.klick.kr
workgogo.kr
yesa.kr
youkamap.kr
yungyanggogo.kr
```

## Operational Rules

- Maintain `data/coupang-channel-registry.json` as the exposure source of truth.
- Treat `data/coupang-channel-registry.json` as the Coupang exposure allowlist. Any domain not listed there must be blocked.
- `not_registered`: not added in Coupang Partners My Page, so block all Coupang links and banners.
- `registered`: added in My Page, but final approval evidence is not complete. Allow only `purpose=approval_screenshot`; keep normal public exposure blocked.
- `screenshot_submitted`: screenshot has been uploaded, but approval is still pending. Allow only `purpose=approval_screenshot`; keep normal public exposure blocked.
- `approved`: registration and screenshot approval are complete, so Coupang links and banners may be shown.
- `rejected` or `paused`: block all Coupang links and banners until the account issue is resolved.
- Use `purpose=approval_screenshot` only on narrow approval evidence pages. Do not use it as a general production traffic bypass.
- Keep Coupang Access Key and Secret Key in server-side environment variables only.
- Use registered `affiliate.subId` only when it exists in the Coupang Partners platform.
- Use `affiliate.subParam` for internal tracking such as `siteId.slotKey.contentSlug`.
- Do not publish Coupang ads on unregistered domains.
- Do not modify API response data, scrape Coupang pages, or call `impressionUrl` before an actual viewport exposure.
- Track monthly payout ceiling risk separately; Coupang states a monthly payout maximum of 30,000,000 KRW.
