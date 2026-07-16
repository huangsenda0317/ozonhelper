"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  type WorkflowStepId,
  type WorkflowStepState,
  moveWorkflowStep,
  sortedWorkflowSteps,
  toggleWorkflowStep,
  updateScenePrompt,
} from "./workflowSteps";

interface WorkflowStepListProps {
  steps: WorkflowStepState[];
  onChange: (steps: WorkflowStepState[]) => void;
}

export function WorkflowStepList({ steps, onChange }: WorkflowStepListProps) {
  const ordered = sortedWorkflowSteps(steps);

  const handleToggle = (id: WorkflowStepId, enabled: boolean) => {
    onChange(toggleWorkflowStep(steps, id, enabled));
  };

  const handleMove = (id: WorkflowStepId, direction: "up" | "down") => {
    onChange(moveWorkflowStep(steps, id, direction));
  };

  const handleScenePrompt = (prompt: string) => {
    onChange(updateScenePrompt(steps, prompt));
  };

  return (
    <div className="space-y-md">
      <ul className="space-y-sm" role="list" aria-label="工作流步骤">
        {ordered.map((step, index) => {
          const isFirst = index === 0;
          const isLast = index === ordered.length - 1;
          const showScenePrompt = step.id === "add_scene" && step.enabled;

          return (
            <li
              key={step.id}
              className="rounded-md border border-hairline bg-canvas/40 px-md py-sm"
            >
              <div className="flex items-center gap-sm">
                <label className="flex flex-1 items-center gap-sm min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={step.enabled}
                    onChange={(e) => handleToggle(step.id, e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-hairline accent-primary cursor-pointer"
                    aria-label={step.label}
                  />
                  <span className="text-caption font-medium text-ink truncate">
                    {step.label}
                  </span>
                  <span className="text-micro-cap text-muted shrink-0">
                    #{index + 1}
                  </span>
                </label>

                <div className="flex items-center gap-xxs shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(step.id, "up")}
                    disabled={isFirst}
                    aria-label={`上移「${step.label}」`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-ink hover:bg-hairline/60 disabled:opacity-30 disabled:pointer-events-none transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(step.id, "down")}
                    disabled={isLast}
                    aria-label={`下移「${step.label}」`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-ink hover:bg-hairline/60 disabled:opacity-30 disabled:pointer-events-none transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet-mid/40"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {showScenePrompt && (
                <div className="mt-sm pl-lg">
                  <label
                    htmlFor="workflow-scene-prompt"
                    className="block text-caption text-muted mb-xs"
                  >
                    场景描述（可选）
                  </label>
                  <textarea
                    id="workflow-scene-prompt"
                    value={step.prompt ?? ""}
                    onChange={(e) => handleScenePrompt(e.target.value)}
                    rows={3}
                    maxLength={800}
                    placeholder="留空则由服务端按商品自动配适合 Ozon 的场景"
                    className="w-full resize-y rounded-md border border-hairline bg-canvas px-md py-sm text-caption text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-violet-mid/40 focus:border-transparent transition-shadow duration-200"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
