# 사이트 → 레포/접근 지도 (D:\web 전체 스캔)

기준: 2026-06-05 | D:\web git 레포 일괄 스캔 결과. 작업 착수 전 git 상태 확인용.
ab = origin 대비 (behind/ahead). 소스 = app/src/components/lib 미커밋 수.

## A. 작업 가능 — 깨끗 + 동기화 (즉시 가능)
| 레포(D:\web\) | 사이트 | GitHub | 비고 |
|---|---|---|---|
| temon | temon.kr | lsk7209/temon | 미커밋27이나 **소스0**(리포트 산출물) |
| bojo24 | bojo24.kr | lsk7209/bojo24 | 깨끗 |
| pickleball | picklefriend.kr | lsk7209/pickleball | 깨끗 (단 SEO 대상 0건) |
| gong365kr | gong365.kr | lsk7209/gong365kr | 깨끗 |
| roadwayskr | roadways.kr | lsk7209/roadwayskr | 깨끗 |
| runmania | runmania.kr | lsk7209/runmania | 깨끗 |
| crepikacom | crepika.com | lsk7209/crepikacom | 소스0 |
| dolbomjigi | dolbomjigi.ehon365.kr | lsk7209/dolbomjigi | 깨끗 |
| pregnancy | pregnancy.ehon365.kr | lsk7209/pregnancy.ehon365.kr | 클린 |
| reada-hanunja | (확인필요) | lsk7209/reada-hanunja | 클린 |
| trend-keyword | (도구?) | lsk7209/trend-keyword-cafe | 소스0 |

## B. 정리 선행 필요 — push 안 된 커밋(ahead)
| 레포 | 사이트 | ahead | 조치 |
|---|---|---|---|
| tennisfrens | tennisfrens.com | 3 | push 여부 확인 |
| dogswherecom | dogswhere.com | 13 | push 여부 확인 |
| spinkorea | spinkorea.kr | 12 | push 여부 확인 |
| today_yakuk | todaypharm.kr(?) | 15 | push 여부 확인 |
| yesa-youunsang | yesa.kr | 2 | push 여부 확인 |
| goeskucom | goesku.com | 1 | push 여부 확인 |

## C. 작업 위험 — 소스 대량 미커밋 (작업 중 추정, 보류)
| 레포 | 사이트 | 소스 미커밋 |
|---|---|---|
| texturb | texturb.com | 40 |
| askorekr | askore.kr | 27 (remote=planty-friends) |
| sinhonjigi | sinhonjigi.ehon365.kr | 14 |
| ehon365/temp_clone | ehon365.kr | 13 (임시클론) |
| cartainkr | cartain.kr | 11 |
| spinkorea | spinkorea.kr | 8 (+ahead12) |

## SSH (WordPress, 레포 없음)
| 사이트 | 접근 |
|---|---|
| fastjob | nexttech@158.247.212.123:/home/nexttech/fastjob.kr (haemongdream키) — 개편중 |
| haemongdream | nexttech@158.247.212.123:/home/nexttech/haemongdream.com (키 haemongdream-claude_key2, 포트1988) |
| finan | finan@158.247.245.11:/home3/finan/public_html (키 finan-chemicloud-PrivateKey-nopass, 포트1988) |
| estat | estat@estat.kr:/home/estat/public_html (키 estat-ssh-key, 포트1988) |
| softwa·gover·homeimer·trave | user@158.247.245.11 (각 키, 접속확인) |
| todayshops | 245.11 — 키 복호화 실패 |
| campgogo | SSH 정보 없음 (chemicloud_ssh.txt 미등록) — sitemap 에러 283건 조사 필요 |

### GA4 measurement ID (2026-06-05 확보, GA4 Admin API)
- haemongdream: property 516256882 → G-4DD3504NHM
- finan: property 520579523 → G-BX75JB1MM9
- estat: property 536753109 → G-LRJ1FE9715
- 전체 매핑은 GA4 Admin API(`@google-analytics/admin` listDataStreamsAsync → webStreamData.measurementId)로 조회.

## 작업 원칙
- 검증된 사이트(temon·tennisfrens) 제목·메타는 **이미 양호** → 레버는 **순위(콘텐츠·내부링크·신선도)**.
- 순위 작업은 페이지별 콘텐츠 → **각 레포 전용 세션**에서. 작업 전 git 정리(ahead/미커밋).
- C그룹은 미커밋 정리 전 손대지 말 것.
