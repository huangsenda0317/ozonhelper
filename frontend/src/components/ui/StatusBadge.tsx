'use client';

import React from 'react';

type StatusType = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'draft' | 'submitting';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusType, { bg: string; text: string; defaultLabel: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', defaultLabel: '待处理' },
  running: { bg: 'bg-blue-100', text: 'text-blue-800', defaultLabel: '处理中' },
  success: { bg: 'bg-green-100', text: 'text-green-800', defaultLabel: '已完成' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', defaultLabel: '失败' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', defaultLabel: '已取消' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', defaultLabel: '草稿' },
  submitting: { bg: 'bg-teal-100', text: 'text-teal-800', defaultLabel: '提交中' },
};

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-pill text-caption font-medium ${config.bg} ${config.text} ${className}`}
    >
      {status === 'running' && (
        <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {displayLabel}
    </span>
  );
}
