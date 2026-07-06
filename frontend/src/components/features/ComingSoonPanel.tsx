import React from "react";
import Link from "next/link";
import { Construction } from "lucide-react";

import { Card } from "@/components/ui/Card";

interface ComingSoonPanelProps {
  title: string;
  description: string;
}

export function ComingSoonPanel({ title, description }: ComingSoonPanelProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-md py-xxl px-xl text-center">
      <Construction
        className="h-12 w-12 text-muted"
        aria-hidden="true"
      />
      <div className="space-y-xs max-w-md">
        <h1 className="text-heading-sm font-display text-ink">{title}</h1>
        <p className="text-body text-muted">{description}</p>
      </div>
      <Link
        href="/changelog"
        className="text-caption text-accent-violet-mid hover:underline"
      >
        查看更新日志
      </Link>
    </Card>
  );
}
