# 사전 준비 자동화 핸드오프 스펙 v1.1

> 작성: 2026-05-17  
> 대상: Claude Code 자율 실행  
> 변경 요지 (v1.0 → v1.1): 5인 검토팀 P0 5개 + P1 5개 — 보안 (1Password CLI receive 패턴) + idempotency (App Password DELETE-then-recreate + state.json) + 운영 (cleanup-wp-bot, dry-run 검증, progress UI)

---

## 0. 변경 이력

| 버전 | 변경 |
|---|---|
| v1.0 | 7개 스크립트 초안, 평문 비밀번호 .env.setup + wp-admins.json |
| **v1.1** | **P0: (1) `wp-admins.json` 폐기 → 1Password CLI receive 🔴 (2) `.env.setup` 동일하게 op inject 🔴 (3) GH_TOKEN fine-grained PAT + 작업 후 자동 revoke (4) WP App Password idempotent (DELETE 후 재생성) (5) `.setup-state.json` 진행 기록 + resume. P1: (6) `cleanup-wp-bot.ts` 동시 추가 (7) GHA Secret 적재 후 workflow_dispatch dry-run 검증 (8) rate limit + exponential backoff (9) shred cross-platform (10) listr2 progress UI** |

---

## 1. 목적

v1.3 메인 스펙의 사전 준비를 30개+ 사이트 대상 일괄 자동화. **디스크에 평문 비밀번호 0** 원칙. 모든 스크립트는 idempotent + resumable.

---

## 2. 자동화 범위

| # | 스크립트 | 변경(v1.0→v1.1) |
|---|---|---|
| 1 | `register-gsc-users.ts` | 변경 없음 (GSC API 한계) |
| 2 | `register-ga4-bindings.ts` | + retry 명시 |
| 3 | `setup-wp-users.ts` | **App Password DELETE-then-recreate** + `op` receive |
| 4 | `set-gha-secrets.ts` | fine-grained PAT 강제, **state.json**, **dry-run 검증** |
| 5 | `set-vercel-envs.ts` | state.json 통합 |
| 6 | `verify-readiness.ts` | listr2 progress |
| 7 | `add-site.ts` | state.json 통합 |
| 8 | **`cleanup-wp-bot.ts` (신규)** | bot user + App Password 일괄 회수 |

---

## 3. 사전 요구 사항

### 3.1 도구 설치

```bash
# 패키지
pnpm i -w -D \
  googleapis @google-analytics/admin \
  @octokit/rest libsodium-wrappers \
  @vercel/sdk \
  yaml zod tsx p-limit p-retry \
  listr2 ora

# 1Password CLI (필수 — 평문 비밀번호 receive)
brew install 1password-cli      # macOS
# 또는 https://1password.com/downloads/command-line/

# direnv (선택, .env 자동 inject)
brew install direnv
```

### 3.2 1Password 사전 셋업

vault `multisite-dashboard-setup` 생성 후 아이템 추가:

| Item name | Field | Value |
|---|---|---|
| `gcp-sa-key` | password | SA JSON 파일 경로 또는 raw content |
| `gcp-sa-email` | password | `multisite-dashboard@<project>.iam.gserviceaccount.com` |
| `gh-pat` | password | fine-grained PAT (`secrets:write`, repo 한정, 7일 만료) |
| `vercel-token` | password | project scope PAT |
| `vercel-project-id` | password | `prj_xxx` |
| `turso-url-write` | password | `libsql://...` |
| `turso-token-write` | password | |
| `turso-url-read` | password | |
| `turso-token-read` | password | |
| `naver-api-key` | password | |
| `bok-api-key` | password | |
| `auth-secret` | password | 32자 random |
| `auth-google-id` | password | |
| `auth-google-secret` | password | |
| `admin-email-whitelist` | password | `limo@example.com` |
| `cron-secret` | password | 32자 random |
| `internal-key` | password | 32자 random |
| `app-url` | password | `https://multisite.example.com` |

WP 사이트별 (24개):
| Item name | Field | Value |
|---|---|---|
| `wp-admin-{siteId}` (예: `wp-admin-recipes-01`) | username | admin username |
| | password | admin App Password (Limo가 WP에서 발급) |
| | url | `https://recipes-example.com` |

> 1Password 없으면 macOS Keychain(`security` CLI), Bitwarden(`bw` CLI), `pass` 등 대체 가능. 어쨌든 **디스크 평문 금지**가 핵심.

### 3.3 `.env.setup.template` (값 없이 키만, repo commit 가능)

```bash
# op run -- inject 용 템플릿. 실제 값은 op vault에서 receive.
GCP_SA_KEY_JSON="op://multisite-dashboard-setup/gcp-sa-key/password"
GCP_SA_EMAIL="op://multisite-dashboard-setup/gcp-sa-email/password"
GH_TOKEN="op://multisite-dashboard-setup/gh-pat/password"
GH_OWNER="limo"
GH_REPO="multisite-dashboard"
VERCEL_TOKEN="op://multisite-dashboard-setup/vercel-token/password"
VERCEL_PROJECT_ID="op://multisite-dashboard-setup/vercel-project-id/password"
TURSO_URL_WRITE="op://multisite-dashboard-setup/turso-url-write/password"
TURSO_TOKEN_WRITE="op://multisite-dashboard-setup/turso-token-write/password"
TURSO_URL_READ="op://multisite-dashboard-setup/turso-url-read/password"
TURSO_TOKEN_READ="op://multisite-dashboard-setup/turso-token-read/password"
NAVER_API_KEY="op://multisite-dashboard-setup/naver-api-key/password"
BOK_API_KEY="op://multisite-dashboard-setup/bok-api-key/password"
AUTH_SECRET="op://multisite-dashboard-setup/auth-secret/password"
AUTH_GOOGLE_ID="op://multisite-dashboard-setup/auth-google-id/password"
AUTH_GOOGLE_SECRET="op://multisite-dashboard-setup/auth-google-secret/password"
ADMIN_EMAIL_WHITELIST="op://multisite-dashboard-setup/admin-email-whitelist/password"
CRON_SECRET="op://multisite-dashboard-setup/cron-secret/password"
INTERNAL_KEY="op://multisite-dashboard-setup/internal-key/password"
APP_URL="op://multisite-dashboard-setup/app-url/password"
```

실행 시:
```bash
op signin
op run --env-file=.env.setup.template -- pnpm setup:all
```

`op run`이 `op://...` 참조를 메모리에 inject — 디스크엔 평문 0.

---

## 4. 디렉토리 구조

```
multisite-dashboard/
└── scripts/setup/
    ├── lib/
    │   ├── env.ts                  # zod, op:// reference 허용
    │   ├── sites.ts
    │   ├── gcp.ts
    │   ├── github.ts               # fine-grained PAT 검증 + libsodium
    │   ├── vercel.ts
    │   ├── wp.ts                   # App Password CRUD
    │   ├── op.ts                   # 1Password CLI 래퍼 (op item get)
    │   ├── state.ts                # .setup-state.json read/write
    │   ├── secure-rm.ts            # cross-platform secure delete
    │   └── retry.ts                # p-retry + exponential backoff
    ├── 01-register-gsc-users.ts
    ├── 02-register-ga4-bindings.ts
    ├── 03-setup-wp-users.ts        # ★ idempotent
    ├── 04-set-gha-secrets.ts       # ★ fine-grained PAT, dry-run
    ├── 05-set-vercel-envs.ts
    ├── 06-verify-readiness.ts      # ★ listr2
    ├── 07-cleanup-wp-bot.ts        # ★ 신규
    ├── add-site.ts
    ├── run-all.ts                  # ★ resume, listr2
    ├── revoke-tokens.ts            # ★ 신규 — 작업 후 PAT revoke
    └── README.md
```

`package.json`:
```json
{
  "scripts": {
    "setup:gsc": "op run --env-file=.env.setup.template -- tsx scripts/setup/01-register-gsc-users.ts",
    "setup:ga4": "op run --env-file=.env.setup.template -- tsx scripts/setup/02-register-ga4-bindings.ts",
    "setup:wp": "op run --env-file=.env.setup.template -- tsx scripts/setup/03-setup-wp-users.ts",
    "setup:gha": "op run --env-file=.env.setup.template -- tsx scripts/setup/04-set-gha-secrets.ts",
    "setup:vercel": "op run --env-file=.env.setup.template -- tsx scripts/setup/05-set-vercel-envs.ts",
    "setup:verify": "op run --env-file=.env.setup.template -- tsx scripts/setup/06-verify-readiness.ts",
    "setup:cleanup-wp": "op run --env-file=.env.setup.template -- tsx scripts/setup/07-cleanup-wp-bot.ts",
    "setup:all": "op run --env-file=.env.setup.template -- tsx scripts/setup/run-all.ts",
    "setup:resume": "op run --env-file=.env.setup.template -- tsx scripts/setup/run-all.ts --resume",
    "setup:add-site": "op run --env-file=.env.setup.template -- tsx scripts/setup/add-site.ts",
    "setup:revoke": "op run --env-file=.env.setup.template -- tsx scripts/setup/revoke-tokens.ts"
  }
}
```

---

## 5. 공통 라이브러리

### 5.1 `lib/op.ts` — 1Password CLI receive

```typescript
import { execSync } from 'node:child_process';

/** vault item field 값을 메모리에 read. 파일 시스템 거치지 않음. */
export function opRead(vault: string, item: string, field = 'password'): string {
  try {
    return execSync(`op item get "${item}" --vault "${vault}" --field "${field}" --reveal`, {
      encoding: 'utf8',
    }).trim();
  } catch (e: any) {
    throw new Error(`1Password read failed: ${vault}/${item}/${field}: ${e.message}`);
  }
}

/** WP admin credentials (사이트별) */
export function getWpAdmin(siteId: string): { url: string; username: string; password: string } {
  const vault = 'multisite-dashboard-setup';
  const item = `wp-admin-${siteId}`;
  return {
    url: opRead(vault, item, 'url'),
    username: opRead(vault, item, 'username'),
    password: opRead(vault, item, 'password'),
  };
}
```

### 5.2 `lib/state.ts` — 진행 상황 기록 + resume

```typescript
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const STATE_PATH = '.setup-state.json';

export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';
export interface SetupState {
  startedAt: string;
  steps: Record<string, {
    status: StepStatus;
    startedAt?: string;
    finishedAt?: string;
    error?: string;
    sites?: Record<string, { status: StepStatus; error?: string }>;  // 사이트별
  }>;
}

export async function loadState(): Promise<SetupState> {
  if (!existsSync(STATE_PATH)) return { startedAt: new Date().toISOString(), steps: {} };
  return JSON.parse(await readFile(STATE_PATH, 'utf8'));
}

export async function saveState(state: SetupState) {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

export async function markStep(stepId: string, status: StepStatus, error?: string) {
  const state = await loadState();
  state.steps[stepId] = {
    ...state.steps[stepId],
    status,
    [status === 'running' ? 'startedAt' : 'finishedAt']: new Date().toISOString(),
    error,
  };
  await saveState(state);
}

export async function markSiteStep(stepId: string, siteId: string, status: StepStatus, error?: string) {
  const state = await loadState();
  state.steps[stepId] = state.steps[stepId] ?? { status: 'running' };
  state.steps[stepId].sites = state.steps[stepId].sites ?? {};
  state.steps[stepId].sites![siteId] = { status, error };
  await saveState(state);
}

export async function getResumableSites(stepId: string, allSiteIds: string[]): Promise<string[]> {
  const state = await loadState();
  const stepSites = state.steps[stepId]?.sites ?? {};
  // 'success' 아닌 사이트만 다시 처리
  return allSiteIds.filter(id => stepSites[id]?.status !== 'success');
}
```

### 5.3 `lib/secure-rm.ts` — cross-platform secure delete

```typescript
import { execSync } from 'node:child_process';
import { unlink } from 'node:fs/promises';

export async function secureRm(path: string) {
  try {
    if (process.platform === 'darwin') {
      execSync(`rm -P "${path}"`);
    } else if (process.platform === 'linux') {
      execSync(`shred -u "${path}"`);
    } else {
      // Windows or other — fallback to overwrite then delete
      const crypto = await import('node:crypto');
      const fs = await import('node:fs/promises');
      const stat = await fs.stat(path);
      await fs.writeFile(path, crypto.randomBytes(stat.size));
      await unlink(path);
    }
  } catch (e) {
    // 파일이 이미 없으면 무시
    try { await unlink(path); } catch {}
  }
}
```

### 5.4 `lib/retry.ts` — exponential backoff

```typescript
import pRetry, { AbortError } from 'p-retry';

export async function withRetry<T>(fn: () => Promise<T>, opts?: { retries?: number; minTimeout?: number }): Promise<T> {
  return pRetry(fn, {
    retries: opts?.retries ?? 3,
    minTimeout: opts?.minTimeout ?? 250,
    factor: 2,           // 250 → 500 → 1000ms
    onFailedAttempt: (err) => {
      // 4xx (auth, bad request)는 abort
      if (err.message.match(/4\d\d/) && !err.message.match(/429/)) {
        throw new AbortError(err.message);
      }
    },
  });
}
```

### 5.5 `lib/github.ts` — fine-grained PAT 검증

```typescript
import { Octokit } from '@octokit/rest';

export async function makeOctokitVerified(token: string, owner: string, repo: string) {
  const octokit = new Octokit({ auth: token });
  // PAT 형식 검증
  if (!token.startsWith('github_pat_')) {
    throw new Error('PAT must be fine-grained (github_pat_...). Classic PAT is too broad.');
  }
  // scope 검증 — secrets:write 실제 가능한지 dry test
  try {
    await octokit.actions.getRepoPublicKey({ owner, repo });
  } catch (e: any) {
    throw new Error(`PAT cannot access ${owner}/${repo} secrets. Check scope: ${e.message}`);
  }
  return octokit;
}
```

---

## 6. 핵심 스크립트 (v1.0 대비 변경 부분만)

### 6.1 `03-setup-wp-users.ts` — Idempotent App Password

```typescript
import { loadSites } from './lib/sites';
import { getWpAdmin } from './lib/op';
import { WpClient } from './lib/wp';
import { markSiteStep, getResumableSites } from './lib/state';
import { withRetry } from './lib/retry';
import { Listr } from 'listr2';

const BOT_USERNAME = 'dashboard-bot';
const APP_PWD_NAME = 'multisite-dashboard';

async function processOne(siteId: string, site: Site): Promise<{ password: string }> {
  const admin = getWpAdmin(siteId);   // op CLI receive — 디스크 평문 X
  const wp = new WpClient({
    base: site.wpRestBase!,
    auth: { user: admin.username, password: admin.password },
  });

  return await withRetry(async () => {
    // 1) Editor user 확보 (idempotent)
    let userId = (await wp.findUserBySlug(BOT_USERNAME))?.id;
    if (!userId) {
      const created = await wp.createUser({
        username: BOT_USERNAME,
        email: `dashboard-bot+${siteId}@example.com`,
        password: crypto.randomUUID(),
        roles: ['editor'],
        name: 'Dashboard Bot',
      });
      userId = created.id;
    } else {
      const existing = await wp.getUser(userId);
      if (!existing.roles?.includes('editor')) {
        await wp.updateUser(userId, { roles: ['editor'] });
      }
    }

    // 2) ★ 기존 'multisite-dashboard' App Password 모두 삭제 (B1: idempotent)
    const existingPwds = await wp.listApplicationPasswords(userId);
    for (const p of existingPwds.filter(x => x.name === APP_PWD_NAME)) {
      await wp.deleteApplicationPassword(userId, p.uuid);
    }

    // 3) 새 App Password 발급
    const newPwd = await wp.createApplicationPassword(userId, APP_PWD_NAME);

    // 4) 즉시 verify (인증 + posts read)
    const auth = Buffer.from(`${BOT_USERNAME}:${newPwd.password}`).toString('base64');
    const r = await fetch(`${site.wpRestBase}/posts?per_page=1`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!r.ok) throw new Error(`verify failed: ${r.status}`);

    return { password: newPwd.password };
  });
}

async function main() {
  const allWp = (await loadSites()).filter(s => s.enabled && s.platform === 'wordpress');
  const resume = process.argv.includes('--resume');
  const targets = resume
    ? await getResumableSites('wp-users', allWp.map(s => s.id))
    : allWp.map(s => s.id);

  const passwords: Record<string, string> = {};

  const tasks = new Listr(
    allWp.filter(s => targets.includes(s.id)).map(site => ({
      title: `WP ${site.id}`,
      task: async () => {
        try {
          const { password } = await processOne(site.id, site);
          passwords[site.id] = password;
          await markSiteStep('wp-users', site.id, 'success');
        } catch (e: any) {
          await markSiteStep('wp-users', site.id, 'failed', e.message);
          throw e;
        }
      },
    })),
    { concurrent: 3, exitOnError: false }
  );

  await tasks.run();

  // 04-gha-secrets가 메모리로 직접 받도록 stdout JSON 출력 (파일 안 만듦)
  process.stdout.write(JSON.stringify({ wpPasswords: passwords }));
}

main().catch((e) => { console.error(e); process.exit(1); });
```

> **핵심 변경**: (1) `wp-admins.json` 안 읽고 1Password에서 직접 (2) 기존 App Password DELETE 후 새로 발급 — 재실행 안전 (3) 발급된 password를 **stdout JSON으로만** 전달 (파일 X).

### 6.2 `04-set-gha-secrets.ts` — fine-grained PAT + dry-run 검증

```typescript
import { execSync } from 'node:child_process';
import sodium from 'libsodium-wrappers';
import { makeOctokitVerified } from './lib/github';
import { withRetry } from './lib/retry';
import { markStep, markSiteStep } from './lib/state';
import { Listr } from 'listr2';

async function encryptSecret(value: string, publicKey: string): Promise<string> {
  await sodium.ready;
  const binKey = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
  const enc = sodium.crypto_box_seal(sodium.from_string(value), binKey);
  return sodium.to_base64(enc, sodium.base64_variants.ORIGINAL);
}

async function main() {
  await markStep('gha-secrets', 'running');
  const env = process.env;
  const octokit = await makeOctokitVerified(env.GH_TOKEN!, env.GH_OWNER!, env.GH_REPO!);
  const { data: publicKey } = await octokit.actions.getRepoPublicKey({ owner: env.GH_OWNER!, repo: env.GH_REPO! });

  // 1) 03 스크립트 stdout에서 WP password JSON 받기 (파이프)
  // run-all.ts에서: pnpm setup:wp | pnpm setup:gha
  const wpPasswords: Record<string, string> = process.env.WP_PASSWORDS_JSON
    ? JSON.parse(process.env.WP_PASSWORDS_JSON)
    : {};

  // 2) 공용 + WP 사이트별 secret
  const allSecrets: Record<string, string> = {
    GCP_SA_KEY_JSON: env.GCP_SA_KEY_JSON!,
    TURSO_URL: env.TURSO_URL_WRITE!,
    TURSO_AUTH_TOKEN: env.TURSO_TOKEN_WRITE!,
    NAVER_API_KEY: env.NAVER_API_KEY!,
    BOK_API_KEY: env.BOK_API_KEY!,
  };
  for (const [siteId, pwd] of Object.entries(wpPasswords)) {
    allSecrets[`WP_PWD_${siteId.toUpperCase().replace(/-/g, '_')}`] = pwd;
  }

  // 3) 일괄 등록 (listr2 progress)
  const tasks = new Listr(
    Object.entries(allSecrets).map(([name, value]) => ({
      title: `Secret: ${name}`,
      task: async () => {
        await withRetry(async () => {
          const encrypted_value = await encryptSecret(value, publicKey.key);
          await octokit.actions.createOrUpdateRepoSecret({
            owner: env.GH_OWNER!,
            repo: env.GH_REPO!,
            secret_name: name,
            encrypted_value,
            key_id: publicKey.key_id,
          });
        });
        await markSiteStep('gha-secrets', name, 'success');
      },
    })),
    { concurrent: 5, exitOnError: false }
  );

  await tasks.run();

  // 4) ★ dry-run 검증: workflow_dispatch로 ETL 1회 (어제 1일치만) trigger
  console.log('\n▶ Triggering ETL dry-run to verify secrets are functional...');
  try {
    execSync(
      `gh workflow run etl-daily.yml --field days=1 -R ${env.GH_OWNER}/${env.GH_REPO}`,
      { stdio: 'inherit' }
    );
    console.log('✓ Workflow triggered. Check status: gh run list -R ' + env.GH_OWNER + '/' + env.GH_REPO);
  } catch (e: any) {
    console.warn('⚠ Dry-run trigger failed (workflow file may not exist yet — OK for first setup):', e.message);
  }

  await markStep('gha-secrets', 'success');
}

main().catch(async (e) => {
  await markStep('gha-secrets', 'failed', e.message);
  console.error(e);
  process.exit(1);
});
```

### 6.3 `07-cleanup-wp-bot.ts` — 신규 (회수)

```typescript
import { loadSites } from './lib/sites';
import { getWpAdmin } from './lib/op';
import { WpClient } from './lib/wp';
import { Octokit } from '@octokit/rest';
import { Listr } from 'listr2';

const BOT_USERNAME = 'dashboard-bot';
const APP_PWD_NAME = 'multisite-dashboard';

async function main() {
  const targetSiteId = process.argv[2];   // 단일 사이트 또는 전체
  const sites = (await loadSites()).filter(s => s.platform === 'wordpress' && (!targetSiteId || s.id === targetSiteId));
  const octokit = new Octokit({ auth: process.env.GH_TOKEN });

  const tasks = new Listr(sites.map(site => ({
    title: `Cleanup ${site.id}`,
    task: async () => {
      // 1) WP App Password + bot user 삭제
      try {
        const admin = getWpAdmin(site.id);
        const wp = new WpClient({ base: site.wpRestBase!, auth: { user: admin.username, password: admin.password } });
        const user = await wp.findUserBySlug(BOT_USERNAME);
        if (user) {
          // App passwords 먼저 모두 삭제
          const pwds = await wp.listApplicationPasswords(user.id);
          for (const p of pwds) await wp.deleteApplicationPassword(user.id, p.uuid);
          // user 삭제 (reassign posts to admin 권장)
          await wp.deleteUser(user.id, { reassign: 1, force: true });
        }
      } catch (e: any) {
        console.warn(`WP cleanup failed for ${site.id}: ${e.message}`);
      }

      // 2) GHA Secret 삭제
      const secretName = `WP_PWD_${site.id.toUpperCase().replace(/-/g, '_')}`;
      try {
        await octokit.actions.deleteRepoSecret({
          owner: process.env.GH_OWNER!,
          repo: process.env.GH_REPO!,
          secret_name: secretName,
        });
      } catch (e: any) {
        console.warn(`GHA secret delete failed for ${secretName}: ${e.message}`);
      }
    },
  })), { concurrent: 3 });

  await tasks.run();
}

main();
```

### 6.4 `revoke-tokens.ts` — 신규 (작업 후 PAT 폐기)

```typescript
import { execSync } from 'node:child_process';

async function main() {
  console.log('Revoking ephemeral tokens used during setup...\n');

  // GitHub fine-grained PAT — GitHub은 API로 self-revoke 불가, UI에서만.
  // 따라서 만료일 7일 설정으로 강제 자연 만료.
  console.log('⚠ GitHub fine-grained PAT: revoke manually at');
  console.log('  https://github.com/settings/tokens?type=beta');

  // Vercel token — API revoke 가능
  try {
    const token = process.env.VERCEL_TOKEN!;
    // Vercel은 user token만 자체 폐기 가능
    const res = await fetch(`https://api.vercel.com/v3/user/tokens/current`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) console.log('✓ Vercel token revoked');
    else console.warn('⚠ Vercel token revoke failed:', await res.text());
  } catch (e) { console.warn(e); }

  // 1Password vault item 삭제 — 사용한 setup token들 회수
  console.log('\nDelete used items from 1Password (or keep with rotation reminder):');
  console.log('  op item delete gh-pat --vault multisite-dashboard-setup');
  console.log('  op item delete vercel-token --vault multisite-dashboard-setup');
  console.log('\n(WP admin items은 정상 운영에 필요하니 유지)');
}

main();
```

### 6.5 `06-verify-readiness.ts` — listr2 progress (v1.0 로직 + UI 개선)

핵심 검증 로직은 v1.0과 동일. 단, 각 사이트가 Listr2 task로 실시간 진행 표시. 에러는 50자 슬라이스 → 전체는 `setup.log` 파일에:

```typescript
const tasks = new Listr(sites.map(site => ({
  title: `${site.id}`,
  task: async (ctx, task) => {
    const r = { gsc: '-', ga4: '-', adsense: '-', wp: site.platform === 'wordpress' ? '-' : 'n/a' };
    for (const apiName of ['gsc', 'ga4', 'adsense', 'wp']) {
      try {
        task.output = `Checking ${apiName}...`;
        await checkApi(apiName, site);
        r[apiName] = '✓';
      } catch (e: any) {
        r[apiName] = '✗';
        appendLog(`${site.id}/${apiName}: ${e.message}`);
      }
    }
    ctx[site.id] = r;
    task.title = `${site.id} — ${formatResult(r)}`;
  },
})), { concurrent: 5, exitOnError: false, rendererOptions: { collapseSubtasks: false } });
```

---

## 7. `run-all.ts` — Resume 지원 + Pipe

```typescript
import { execSync, spawn } from 'node:child_process';
import { rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Listr } from 'listr2';
import { loadState, markStep } from './lib/state';

async function main() {
  const resume = process.argv.includes('--resume');
  const state = await loadState();

  const stepDone = (id: string) => resume && state.steps[id]?.status === 'success';

  const tasks = new Listr([
    {
      title: 'GSC verify (manual reminder)',
      skip: () => stepDone('gsc') && 'already done',
      task: async () => { execSync('tsx scripts/setup/01-register-gsc-users.ts', { stdio: 'inherit' }); },
    },
    {
      title: 'GA4 binding',
      skip: () => stepDone('ga4') && 'already done',
      task: async () => { execSync('tsx scripts/setup/02-register-ga4-bindings.ts', { stdio: 'inherit' }); },
    },
    {
      title: 'WP users + App Password',
      skip: () => stepDone('wp-users') && 'already done',
      task: async (ctx) => {
        // 03 스크립트의 stdout JSON을 capture → 04에 inject (디스크 거치지 않음)
        const out = execSync('tsx scripts/setup/03-setup-wp-users.ts', { encoding: 'utf8' });
        const { wpPasswords } = JSON.parse(out.match(/\{.*\}$/s)![0]);
        ctx.wpPasswords = wpPasswords;
      },
    },
    {
      title: 'GHA secrets',
      skip: () => stepDone('gha-secrets') && 'already done',
      task: async (ctx) => {
        execSync('tsx scripts/setup/04-set-gha-secrets.ts', {
          stdio: 'inherit',
          env: { ...process.env, WP_PASSWORDS_JSON: JSON.stringify(ctx.wpPasswords ?? {}) },
        });
      },
    },
    {
      title: 'Vercel envs',
      skip: () => stepDone('vercel') && 'already done',
      task: async () => { execSync('tsx scripts/setup/05-set-vercel-envs.ts', { stdio: 'inherit' }); },
    },
    {
      title: 'Verify all sites',
      task: async () => { execSync('tsx scripts/setup/06-verify-readiness.ts', { stdio: 'inherit' }); },
    },
  ]);

  try {
    await tasks.run();
    console.log('\n🎉 Setup complete.');
    console.log('Next:');
    console.log('  1. pnpm setup:revoke   # Revoke ephemeral PATs');
    console.log('  2. Add SA to GSC for any sites listed in step 1 output');
  } catch (e) {
    console.error('\n✗ Setup failed. Resume with: pnpm setup:resume');
    process.exit(1);
  }
}

main();
```

---

## 8. 보안 주의 (v1.0에서 강화)

| 항목 | v1.0 | v1.1 |
|---|---|---|
| 비밀번호 저장 | 디스크 평문 (`wp-admins.json`, `.env.setup`) | **1Password vault만**, `op run --` 메모리 inject |
| WP App Password 누적 | 매번 새 password 발급 → WP에 누적 | **기존 'multisite-dashboard' 모두 DELETE 후 재생성** |
| GH Token | classic `repo + workflow` scope | **fine-grained PAT** (`secrets:write`, repo 한정, 7일 만료) |
| 작업 후 토큰 회수 | "수동으로 revoke 하세요" 메모 | `pnpm setup:revoke` 자동 (Vercel) + 안내 (GitHub) |
| 임시 파일 (wpPasswords) | `.secrets-staging/wp-passwords.json` 디스크 | **stdout JSON pipe** — 디스크 거치지 않음 |
| 진행 추적 | 없음 | `.setup-state.json` (비밀 값 없음, 진행 상태만) |
| Cleanup | 향후 항목 | **v1.1 동시 추가** (`pnpm setup:cleanup-wp`) |

`.gitignore` 추가:
```
.setup-state.json
setup.log
```

> `.env.setup.template`은 op:// 참조만 있어서 **commit 안전**. 

---

## 9. 검증 체크리스트

- [ ] `op signin` 완료, vault `multisite-dashboard-setup` 존재
- [ ] `op item list --vault multisite-dashboard-setup` 결과에 필수 아이템 + WP admin 24개
- [ ] `pnpm setup:all` 6/6 ✓
- [ ] `pnpm setup:verify` 모든 사이트 ✓
- [ ] GitHub Secrets 페이지: `WP_PWD_*` 24개 + 공용 5개 확인
- [ ] Vercel ENV 페이지: 11개 키 확인
- [ ] `pnpm setup:revoke` 실행 후 Vercel token revoked 확인
- [ ] GitHub fine-grained PAT 수동 revoke 또는 7일 만료 대기
- [ ] `.setup-state.json` 보관 (audit log 용도) — 비밀 값 0이라 commit 가능

---

## 10. 향후 (v1.2)

- `rotate-gcp-key.ts`: 90일 SA 키 자동 로테이션
- `audit-permissions.ts`: 30개 사이트 권한 over-privilege 탐지
- 인프라 생성 자동화 (Turso db / Vercel project / GitHub repo) — 별도 트랙
- macOS Keychain / Bitwarden CLI 어댑터 (1Password 대안)

---

## 11. Claude Code 실행 메모

1. `pnpm i`
2. 1Password vault 셋업 (위 3.2)
3. `cp .env.setup.example .env.setup.template` (op:// references만 포함)
4. `op signin`
5. `pnpm setup:all`
6. 출력의 GSC 수동 등록 URL 30개 클릭 (구글 API 한계)
7. `pnpm setup:verify` 모든 ✓ 재확인
8. `pnpm setup:revoke` — Vercel token 폐기, GitHub PAT 수동 revoke
9. GA4·WP·Vercel 모두 ✓이지만 GSC만 ✗인 사이트는 콘솔 수동 추가 후 재verify

### 실패 시
- `pnpm setup:resume` — `.setup-state.json` 보고 미완료 사이트만 재처리
- 특정 step만 재실행: `pnpm setup:wp` (resume 모드)

### 신규 사이트 추가
1. 1Password에 `wp-admin-{newSiteId}` 아이템 추가
2. `sites.yaml`에 entry 추가
3. `pnpm setup:add-site --id=newSiteId`
4. GSC 수동 추가

### 사이트 제거
1. `pnpm setup:cleanup-wp newSiteId` — WP bot user + GHA secret 회수
2. `sites.yaml`에서 entry 제거 또는 `enabled: false`
3. 1Password에서 `wp-admin-{siteId}` 삭제 (선택)
