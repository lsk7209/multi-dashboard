"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

interface PlacementRow {
  id: string;
  name: string;
  type: string;
  noAdPolicy: string;
  status: string;
  assignedCreativeId: string | null;
  assignedCreativeName: string | null;
  assignedTrackingLinkId: string | null;
  assignedTrackingSlug: string | null;
  requests: number;
  imageRequests: number;
  noAd: number;
}

interface CreativeRow {
  id: string;
  name: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  status: string;
  policyStatus: string;
}

interface TrackingLinkRow {
  id: string;
  slug: string;
  publicUrl: string;
  offerName: string | null;
  status: string;
}

interface AssignmentRow {
  id: string;
  placementName: string;
  creativeName: string | null;
  trackingSlug: string | null;
  weight: number;
  status: string;
}

interface BannerManagementState {
  dbPath: string;
  dbExists: boolean;
  dbUpdatedAt: string | null;
  writable: boolean;
  persistenceNote: string;
  placements: PlacementRow[];
  creatives: CreativeRow[];
  trackingLinks: TrackingLinkRow[];
  assignments: AssignmentRow[];
}

const EMPTY_STATE: BannerManagementState = {
  assignments: [],
  creatives: [],
  dbExists: false,
  dbPath: "",
  dbUpdatedAt: null,
  persistenceNote: "",
  placements: [],
  trackingLinks: [],
  writable: false,
};

const STATUS_OPTIONS = ["active", "paused", "inactive"] as const;
const POLICY_OPTIONS = ["approved", "review", "rejected"] as const;
const NO_AD_OPTIONS = ["transparent", "house", "collapse"] as const;

type ApiAction =
  | "createPlacement"
  | "updatePlacement"
  | "createCreative"
  | "updateCreative"
  | "createTrackingLink"
  | "updateTrackingLink"
  | "assignPlacement";

export function BannerManagementConsole() {
  const [state, setState] = useState<BannerManagementState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placementForm, setPlacementForm] = useState({
    name: "본문 중간 배너",
    noAdPolicy: "transparent",
    status: "active",
    type: "image_link",
  });
  const [creativeForm, setCreativeForm] = useState({
    height: "90",
    imageUrl: "https://placehold.co/728x90/png?text=Affiliate+Banner",
    name: "기본 728x90 배너",
    policyStatus: "approved",
    status: "active",
    width: "728",
  });
  const [trackingForm, setTrackingForm] = useState({
    offerName: "기본 제휴 링크",
    publicUrl: "https://example.com/",
    slug: `offer-${Date.now().toString().slice(-6)}`,
    status: "active",
  });
  const [assignmentForm, setAssignmentForm] = useState({
    creativeId: "",
    placementId: "",
    trackingLinkId: "",
  });

  useEffect(() => {
    void loadState();
  }, []);

  useEffect(() => {
    setAssignmentForm((current) => ({
      creativeId: current.creativeId || state.creatives[0]?.id || "",
      placementId: current.placementId || state.placements[0]?.id || "",
      trackingLinkId: current.trackingLinkId || state.trackingLinks[0]?.id || "",
    }));
  }, [state.creatives, state.placements, state.trackingLinks]);

  const selectedPlacement = useMemo(
    () => state.placements.find((placement) => placement.id === assignmentForm.placementId),
    [assignmentForm.placementId, state.placements],
  );
  const controlsDisabled = isSaving || !state.writable;

  async function loadState() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/banner-management", { cache: "no-store" });
      const payload = (await response.json()) as BannerManagementState | { error?: string };
      if (!response.ok) throw new Error("error" in payload ? payload.error : "배너 운영 상태를 불러오지 못했습니다.");
      setState(payload as BannerManagementState);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "배너 운영 상태를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitAction(action: ApiAction, payload: Record<string, unknown>, success: string) {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/banner-management", {
        body: JSON.stringify({ action, ...payload }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const next = (await response.json()) as BannerManagementState | { error?: string };
      if (!response.ok) throw new Error("error" in next ? next.error : "배너 설정 저장에 실패했습니다.");
      setState(next as BannerManagementState);
      setMessage(success);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "배너 설정 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  function createPlacement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAction("createPlacement", placementForm, "배치 위치를 만들었습니다.");
  }

  function createCreative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAction(
      "createCreative",
      {
        ...creativeForm,
        height: numberOrNull(creativeForm.height),
        width: numberOrNull(creativeForm.width),
      },
      "배너 소재를 만들었습니다.",
    );
  }

  function createTrackingLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAction("createTrackingLink", trackingForm, "추적 링크를 만들었습니다.");
  }

  function assignPlacement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAction("assignPlacement", assignmentForm, "배치 위치에 소재와 추적 링크를 연결했습니다.");
  }

  return (
    <section className="panel banner-console">
      <div className="panel-heading">
        <div>
          <h2>배너 설정 운영</h2>
          <p>배치 위치, 소재, 추적 링크, 연결 상태를 멀티 대시보드 안에서 직접 관리합니다.</p>
        </div>
        <button className="ops-button ops-button-secondary" type="button" onClick={() => void loadState()}>
          새로고침
        </button>
      </div>

      <div className="ops-notice">
        <strong>{state.writable ? "쓰기 가능" : "쓰기 제한 가능"}</strong>
        <span>{state.persistenceNote || "배너 DB 상태를 확인하는 중입니다."}</span>
        <code>{state.dbPath || "data/monetization/ad-manage.db"}</code>
      </div>

      {message ? <p className="ops-message">{message}</p> : null}
      {error ? <p className="ops-error">{error}</p> : null}

      <div className="ops-form-grid">
        <form className="ops-form" onSubmit={createTrackingLink}>
          <h3>1. 추적 링크</h3>
          <label>
            슬러그
            <input
              required
              value={trackingForm.slug}
              onChange={(event) => setTrackingForm({ ...trackingForm, slug: event.target.value })}
            />
          </label>
          <label>
            목적 URL
            <input
              required
              type="url"
              value={trackingForm.publicUrl}
              onChange={(event) => setTrackingForm({ ...trackingForm, publicUrl: event.target.value })}
            />
          </label>
          <label>
            오퍼 이름
            <input
              value={trackingForm.offerName}
              onChange={(event) => setTrackingForm({ ...trackingForm, offerName: event.target.value })}
            />
          </label>
          <label>
            상태
            <select
              value={trackingForm.status}
              onChange={(event) => setTrackingForm({ ...trackingForm, status: event.target.value })}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button className="ops-button" disabled={controlsDisabled}>
            링크 생성
          </button>
        </form>

        <form className="ops-form" onSubmit={createCreative}>
          <h3>2. 배너 소재</h3>
          <label>
            소재 이름
            <input
              required
              value={creativeForm.name}
              onChange={(event) => setCreativeForm({ ...creativeForm, name: event.target.value })}
            />
          </label>
          <label>
            이미지 URL
            <input
              required
              type="url"
              value={creativeForm.imageUrl}
              onChange={(event) => setCreativeForm({ ...creativeForm, imageUrl: event.target.value })}
            />
          </label>
          <div className="ops-two">
            <label>
              너비
              <input
                inputMode="numeric"
                value={creativeForm.width}
                onChange={(event) => setCreativeForm({ ...creativeForm, width: event.target.value })}
              />
            </label>
            <label>
              높이
              <input
                inputMode="numeric"
                value={creativeForm.height}
                onChange={(event) => setCreativeForm({ ...creativeForm, height: event.target.value })}
              />
            </label>
          </div>
          <div className="ops-two">
            <label>
              상태
              <select
                value={creativeForm.status}
                onChange={(event) => setCreativeForm({ ...creativeForm, status: event.target.value })}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              검수
              <select
                value={creativeForm.policyStatus}
                onChange={(event) => setCreativeForm({ ...creativeForm, policyStatus: event.target.value })}
              >
                {POLICY_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="ops-button" disabled={controlsDisabled}>
            소재 생성
          </button>
        </form>

        <form className="ops-form" onSubmit={createPlacement}>
          <h3>3. 배치 위치</h3>
          <label>
            위치 이름
            <input
              required
              value={placementForm.name}
              onChange={(event) => setPlacementForm({ ...placementForm, name: event.target.value })}
            />
          </label>
          <label>
            유형
            <select
              value={placementForm.type}
              onChange={(event) => setPlacementForm({ ...placementForm, type: event.target.value })}
            >
              <option value="image_link">image_link</option>
              <option value="js_slot">js_slot</option>
            </select>
          </label>
          <label>
            no_ad 정책
            <select
              value={placementForm.noAdPolicy}
              onChange={(event) => setPlacementForm({ ...placementForm, noAdPolicy: event.target.value })}
            >
              {NO_AD_OPTIONS.map((policy) => (
                <option key={policy} value={policy}>
                  {policy}
                </option>
              ))}
            </select>
          </label>
          <label>
            상태
            <select
              value={placementForm.status}
              onChange={(event) => setPlacementForm({ ...placementForm, status: event.target.value })}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button className="ops-button" disabled={controlsDisabled}>
            위치 생성
          </button>
        </form>
      </div>

      <form className="ops-assignment" onSubmit={assignPlacement}>
        <div>
          <h3>4. 소재 연결</h3>
          <p>선택한 배치 위치의 기존 active 연결은 inactive로 바꾸고 새 연결을 active로 저장합니다.</p>
        </div>
        <select
          required
          disabled={controlsDisabled}
          value={assignmentForm.placementId}
          onChange={(event) => setAssignmentForm({ ...assignmentForm, placementId: event.target.value })}
        >
          <option value="">배치 위치 선택</option>
          {state.placements.map((placement) => (
            <option key={placement.id} value={placement.id}>
              {placement.name}
            </option>
          ))}
        </select>
        <select
          required
          disabled={controlsDisabled}
          value={assignmentForm.creativeId}
          onChange={(event) => setAssignmentForm({ ...assignmentForm, creativeId: event.target.value })}
        >
          <option value="">소재 선택</option>
          {state.creatives.map((creative) => (
            <option key={creative.id} value={creative.id}>
              {creative.name}
            </option>
          ))}
        </select>
        <select
          required
          disabled={controlsDisabled}
          value={assignmentForm.trackingLinkId}
          onChange={(event) => setAssignmentForm({ ...assignmentForm, trackingLinkId: event.target.value })}
        >
          <option value="">추적 링크 선택</option>
          {state.trackingLinks.map((link) => (
            <option key={link.id} value={link.id}>
              {link.slug}
            </option>
          ))}
        </select>
        <button className="ops-button" disabled={controlsDisabled}>
          연결 저장
        </button>
      </form>

      {selectedPlacement ? (
        <div className="ops-install">
          <strong>설치 코드</strong>
          <code>{`<img src="/img/${selectedPlacement.id}" alt="" />`}</code>
          <code>{`<a href="/go/p/${selectedPlacement.id}" rel="sponsored nofollow">배너 클릭</a>`}</code>
        </div>
      ) : null}

      <div className="ops-table-grid">
        <OpsTable title="배치 위치" isLoading={isLoading} emptyText="배치 위치가 없습니다.">
          {state.placements.map((placement) => (
            <tr key={placement.id}>
              <td>
                <strong>{placement.name}</strong>
                <small>{placement.id}</small>
              </td>
              <td>{placement.type}</td>
              <td>{placement.noAdPolicy}</td>
              <td>{placement.assignedCreativeName ?? "-"}</td>
              <td>{placement.assignedTrackingSlug ?? "-"}</td>
              <td>{formatNumber(placement.requests)}</td>
              <td>{formatNumber(placement.noAd)}</td>
              <td>
                <StatusSelect
                  disabled={controlsDisabled}
                  value={placement.status}
                  onChange={(status) =>
                    void submitAction("updatePlacement", { id: placement.id, status }, "배치 위치 상태를 저장했습니다.")
                  }
                />
              </td>
            </tr>
          ))}
        </OpsTable>

        <OpsTable title="소재" isLoading={isLoading} emptyText="소재가 없습니다.">
          {state.creatives.map((creative) => (
            <tr key={creative.id}>
              <td>
                <strong>{creative.name}</strong>
                <small>{creative.imageUrl}</small>
              </td>
              <td>{creative.width ?? "-"}x{creative.height ?? "-"}</td>
              <td>
                <select
                  disabled={controlsDisabled}
                  value={creative.policyStatus}
                  onChange={(event) =>
                    void submitAction(
                      "updateCreative",
                      { id: creative.id, policyStatus: event.target.value },
                      "소재 검수 상태를 저장했습니다.",
                    )
                  }
                >
                  {POLICY_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <StatusSelect
                  disabled={controlsDisabled}
                  value={creative.status}
                  onChange={(status) =>
                    void submitAction("updateCreative", { id: creative.id, status }, "소재 상태를 저장했습니다.")
                  }
                />
              </td>
            </tr>
          ))}
        </OpsTable>

        <OpsTable title="추적 링크" isLoading={isLoading} emptyText="추적 링크가 없습니다.">
          {state.trackingLinks.map((link) => (
            <tr key={link.id}>
              <td>
                <strong>{link.slug}</strong>
                <small>{link.publicUrl}</small>
              </td>
              <td>{link.offerName ?? "-"}</td>
              <td>
                <StatusSelect
                  disabled={controlsDisabled}
                  value={link.status}
                  onChange={(status) =>
                    void submitAction("updateTrackingLink", { id: link.id, status }, "추적 링크 상태를 저장했습니다.")
                  }
                />
              </td>
            </tr>
          ))}
        </OpsTable>

        <OpsTable title="최근 연결 이력" isLoading={isLoading} emptyText="연결 이력이 없습니다.">
          {state.assignments.map((assignment) => (
            <tr key={assignment.id}>
              <td>
                <strong>{assignment.placementName}</strong>
                <small>{assignment.id}</small>
              </td>
              <td>{assignment.creativeName ?? "-"}</td>
              <td>{assignment.trackingSlug ?? "-"}</td>
              <td>{assignment.weight}</td>
              <td>{assignment.status}</td>
            </tr>
          ))}
        </OpsTable>
      </div>
    </section>
  );
}

function OpsTable({
  children,
  emptyText,
  isLoading,
  title,
}: {
  children: ReactNode;
  emptyText: string;
  isLoading: boolean;
  title: string;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="ops-table-card">
      <h3>{title}</h3>
      <div className="workspace-table-wrap">
        <table className="workspace-table ops-table">
          <tbody>
            {isLoading ? (
              <tr>
                <td>불러오는 중입니다.</td>
              </tr>
            ) : hasRows ? (
              children
            ) : (
              <tr>
                <td>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusSelect({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (status: string) => void;
  value: string;
}) {
  return (
    <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}
