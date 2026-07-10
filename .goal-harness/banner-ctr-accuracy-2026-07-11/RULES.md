# Rules

- Do not claim CTR from legacy endpoint-call data.
- Store only anonymous, per-site session tokens; do not collect IP addresses or browser fingerprints.
- Do not alter or delete production historical events.
- Treat fleet deployment and remote WordPress writes as risky; record a Risk Notice and verify each deployment.
- Do not expose secrets or stage unrelated files.
