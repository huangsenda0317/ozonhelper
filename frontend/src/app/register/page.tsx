'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
      await login(email, password);
      router.push('/rankings');
    } catch (err: any) {
      setError(err.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md px-lg">
        <h1 className="text-display-md font-display text-center mb-lg">注册 OzonHelper</h1>
        {error && (
          <div className="bg-red-50 text-red-700 p-md rounded-md mb-lg text-body-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-lg">
          <div>
            <label className="block text-body-sm font-medium text-ink-muted-80 mb-xs">用户名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-lg py-sm text-body border border-gray-300 rounded-pill focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="您的姓名"
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-ink-muted-80 mb-xs">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-lg py-sm text-body border border-gray-300 rounded-pill focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-ink-muted-80 mb-xs">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-lg py-sm text-body border border-gray-300 rounded-pill focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="至少6位"
            />
          </div>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            注册
          </Button>
        </form>
        <p className="text-body-sm text-ink-muted-48 text-center mt-lg">
          已有账号？{' '}
          <Link href="/login" className="text-primary hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
