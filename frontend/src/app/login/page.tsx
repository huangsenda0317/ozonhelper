'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/rankings');
    } catch (err: any) {
      setError(err.message || '登录失败，请检查账号和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md px-lg">
        <h1 className="text-display-md font-display text-center mb-lg">登录 OzonHelper</h1>
        {error && (
          <div className="bg-red-50 text-red-700 p-md rounded-md mb-lg text-body-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-lg">
          <div>
            <label className="block text-body-sm font-medium text-ink-muted-80 mb-xs">账号</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-lg py-sm text-body border border-gray-300 rounded-pill focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-ink-muted-80 mb-xs">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-lg py-sm text-body border border-gray-300 rounded-pill focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="请输入密码"
            />
          </div>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            登录
          </Button>
        </form>
        <p className="text-body-sm text-ink-muted-48 text-center mt-lg">
          还没有账号？{' '}
          <Link href="/register" className="text-primary hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
