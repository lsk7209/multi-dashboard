# Affiliate Inventory Research - 2026-07-03

Purpose: expand the dashboard `제휴` page into a practical affiliate program inventory for 100+ site operations. This is metadata only. Do not store API keys, bank data, tax IDs, or private affiliate account files here.

## Collection Rules

- Mark API/feed support only when an official page or developer documentation exists.
- Mark MCP/CLI as `none documented` unless the affiliate program itself documents official support.
- Treat program-level rates, cookies, prohibited traffic, API quotas, and creative rules as account-verification items before deployment.
- Use `pnpm ops:monetization` after editing `data/monetization/affiliates/inventory.yml`.

## Newly Added Programs

| Program | Region | Automation Surface | Source | Operator Note |
| --- | --- | --- | --- | --- |
| Adpick | KR | JSON campaign API, image/tracking-link response, one-minute cache rule | https://adpick.co.kr/?ac=guide&md=api&tac=sdk | API-friendly domestic campaign source; gate CPA/CPI claims manually. |
| FlexOffers | Global | Web Services API, promotional feed, product data feed, reporting | https://www.flexoffers.com/publishers/web-service-api/ | Strong feed/API candidate for global shopping pages. |
| Skimlinks | Global | Merchant API, Reporting API, link wrapper | https://developers.skimlinks.com/ | Better for text-link auto monetization than first-party banner rotation. |
| Travelpayouts | Global | Partner-link API, statistics, balance/payment, brand APIs, feeds | https://support.travelpayouts.com/hc/en-us/categories/200358578-API-and-data | Best API-friendly travel network layer for multiple verticals. |
| GetYourGuide | Global | Partner API | https://api.getyourguide.com/ | Use only for destination/activity-intent pages. |
| Viator | Global | Partner API with product, pricing, availability, booking/post-booking workflows | https://docs.viator.com/partner-api/ | Redirect affiliate links first; booking API needs heavier QA. |
| Klook | APAC/Global | OpenAPI, affiliate data feeds/API/white-label support | https://affiliate.klook.com/ and https://klook.gitbook.io/openapi | Strong Korea/APAC travel fit. |
| Agoda | Global | Demand API / JSON search API | https://developer.agoda.com/demand/docs/getting-started | APAC accommodation backup to Booking.com. |
| Trip.com | Global | Developer portal / partner integrations | https://developers.trip.com/ | Verify available surfaces after partner approval. |
| Admitad | Global | Publisher APIs | https://developers.mitgo.com/hc/en-us/categories/34481291136402-Admitad-API-for-Publishers | Secondary global network where advertiser coverage is better. |
| TradeTracker | Global | Extensive API, product/voucher feeds, reports, payment info | https://tradetracker.com/us/publishers/ | Good for feed-driven coupon/product pages. |
| ClickBank | Global | ClickBank APIs | https://support.clickbank.com/en/articles/10535400-clickbank-apis | Manual-review only due digital-product claim risk. |

## Existing Program Automation Updates

| Program | Automation Surface | Source |
| --- | --- | --- |
| LinkPrice | Reward API, deeplink API, ad API/open API | https://www.linkprice.com/affiliate/2022_index.html |
| Amazon Associates | Product Advertising API 5.0 / Creators API direction | https://webservices.amazon.com/paapi5/documentation/ |
| eBay Partner Network | eBay APIs with EPN affiliate parameters, feed/API availability | https://developer.ebay.com/grow/affiliate-program |
| Booking.com | Demand API, managed affiliate integration levels, transaction reporting path | https://developers.booking.com/demand |
| impact.com | REST API | https://api.impact.com/ |
| CJ Affiliate | Developer portal APIs | https://developers.cj.com/ |
| Awin | Link Builder, Offers, Performance APIs | https://help.awin.com/apidocs/introduction-1 |
| Rakuten Advertising | Affiliate APIs | https://developers.rakutenadvertising.com/documentation/en-US/affiliate_apis |

## MCP / CLI Findings

- Official runtime MCP support was not found for the affiliate programs reviewed.
- Booking developer docs expose developer-tool helpers, but this was recorded as documentation assistance only, not affiliate runtime MCP support.
- Official CLIs were not found for these affiliate programs. Use APIs with cached ingestion scripts instead of assuming CLI automation.

## Recommended Operating Order

1. Start with low-friction broad programs: Coupang Partners, Amazon Associates, HubSpot/Grammarly where content fit exists.
2. Add Korean API/network coverage: LinkPrice and Adpick.
3. Add global network layers: impact.com, Awin, CJ, Rakuten, FlexOffers.
4. Add travel-specific APIs for travel sites: Booking.com, Travelpayouts, Klook, Agoda, Trip.com, Viator, GetYourGuide.
5. Keep high-claim or campaign-sensitive sources behind manual review: Tenping, RippleAlba, ClickBank, sensitive finance/health/legal offers.
