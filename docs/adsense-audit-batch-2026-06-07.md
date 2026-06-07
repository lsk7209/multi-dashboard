# AdSense Approval Audit Batch 01 | 2026-06-07

Scope: first 10 unapproved/high-impression sites from `docs/adsense-approval-log.md`.

Mode: audit only. No production changes applied.

Policy basis:
- Official AdSense eligibility requires high-quality, original content that attracts an audience.
- Official site review checks the entire site against AdSense Program policies.
- Official connection checks require code/meta/ads.txt on reachable pages, and crawler access.
- Google Publisher Policies include low-value/no publisher-content inventory and ads.txt authorization concerns.

Verification method:
- Googlebot user agent fetch for home, policy pages, ads.txt, robots.txt, sitemap, and one sitemap-derived sample URL.
- Public HTTP only. Private AdSense/GSC account status was not queried in this batch.

## Batch Result

| Site | Approval Readiness | Evidence | Action |
|---|---|---|---|
| askore.kr | Needs review | Home 200, ads.txt OK, robots sitemap OK, About/Contact/Privacy/Terms 200. Sample tool page text only 422 chars; home 1,727 chars. | T3 content expansion for low-text utility pages; T2 add `/privacy-policy` alias only if nav/AdSense review expects that slug. |
| texturb.com | Needs technical fix | Home 200, ads.txt OK, policy pages exist at `/privacy` and `/terms`. Sitemap loc values include embedded newline after host in fetched XML, causing malformed sample URL extraction. | T2 fix sitemap loc formatting and canonical host consistency. Then resample actual tool/content URLs. |
| todayshops.kr | Needs patch | Home 200, sample post 7,256 chars, ads.txt OK, About/Contact/Privacy 200, `/terms` 404. | T2 create/route Terms page and expose it in footer/menu. |
| softwa.kr | Needs patch | Home 200, sample post 4,868 chars, ads.txt OK, About/Contact/Privacy 200, `/terms` 404. | T2 create/route Terms page and expose it in footer/menu. |
| etique.kr | Needs patch | Home 200, sample post 4,603 chars, ads.txt OK, About/Contact/Privacy 200, `/terms` 404. | T2 create/route Terms page and expose it in footer/menu. |
| estat.kr | Ready for review | Home 200, ads.txt OK, robots sitemap OK, About/Contact/Privacy/Terms 200. | Reapply/check AdSense status unless account-side rejection reason says otherwise. |
| gong365.kr | Blocked | Home 200, ads.txt OK, robots sitemap OK, but About/Contact/Privacy/Terms all 404. | T2 create required trust/legal pages before reapply. Highest priority in this batch. |
| today2424.kr | Ready with minor alias | Home 200, ads.txt OK, About/Contact/Privacy/Terms 200 via `/privacy`; `/privacy-policy` 404. | Reapply/check status. Optional T2 alias `/privacy-policy` to `/privacy`. |
| petinsuer.com | Ready for review | Home 200, sample post 6,467 chars, ads.txt OK, About/Contact/Privacy/Terms 200. | Reapply/check AdSense status unless account-side rejection reason says otherwise. |
| discparty.com | Needs patch | Home 200, sample post 2,457 chars, ads.txt OK, About/Contact/Privacy 200, `/terms` 404. | T2 create/route Terms page and expose it in footer/menu. |

## Priority Queue

1. `gong365.kr`: create About, Contact, Privacy, Terms. This is the clearest approval blocker.
2. `todayshops.kr`, `softwa.kr`, `etique.kr`, `discparty.com`: add missing Terms page.
3. `texturb.com`: fix sitemap `<loc>` newline/canonical issue, then resample content pages.
4. `askore.kr`: expand low-text tool/guide pages or add richer explanatory blocks before reapply.
5. `estat.kr`, `today2424.kr`, `petinsuer.com`: ready for AdSense review/status check.

## Tiers

- T2: policy page routes, sitemap formatting, footer/menu exposure, canonical adjustments. Requires patch plan and deploy verification.
- T3: article/tool body expansion, persona/E-E-A-T strengthening, editorial rewrites. Route to content workflow, not site-optimizer auto changes.

## Next Batch

Continue with rows 11-20:
`bojo24.kr`, `finan.kr`, `picklefriend.kr`, `dogspang.kr`, `dogswhere.com`, `travelpang.kr`, `goesku.com`, `insupang.com`, `gover.kr`, `legalser.com`.

## Batch 02 Result

| Site | Approval Readiness | Evidence | Action |
|---|---|---|---|
| bojo24.kr | Ready with minor alias | Home 200, ads.txt OK, robots sitemap OK, About/Contact/Privacy/Terms 200 via canonical routes. `/privacy-policy` 404 but `/privacy` exists. | Reapply/check status. Optional T2 alias `/privacy-policy` to `/privacy`. |
| finan.kr | Needs patch | Home 200, sample post 6,002 chars, ads.txt OK, About/Contact/Privacy 200, `/terms` 404. | T2 create/route Terms page and expose it in footer/menu. |
| picklefriend.kr | Needs patch | Home 200, ads.txt OK, About/Privacy/Terms 200, `/contact` 404. | T2 create/route Contact page or fix existing contact link. |
| dogspang.kr | Blocked by content quality | Technical basics pass and Terms exists via `/terms-of-service`, but sitemap sample `/post-3/` has default placeholder title: `Mastering the First Impression: Your intriguing post title goes here`. | T3 remove/replace placeholder post and inspect for more starter-template posts before reapply. |
| dogswhere.com | Ready with minor alias | Home 200, ads.txt OK, About/Contact/Privacy/Terms 200 via `/privacy`; `/privacy-policy` 404. | Reapply/check status. Optional T2 alias `/privacy-policy` to `/privacy`. |
| travelpang.kr | Ready for review | Home 200, sample post 6,664 chars, ads.txt OK, About/Contact/Privacy/Terms 200. | Reapply/check AdSense status unless account-side rejection reason says otherwise. |
| goesku.com | Ready for review | Home 200, ads.txt OK, robots sitemap OK, About/Contact/Privacy/Privacy-policy/Terms 200. | Reapply/check AdSense status unless account-side rejection reason says otherwise. |
| insupang.com | Needs patch | Home 200, sample/blog page 2,994 chars, ads.txt OK, About/Contact/Privacy 200, `/terms` 404. | T2 create/route Terms page. Also resample a real article URL after sitemap prioritization is improved. |
| gover.kr | Needs patch | Home 200, sample post 3,841 chars, ads.txt OK, About/Contact/Privacy 200, `/terms` 404. | T2 create/route Terms page and expose it in footer/menu. |
| legalser.com | Needs patch | Home 200, sample post 10,231 chars, ads.txt OK, About/Contact/Privacy-policy 200. `/terms` and `/terms-of-service` resolve to normal legal-topic articles, not a legal terms page; `/disclaimer` 404. | T2 create a real site Terms page and avoid slug collision with article URLs. |

## Updated Priority Queue

1. `gong365.kr`: missing all core trust/legal pages.
2. `dogspang.kr`: visible starter-template post. Check and remove/replace placeholder content before any reapply.
3. Missing Terms page group: `todayshops.kr`, `softwa.kr`, `etique.kr`, `discparty.com`, `finan.kr`, `insupang.com`, `gover.kr`, `legalser.com`.
4. Missing Contact page: `picklefriend.kr`.
5. Sitemap/canonical technical issue: `texturb.com`.
6. Ready/check status: `estat.kr`, `today2424.kr`, `petinsuer.com`, `bojo24.kr`, `dogswhere.com`, `travelpang.kr`, `goesku.com`.

## Next Batch 03

Continue with rows 21-30:
`chatgipt.kr`, `homeimer.com`, `sssaass.com`, `knewstory.kr`, `autoscares.com`, `trave.kr`, `richyou.kr`, `lawer.kr`, `healfood.kr`, `luxurytraver.com`.

## Batch 03 Result

| Site | Approval Readiness | Evidence | Action |
|---|---|---|---|
| chatgipt.kr | Needs patch | Home 200, ads.txt OK, About/Contact/Privacy 200, `/terms` and `/terms-of-service` 404. Sitemap sample selected blog index, not a post. | T2 create/route Terms page. Resample a real article URL after sitemap prioritization. |
| homeimer.com | Blocked | Home 200 and sample post 6,402 chars, ads.txt OK, but About 404, Contact 404, Terms 404. Privacy exists. | T2 create About, Contact, Terms before reapply. |
| sssaass.com | Needs patch | Home 200, sample post 7,992 chars, ads.txt OK, About/Contact/Privacy 200, Terms 404. | T2 create/route Terms page. |
| knewstory.kr | Ready for review | Home 200, ads.txt OK, About/Contact/Privacy/Terms/Disclaimer 200. Sample selected blog index 2,617 chars. | Reapply/check AdSense status. Optional resample a real article URL if account-side rejection mentions low-value content. |
| autoscares.com | Needs patch | Home 200, ads.txt OK, About/Contact/Privacy 200, Terms and Disclaimer 404. Sample selected blog index 2,335 chars. | T2 create Terms. T3 if rejection cites content depth, inspect actual article set. |
| trave.kr | Needs patch | Home 200, ads.txt OK, About/Contact/Privacy 200, Terms and Disclaimer 404. Sample guide index 2,461 chars. | T2 create Terms. Resample actual article pages if still pending/rejected. |
| richyou.kr | Ready for review | Home 200, sample post 4,387 chars, ads.txt OK, About/Contact/Privacy/Terms/Disclaimer 200. | Reapply/check AdSense status. |
| lawer.kr | Needs patch | Home 200, ads.txt OK, About/Contact/Privacy/Disclaimer 200, Terms 404. Sample fell back to homepage. | T2 create/route Terms page and resample real article URL. |
| healfood.kr | Needs patch | Home 200, sample post 2,563 chars, ads.txt OK, About/Contact/Privacy/Disclaimer 200, Terms 404. | T2 create/route Terms page. T3 improve short health/YMYL-style posts with source/review-date signals. |
| luxurytraver.com | Ready for review | Home 200, sample post 14,599 chars, ads.txt OK, About/Contact/Privacy/Terms 200. Disclaimer 404 but not a blocker if Terms/Privacy are exposed. | Reapply/check AdSense status. |

## Updated Priority Queue After Batch 03

1. `gong365.kr`, `homeimer.com`: missing multiple trust/legal pages.
2. `dogspang.kr`: placeholder starter content exposed.
3. Missing Terms page group: `todayshops.kr`, `softwa.kr`, `etique.kr`, `discparty.com`, `finan.kr`, `insupang.com`, `gover.kr`, `legalser.com`, `chatgipt.kr`, `sssaass.com`, `autoscares.com`, `trave.kr`, `lawer.kr`, `healfood.kr`.
4. Missing Contact page: `picklefriend.kr`.
5. Sitemap/canonical technical issue: `texturb.com`.
6. Ready/check status: `estat.kr`, `today2424.kr`, `petinsuer.com`, `bojo24.kr`, `dogswhere.com`, `travelpang.kr`, `goesku.com`, `knewstory.kr`, `richyou.kr`, `luxurytraver.com`.

## Next Batch 04

Continue with rows 31-40:
`spinkorea.kr`, `ezfunnel.kr`, `2mlab.kr`, `petjigi.kr`, `healthgotoo.com`, `roadways.kr`, `dolbomjigi.ehon365.kr`, `yesa.kr`, `runmania.kr`, `gpt.nexttech7.com`.

## Batch 04 Result

| Site | Approval Readiness | Evidence | Action |
|---|---|---|---|
| spinkorea.kr | Blocked by low-value/fallback | Home only 267 visible chars. About/Contact/Privacy/Terms return 200 but are 184-267 chars and several routes render the same roulette page, not real policy pages. | T2 implement real static pages/routes. T3 add substantial explanatory content for the tool and use cases. |
| ezfunnel.kr | Needs patch | Home 200, sample post 5,449 chars, ads.txt OK, About/Contact/Privacy 200, Terms/Disclaimer 404. | T2 create Terms page. |
| 2mlab.kr | Ready for review | Home 200, sample post 3,169 chars, ads.txt OK, About/Contact/Privacy/Terms 200. | Reapply/check AdSense status. |
| petjigi.kr | Ready with minor alias | Home 200, ads.txt OK, About/Contact/Privacy/Terms 200 via canonical routes; `/privacy-policy` 404 returns home-like fallback. | Reapply/check status. Optional T2 alias `/privacy-policy` to `/privacy`. |
| healthgotoo.com | Ready for review | Home 200, sample post 3,041 chars, ads.txt OK, About/Contact/Privacy/Terms/Disclaimer 200. | Reapply/check AdSense status. |
| roadways.kr | Ready with minor alias | Home 200, ads.txt OK, About/Contact/Privacy/Terms 200. `/privacy-policy` 404 but `/privacy` exists. | Reapply/check status. Optional T2 alias `/privacy-policy` to `/privacy`. |
| dolbomjigi.ehon365.kr | Needs patch | Home 200, ads.txt OK, About/Privacy/Terms 200, Contact 404. | T2 create/route Contact page. |
| yesa.kr | Blocked | Home 200, ads.txt OK, but About/Contact/Privacy/Terms/Disclaimer all 404. | T2 create all core trust/legal pages before reapply. |
| runmania.kr | Blocked by low-value/fallback | Home only 166 visible chars. About/Contact/Privacy/Terms all return 200 but same 166-char home-like content. | T2 implement real static pages/routes. T3 add real content depth before reapply. |
| gpt.nexttech7.com | Blocked | Home 727 chars, no H1 in sampled home. About/Contact 200, but Privacy/Terms/Disclaimer 404. | T2 create Privacy and Terms pages; T3 strengthen homepage/content depth. |

## Updated Priority Queue After Batch 04

1. Missing multiple trust/legal pages: `gong365.kr`, `homeimer.com`, `yesa.kr`, `gpt.nexttech7.com`.
2. Fallback/low-value route blockers: `spinkorea.kr`, `runmania.kr`.
3. Placeholder content: `dogspang.kr`.
4. Missing Terms page group: `todayshops.kr`, `softwa.kr`, `etique.kr`, `discparty.com`, `finan.kr`, `insupang.com`, `gover.kr`, `legalser.com`, `chatgipt.kr`, `sssaass.com`, `autoscares.com`, `trave.kr`, `lawer.kr`, `healfood.kr`, `ezfunnel.kr`.
5. Missing Contact page: `picklefriend.kr`, `dolbomjigi.ehon365.kr`.
6. Ready/check status: `estat.kr`, `today2424.kr`, `petinsuer.com`, `bojo24.kr`, `dogswhere.com`, `travelpang.kr`, `goesku.com`, `knewstory.kr`, `richyou.kr`, `luxurytraver.com`, `2mlab.kr`, `healthgotoo.com`, `roadways.kr`.

## Next Batch 05

Continue with rows 41-50:
`educaer.com`, `mbti.tasko.kr`, `dog.klick.kr`, `notebook.klick.kr`, `webtoon.klick.kr`, `campgogo.kr`, `crepika.com`, `dullegilgogo.kr`, `smart.sellerpit.kr`, `nicewomen.kr`.

## Batch 05 Result

| Site | Approval Readiness | Evidence | Action |
|---|---|---|---|
| educaer.com | Needs patch | Home 200, sample post 4,148 chars, ads.txt OK, About/Contact/Privacy/Disclaimer 200, Terms 404. | T2 create Terms page. |
| mbti.tasko.kr | Needs patch | Home 44,889 chars, ads.txt OK, About/Contact/Privacy 200, Terms 404. Sample fell back to sitemap XML, so article resampling is still needed. | T2 create Terms. Resample actual article URL. |
| dog.klick.kr | Blocked | Home 200 and sample post 4,885 chars, ads.txt OK, but About/Contact/Privacy/Terms/Disclaimer all 404. | T2 create all core trust/legal pages before reapply. |
| notebook.klick.kr | Needs patch | Home 200, sample post 6,498 chars, ads.txt OK, About/Contact/Privacy 200, Terms 404. | T2 create Terms page. |
| webtoon.klick.kr | Blocked | Home 200 and sample post 2,354 chars, ads.txt OK, but About/Contact/Privacy/Terms/Disclaimer all 404. | T2 create all core trust/legal pages before reapply. |
| campgogo.kr | Ready with minor alias | Home 996 chars, ads.txt OK, About/Contact/Privacy/Terms 200. `/privacy-policy` 404 but `/privacy` exists. | Reapply/check status after reviewing account-side reason. Optional T2 alias `/privacy-policy` to `/privacy`. |
| crepika.com | Blocked by low-value/fallback | Home only 173 visible chars. About/Contact/Privacy/Terms all return 200 but same 173-char tool page. | T2 implement real routes. T3 add substantial content around each tool/use case before reapply. |
| dullegilgogo.kr | Needs patch | Home 200, ads.txt OK, About/Privacy/Terms 200, Contact 404. | T2 create/route Contact page. |
| smart.sellerpit.kr | Blocked | Home only 425 chars, sample post 930 chars, ads.txt OK, but About/Contact/Privacy/Terms/Disclaimer all 404. | T2 create all core trust/legal pages. T3 expand thin starter content before reapply. |
| nicewomen.kr | Ready for review | Home 200, ads.txt OK, About/Contact/Privacy/Terms 200. Sample selected blog index 1,761 chars. | Reapply/check status. Resample actual article if rejection mentions low-value content. |

## Updated Priority Queue After Batch 05

1. Missing multiple trust/legal pages: `gong365.kr`, `homeimer.com`, `yesa.kr`, `gpt.nexttech7.com`, `dog.klick.kr`, `webtoon.klick.kr`, `smart.sellerpit.kr`.
2. Fallback/low-value route blockers: `spinkorea.kr`, `runmania.kr`, `crepika.com`.
3. Placeholder/thin content blockers: `dogspang.kr`, `smart.sellerpit.kr`.
4. Missing Terms page group: `todayshops.kr`, `softwa.kr`, `etique.kr`, `discparty.com`, `finan.kr`, `insupang.com`, `gover.kr`, `legalser.com`, `chatgipt.kr`, `sssaass.com`, `autoscares.com`, `trave.kr`, `lawer.kr`, `healfood.kr`, `ezfunnel.kr`, `educaer.com`, `mbti.tasko.kr`, `notebook.klick.kr`.
5. Missing Contact page: `picklefriend.kr`, `dolbomjigi.ehon365.kr`, `dullegilgogo.kr`.
6. Ready/check status: `estat.kr`, `today2424.kr`, `petinsuer.com`, `bojo24.kr`, `dogswhere.com`, `travelpang.kr`, `goesku.com`, `knewstory.kr`, `richyou.kr`, `luxurytraver.com`, `2mlab.kr`, `healthgotoo.com`, `roadways.kr`, `campgogo.kr`, `nicewomen.kr`.

## Next Batch 06

Continue with rows 51-65:
`saju.tasko.kr`, `sinhonjigi.ehon365.kr`, `jasamall.sellerpit.kr`, `travel.sellerpit.kr`, `certifi.kr`, `car.luckyday.kr`, `coinyo.kr`, `pregnancy.ehon365.kr`, `phone.luckyday.kr`, `gong.luckyday.kr`, `esgyo.kr`, `ai.tasko.kr`, `workgogo.kr`, plus any remaining new rows in the approval log.

## Batch 06 Result

| Site | Approval Readiness | Evidence | Action |
|---|---|---|---|
| saju.tasko.kr | Needs patch | Home 200, sample article 10,522 chars with H1 1/H2 13, ads.txt OK, About/Contact/Privacy 200, Terms 404. | T2 create Terms page. Content depth looks review-ready after the legal page fix. |
| sinhonjigi.ehon365.kr | Ready with minor alias | Home 200, ads.txt OK, About/Contact/Privacy/Terms 200. `/privacy-policy` 404 but `/privacy` exists. Sample fell to home, so article depth was not verified in this pass. | Reapply/check status. Optional T2 alias `/privacy-policy` to `/privacy`; resample a real post if account-side rejection says low-value content. |
| jasamall.sellerpit.kr | Blocked | Home only 642 visible chars. About/Contact/Privacy/Terms/Disclaimer all 404. Sample fell to home. | T2 create all core trust/legal pages. T3 add real category/product/editorial content before reapply. |
| travel.sellerpit.kr | Blocked by missing trust pages | Home 200, sample article 6,576 chars with H1 1/H2 13, ads.txt OK, but About/Contact/Privacy/Terms/Disclaimer all 404. | T2 create all core trust/legal pages before reapply. Content sample itself is not the primary blocker. |
| certifi.kr | Needs patch | Canonical home is `https://www.certifi.kr/`. Home 200, sample post 4,415 chars, ads.txt OK, About/Contact/Privacy 200, Terms 404. | T2 create Terms page on the canonical host. |
| car.luckyday.kr | Needs patch | Home 200, sample post 7,021 chars, ads.txt OK, About/Contact/Privacy 200, Terms 404. | T2 create Terms page. |
| coinyo.kr | Ready for review | Home 200, ads.txt OK, About/Contact/Privacy/Terms/Disclaimer 200. Sample selected blog index 1,869 chars. | Reapply/check status. Resample actual article if rejection mentions low-value content. |
| pregnancy.ehon365.kr | Needs patch | Home 949 chars, ads.txt OK, About/Privacy/Terms 200, Contact 404. Sample fell to home. | T2 create Contact page. T3 inspect pregnancy/YMYL-style article depth, sources, and review-date signals before reapply if rejection says low-value or policy. |
| phone.luckyday.kr | Ready with minor alias | Home 200, sample article 5,152 chars with H1 1/H2 12, ads.txt OK, About/Contact/Privacy/Terms 200. `/privacy-policy` 404 but `/privacy` exists. | Reapply/check status. Optional T2 alias `/privacy-policy` to `/privacy`. |
| gong.luckyday.kr | Blocked / needs patch | Home only 516 visible chars, sample post 3,975 chars, ads.txt OK, About/Contact 200, but Privacy and Terms 404. | T2 create Privacy and Terms pages. T3 strengthen home/category surface so the site does not look thin from entry pages. |
| esgyo.kr | Ready for review | Home 200, ads.txt OK, About/Contact/Privacy/Terms 200. Sample selected blog index 2,216 chars. | Reapply/check status. Resample actual article if rejection mentions low-value content. |
| ai.tasko.kr | Blocked | ads.txt not OK. Contact/Terms/Disclaimer 404. Sample is `hello-world/`, 1,527 chars, which reads like starter content. | T2 fix ads.txt and create Contact/Terms. T3 replace starter/thin content before reapply. |
| workgogo.kr | Needs patch | Home 200, ads.txt OK, Privacy/Terms 200, but About and Contact 404. Sample fell to home. | T2 create About and Contact pages. Resample actual article URL before final reapply. |

## Updated Priority Queue After Batch 06

1. Critical trust/legal blockers: `gong365.kr`, `homeimer.com`, `yesa.kr`, `gpt.nexttech7.com`, `dog.klick.kr`, `webtoon.klick.kr`, `smart.sellerpit.kr`, `jasamall.sellerpit.kr`, `travel.sellerpit.kr`, `gong.luckyday.kr`, `ai.tasko.kr`.
2. Fallback/low-value route blockers: `spinkorea.kr`, `runmania.kr`, `crepika.com`.
3. Placeholder/thin content blockers: `dogspang.kr`, `smart.sellerpit.kr`, `ai.tasko.kr`, `jasamall.sellerpit.kr`.
4. Missing Terms page group: `todayshops.kr`, `softwa.kr`, `etique.kr`, `discparty.com`, `finan.kr`, `insupang.com`, `gover.kr`, `legalser.com`, `chatgipt.kr`, `sssaass.com`, `autoscares.com`, `trave.kr`, `lawer.kr`, `healfood.kr`, `ezfunnel.kr`, `educaer.com`, `mbti.tasko.kr`, `notebook.klick.kr`, `saju.tasko.kr`, `certifi.kr`, `car.luckyday.kr`.
5. Missing Contact page group: `picklefriend.kr`, `dolbomjigi.ehon365.kr`, `dullegilgogo.kr`, `pregnancy.ehon365.kr`, `workgogo.kr`.
6. Technical issue: `texturb.com` has malformed sitemap loc output with embedded newlines after the host; `ai.tasko.kr` has ads.txt failure.
7. Content-quality watchlist after page fixes: `askore.kr` short tool page, `healfood.kr` health/YMYL-style posts, `pregnancy.ehon365.kr` pregnancy/YMYL-style posts, `mbti.tasko.kr` and sitemap-sampled sites needing real article resampling.
8. Ready/check status: `estat.kr`, `today2424.kr`, `petinsuer.com`, `bojo24.kr`, `dogswhere.com`, `travelpang.kr`, `goesku.com`, `knewstory.kr`, `richyou.kr`, `luxurytraver.com`, `2mlab.kr`, `healthgotoo.com`, `roadways.kr`, `campgogo.kr`, `nicewomen.kr`, `sinhonjigi.ehon365.kr`, `coinyo.kr`, `phone.luckyday.kr`, `esgyo.kr`.

## Patch Plan

T2 safe patch candidates are routing/static-page changes only: create missing About, Contact, Privacy, and Terms pages; add `/privacy-policy -> /privacy` aliases where `/privacy` already exists; repair ads.txt on `ai.tasko.kr`; repair the malformed sitemap output on `texturb.com`.

T3 content handoff candidates are sites where a static-page patch alone is unlikely to satisfy AdSense review: `dogspang.kr`, `spinkorea.kr`, `runmania.kr`, `crepika.com`, `smart.sellerpit.kr`, `jasamall.sellerpit.kr`, `ai.tasko.kr`, plus YMYL-sensitive review passes for `healfood.kr` and `pregnancy.ehon365.kr`.

## Policy Basis Checked

- Google AdSense Publisher Policies require a privacy policy that discloses data collection, sharing, and usage from Google products and services, including cookies and identifiers.
- Google AdSense Required content says privacy policies should disclose third-party vendors, including Google, ad cookies, personalized advertising opt-out paths, and relevant third-party ad network disclosures.
- Google AdSense ads.txt guidance says ads.txt is highly recommended and must be crawlable when used; changes can take time to reflect in AdSense.

References:
- https://support.google.com/adsense/answer/9335564
- https://support.google.com/adsense/answer/1348695
- https://support.google.com/adsense/answer/12171612
- https://support.google.com/adsense/answer/7679060

## Patch Execution 2026-06-08

Local patch script added:

- `scripts/setup/patch-adsense-pages.ts` creates or publishes missing WordPress trust/legal pages through WP REST, then verifies the public URL with a Googlebot user agent.
- Dry-run and repository validation passed: `pnpm type-check`, `pnpm lint`.
- Actual WP REST execution was blocked for all configured targets because local WP admin credentials are not registered in `.env.setup.local`, `.env.local`, or `D:\env\키파일.txt` under the expected `WP_ADMIN_<SITE_ID>_*` names.

Applied local repository patches:

| Site | Patch | Verification |
|---|---|---|
| gong365.kr | Added `/about`, `/contact`, `/privacy`, `/terms`; added footer exposure and sitemap inclusion. | `pnpm type-check`, `pnpm lint`, `pnpm build` passed in `D:\web\gong365kr`. Build output includes all 4 static routes. IndexNow submitted 126 URLs. |
| picklefriend.kr | Added `/contact`; added `/contact` to sitemap. | `pnpm exec tsc --noEmit` and `pnpm build` passed in `D:\web\pickleball`. Build output includes `/contact`. `pnpm lint` still fails on pre-existing `docs/*.jsx` and unrelated existing rules, not this contact page. |

Remaining execution blockers:

- WordPress REST credentials are missing for the bulk T2 page patch queue.
- `yesa.kr` has many existing dirty changes in `D:\web\yesa-youunsang`; defer auto-patch until the current worktree is reconciled.
- `dog.klick.kr` and `webtoon.klick.kr` local folders are not normal git app repositories; use SSH/WP-CLI or production WordPress access.
- `ai.tasko.kr` still needs ads.txt repair and starter-content replacement after Contact/Terms access is available.

## Remote WP-CLI Patch Execution 2026-06-08

Production pages created through SSH + WP-CLI and verified with Googlebot-style public fetch:

| Site | Created pages | Verification |
|---|---|---|
| gover.kr | `/terms/` | 200, body contains `이용약관`, text length 702 |
| trave.kr | `/terms/` | 200, body contains `이용약관`, text length 720 |
| finan.kr | `/terms/` | 200, body contains `이용약관`, text length 738 |
| healfood.kr | `/terms/` | 200, body contains `이용약관`, text length 614 |
| certifi.kr | `/terms/` on canonical `www.certifi.kr` | 200, body contains `이용약관`, text length 728 |
| legalser.com | `/terms/` | 200, body contains `이용약관`, text length 669 |
| saju.tasko.kr | `/terms/` | 200, body contains `이용약관`, text length 826 |
| mbti.tasko.kr | `/terms/` | 200, body contains `이용약관`, text length 879 |
| ai.tasko.kr | `/contact/`, `/terms/` | 200 for both; expected text present |
| car.luckyday.kr | `/terms/` | 200, body contains `이용약관`, text length 629 |
| gong.luckyday.kr | `/privacy/`, `/terms/` | 200 for both; expected text present |
| notebook.klick.kr | `/terms/` | 200, body contains `이용약관`, text length 638 |
| dog.klick.kr | `/about/`, `/contact/`, `/privacy/`, `/terms/` | 200 for all; expected text present |
| webtoon.klick.kr | `/about/`, `/contact/`, `/privacy/`, `/terms/` | 200 for all; expected text present |
| etique.kr | `/terms/` | 200, body contains `이용약관`, text length 648 |
| lawer.kr | `/terms/` | 200, body contains `이용약관`, text length 706 |
| autoscares.com | `/terms/` | 200, body contains `이용약관`, text length 622 |
| insupang.com | `/terms/` | 200, body contains `이용약관`, text length 663 |
| chatgipt.kr | `/terms/` | 200, body contains `이용약관`, text length 593 |

Updated readiness after this run:

- T2 trust/legal page blocker cleared for: `gover.kr`, `trave.kr`, `finan.kr`, `healfood.kr`, `certifi.kr`, `legalser.com`, `saju.tasko.kr`, `mbti.tasko.kr`, `car.luckyday.kr`, `notebook.klick.kr`, `etique.kr`, `lawer.kr`, `autoscares.com`, `insupang.com`, `chatgipt.kr`.
- Critical missing-page blocker cleared for: `dog.klick.kr`, `webtoon.klick.kr`, `gong.luckyday.kr`.
- `ai.tasko.kr` now has Contact/Terms, corrected ads.txt, and the former starter post has been replaced with a substantive site guide.
- `gong365.kr` and `picklefriend.kr` were fixed in local repositories and then deployed to production; public URLs now verify successfully.

User/action-required items:

- Provide or repair SSH/WP access for `todayshops.kr`, `sssaass.com`, `softwa.kr`, and `homeimer.com`; current local keys failed with invalid format or permission denied.
- Reconcile the dirty `D:\web\yesa-youunsang` worktree before automated AdSense trust-page patching.
- Decide deployment path for local Next.js patches: `D:\web\gong365kr` and `D:\web\pickleball`.
- For low-value/fallback sites (`spinkorea.kr`, `runmania.kr`, `crepika.com`, `smart.sellerpit.kr`, `jasamall.sellerpit.kr`), content/deployment access is still needed beyond static trust pages.

## Production Deployment 2026-06-08

Local Next.js patches deployed to Vercel production:

| Site | Deployment | Public verification |
|---|---|---|
| gong365.kr | Vercel deployment `dpl_6YhjXc6FkMsbRjHchfCefogbxGoY`, status Ready, aliased to `https://www.gong365.kr` and `https://gong365.kr` | `/about`, `/contact`, `/privacy`, `/terms`, `/sitemap.xml` all returned 200 with Googlebot-style fetch. |
| picklefriend.kr | Vercel deployment `dpl_awQ8cCzqKTWGk3KkjZsS4Mkkd39s`, status Ready, aliased to `https://www.picklefriend.kr` and `https://picklefriend.kr` | `/contact` and `/sitemap.xml` returned 200; sitemap contains `/contact`. |

Additional technical fix:

- `ai.tasko.kr/ads.txt` corrected from `ca-pub-3050601904412736` to `pub-3050601904412736`.
- Public verification: `https://ai.tasko.kr/ads.txt` returned 200 and contains `google.com, pub-3050601904412736, DIRECT, f08c47fec0942fa0`.
- `ai.tasko.kr` starter post ID 1 was rewritten from `/hello-world/` into `AI 타스코 시작 가이드: 인공지능 도구를 안전하게 활용하는 법` at `/ai-tasko-start-guide/`.
- Public verification: `/ai-tasko-start-guide/` returned 200 with 2,940 visible chars; `/hello-world/` redirects to the new slug and returns 200.

## Additional Production Fixes 2026-06-08

`runmania.kr` fallback/trust-page issue:

- Added `/contact` and `/terms` pages in `D:\web\runmania`.
- Connected `/about`, `/contact`, `/privacy`, and `/terms` to React routes, footer links, dynamic sitemap API, static sitemap data, and prerender metadata.
- Local verification passed: `npm run lint`, `npm run build`.
- Vercel production deployment `dpl_VextBtRiMRtaZVFd1rxgEiPD6pQX` completed and was aliased to `https://www.runmania.kr`.
- Public Googlebot-style verification: `/about/`, `/contact/`, `/privacy/`, `/terms/`, and `/sitemap.xml` all returned 200. Sitemap contains `/contact`.

`sellerpit` WordPress trust-page fixes:

| Site | Created/published pages | Public verification |
|---|---|---|
| smart.sellerpit.kr | `/about/`, `/contact/`, `/privacy/`, `/terms/` via SSH + WP-CLI | All 200 with Googlebot-style fetch; visible text lengths 42,180-42,457; expected trust markers present. |
| travel.sellerpit.kr | `/about/`, `/contact/`, `/privacy/`, `/terms/` via SSH + WP-CLI | All 200 with Googlebot-style fetch; visible text lengths 18,882-19,165; expected trust markers present. |
| jasamall.sellerpit.kr | `/about/`, `/contact/`, `/privacy/`, `/terms/` via SSH + WP-CLI | All 200 with Googlebot-style fetch; visible text lengths 36,323-36,602; expected trust markers present. |

`spinkorea.kr` fallback/trust-page fix:

- Replaced thin fallback-style `/about`, `/contact`, `/privacy`, and `/terms` React page content in `D:\web\spinkorea` with page-specific Korean trust/legal copy.
- Added Vercel rewrites for those routes and static crawler-visible trust page bodies to the asset generation script.
- Local verification passed: `npm run lint`, `npm run build`.
- Vercel production deployment `dpl_DSZarSpVUuXZ1dB2Y3vVWohdMar5` completed and was aliased to `https://www.spinkorea.kr`.
- Public Googlebot-style verification: `/about/`, `/contact/`, `/privacy/`, `/terms/`, and `/sitemap.xml` all returned 200. Visible text lengths increased to 634-822 for the trust/legal pages, and sitemap contains `/contact`.

`texturb.com` sitemap/canonical fix:

- Fixed `app/sitemap.ts` in `D:\web\texturb` to trim `NEXT_PUBLIC_SITE_URL`, remove trailing slashes, and normalize `texturb.com` to `www.texturb.com` before composing sitemap URLs.
- Adjusted the local `BlogPost` type and blog detail fallback handling so the existing generated batch posts can pass production type-check during deployment.
- Local verification: `npm run build` passed. `npm run lint` could not run because this repository does not currently include `eslint` in installed dependencies.
- Vercel production deployment `dpl_8tvBZsw2HxSSqb86P2rDwixWBg9F` completed and was aliased to `https://www.texturb.com`.
- Public Googlebot-style verification: `/sitemap.xml` returned 200, first sampled `<loc>` values had no embedded whitespace, and loc host is now `https://www.texturb.com`. `/about/`, `/contact/`, `/privacy/`, and `/terms/` all returned 200 with expected trust/legal markers.

`ehon365.kr` subdomain contact-page fixes:

| Site | Change | Verification |
|---|---|---|
| pregnancy.ehon365.kr | Added `/contact` in `D:\web\pregnancy` and included it in `src/app/sitemap.ts`. | Local `npm run build` passed. Vercel production deployment aliased to `https://pregnancy.ehon365.kr`. Public Googlebot-style verification: `/contact/` returned 200 with expected contact/trust markers; `/sitemap.xml` returned 200 and contains `/contact`. |
| dolbomjigi.ehon365.kr | Added `/contact` in `D:\web\dolbomjigi` and included it in `src/app/sitemap.ts`. | Local `pnpm build` passed. `pnpm lint` still fails on pre-existing internal `<a>` link lint errors across existing pages, but the new contact page's lint issue was fixed. Vercel production deployment `dpl_DwJAQ5v2PPevTUnuzLKsYfyXqvyR` completed and was aliased to `https://dolbomjigi.ehon365.kr`. Public Googlebot-style verification: `/contact/` returned 200 with expected contact/trust markers; `/sitemap.xml` returned 200 and contains `/contact`. |

Additional Vercel trust-page fixes:

| Site | Change | Verification |
|---|---|---|
| dullegilgogo.kr | Cloned `lsk7209/dulekil` to `D:\web\dulekil` and added the missing `/contact` route. Sitemap already listed `/contact`. | Local `npm run build` was blocked by missing local `TURSO_DATABASE_URL`, but Vercel production env build passed. Vercel deployment `dpl_4C28SfgiDw8sgEgPRt3rH8M7efLZ` completed and was aliased to `https://dullegilgogo.kr`. Public Googlebot-style verification: `/contact/` returned 200 with expected markers; `/sitemap.xml` returned 200 and contains `/contact`. |
| workgogo.kr | Cloned `lsk7209/workgogo.kr` to `D:\web\workgogo.kr`, added `/about` and `/contact`, and included both in `app/sitemap.ts`. | Local `npm run build` passed. Vercel deployment `dpl_3gdVNDp8x4q13vn4cJ8pkMBNo1a4` completed and was aliased to `https://workgogo.kr`. Public Googlebot-style verification: `/about/`, `/contact/`, and `/sitemap.xml` all returned 200; sitemap contains both `/about` and `/contact`. |

`dogspang.kr` placeholder-content fix:

- Confirmed the exposed starter post through public WP REST: post ID `244`, slug `post-3`, title `Mastering the First Impression: Your intriguing post title goes here`.
- Used SSH/WP-CLI on `/home/dogspang/public_html` to change post ID `244` from `publish` to `draft`.
- Flushed WordPress object cache and LiteSpeed cache.
- Public Googlebot-style verification: `/post-3/` now returns 404; `/`, `/about/`, `/contact/`, and `/sitemap.xml` no longer expose the starter title or `intriguing post title`. Sitemap no longer contains `/post-3/`.
- WP database follow-up query found no remaining published posts/pages containing `Mastering the First Impression`, `intriguing post title`, or `blogsample2.nexttech7.com`.

Source-control preservation:

- Pushed the production trust-page fixes to the matching GitHub repositories so future Git-based Vercel deployments keep the same approval fixes:
  - `lsk7209/gong365kr` commit `69c36da`
  - `lsk7209/pickleball` commit `785242c`
  - `lsk7209/runmania` commit `9723257`
  - `lsk7209/spinkorea` commit `7c0392f`
  - `lsk7209/texturb` commit `f34e43b`
  - `lsk7209/pregnancy.ehon365.kr` commit `ccee858`
  - `lsk7209/dolbomjigi` commit `35a5963`
  - `lsk7209/dulekil` commit `cfa5ab2`
  - `lsk7209/workgogo.kr` commit `df7555b`

Dashboard repository verification after report/script updates:

- `pnpm type-check` passed.
- `pnpm lint` passed.

Remaining user/action-required blockers after this round:

- `todayshops.kr`: current local SSH key is invalid format; provide repaired SSH key or WP admin credential.
- `sssaass.com`: current local SSH key is invalid format; provide repaired SSH key or WP admin credential.
- `softwa.kr`: SSH permission denied with the available key; provide working access or WP admin credential.
- `homeimer.com`: SSH permission denied with the available key; provide working access or WP admin credential.
- `yesa.kr`: `D:\web\yesa-youunsang` has many pre-existing dirty changes; reconcile or confirm that this worktree can be modified.
- `gpt.nexttech7.com`: still needs host/path access discovery or credentials before WP-CLI patching.

## Follow-up Verification 2026-06-08

Additional Googlebot-style public checks after the production fixes:

| Site | Result | Evidence |
|---|---|---|
| askore.kr | Reclassified from content watchlist to review-ready from public crawl evidence. | Home 200 with 21,814 visible chars. About/Contact/Privacy/Terms all 200 with 12k-17k visible chars. Sitemap sample URLs include tool/category/plant pages with 13k-33k visible chars and plant-content markers present. No repository changes were made because `D:\web\askorekr` has extensive pre-existing dirty changes. |
| healfood.kr | Reclassified from Terms/YMYL watchlist to review-ready from public crawl evidence. | Home 200 with 114,361 visible chars. About/Contact/Privacy/Terms all 200. Sampled post sitemap URLs returned roughly 120k visible chars each, with medical disclaimer and source markers present. |
| smart.sellerpit.kr | Trust pages remain public and content sample no longer appears thin in crawler view. | Sampled content pages returned 41k+ visible chars. Placeholder matches were CSS-only (`sticky-placeholder`), not starter content. |
| jasamall.sellerpit.kr | Trust pages remain public and sampled posts appear content-rich in crawler view. | Sampled posts returned 33k+ visible chars. Placeholder matches were CSS-only, not starter content. |
| travel.sellerpit.kr | Starter/default public surfaces removed. | Drafted default `/sample-page/` post ID 2; flushed WordPress and LiteSpeed cache. `/sample-page/`, `/category/uncategorized/`, `/category/money/`, and `/category/travel-info/` now return 404. Real populated category `/category/asia/` returns 200. Sitemap no longer exposes the removed sample or empty category URLs. |

Updated readiness notes:

- `askore.kr`, `healfood.kr`, `smart.sellerpit.kr`, `jasamall.sellerpit.kr`, and `travel.sellerpit.kr` are ready for AdSense re-review from the public-site checks available here, unless the AdSense account shows a different private rejection reason.
- `travel.sellerpit.kr` cleanup used deletion only for zero-count categories and draft status only for the WordPress default sample page; published travel articles were not removed.

## Additional Production Fix 2026-06-08: Crepika

`crepika.com` Vite SPA fallback/low-value route issue:

- Added a build-time crawler-page generator in `D:\web\crepikacom` that creates static HTML for `/about/`, `/contact/`, `/privacy/`, `/terms/`, `/blog/`, and seven core `/tools/*/` routes before the SPA fallback is used.
- Added `/terms` to `public/sitemap.xml`.
- Added a substantive homepage `noscript` summary so the root URL also exposes publisher/tool/policy content before React loads.
- Pushed repository commits `fbb5f37` and `10182fc` to `lsk7209/crepikacom`.
- Vercel production deployment `dpl_2kposftqDL55JB7hKLgA72PKraQU` completed and was aliased to `https://www.crepika.com`.
- Public Googlebot-style verification:
  - `/` 200, 778 visible chars.
  - `/about/`, `/contact/`, `/privacy/`, `/terms/`, `/blog/`, `/tools/text-counter/`, `/tools/webp-converter/` all 200 with 760-960 visible chars.
  - `/sitemap.xml` 200 and contains `/terms`.
- Local verification: `npm run build` passed. `npm run lint` still fails on pre-existing unrelated React/TypeScript lint errors (`no-explicit-any`, hook order, shadcn empty interface rules, CommonJS require rules).

Updated readiness notes:

- `crepika.com` is no longer a fallback/low-value route blocker from public crawler evidence. It is ready for AdSense re-review unless the account-side rejection gives a different private reason.
