"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/rankings");
    } catch (err: any) {
      setError(err.message || "登录失败，请检查账号和密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-xxl py-xxl">
      <div className="w-full max-w-md">
        <Card variant="default" padding="lg">
          <div className="text-center mb-xl">
            <p className="eyebrow-cap mb-sm">OzonHelper</p>
            <h1 className="font-display font-bold text-heading-md text-ink">
              登录{" "}
              <span className="bg-accent-lime text-ink-deep px-sm rounded-xs">
                账号
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
                htmlFor="login-email"
                className="block text-caption font-medium text-body mb-xs"
              >
                账号
              </label>
              <input
                id="login-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="input-sentry"
                placeholder="admin"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="block text-caption font-medium text-body mb-xs"
              >
                密码
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input-sentry"
                placeholder="请输入密码"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              className="gap-sm"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              登录
            </Button>
          </form>

          <p className="text-caption text-muted text-center mt-xl">
            还没有账号？{" "}
            <Link
              href="/register"
              className="text-ink underline hover:text-body transition-colors duration-200 cursor-pointer"
            >
              立即注册
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
