# Status

Current State: ROLLING_OUT
Current Phase: Production canaries verified; fleet propagation in progress
Completed: The Vercel production secret and dashboard deployment are live. A headed-Chrome visit to `temon.kr` produced a CORS-authorized `POST /api/banner-management/event` 200, and the qualified-impression metric increased. The same browser check passed for the `smallhomepick.com` WordPress MU-plugin canary. Eight WordPress MU plugins and eight clean app repositories were pushed/applied.
In Progress: Waiting for recent Git-connected app deployments to reach public pages, then validating every site with a cache-bypass URL.
Remaining: Verify Cartain's public placement and resolve Notebook's external-script optimization, which removes the loader even though the banner marker is present.
Blocked: No global blocker. Pregnancy, Yungyang, and Dogswhere are now deployed with public measurement markers.
Last Verification: `pnpm lint`, `pnpm type-check`, and focused banner Vitest (14 tests) passed. Browser evidence: Temon and Smallhomepick event 200 responses.
Next Action: Recheck public deployment markers, then address remaining site-specific blockers without modifying unrelated work.
