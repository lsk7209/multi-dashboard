"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  OpsMailFinding,
  OpsMailKind,
  OpsMailReport,
  OpsMailSeverity,
} from "../lib/dashboard-data.js";
import type { OpsMailReviewStatus } from "../lib/ops-mail-review-store.js";

type ReviewDraft = {
  status: OpsMailReviewStatus;
  note: string;
};

const KIND_OPTIONS: Array<"all" | OpsMailKind> = [
  "all",
  "gsc",
  "adsense",
  "ga4",
  "vercel",
  "github-actions",
  "other",
];
const SEVERITY_OPTIONS: Array<"all" | OpsMailSeverity> = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
];
const STATUS_OPTIONS: Array<"all" | OpsMailReviewStatus> = [
  "all",
  "open",
  "reviewing",
  "fixed",
  "ignored",
];

const TOKEN_STORAGE_KEY = "multi-dashboard.ops-mail-review-token";

export function OpsMailReportPanel({ report }: { report: OpsMailReport }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | OpsMailKind>("all");
  const [severity, setSeverity] = useState<"all" | OpsMailSeverity>("all");
  const [status, setStatus] = useState<"all" | OpsMailReviewStatus>("all");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>(() =>
    Object.fromEntries(
      report.findings.map((finding) => [
        finding.id,
        {
          status: finding.reviewStatus,
          note: finding.reviewNote,
        },
      ]),
    ),
  );

  useEffect(() => {
    setToken(window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
  }, []);

  const visibleFindings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return report.findings.filter((finding) => {
      const draft = drafts[finding.id];
      const reviewStatus = draft?.status ?? finding.reviewStatus;
      if (kind !== "all" && finding.kind !== kind) return false;
      if (severity !== "all" && finding.severity !== severity) return false;
      if (status !== "all" && reviewStatus !== status) return false;
      if (!normalizedQuery) return true;
      return [
        finding.title,
        finding.recommendedAction,
        finding.repo,
        finding.site,
        finding.workflow,
        finding.sourceLine,
        draft?.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [drafts, kind, query, report.findings, severity, status]);

  function updateDraft(id: string, draft: Partial<ReviewDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        status: current[id]?.status ?? "open",
        note: current[id]?.note ?? "",
        ...draft,
      },
    }));
  }

  function saveToken() {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
    setMessage("쓰기 토큰을 브라우저에 저장했습니다.");
    setError(null);
  }

  async function saveReview(finding: OpsMailFinding) {
    const draft = drafts[finding.id] ?? {
      status: finding.reviewStatus,
      note: finding.reviewNote,
    };
    setSavingId(finding.id);
    setMessage(null);
    setError(null);

    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (token.trim()) {
        headers["x-ops-mail-review-token"] = token.trim();
      }
      const response = await fetch("/api/ops-mail-review", {
        method: "POST",
        headers,
        body: JSON.stringify({
          findingId: finding.id,
          status: draft.status,
          note: draft.note,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "메일 처리 상태 저장에 실패했습니다.");
      }
      setMessage(`${finding.title} 처리 상태를 저장했습니다.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "메일 처리 상태 저장에 실패했습니다.",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="mail-report">
      <article className="panel">
        <div className="panel-heading">
          <div>
            <h2>Gmail 운영 메일 리포트</h2>
            <p>
              GSC, AdSense, GA4, Vercel, GitHub Actions 알림을 같은 큐에서 확인합니다.
            </p>
          </div>
          <span>{formatNumber(report.openCount)} open</span>
        </div>
        <div className="ops-kpi-strip">
          <MailKpi label="전체" value={report.totalCount} />
          <MailKpi label="사이트 관련" value={report.siteRelatedCount} />
          <MailKpi label="GSC" value={report.counts.gsc} />
          <MailKpi label="AdSense" value={report.counts.adsense} />
          <MailKpi label="GA4" value={report.counts.ga4} />
        </div>
        <div className="mail-source-meta">
          <span>{`digest ${formatDateTime(report.digestUpdatedAt ?? report.generatedAt)}`}</span>
          <span>{report.digestUrl ?? report.path}</span>
          <span>{report.persistenceNote}</span>
        </div>
      </article>

      <article className="ops-control-panel">
        <div className="ops-control-heading">
          <div>
            <h3>필터</h3>
            <p>{formatNumber(visibleFindings.length)}개 메일 신호가 표시됩니다.</p>
          </div>
          <strong>{`critical ${formatNumber(report.summary.critical)} · high ${formatNumber(report.summary.high)}`}</strong>
        </div>
        <div className="ops-filter-grid mail-filter-grid">
          <label>
            검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="사이트, 제목, 워크플로, 메모"
            />
          </label>
          <label>
            종류
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as "all" | OpsMailKind)}
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "전체" : getKindLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            심각도
            <select
              value={severity}
              onChange={(event) =>
                setSeverity(event.target.value as "all" | OpsMailSeverity)
              }
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "전체" : option}
                </option>
              ))}
            </select>
          </label>
          <label>
            처리
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "all" | OpsMailReviewStatus)
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "전체" : getStatusLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="ops-admin-token mail-token-row">
          <label>
            쓰기 토큰
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="OPS_MAIL_REVIEW_ADMIN_TOKEN"
              type="password"
            />
          </label>
          <button className="ops-button ops-button-secondary" onClick={saveToken} type="button">
            저장
          </button>
        </div>
        {message ? <p className="ops-message">{message}</p> : null}
        {error ? <p className="ops-error">{error}</p> : null}
      </article>

      <div className="mail-finding-list">
        {visibleFindings.length === 0 ? (
          <article className="panel empty-state">
            <strong>표시할 메일 신호가 없습니다.</strong>
            <p>필터를 줄이거나 `pnpm ops:triage`로 Gmail digest를 갱신하세요.</p>
          </article>
        ) : (
          visibleFindings.map((finding) => (
            <MailFindingCard
              draft={drafts[finding.id] ?? {
                status: finding.reviewStatus,
                note: finding.reviewNote,
              }}
              finding={finding}
              isSaving={savingId === finding.id}
              key={finding.id}
              onSave={() => saveReview(finding)}
              onUpdate={(draft) => updateDraft(finding.id, draft)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function MailFindingCard({
  draft,
  finding,
  isSaving,
  onSave,
  onUpdate,
}: {
  draft: ReviewDraft;
  finding: OpsMailFinding;
  isSaving: boolean;
  onSave: () => void;
  onUpdate: (draft: Partial<ReviewDraft>) => void;
}) {
  return (
    <article className={`mail-finding-card mail-${finding.severity}`}>
      <div className="mail-finding-main">
        <div>
          <strong>{finding.title}</strong>
          <p>{finding.recommendedAction}</p>
          <div className="mail-chip-row">
            <span>{getKindLabel(finding.kind)}</span>
            <span>{finding.severity}</span>
            <span>{`P${finding.priority}`}</span>
            {finding.site ? <span>{finding.site}</span> : null}
            {finding.repo ? <span>{finding.repo}</span> : null}
          </div>
        </div>
        <span className={`mail-status mail-status-${draft.status}`}>
          {getStatusLabel(draft.status)}
        </span>
      </div>
      <code>{finding.sourceLine}</code>
      <div className="mail-review-controls">
        <label>
          처리 상태
          <select
            value={draft.status}
            onChange={(event) =>
              onUpdate({ status: event.target.value as OpsMailReviewStatus })
            }
          >
            {STATUS_OPTIONS.filter((option) => option !== "all").map((option) => (
              <option key={option} value={option}>
                {getStatusLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label>
          처리 메모
          <textarea
            value={draft.note}
            onChange={(event) => onUpdate({ note: event.target.value })}
            placeholder="확인 내용, 수정 대상, 배포/검증 결과"
            rows={3}
          />
        </label>
        <button className="ops-button" disabled={isSaving} onClick={onSave} type="button">
          {isSaving ? "저장 중" : "저장"}
        </button>
      </div>
      {finding.issueUrl ? <a href={finding.issueUrl}>연결된 이슈 열기</a> : null}
    </article>
  );
}

function MailKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="ops-kpi">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

function getKindLabel(kind: OpsMailKind): string {
  if (kind === "github-actions") return "GitHub Actions";
  if (kind === "gsc") return "GSC";
  if (kind === "adsense") return "AdSense";
  if (kind === "ga4") return "GA4";
  if (kind === "vercel") return "Vercel";
  return "기타";
}

function getStatusLabel(status: OpsMailReviewStatus): string {
  if (status === "reviewing") return "검토중";
  if (status === "fixed") return "수정완료";
  if (status === "ignored") return "제외";
  return "열림";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "미수집";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}
