"use client";

import React from "react";
import { Sparkles } from "lucide-react";

import { Card } from "@/components/ui/Card";
import {
  CHANGELOG,
  type ChangelogTag,
  formatChangelogDate,
} from "@/lib/changelog";

const TAG_STYLES: Record<ChangelogTag, string> = {
  新功能: "bg-accent-lime text-ink-deep",
  改进: "bg-accent-violet-mid/15 text-accent-violet-mid border border-accent-violet-mid/25",
  修复: "bg-accent-pink/10 text-accent-pink border border-accent-pink/20",
  其他: "bg-surface-elevated text-muted border border-hairline",
};

function ChangelogTagBadge({ tag }: { tag: ChangelogTag }) {
  return (
    <span
      className={`inline-flex items-center shrink-0 px-sm py-0.5 rounded-xs text-caption font-medium ${TAG_STYLES[tag]}`}
    >
      {tag}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-xxl py-xxl">
      <header className="mb-xxl">
        <p className="eyebrow-cap mb-sm">Changelog</p>
        <h1 className="font-display text-heading-md text-ink flex items-center gap-sm flex-wrap">
          <Sparkles
            className="h-7 w-7 text-accent-violet-mid shrink-0"
            aria-hidden="true"
          />
          <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
            更新日志
          </span>
        </h1>
        <p className="text-body text-muted mt-xs">
          产品功能迭代与问题修复记录，按日期倒序排列
        </p>
      </header>

      <div className="relative">
        {/* 时间轴竖线 */}
        <div
          className="absolute left-[7px] top-3 bottom-3 w-px bg-hairline hidden sm:block"
          aria-hidden="true"
        />

        <div className="space-y-xxl">
          {CHANGELOG.map((day, dayIndex) => (
            <section key={day.date} className="relative sm:pl-8">
              {/* 时间轴节点 */}
              <div
                className="absolute left-0 top-1.5 hidden sm:flex h-4 w-4 items-center justify-center"
                aria-hidden="true"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ring-4 ring-[var(--color-canvas)] ${
                    dayIndex === 0
                      ? "bg-accent-violet-mid"
                      : "bg-hairline-cool"
                  }`}
                />
              </div>

              <div className="mb-md">
                <time
                  dateTime={day.date}
                  className="font-display text-heading-sm text-ink"
                >
                  {formatChangelogDate(day.date)}
                </time>
                {dayIndex === 0 && (
                  <span className="ml-sm inline-flex items-center px-sm py-0.5 rounded-xs bg-accent-lime/30 text-caption font-medium text-ink-deep">
                    最新
                  </span>
                )}
              </div>

              <Card variant="default" padding="none" className="overflow-hidden">
                <ul className="divide-y divide-hairline">
                  {day.items.map((item, itemIndex) => (
                    <li
                      key={`${day.date}-${itemIndex}`}
                      className="px-lg py-md hover:bg-surface-elevated/50 transition-colors duration-200"
                    >
                      <div className="flex flex-col gap-xs sm:flex-row sm:items-start sm:justify-between sm:gap-md">
                        <div className="min-w-0 flex-1 space-y-xs">
                          <p className="text-body font-medium text-ink">
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-caption text-muted leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <ChangelogTagBadge tag={item.tag} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
