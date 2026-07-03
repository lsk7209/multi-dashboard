# Design

## Source of truth
- Status: Draft
- Last refreshed: 2026-07-03
- Primary product surfaces: multi-dashboard home tabs, `/affiliate` affiliate operations page, banner operations console
- Evidence reviewed:
  - `app/page.tsx`: top-level dashboard tabs, `BannerManagementSection`, affiliate summary tab
  - `app/affiliate/page.tsx`: dedicated affiliate operations route
  - `app/components/affiliate-workspace.tsx`: shared affiliate inventory workspace
  - `app/components/dashboard-tabs.tsx`: hash-synced tab component pattern
  - `app/components/banner-management-console.tsx`: banner CRUD, assignment, install code, site filters, operational tables
  - `app/globals.css`: existing panel, table, segment-tabs, form, and operations styles

## Brand
- Personality: quiet, operational, dense, reliable.
- Trust signals: visible data freshness, source paths, status counts, validation state, safe disabled states.
- Avoid: marketing-style hero sections, decorative cards, one-screen information overload, unexplained mixed create/read/update surfaces.

## Product goals
- Goals:
  - Let operators understand monetization readiness by site, affiliate item, banner slot, creative, tracking link, and assignment.
  - Make the next safe action obvious without scanning every table and form at once.
  - Separate planning, setup, live assignment, and diagnostics.
- Non-goals:
  - Do not turn the dashboard into a public-facing affiliate marketplace.
  - Do not hide operational evidence needed for debugging.
  - Do not require external production changes from the UI without explicit state and validation.
- Success signals:
  - A user can answer "what needs setup?", "what is live?", and "what should I fix next?" within one focused view.
  - Creating a new placement, creative, tracking link, and assignment follows a clear sequence.

## Personas and jobs
- Primary personas: site monetization operator, content/site owner, dashboard maintainer.
- User jobs:
  - Find high-priority affiliate items suitable for banners.
  - Create or review banner assets and tracking links.
  - Assign creatives to site slots.
  - Copy install code for a selected placement.
  - Diagnose no-ad, unassigned, inactive, and policy-review states.
- Key contexts of use: repeated daily operations, quick checks after `pnpm ops:monetization`, focused site-by-site monetization setup.

## Information architecture
- Primary navigation:
  - `대시보드`: daily operations, site stats, insights, broad health.
  - `제휴`: collected affiliate inventory, program readiness, banner suitability, risk, disclosure, and next actions.
  - `배너`: dashboard-level banner operations snapshot.
  - `배너 콘솔`: mutable placement, creative, tracking link, assignment, install, and diagnostics workflow.
- Recommended affiliate page structure:
  - `제휴 운영 원장`: summary, source freshness, disclosure rule, banner slot strategy.
  - `우선순위 큐`: P0/P1/P2/manual affiliate items sorted by rollout priority.
  - `배너 적용 준비`: high/medium banner-fit items with recommended slots.
  - `프로그램 원장`: official application/source links, region, network, status, next action.
  - `운영 규칙`: priority rules, disclosure, rel, compliance notes.
  - `리플알바 고단가 후보`: high-commission candidates requiring conservative manual review.
- Recommended banner subnavigation:
  - `요약`: readiness summary, site health, active problems, data source.
  - `사이트`: site-by-site slots, assigned/unassigned state, requests/clicks/no_ad.
  - `설정`: tracking links, creatives, and placement creation/editing.
  - `배정`: connect placement + creative + tracking link; show current live connection and history.
  - `설치`: selected placement install snippet, image URL, click URL, copy actions.
  - `진단`: events, no_ad, data source, DB state, admin token, refresh commands.
- Content hierarchy:
  - View header: title, freshness, source status.
  - Focus controls: site/search/status filters.
  - Primary table or form for the current task.
  - Secondary evidence below, collapsed or in diagnostics tab.

## Design principles
- One job per view: each subtab should answer one operational question.
- Progress from inventory to activation: item -> link/creative -> placement -> assignment -> install -> diagnose.
- Keep evidence visible but not dominant: source paths, raw event counts, and DB status belong in diagnostics unless directly actionable.
- Tradeoffs: dense tables are acceptable for operations, but creation forms should be isolated from monitoring tables.

## Scale requirements
- Target scale: 100+ sites, multiple banner slots per site, many creatives and tracking links.
- Default view must be exception-first, not full inventory-first:
  - unassigned active placements
  - no_ad spikes
  - inactive or policy-review creatives attached to active placements
  - tracking links with missing affiliate item IDs
  - sites with zero active placements
  - recently changed assignments
- Every operational table needs:
  - site group filter
  - search by siteKey, host, slotKey, affiliate item ID, creative name, tracking slug
  - status filter
  - assigned/unassigned filter where relevant
  - sorted priority order with problem rows first
  - pagination or visible row limits once rows exceed 50
- Site grouping should support:
  - all sites
  - WordPress sites
  - Vercel/Next.js sites
  - high-traffic sites
  - AdSense-ready sites
  - missing-banner sites
  - manual-review sites
- Bulk actions should be gated and reversible:
  - bulk pause placements
  - bulk activate placements
  - bulk assign a house banner to selected empty slots
  - export selected rows to CSV/JSON
  - never bulk-delete from the UI
- Add an audit trail surface before scaling edits:
  - who/what changed assignment
  - previous creative/tracking link
  - new creative/tracking link
  - timestamp
  - source: UI, script, import, or migration
- For 100+ sites, the primary workflow should be:
  - choose a site group
  - inspect exceptions
  - fix one site or selected rows
  - verify install/assignment
  - return to exception queue.

## Visual language
- Color: reuse current dashboard tokens; use status color sparingly for ok/warning/error/review.
- Typography: compact headings inside panels, table-first hierarchy, no hero-scale text in tool surfaces.
- Spacing/layout rhythm: full-width operational bands, constrained inner grids, no nested cards.
- Shape/radius/elevation: keep existing 6-8px panel/table/input radius.
- Motion: minimal; tab changes and loading states should be immediate and predictable.
- Imagery/iconography: use icons only for actions such as refresh, copy, edit, link, image, warning, and save if the project adds an icon set.

## Components
- Existing components to reuse:
  - `DashboardTabs`
  - `StatusCard`
  - `workspace-table`
  - `segment-tabs`
  - existing `ops-*` form/table styles
- New/changed components:
  - `AffiliateWorkspace`
  - `MonetizationSubTabs` or reusable `SegmentTabs`
  - `SiteBannerMatrix`
  - `AffiliateItemPicker`
  - `AssignmentBuilder`
  - `InstallCodePanel`
  - `OpsDiagnosticsPanel`
- Variants and states:
  - Loading, empty, read-only, admin-token-required, save-success, save-error, unassigned, policy-review.
- Token/component ownership: keep styles in `app/globals.css` until repeated use justifies extracting components.

## Accessibility
- Target standard: practical WCAG 2.1 AA.
- Keyboard/focus behavior: tabs use `role=tablist`, selected state, hash sync, and visible focus.
- Contrast/readability: badges must retain readable text at small sizes.
- Screen-reader semantics: tables need clear headings; forms need explicit labels.
- Reduced motion and sensory considerations: avoid motion-dependent state.

## Responsive behavior
- Supported breakpoints/devices: desktop-first operations, usable tablet/mobile inspection.
- Layout adaptations:
  - Desktop: left secondary nav or horizontal segment tabs with table content.
  - Mobile: horizontal scroll tabs, single-column forms, tables scroll horizontally.
- Touch/hover differences: controls must not require hover-only affordances.

## Interaction states
- Loading: show current tab skeleton or simple loading row.
- Empty: state the missing entity and the first create action.
- Error: show failed API call and preserve form data.
- Success: short confirmation near the action.
- Disabled: explain admin token/write restriction when controls are disabled.
- Offline/slow network: retain previous loaded state where possible and show refresh failure.

## Content voice
- Tone: concise Korean operational labels.
- Terminology:
  - Affiliate item: `제휴 항목`
  - Affiliate program: `제휴 프로그램`
  - Tracking link: `추적 링크`
  - Creative: `배너 소재`
  - Placement: `배치 위치`
  - Assignment: `배정`
  - Install code: `설치 코드`
  - Disclosure: `공시 문구`
- Microcopy rules: avoid long instructional paragraphs inside panels; prefer labels, counts, and next-action text.

## Implementation constraints
- Framework/styling system: Next.js App Router, React client components, plain CSS in `app/globals.css`.
- Design-token constraints: reuse existing CSS variables and table/panel patterns.
- Performance constraints: keep tab content local and avoid extra network calls unless a view needs fresh mutable state; paginate or virtualize large tables before exposing 100+ sites with all slots at once.
- Compatibility constraints: GitHub Actions and generated JSON snapshots remain the data source for read-only summaries; banner console uses `/api/banner-management`.
- Test/screenshot expectations: validate typecheck/lint/tests/build; for implementation, smoke test `#banners` and key subtabs.

## Open questions
- [x] Should `Banners` and `Affiliate Items` remain separate top-level tabs, or become subtabs under one `Monetization` tab? Decision: keep `제휴` as its own top navigation page, exclude it from dashboard tabs, and keep banner execution separate.
- [ ] Should install-code copy actions write to clipboard, or only display code for manual copy?
- [ ] Should affiliate item selection auto-fill tracking/creative defaults in the banner console?
