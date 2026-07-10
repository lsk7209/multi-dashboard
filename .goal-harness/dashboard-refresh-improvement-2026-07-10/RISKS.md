# RISKS

| Risk | Impact | Mitigation | Status |
|---|---|---|---|
| Fresh telemetry could be mistaken for authorization to act externally. | High | Retain actionability gating and do not run external mutations. | Controlled |
| Noisy untracked artifacts could enter the deployment commit. | Medium | Stage only reviewed source, tests, current runtime artifacts, and documentation. | Controlled |
| Dashboard change could regress production module resolution. | High | Run typecheck, focused tests, build, local smoke, and Vercel production smoke. | Pending |
