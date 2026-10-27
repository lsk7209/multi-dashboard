# Ops Triage

Generated: 2026-10-27T09:49:46.392Z
Source: direct
Source path: data/ops-intel.json
Source updated: 2026-10-27T09:49:45.356Z

## Summary

- Critical: 1
- High: 33
- Medium: 7
- Low: 3
- GitHub Actions: 7
- GSC: 28
- AdSense: 9
- GA4: 0
- Vercel: 0

## Findings

| Priority | Severity | Kind | Target | Title | Action |
|---:|---|---|---|---|---|
| 115 | critical | github-actions | crepikacom | crepikacom: Auto Publish Blog Post failed 39 times | Inspect the content queue and publish script assumptions; skip missing input with evidence instead of failing the whole workflow. |
| 87 | high | github-actions | 2424 | 2424: Live Cost Watch failed 7 times | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 87 | high | github-actions | dog-breed | dog-breed: Update Outdoor Risk Data failed 7 times | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 81 | high | github-actions | tennis_friends | tennis_friends: Quality checks failed 1 time | Run the repo quality gate locally and patch the failing build, lint, SEO, schema, or test check. |
| 80 | high | gsc | luckyday | 럭키데이 - GA4: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | knewstory | 케이뉴스스토리 - GA4: GSC direct collector signal sitemap warnings=0 errors=1 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://knewstory.kr/sitemap_index.xml warnings=0 errors=1 submitted=3979 downloaded=2026-10-07T02:20:51.012Z submittedAt=2026-09-16T23:28:44.297Z. |
| 80 | high | gsc | ai-tasko | ai.tasko.kr: GSC direct collector signal sitemap warnings=0 errors=1 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://ai.tasko.kr/sitemap.xml warnings=0 errors=1 downloaded=2026-09-23T23:23:25.554Z submittedAt=2026-09-23T23:23:21.766Z. |
| 80 | high | gsc | coinyo-alt | alt.coinyo.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | coinyo-bit | bit.coinyo.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | car-klick | car.klick.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | car-luckyday | car.luckyday.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | adsense | cartain-2 | cartain.kr: ADSENSE direct collector signal missing_config | Verify AdSense code, ads.txt, approval scope, and collector evidence for status missing_config. |
| 80 | high | gsc | dog-klick | dog.klick.kr: GSC direct collector signal sitemap warnings=1 errors=1 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://dog.klick.kr/sitemap.xml warnings=1 errors=1 downloaded=2026-09-23T23:23:31.207Z submittedAt=2026-09-23T23:23:26.686Z. |
| 80 | high | gsc | dog-nekau | dog.nekau.com: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | educaer | educaer.com: GSC direct collector signal sitemap warnings=1 errors=1 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://educaer.com/sitemap_index.xml warnings=1 errors=1 submitted=634 downloaded=2026-10-06T20:28:26.014Z submittedAt=2026-06-02T03:55:58.091Z. |
| 80 | high | gsc | finance-2mlab | finance.2mlab.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | food-2mlab | food.2mlab.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | gong-luckyday | gong.luckyday.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | hos-dogspang | hos.dogspang.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | insupang | insupang - GA4: GSC direct collector signal sitemap warnings=0 errors=1 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://insupang.com/sitemap.xml warnings=0 errors=1 submitted=675 downloaded=2026-10-08T03:33:16.268Z submittedAt=2026-08-23T21:16:04.434Z. |
| 80 | high | gsc | jeompolab | jeompolab.com: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | adsense | kapti | kapti.kr: ADSENSE direct collector signal missing_config | Verify AdSense code, ads.txt, approval scope, and collector evidence for status missing_config. |
| 80 | high | gsc | ko-klick | ko.klick.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | lo-klick | lo.klick.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | luxurytraver-2 | luxurytraver.com: GSC direct collector signal sitemap warnings=0 errors=1 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://luxurytraver.com/sitemap.xml warnings=0 errors=1 submitted=482 downloaded=2026-10-03T23:48:07.938Z submittedAt=2026-09-22T23:25:36.503Z. |
| 80 | high | gsc | notebook-klick-2 | notebook.klick.kr: GSC direct collector signal sitemap warnings=0 errors=1 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://notebook.klick.kr/sitemap.xml warnings=0 errors=1 submitted=703 downloaded=2026-09-22T23:24:54.084Z submittedAt=2026-09-22T23:24:50.402Z. |
| 80 | high | gsc | phone-luckyday | phone.luckyday.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | mbti-tasko | tasko.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | adsense | tennisfrens | tennisfrens.com: ADSENSE direct collector signal missing_config | Verify AdSense code, ads.txt, approval scope, and collector evidence for status missing_config. |
| 80 | high | adsense | toolnavigo | toolnavigo.com: ADSENSE direct collector signal missing_config | Verify AdSense code, ads.txt, approval scope, and collector evidence for status missing_config. |
| 80 | high | gsc | toolnavigo | toolnavigo.com: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | travel-dogspang | travel.dogspang.kr: GSC direct collector signal auth_error | Inspect GSC property, sitemap, canonical, robots, and indexing state from direct Search Console evidence. |
| 80 | high | gsc | webtoon-klick | webtoon.klick.kr: GSC direct collector signal sitemap warnings=0 errors=1 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://webtoon.klick.kr/sitemap_index.xml/ warnings=0 errors=1 downloaded=2026-09-22T23:25:13.264Z submittedAt=2026-09-22T23:25:11.521Z. |
| 80 | high | gsc | workgogo | workgogo.kr: GSC direct collector signal sitemap warnings=0 errors=1 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://workgogo.kr/sitemap.xml warnings=0 errors=1 submitted=121 downloaded=2026-09-23T23:23:32.163Z submittedAt=2026-09-23T23:23:30.570Z. |
| 51 | medium | github-actions | dog-breed | dog-breed: Check Public Data APIs failed 1 time | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 51 | medium | github-actions | tennis_friends | tennis_friends: Editorial operations monitor failed 1 time | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 51 | medium | github-actions | today_yakuk | today_yakuk: CI failed 1 time | Open the latest workflow run, capture the first failing command, and patch the narrowest repo-local cause. |
| 50 | medium | adsense | kapti | kapti.kr: ADSENSE direct collector signal ads.txt missing_config | Verify AdSense code, ads.txt, approval scope, and collector evidence for status ads.txt missing_config. |
| 50 | medium | adsense | seniorlivingnote | seniorlivingnote.com: ADSENSE direct collector signal ads.txt missing_config | Verify AdSense code, ads.txt, approval scope, and collector evidence for status ads.txt missing_config. |
| 50 | medium | adsense | toolnavigo | toolnavigo.com: ADSENSE direct collector signal ads.txt missing_config | Verify AdSense code, ads.txt, approval scope, and collector evidence for status ads.txt missing_config. |
| 50 | medium | adsense | workgogo | workgogo.kr: ADSENSE direct collector signal ads.txt missing_config | Verify AdSense code, ads.txt, approval scope, and collector evidence for status ads.txt missing_config. |
| 20 | low | gsc | chatgipt-3 | chatgipt.kr: GSC direct collector signal sitemap warnings=1 errors=0 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://chatgipt.kr/sitemap_index.xml warnings=1 errors=0 submitted=3048 downloaded=2026-10-27T06:06:11.963Z submittedAt=2026-06-02T03:55:39.224Z. |
| 20 | low | gsc | dogswhere | dogswhere.com: GSC direct collector signal sitemap warnings=1 errors=0 | Inspect the listed sitemap detail from direct Search Console evidence, then verify canonical, robots, and indexing state: https://www.dogswhere.com/sitemap.xml warnings=1 errors=0 submitted=216 downloaded=2026-10-26T23:24:25.990Z submittedAt=2026-06-07T16:33:00.627Z. |
| 20 | low | adsense | nongsusangogo | https://nongsusangogo.kr: ADSENSE direct collector signal launch_hold | Keep AdSense paused until launch, publishing, and production-data gates are explicitly released. |
