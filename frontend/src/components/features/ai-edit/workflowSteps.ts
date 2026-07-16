export type WorkflowStepId =
  | "remove_watermark"
  | "cutout"
  | "add_scene"
  | "annotate_ru";

export interface WorkflowStepState {
  id: WorkflowStepId;
  label: string;
  enabled: boolean;
  order: number;
  prompt?: string; // only add_scene
}

export interface WorkflowStepPayload {
  id: WorkflowStepId;
  enabled: boolean;
  order: number;
  prompt: string;
}

export const DEFAULT_WORKFLOW_STEPS: WorkflowStepState[] = [
  { id: "remove_watermark", label: "去水印", enabled: true, order: 0 },
  { id: "cutout", label: "抠主体", enabled: true, order: 1 },
  { id: "add_scene", label: "加场景", enabled: true, order: 2, prompt: "" },
  { id: "annotate_ru", label: "俄文注解", enabled: true, order: 3 },
];

/** 按 order 排序后的步骤副本 */
export function sortedWorkflowSteps(
  steps: WorkflowStepState[],
): WorkflowStepState[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

/** 规范化 order 为 0..n-1（按当前数组顺序） */
export function reindexWorkflowSteps(
  steps: WorkflowStepState[],
): WorkflowStepState[] {
  return steps.map((step, index) => ({ ...step, order: index }));
}

export function toggleWorkflowStep(
  steps: WorkflowStepState[],
  id: WorkflowStepId,
  enabled: boolean,
): WorkflowStepState[] {
  return steps.map((step) =>
    step.id === id ? { ...step, enabled } : step,
  );
}

export function updateScenePrompt(
  steps: WorkflowStepState[],
  prompt: string,
): WorkflowStepState[] {
  return steps.map((step) =>
    step.id === "add_scene" ? { ...step, prompt } : step,
  );
}

/** 将步骤上移/下移一位，并重排 order */
export function moveWorkflowStep(
  steps: WorkflowStepState[],
  id: WorkflowStepId,
  direction: "up" | "down",
): WorkflowStepState[] {
  const sorted = sortedWorkflowSteps(steps);
  const index = sorted.findIndex((step) => step.id === id);
  if (index < 0) return steps;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= sorted.length) return steps;

  const next = [...sorted];
  [next[index], next[target]] = [next[target], next[index]];
  return reindexWorkflowSteps(next);
}

export function toWorkflowStepPayloads(
  steps: WorkflowStepState[],
): WorkflowStepPayload[] {
  return sortedWorkflowSteps(steps).map((step) => ({
    id: step.id,
    enabled: step.enabled,
    order: step.order,
    prompt: step.id === "add_scene" ? (step.prompt ?? "") : "",
  }));
}

export function hasEnabledWorkflowStep(steps: WorkflowStepState[]): boolean {
  return steps.some((step) => step.enabled);
}
