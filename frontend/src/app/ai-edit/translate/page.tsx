'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { apiClient, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

const MAX_CHARS = 6000;

interface TranslateTextResult {
  target_text: string;
  used_amount: number;
  source_lang: string;
  target_lang: string;
}

interface TranslateTask {
  id: string;
  task_type: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  input_data: { fields: string[]; source_lang: string; target_lang: string } | null;
  output_data: { translations: Record<string, string>; used_amount: number } | null;
  error_message: string | null;
  created_at: string;
}

export default function TranslatePage() {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [usedAmount, setUsedAmount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [tasks, setTasks] = useState<TranslateTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TranslateTask | null>(null);
  const [editText, setEditText] = useState('');

  const charCount = sourceText.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmptyInput = !sourceText.trim();
  const canTranslate = !isEmptyInput && !isOverLimit && !submitting;

  const fetchTasks = useCallback(async () => {
    try {
      const response = await apiClient.get<TranslateTask[]>('/ai/tasks?task_type=translate&limit=50');
      if (response.success && response.data) setTasks(response.data);
    } catch (err) {
      console.error('Failed to fetch translate tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleTranslate = async () => {
    if (!canTranslate) {
      if (isEmptyInput) setError('请输入待翻译文本');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiClient.post<TranslateTextResult>('/ai/translate-text', {
        source_text: sourceText.trim(),
        source_lang: 'zh',
        target_lang: 'ru',
      });
      if (response.success && response.data) {
        setTargetText(response.data.target_text);
        setUsedAmount(response.data.used_amount);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '翻译失败，请稍后重试';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!targetText) return;
    try {
      await navigator.clipboard.writeText(targetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请手动选择文本复制');
    }
  };

  const handleSaveEdit = async (taskId: string) => {
    try {
      await apiClient.put(`/ai/tasks/${taskId}/output`, {
        output_data: { ...editingTask?.output_data, manual_edit: editText },
      });
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      console.error('Failed to save edit:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-lg py-xxl">
      <h1 className="text-display-md font-display mb-lg">AI 翻译</h1>
      <p className="text-body text-ink-muted-48 mb-lg">
        腾讯云机器翻译（TMT）— 中文 → 俄文，5次/秒，单次最长 6000 字符
      </p>

      {/* 翻译工作区 */}
      <Card variant="light" padding="md" className="mb-xl">
        <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] gap-md md:gap-lg md:items-stretch min-h-[360px]">
          {/* 左侧：原文输入 */}
          <div className="flex flex-col min-h-[240px] md:min-h-0">
            <div className="flex items-center justify-between mb-sm">
              <span className="text-caption font-medium text-ink-muted-48">原文（中文）</span>
              <span className={`text-caption ${isOverLimit ? 'text-red font-medium' : 'text-ink-muted-48'}`}>
                {charCount} / {MAX_CHARS}
              </span>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => {
                setSourceText(e.target.value);
                if (error === '请输入待翻译文本') setError(null);
              }}
              placeholder="请输入中文原文"
              className="flex-1 w-full px-lg py-md text-body border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[200px] md:min-h-0"
            />
          </div>

          {/* 中间：翻译按钮 */}
          <div className="flex items-center justify-center py-sm md:py-0">
            <Button
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={!canTranslate}
              onClick={handleTranslate}
            >
              翻译
            </Button>
          </div>

          {/* 右侧：译文输出 */}
          <div className="flex flex-col min-h-[240px] md:min-h-0">
            <div className="flex items-center justify-between mb-sm">
              <span className="text-caption font-medium text-ink-muted-48">译文（俄文）</span>
              <div className="flex items-center gap-sm">
                {usedAmount !== null && (
                  <span className="text-caption text-ink-muted-48">消耗 {usedAmount} 字符</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!targetText}
                  onClick={handleCopy}
                >
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
            </div>
            <div className="flex-1 w-full px-lg py-md text-body border border-gray-200 rounded-lg bg-canvas-parchment overflow-auto min-h-[200px] md:min-h-0">
              {targetText ? (
                <p className="whitespace-pre-wrap">{targetText}</p>
              ) : (
                <p className="text-ink-muted-48">翻译结果将显示在这里</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-caption text-red mt-md">{error}</p>
        )}
      </Card>

      {/* 历史任务（折叠） */}
      <div>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="flex items-center gap-sm text-body font-medium text-ink hover:text-primary transition-colors mb-md"
        >
          <svg
            className={`w-4 h-4 transition-transform ${historyOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          历史任务
          {tasks.length > 0 && (
            <span className="text-caption text-ink-muted-48">({tasks.length})</span>
          )}
        </button>

        {historyOpen && (
          loadingTasks ? (
            <div className="text-center py-xxl text-ink-muted-48">加载中...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-xxl text-ink-muted-48">暂无翻译任务</div>
          ) : (
            <div className="space-y-md">
              {tasks.map((task) => (
                <Card key={task.id} variant="light" padding="md">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-md mb-xs">
                        <StatusBadge status={task.status as 'pending' | 'running' | 'success' | 'failed'} />
                        <span className="text-caption text-ink-muted-48">
                          {task.input_data?.source_lang} → {task.input_data?.target_lang}
                        </span>
                        {task.output_data?.used_amount && (
                          <span className="text-caption text-ink-muted-48">
                            消耗 {task.output_data.used_amount} 字符
                          </span>
                        )}
                      </div>
                      {task.output_data?.translations && (
                        <div className="mt-sm space-y-xs">
                          {Object.entries(task.output_data.translations).map(([field, text]) => (
                            <div key={field} className="bg-canvas-parchment rounded-md p-sm">
                              <span className="text-caption font-medium text-ink-muted-48">{field}:</span>
                              <p className="text-body-sm mt-xxs">{text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {task.error_message && (
                        <p className="text-caption text-red mt-xs">{task.error_message}</p>
                      )}
                    </div>
                    {task.status === 'success' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTask(task);
                          setEditText(task.output_data?.translations?.title || '');
                        }}
                      >
                        编辑
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      {/* 编辑弹窗 */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-lg p-xl">
            <h3 className="text-title font-medium mb-lg">编辑翻译结果</h3>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              className="w-full px-lg py-sm text-body border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex gap-md justify-end mt-lg">
              <Button variant="ghost" onClick={() => setEditingTask(null)}>取消</Button>
              <Button variant="primary" onClick={() => handleSaveEdit(editingTask.id)}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
