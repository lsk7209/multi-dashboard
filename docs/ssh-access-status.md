# SSH 접근 현황 — 추적 WP 사이트

기준일: 2026-06-05 | GSC 노출/클릭 = 최근 7일 | enabled 76개 중 contentSource에 SSH 없는 72개를 키 확보 여부로 재분류

> 정정: 이전 "신규키 필요"는 접속 불가가 아니라 chemicloud_ssh.txt 매핑 누락이었음. D:env 키파일 교차 확인 결과 상당수가 기존 키 보유.

## 요약
- A. chemicloud_ssh.txt 매핑 완비 → 즉시 작업: 23개
- B. 키파일 보유, 매핑만 추가하면 접속 가능: 10개 (softwa/gover/homeimer/trave 접속 실증)
- C. 키파일도 없음 → 진짜 신규 키 필요: 39개 (노출>0: 23, 노출0: 16)

## B. 키파일 보유 (매핑만 추가하면 즉시 작업) — 우선 대상

| id | url | 노출 | 클릭 |
|---|---|---|---|
| fastjob | https://fastjob.kr/ | 623 | 8 |
| softwa | https://softwa.kr/ | 177 | 5 |
| todayshops-2 | https://todayshops.kr/ | 160 | 0 |
| etique | https://etique.kr/ | 63 | 0 |
| sssaass | https://sssaass.com/ | 9 | 0 |
| gover | https://gover.kr/ | 8 | 0 |
| richyou | https://richyou.kr/ | 8 | 0 |
| homeimer | https://homeimer.com/ | 6 | 0 |
| trave | https://trave.kr/ | 3 | 0 |
| luxurytraver-2 | https://luxurytraver.com/ | 1 | 0 |

참고 — B그룹 접속 패턴: user=사이트id, HOST=158.247.245.11(2번)/158.247.212.123(1번), port 1988, key=D:env<사이트>-chemicloud-PrivateKey(-nopass). todayshops/sssaass는 키 형식 변환 필요(invalid format).

## C. 진짜 신규 키 필요 (노출 있는 것)

| id | url | 노출 | 클릭 |
|---|---|---|---|
| temon | https://temon.kr/ | 1037 | 29 |
| tennisfrens | https://tennisfrens.com/ | 994 | 22 |
| askore | https://askore.kr/ | 304 | 4 |
| texturb | https://texturb.com/ | 263 | 6 |
| estat-2 | https://estat.kr/ | 189 | 2 |
| picklefriend | https://picklefriend.kr/ | 125 | 20 |
| ehon365 | https://ehon365.kr/ | 115 | 1 |
| cartain-2 | https://cartain.kr/ | 101 | 1 |
| petinsuer-2 | https://petinsuer.com/ | 69 | 0 |
| bojo24 | https://bojo24.kr/ | 48 | 0 |
| discparty | https://discparty.com/ | 42 | 1 |
| dogswhere | https://dogswhere.com/ | 41 | 3 |
| goesku | https://goesku.com/ | 36 | 0 |
| dogspang-2 | https://dogspang.kr/ | 20 | 1 |
| gong365 | https://gong365.kr/ | 19 | 0 |
| insupang | https://insupang.com/ | 8 | 0 |
| knewstory | https://knewstory.kr/ | 6 | 0 |
| lawer | https://lawer.kr/ | 3 | 0 |
| ezfunnel | https://ezfunnel.kr/ | 3 | 0 |
| autoscares-2 | https://autoscares.com/ | 3 | 0 |
| petjigi | https://petjigi.kr/ | 2 | 0 |
| dolbomjigi-ehon365 | https://dolbomjigi.ehon365.kr/ | 2 | 0 |
| roadways | https://roadways.kr/ | 1 | 0 |

### C-2. 신규 키 필요 + 노출 0 (후순위)

healthgotoo, nicewomen, esgyo, runmania, today2424, todaypharm, 2mlab-2, spinkorea-2, coinyo-2, crepika, educaer, pregnancy-ehon365, sinhonjigi-ehon365, sorimate, campgogo, dullegilgogo

## A. chemicloud 매핑 완비

| id | url | 노출 | 클릭 |
|---|---|---|---|
| haemongdream | https://haemongdream.com/ | 243 | 12 |
| finan | https://finan.kr/ | 55 | 0 |
| nexttech7 | https://nexttech7.com/ | 48 | 0 |
| travelpang-2 | https://travelpang.kr/ | 25 | 0 |
| chatgipt-3 | https://chatgipt.kr/ | 10 | 0 |
| legalser | https://legalser.com/ | 6 | 0 |
| healfood-2 | https://healfood.kr/ | 3 | 0 |
| yesa | https://yesa.kr/ | 1 | 0 |
| gpt-nexttech7 | https://gpt.nexttech7.com/ | 1 | 0 |
| kang4 | https://kang4.com/ | 0 | 0 |
| luckyday | https://luckyday.kr/ | 0 | 0 |
| tasko-2 | https://tasko.kr/ | 0 | 0 |
| mbti-tasko | https://mbti.tasko.kr/ | 0 | 0 |
| klick-2 | https://klick.kr/ | 0 | 0 |
| certifi | https://certifi.kr/ | 0 | 0 |
| phone-luckyday | https://phone.luckyday.kr/ | 0 | 0 |
| gong-luckyday | https://gong.luckyday.kr/ | 0 | 0 |
| car-luckyday | https://car.luckyday.kr/ | 0 | 0 |
| notebook-klick-2 | https://notebook.klick.kr/ | 0 | 0 |
| ai-tasko | https://ai.tasko.kr/ | 0 | 0 |
| saju-tasko | https://saju.tasko.kr/ | 0 | 0 |
| webtoon-klick | https://webtoon.klick.kr/ | 0 | 0 |
| dog-klick | https://dog.klick.kr/ | 0 | 0 |

## 비고
- 제목·메타 ROI 1·2순위(temon 1037, tennisfrens 994)는 C(진짜 신규 필요).
- 단 fastjob(623)·softwa(177)·todayshops-2(160)는 B(키 보유) → 키 없이 바로 착수 가능.
- haemongdream(A, 키보유)은 롱테일이라 제목·메타가 아닌 색인/노출 진단 트랙.
