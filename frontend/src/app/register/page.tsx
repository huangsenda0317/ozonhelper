"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
      await login(email, password);
      router.push("/tracking");
    } catch (err: any) {
      setError(err.message || "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-xxl py-xxl">
      <div className="w-full max-w-md">
        <Card variant="default" padding="lg">
          <div className="text-center mb-xl">
            <p className="eyebrow-cap mb-sm">开始使用</p>
            <h1 className="font-display font-bold text-heading-md text-ink">
              注册{" "}
              <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
                OzonHelper
              </span>
            </h1>
          </div>

          {error && (
            <div
              className="bg-accent-pink/15 text-accent-pink p-md rounded-md mb-lg text-caption"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-lg">
            <div>
              <label
                htmlFor="register-name"
                className="block text-caption font-medium text-body mb-xs"
              >
                用户名
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="input-sentry"
                placeholder="您的姓名"
              />
            </div>
            <div>
              <label
                htmlFor="register-email"
                className="block text-caption font-medium text-body mb-xs"
              >
                邮箱
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-sentry"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="register-password"
                className="block text-caption font-medium text-body mb-xs"
              >
                密码
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="input-sentry"
                placeholder="至少6位"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              className="gap-sm"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              注册
            </Button>
          </form>

          <p className="text-caption text-muted text-center mt-xl">
            已有账号？{" "}
            <Link
              href="/login"
              className="text-ink underline hover:text-body transition-colors duration-200 cursor-pointer"
            >
              立即登录
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
