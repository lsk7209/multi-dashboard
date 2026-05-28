import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const STATE_PATH = ".setup-state.json";

export type StepStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface SiteStepState {
  status: StepStatus;
  error?: string;
}

export interface StepState {
  status: StepStatus;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  sites?: Record<string, SiteStepState>;
}

export interface SetupState {
  startedAt: string;
  steps: Record<string, StepState>;
}

export async function loadState(): Promise<SetupState> {
  if (!existsSync(STATE_PATH)) {
    return { startedAt: new Date().toISOString(), steps: {} };
  }

  return JSON.parse(await readFile(STATE_PATH, "utf8")) as SetupState;
}

export async function saveState(state: SetupState): Promise<void> {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

export async function markStep(stepId: string, status: StepStatus, error?: string): Promise<void> {
  const state = await loadState();
  const now = new Date().toISOString();
  const previous = state.steps[stepId] ?? { status: "pending" };
  const next: StepState = {
    ...previous,
    status,
  };

  if (status === "running") {
    next.startedAt = now;
    delete next.finishedAt;
  } else {
    next.finishedAt = now;
  }

  if (error) {
    next.error = error;
  } else {
    delete next.error;
  }

  state.steps[stepId] = next;

  await saveState(state);
}

export async function markSiteStep(
  stepId: string,
  siteId: string,
  status: StepStatus,
  error?: string,
): Promise<void> {
  const state = await loadState();
  const step = state.steps[stepId] ?? { status: "running" };

  state.steps[stepId] = {
    ...step,
    sites: {
      ...(step.sites ?? {}),
      [siteId]: error ? { status, error } : { status },
    },
  };

  await saveState(state);
}

export async function getResumableSites(stepId: string, allSiteIds: string[]): Promise<string[]> {
  const state = await loadState();
  const stepSites = state.steps[stepId]?.sites ?? {};
  return allSiteIds.filter((id) => stepSites[id]?.status !== "success");
}
