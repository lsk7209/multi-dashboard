import { describe, expect, it } from "vitest";
import { evaluateDashboardArtifactIntegrity } from "./check-dashboard-artifact-integrity.js";

const SNAPSHOT = "2026-07-05T19:12:41.673Z";

describe("check-dashboard-artifact-integrity", () => {
  it("accepts a current locally verified external blocker state", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput());

    expect(result.ready).toBe(true);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "current_snapshot_aligned", pass: true }),
        expect.objectContaining({ id: "verdict_state_consistent", pass: true }),
        expect.objectContaining({ id: "mutation_boundary_clean", pass: true }),
      ]),
    );
  });

  it("accepts a current ready-to-act state after external recovery", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      verification: makeVerification({
        verdict: "local_verified",
        summary: { commands: 4, pass: 4, expectedBlocked: 0, fail: 0, skipped: 0 },
        externalBlockerEvidence: [],
        dashboardActionability: {
          status: "safe_to_act",
          blockerHosts: [],
          requiredVerificationCommand: "pnpm dashboard:post-recovery",
        },
        dashboardSurfaceEvidence: {
          status: "current",
          statsSnapshot: SNAPSHOT,
          blockerHosts: [],
        },
        postRecoveryAcceptance: makePostRecoveryAcceptance("satisfied"),
      }),
      uiSmoke: makeUiSmoke({
        blockerHosts: [],
      }),
      verificationMarkdown: makeVerificationMarkdown({
        verdict: "local_verified",
        actionabilityStatus: "safe_to_act",
        requiredCommand: "pnpm dashboard:post-recovery",
        hosts: [],
      }),
      uiSmokeMarkdown: makeUiSmokeMarkdown({
        actionabilityStatus: "safe_to_act",
        hosts: [],
      }),
      postRecoveryMarkdown: makePostRecoveryMarkdown({
        readiness: "ready_to_act",
        verdict: "local_verified",
        actionabilityStatus: "safe_to_act",
        hosts: [],
        results: [
          ["gsc-permission-audit", "pass", "0"],
          ["dashboard-verify", "pass", "0"],
          ["dashboard-acceptance", "pass", "0"],
        ],
      }),
      postRecovery: makePostRecovery({
        readiness: "ready_to_act",
        results: [
          {
            id: "gsc-permission-audit",
            status: "pass",
            exitCode: 0,
            stdoutTail: `snapshot=${SNAPSHOT}`,
          },
          {
            id: "dashboard-verify",
            status: "pass",
            exitCode: 0,
            stdoutTail: `snapshot=${SNAPSHOT}`,
          },
          {
            id: "dashboard-acceptance",
            status: "pass",
            exitCode: 0,
            stdoutTail: "",
          },
        ],
        summary: {
          commands: 3,
          pass: 3,
          fail: 0,
          skipped: 0,
        },
        dashboardVerification: {
          path: "data\\dashboard-verification-2026-07-06.json",
          statsSnapshot: SNAPSHOT,
          verdict: "local_verified",
          expectedBlocked: 0,
          fail: 0,
          skipped: 0,
          externalBlockerEvidenceCount: 0,
          actionabilityStatus: "safe_to_act",
          actionabilityBlockerHosts: [],
          surfaceBlockerHosts: [],
          postRecoveryAcceptance: [
            "external_gsc_access_restored=satisfied",
            "dashboard_verify_local_verified=satisfied",
            "rendered_ui_smoke_current=satisfied",
            "dashboard_surface_current=satisfied",
            "recommendations_safe_to_act=satisfied",
            "mutation_boundary_clean=satisfied",
          ],
        },
      }),
    }));

    expect(result.ready).toBe(true);
  });

  it("fails when the UI smoke artifact is stale against the current snapshot", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      uiSmoke: {
        ...makeUiSmoke(),
        generatedAt: "2026-07-05T19:00:00.000Z",
      },
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "current_snapshot_aligned")).toMatchObject({
      pass: false,
    });
  });

  it("fails an external blocker verdict without concrete GSC blocker fields", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      verification: makeVerification({
        externalBlockerEvidence: [
          {
            source: "gsc_permission_audit",
            artifactPath: "data\\gsc-permission-audit-2026-07-06.json",
            workOrderPath: "docs\\work-orders\\gsc-permission-audit-2026-07-06.md",
            collectorSnapshot: `data/site-stats.json generatedAt=${SNAPSHOT}`,
            host: "yesa.kr",
            siteId: "",
            gscStatus: "auth_error",
            permissionLevel: "siteUnverifiedUser",
            accessState: "unverified",
          },
        ],
      }),
      postRecovery: makePostRecovery({
        dashboardVerification: {
          ...makePostRecovery().dashboardVerification,
          externalBlockerEvidenceCount: 1,
        },
      }),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "verdict_state_consistent")).toMatchObject({
      pass: false,
    });
  });

  it("fails when post-recovery snapshot disagrees with dashboard verification", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      postRecovery: makePostRecovery({
        dashboardVerification: {
          ...makePostRecovery().dashboardVerification,
          verdict: "local_verified",
        },
      }),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "post_recovery_matches_verification")).toMatchObject({
      pass: false,
    });
  });

  it("fails dirty mutation evidence rows", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      verification: makeVerification({
        mutationBoundaryEvidence: {
          ...makeMutationBoundaryEvidence(),
          evidenceArtifacts: [
            {
              ...makeMutationBoundaryEvidence().evidenceArtifacts[0],
              titleOrBodyMutationPerformed: true,
            },
          ],
        },
      }),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "mutation_boundary_clean")).toMatchObject({
      pass: false,
    });
  });

  it("fails when Markdown work-order summaries drift from JSON", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      verificationMarkdown: makeVerificationMarkdown({
        verdict: "local_verified",
      }) + `\n<!-- correct later: local_verified_external_blocker ${SNAPSHOT} -->\n`,
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "markdown_mirrors_json")).toMatchObject({
      pass: false,
    });
  });

  it("fails when Markdown external blocker tuples drift while the host still appears", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      verificationMarkdown: makeVerificationMarkdown({
        permissionLevel: "owner",
      }),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "markdown_mirrors_json")).toMatchObject({
      pass: false,
    });
  });

  it("fails missing numeric summary fields instead of treating them as zero", () => {
    const verification = makeVerification({
      summary: {
        commands: 4,
        pass: 3,
        expectedBlocked: 1,
      },
    });
    const result = evaluateDashboardArtifactIntegrity(makeInput({ verification }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "post_recovery_matches_verification")).toMatchObject({
      pass: false,
    });
    expect(result.checks.find((check) => check.id === "verdict_state_consistent")).toMatchObject({
      pass: false,
    });
  });

  it("fails pass command results with dirty stderr or non-zero exits", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      postRecovery: makePostRecovery({
        results: [
          {
            id: "gsc-permission-audit",
            status: "pass",
            exitCode: 0,
            stdoutTail: `snapshot=${SNAPSHOT}`,
            stderrTail: "warning: auth stderr",
          },
          {
            id: "dashboard-verify",
            status: "pass",
            exitCode: 0,
            stdoutTail: `snapshot=${SNAPSHOT}`,
            stderrTail: "",
          },
          {
            id: "dashboard-acceptance",
            status: "fail",
            exitCode: 1,
            stdoutTail: "",
            stderrTail: "",
          },
        ],
      }),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "commands_and_tails_consistent")).toMatchObject({
      pass: false,
    });
  });

  it("fails acceptance rows without requirement and evidence text", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      verification: makeVerification({
        postRecoveryAcceptance: [
          { id: "external_gsc_access_restored", status: "pending_external", requirement: "", evidence: "Pending blockers: yesa.kr." },
          ...makePostRecoveryAcceptance().slice(1),
        ],
      }),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "post_recovery_rows_exact")).toMatchObject({
      pass: false,
    });
  });

  it("fails when Markdown acceptance rows drift from JSON", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      verificationMarkdown: makeVerificationMarkdown().replace(
        "| `pending_external` | `recommendations_safe_to_act` |",
        "| `satisfied` | `recommendations_safe_to_act` |",
      ),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "markdown_mirrors_json")).toMatchObject({
      pass: false,
    });
  });

  it("fails when Markdown mutation boundary drifts from JSON", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      verificationMarkdown: makeVerificationMarkdown().replace(
        "- Production mutation: `false`",
        "- Production mutation: `true`",
      ),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "markdown_mirrors_json")).toMatchObject({
      pass: false,
    });
  });


  it("fails stale pre-refresh command tails when the final marker does not match", () => {
    const postRecovery = makePostRecovery({
      results: [
        {
          id: "gsc-permission-audit",
          status: "pass",
          exitCode: 0,
          stdoutTail:
            "snapshot=2026-07-05T19:00:00.000Z pre_refresh_non_authoritative=true finalDashboardVerificationSnapshot=2026-07-05T19:01:00.000Z",
        },
        {
          id: "dashboard-verify",
          status: "pass",
          exitCode: 0,
          stdoutTail: `snapshot=${SNAPSHOT}`,
        },
        {
          id: "dashboard-acceptance",
          status: "fail",
          exitCode: 1,
          stdoutTail: "",
        },
      ],
    });
    const result = evaluateDashboardArtifactIntegrity(makeInput({ postRecovery }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "commands_and_tails_consistent")).toMatchObject({
      pass: false,
    });
  });

  it("fails external blocker audits when collectorSnapshot only contains the snapshot as a substring", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      auditArtifacts: {
        "data\\gsc-permission-audit-2026-07-06.json": {
          collectorSnapshot: `data/site-stats.json generatedAt=${SNAPSHOT} stale`,
          handoffStatus: "pending_external",
          results: [
            {
              host: "yesa.kr",
              siteId: "yesa",
              gscStatus: "auth_error",
              permissionLevel: "siteUnverifiedUser",
              accessState: "unverified",
            },
          ],
        },
      },
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "blocker_evidence_concrete")).toMatchObject({
      pass: false,
    });
  });

  it("fails external blocker audits when handoffStatus is missing or inconsistent", () => {
    const missingStatus = evaluateDashboardArtifactIntegrity(makeInput({
      auditArtifacts: {
        "data\\gsc-permission-audit-2026-07-06.json": {
          collectorSnapshot: `data/site-stats.json generatedAt=${SNAPSHOT}`,
          results: [
            {
              host: "yesa.kr",
              siteId: "yesa",
              gscStatus: "auth_error",
              permissionLevel: "siteUnverifiedUser",
              accessState: "unverified",
            },
          ],
        },
      },
    }));

    expect(missingStatus.ready).toBe(false);
    expect(missingStatus.checks.find((check) => check.id === "blocker_evidence_concrete")).toMatchObject({
      pass: false,
    });

    const inconsistentStatus = evaluateDashboardArtifactIntegrity(makeInput({
      auditArtifacts: {
        "data\\gsc-permission-audit-2026-07-06.json": {
          collectorSnapshot: `data/site-stats.json generatedAt=${SNAPSHOT}`,
          handoffStatus: "resolved",
          results: [
            {
              host: "yesa.kr",
              siteId: "yesa",
              gscStatus: "auth_error",
              permissionLevel: "siteUnverifiedUser",
              accessState: "unverified",
            },
          ],
        },
      },
    }));

    expect(inconsistentStatus.ready).toBe(false);
    expect(inconsistentStatus.checks.find((check) => check.id === "blocker_evidence_concrete")).toMatchObject({
      pass: false,
    });
  });

  it("fails external blocker audits when the GSC work-order Markdown drifts from JSON", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      auditMarkdowns: {
        "docs\\work-orders\\gsc-permission-audit-2026-07-06.md": makeGscAuditMarkdown({
          handoffStatus: "resolved",
        }),
      },
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "blocker_evidence_concrete")).toMatchObject({
      pass: false,
    });
  });

  it("fails external blocker audits when the referenced work-order path drifts from the audit artifact date", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      verification: makeVerification({
        externalBlockerEvidence: [
          {
            source: "gsc_permission_audit",
            artifactPath: "data\\gsc-permission-audit-2026-07-06.json",
            workOrderPath: "docs\\work-orders\\gsc-permission-audit-2026-07-05.md",
            collectorSnapshot: `data/site-stats.json generatedAt=${SNAPSHOT}`,
            host: "yesa.kr",
            siteId: "yesa",
            gscStatus: "auth_error",
            permissionLevel: "siteUnverifiedUser",
            accessState: "unverified",
          },
        ],
      }),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "blocker_evidence_concrete")).toMatchObject({
      pass: false,
    });
  });

  it("fails when verification post-recovery commands drift from the chain commands", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      verification: makeVerification({
        postRecoveryCommands: [
          { id: "gsc-permissions-audit", args: ["gsc:permissions:audit"] },
          { id: "dashboard-verify", args: ["dashboard:verify"] },
          { id: "dashboard-acceptance", args: ["dashboard:acceptance", "data\\dashboard-verification-2026-07-06.json"] },
        ],
      }),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "post_recovery_matches_verification")).toMatchObject({
      pass: false,
    });
  });

  it("fails when the recorded post-write artifact integrity result failed", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      postRecovery: makePostRecovery({
        artifactIntegrity: {
          id: "dashboard-artifact-integrity",
          status: "fail",
          exitCode: 1,
          stdoutTail: "ready=false",
        },
      }),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "post_write_integrity_clean")).toMatchObject({
      pass: false,
    });
  });

  it("fails when the recorded post-write artifact integrity stdout summary is contradictory", () => {
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      postRecovery: makePostRecovery({
        artifactIntegrity: {
          id: "dashboard-artifact-integrity",
          status: "pass",
          exitCode: 0,
          stdoutTail: "date=2026-07-06 ready=true pass=11 fail=1",
        },
      }),
    }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "post_write_integrity_clean")).toMatchObject({
      pass: false,
    });
  });

  it("fails final artifacts when the post-write artifact integrity result is missing", () => {
    const postRecovery = makePostRecovery();
    delete (postRecovery as Record<string, unknown>).artifactIntegrity;
    const result = evaluateDashboardArtifactIntegrity(makeInput({ postRecovery }));

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "post_write_integrity_clean")).toMatchObject({
      pass: false,
    });
  });

  it("allows missing post-write integrity only for the internal pre-recording check", () => {
    const postRecovery = makePostRecovery();
    delete (postRecovery as Record<string, unknown>).artifactIntegrity;
    const result = evaluateDashboardArtifactIntegrity(makeInput({
      postRecovery,
      allowMissingPostWriteIntegrity: true,
    }));

    expect(result.ready).toBe(true);
    expect(result.checks.find((check) => check.id === "post_write_integrity_clean")).toMatchObject({
      pass: true,
    });
  });
});

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    date: "2026-07-06",
    siteStats: {
      generatedAt: SNAPSHOT,
    },
    verification: makeVerification(),
    uiSmoke: makeUiSmoke(),
    postRecovery: makePostRecovery(),
    verificationMarkdown: makeVerificationMarkdown(),
    uiSmokeMarkdown: makeUiSmokeMarkdown(),
    postRecoveryMarkdown: makePostRecoveryMarkdown(),
    auditArtifacts: {
      "data\\gsc-permission-audit-2026-07-06.json": {
        collectorSnapshot: `data/site-stats.json generatedAt=${SNAPSHOT}`,
        handoffStatus: "pending_external",
        summary: {
          auditedRows: 1,
          ownerAccess: 0,
          restrictedAccess: 0,
          unverified: 1,
          notListed: 0,
        },
        results: [
          {
            host: "yesa.kr",
            siteId: "yesa",
            configuredGscSiteUrl: "https://yesa.kr/",
            gscStatus: "auth_error",
            listedSiteUrl: "https://yesa.kr/",
            permissionLevel: "siteUnverifiedUser",
            accessState: "unverified",
            requiredAction: "Verify the Search Console property.",
          },
        ],
      },
    },
    auditMarkdowns: {
      "docs\\work-orders\\gsc-permission-audit-2026-07-06.md": makeGscAuditMarkdown(),
    },
    ...overrides,
  };
}

function makeGscAuditMarkdown(overrides: {
  handoffStatus?: string;
  snapshot?: string;
  auditedRows?: number;
  ownerAccess?: number;
  restrictedAccess?: number;
  unverified?: number;
  notListed?: number;
  host?: string;
  siteId?: string;
  configuredGscSiteUrl?: string;
  listedSiteUrl?: string;
  permissionLevel?: string;
  accessState?: string;
  requiredAction?: string;
} = {}) {
  const handoffStatus = overrides.handoffStatus ?? "pending_external";
  const snapshot = overrides.snapshot ?? `data/site-stats.json generatedAt=${SNAPSHOT}`;
  const auditedRows = overrides.auditedRows ?? 1;
  const ownerAccess = overrides.ownerAccess ?? 0;
  const restrictedAccess = overrides.restrictedAccess ?? 0;
  const unverified = overrides.unverified ?? 1;
  const notListed = overrides.notListed ?? 0;
  const host = overrides.host ?? "yesa.kr";
  const siteId = overrides.siteId ?? "yesa";
  const configuredGscSiteUrl = overrides.configuredGscSiteUrl ?? "https://yesa.kr/";
  const listedSiteUrl = overrides.listedSiteUrl ?? "https://yesa.kr/";
  const permissionLevel = overrides.permissionLevel ?? "siteUnverifiedUser";
  const accessState = overrides.accessState ?? "unverified";
  const requiredAction = overrides.requiredAction ?? "Verify the Search Console property.";
  return `# GSC Permission Audit - ${SNAPSHOT}

## Summary

- Handoff status: \`${handoffStatus}\`
- Snapshot: \`${snapshot}\`
- Audited rows: ${auditedRows}
- Owner access: ${ownerAccess}
- Restricted access: ${restrictedAccess}
- Unverified: ${unverified}
- Not listed: ${notListed}

## Required Actions

### ${host} (${siteId})

- Configured GSC property: \`${configuredGscSiteUrl}\`
- Listed in service account view: \`${listedSiteUrl}\`
- Permission level: \`${permissionLevel}\`
- Access state: \`${accessState}\`
- Required action: ${requiredAction}
`;
}

function makeVerification(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: "2026-07-05T19:12:51.385Z",
    date: "2026-07-06",
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    summary: {
      commands: 4,
      pass: 3,
      expectedBlocked: 1,
      fail: 0,
      skipped: 0,
    },
    verdict: "local_verified_external_blocker",
    statsSnapshot: SNAPSHOT,
    externalBlockerEvidence: [
      {
        source: "gsc_permission_audit",
        artifactPath: "data\\gsc-permission-audit-2026-07-06.json",
        workOrderPath: "docs\\work-orders\\gsc-permission-audit-2026-07-06.md",
        collectorSnapshot: `data/site-stats.json generatedAt=${SNAPSHOT}`,
        host: "yesa.kr",
        siteId: "yesa",
        gscStatus: "auth_error",
        permissionLevel: "siteUnverifiedUser",
        accessState: "unverified",
        requiredAction: "Verify the Search Console property.",
      },
    ],
    blockerSources: ["skipped_refresh_failed:gsc:auth_error:1"],
    blockerDetails: [
      {
        source: "skipped_refresh_failed:gsc:auth_error:1",
      },
    ],
    renderedUiSmokeEvidence: {
      path: "data\\dashboard-ui-smoke-2026-07-06.json",
      expectedStatsSnapshot: SNAPSHOT,
      statsSnapshot: SNAPSHOT,
    },
    dashboardSurfaceEvidence: {
      status: "current",
      statsSnapshot: SNAPSHOT,
      blockerHosts: ["yesa.kr"],
    },
    dashboardActionability: {
      status: "blocked_for_action_until_post_recovery_verify",
      blockerHosts: ["yesa.kr"],
      requiredVerificationCommand: "pnpm dashboard:post-recovery",
    },
    postRecoveryShortcutCommand: "pnpm dashboard:post-recovery",
    postRecoveryCommands: [
      { id: "gsc-permission-audit", args: ["gsc:permissions:audit"] },
      { id: "dashboard-verify", args: ["dashboard:verify"] },
      { id: "dashboard-acceptance", args: ["dashboard:acceptance", "data\\dashboard-verification-2026-07-06.json"] },
    ],
    postRecoveryAcceptance: makePostRecoveryAcceptance(),
    mutationBoundaryEvidence: makeMutationBoundaryEvidence(),
    ...overrides,
  };
}

function makeVerificationMarkdown(overrides: {
  verdict?: string;
  actionabilityStatus?: string;
  requiredCommand?: string;
  hosts?: string[];
  permissionLevel?: string;
  accessState?: string;
  requiredAction?: string;
  workOrderPath?: string;
} = {}) {
  const verdict = overrides.verdict ?? "local_verified_external_blocker";
  const actionabilityStatus = overrides.actionabilityStatus ?? "blocked_for_action_until_post_recovery_verify";
  const requiredCommand = overrides.requiredCommand ?? "pnpm dashboard:post-recovery";
  const hosts = overrides.hosts ?? ["yesa.kr"];
  const permissionLevel = overrides.permissionLevel ?? "siteUnverifiedUser";
  const accessState = overrides.accessState ?? "unverified";
  const requiredAction = overrides.requiredAction ?? "Verify the Search Console property.";
  const workOrderPath = overrides.workOrderPath ?? "docs\\work-orders\\gsc-permission-audit-2026-07-06.md";
  const acceptanceRows = makePostRecoveryAcceptance(verdict === "local_verified" ? "satisfied" : "mixed");
  return `# Dashboard Verification - 2026-07-06

- Stats snapshot: \`${SNAPSHOT}\`
- Verdict: \`${verdict}\`
- External blocker evidence: ${hosts.length > 0 ? hosts.map((host) => `\`${host}:siteUnverifiedUser:unverified\``).join(", ") : "`none`"}

## External Blocker Evidence

${hosts.length > 0 ? hosts.map((host) => `- \`${host}\` (\`yesa\`): \`auth_error\`, \`${permissionLevel}\`, \`${accessState}\`; required action \`${requiredAction}\`; work order \`${workOrderPath}\`.`).join("\n") : "- `none`"}

## Dashboard Actionability

- Status: \`${actionabilityStatus}\`
- Blocker hosts: ${hosts.length > 0 ? hosts.map((host) => `\`${host}\``).join(", ") : "`none`"}
- Required verification command: \`${requiredCommand}\`

## Post-Recovery Acceptance

| Status | Criterion | Requirement | Evidence |
|---|---|---|---|
${acceptanceRows.map((item) => `| \`${item.status}\` | \`${item.id}\` | ${item.requirement} | ${item.evidence} |`).join("\n")}

## Mutation Boundary

- Local evidence artifacts written: \`true\`
- Production mutation: \`false\`
- CMS mutation: \`false\`
- Search Console mutation: \`false\`
- AdSense mutation: \`false\`
- Title/body mutation: \`false\`
`;
}

function makeUiSmokeMarkdown(overrides: {
  actionabilityStatus?: string;
  hosts?: string[];
} = {}) {
  const actionabilityStatus = overrides.actionabilityStatus ?? "blocked_for_action_until_post_recovery_verify";
  const hosts = overrides.hosts ?? ["yesa.kr"];
  const hostText = hosts.length > 0 ? hosts.join(", ") : "none";
  return `# Dashboard UI Smoke - 2026-07-06

- Stats snapshot: \`${SNAPSHOT}\`
- Blocker hosts: \`${hostText}\`

## Actionability

- Status: \`${actionabilityStatus}\`
- Required command: \`pnpm dashboard:post-recovery\`
`;
}

function makePostRecoveryMarkdown(overrides: {
  readiness?: string;
  verdict?: string;
  actionabilityStatus?: string;
  hosts?: string[];
  results?: Array<[string, string, string]>;
} = {}) {
  const readiness = overrides.readiness ?? "external_recovery_required";
  const verdict = overrides.verdict ?? "local_verified_external_blocker";
  const actionabilityStatus = overrides.actionabilityStatus ?? "blocked_for_action_until_post_recovery_verify";
  const hosts = overrides.hosts ?? ["yesa.kr"];
  const results = overrides.results ?? [
    ["gsc-permission-audit", "pass", "0"],
    ["dashboard-verify", "pass", "0"],
    ["dashboard-acceptance", "fail", "1"],
  ];
  return `# Dashboard Post-Recovery Chain - 2026-07-06

- Readiness: \`${readiness}\`
- Stats snapshot: \`${SNAPSHOT}\`
- Verification verdict: \`${verdict}\`

## Commands

${results.map(([id, status, exit]) => `| \`${id}\` | \`${status}\` | ${exit} |`).join("\n")}

## Dashboard Verification

- Actionability: \`${actionabilityStatus}\`
- Actionability blocker hosts: ${hosts.length > 0 ? hosts.map((host) => `\`${host}\``).join(", ") : "`none`"}
`;
}

function makeUiSmoke(overrides: Record<string, unknown> = {}) {
  return {
    date: "2026-07-06",
    generatedAt: SNAPSHOT,
    blockerHosts: ["yesa.kr"],
    actionabilityCommand: "pnpm dashboard:post-recovery",
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    ...overrides,
  };
}

function makePostRecovery(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: "2026-07-05T19:12:51.998Z",
    date: "2026-07-06",
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    readiness: "external_recovery_required",
    commands: [
      { id: "gsc-permission-audit", args: ["gsc:permissions:audit"] },
      { id: "dashboard-verify", args: ["dashboard:verify"] },
      { id: "dashboard-acceptance", args: ["dashboard:acceptance", "data\\dashboard-verification-2026-07-06.json"] },
    ],
    results: [
      {
        id: "gsc-permission-audit",
        status: "pass",
        exitCode: 0,
        stdoutTail:
          `Wrote data\\gsc-permission-audit-2026-07-06.json. snapshot=2026-07-05T19:00:00.000Z\npre_refresh_non_authoritative=true finalDashboardVerificationSnapshot=${SNAPSHOT}`,
      },
      {
        id: "dashboard-verify",
        status: "pass",
        exitCode: 0,
        stdoutTail: `snapshot=${SNAPSHOT}`,
      },
      {
        id: "dashboard-acceptance",
        status: "fail",
        exitCode: 1,
        stdoutTail: "",
      },
    ],
    summary: {
      commands: 3,
      pass: 2,
      fail: 1,
      skipped: 0,
    },
    artifactIntegrity: {
      id: "dashboard-artifact-integrity",
      status: "pass",
      exitCode: 0,
      stdoutTail: "date=2026-07-06 ready=true pass=12 fail=0",
      stderrTail: "",
    },
    dashboardVerification: {
      path: "data\\dashboard-verification-2026-07-06.json",
      statsSnapshot: SNAPSHOT,
      verdict: "local_verified_external_blocker",
      expectedBlocked: 1,
      fail: 0,
      skipped: 0,
      externalBlockerEvidenceCount: 1,
      actionabilityStatus: "blocked_for_action_until_post_recovery_verify",
      actionabilityBlockerHosts: ["yesa.kr"],
      surfaceBlockerHosts: ["yesa.kr"],
      postRecoveryAcceptance: [
        "external_gsc_access_restored=pending_external",
        "dashboard_verify_local_verified=pending_verification",
        "rendered_ui_smoke_current=satisfied",
        "dashboard_surface_current=satisfied",
        "recommendations_safe_to_act=pending_external",
        "mutation_boundary_clean=satisfied",
      ],
    },
    ...overrides,
  };
}

function makePostRecoveryAcceptance(status = "mixed") {
  const statuses =
    status === "satisfied"
      ? {
          external_gsc_access_restored: "satisfied",
          dashboard_verify_local_verified: "satisfied",
          rendered_ui_smoke_current: "satisfied",
          dashboard_surface_current: "satisfied",
          recommendations_safe_to_act: "satisfied",
          mutation_boundary_clean: "satisfied",
        }
      : {
          external_gsc_access_restored: "pending_external",
          dashboard_verify_local_verified: "pending_verification",
          rendered_ui_smoke_current: "satisfied",
          dashboard_surface_current: "satisfied",
          recommendations_safe_to_act: "pending_external",
          mutation_boundary_clean: "satisfied",
        };
  return Object.entries(statuses).map(([id, rowStatus]) => ({
    id,
    status: rowStatus,
    requirement: requirementForAcceptanceId(id),
    evidence: evidenceForAcceptanceId(id, rowStatus),
  }));
}

function requirementForAcceptanceId(id: string): string {
  const requirements: Record<string, string> = {
    external_gsc_access_restored: "Search Console access/ownership is restored for every external GSC blocker.",
    dashboard_verify_local_verified: "`pnpm dashboard:verify` finishes with verdict `local_verified`.",
    rendered_ui_smoke_current: "Rendered browser UI smoke exists and matches the current stats snapshot.",
    dashboard_surface_current: "Dashboard runtime surface evidence matches the current stats snapshot.",
    recommendations_safe_to_act: "Dashboard actions and insights are execution-ready, not read-only.",
    mutation_boundary_clean: "Verification remains non-mutating for production, CMS, GSC, AdSense, and title/body content.",
  };
  return requirements[id] ?? "Unknown requirement.";
}

function evidenceForAcceptanceId(id: string, status: string): string {
  const evidence: Record<string, string> = {
    external_gsc_access_restored: status === "satisfied" ? "No external GSC blockers remain." : "Pending blockers: yesa.kr.",
    dashboard_verify_local_verified: status === "satisfied" ? "Current verdict is local_verified." : "Current verdict is local_verified_external_blocker.",
    rendered_ui_smoke_current: "Rendered UI smoke status is current.",
    dashboard_surface_current: "Dashboard surface status is current.",
    recommendations_safe_to_act: status === "satisfied" ? "Current actionability is safe_to_act." : "Current actionability is blocked_for_action_until_post_recovery_verify.",
    mutation_boundary_clean: "Mutation flags: production=false, cms=false, searchConsole=false, adsense=false, titleOrBody=false.",
  };
  return evidence[id] ?? "Unknown evidence.";
}

function makeMutationBoundaryEvidence() {
  return {
    localEvidenceArtifactsWritten: true,
    productionMutationPerformed: false,
    cmsMutationPerformed: false,
    searchConsoleMutationPerformed: false,
    adsenseMutationPerformed: false,
    titleOrBodyMutationPerformed: false,
    evidenceArtifacts: [
      {
        source: "site_stats_snapshot",
        path: "data\\site-stats.json",
        exists: true,
        generatedAt: SNAPSHOT,
        snapshot: SNAPSHOT,
        productionMutationPerformed: null,
        cmsMutationPerformed: null,
        searchConsoleMutationPerformed: null,
        adsenseMutationPerformed: null,
        titleOrBodyMutationPerformed: null,
      },
    ],
  };
}
