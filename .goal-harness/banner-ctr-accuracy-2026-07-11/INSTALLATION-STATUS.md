# Installation Status

## Ready for deployment after dashboard release

- Next/Vite loader markup added locally: `campgogo`, `cartain-2`, `dogswhere`, `dullegilgogo`, `picklefriend`, `plategogo`, `roadways`, `temon`, `tennisfrens`, `todaypharm`.
- WordPress MU-plugin installer: 9 targets pass dry-run (`nexttech7`, `smallhomepick`, `petinsuer-2`, `healfood-2`, `estat-2`, `autoscares-2`, `dogspang-2`, `notebook-klick-2`, `softwa`). The script only writes with `--apply` and creates a timestamped remote backup.

## Held to preserve existing local work

- `pregnancy-ehon365` and `yungyanggogo` banner components are untracked local files. Apply the same loader wrapper only after their existing work is reviewed or committed.

## Verification gaps

- App-local dependencies are absent in the inspected checkouts, so `temon` build, `cartain` build, and `roadways` typecheck could not start. Dashboard lint/typecheck and focused tests pass.
- Production validation remains required: deploy dashboard with the event secret, then inspect browser network and LibSQL rows for a Next/Vite and WordPress canary before the remaining rollout.
