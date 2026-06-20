"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";

import { useAuth, PHONE_PATTERN } from "@/lib/auth-context";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type LoginMode = "password" | "sms";

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("sms");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { login, loginWithSms } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(
      () => setCountdown((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/tracking");
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "登录失败，请检查账号和密码";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setError("");
    if (!PHONE_PATTERN.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }

    setSendingCode(true);
    try {
      const response = await apiClient.request<null>(
        "/auth/sms/send",
        {
          method: "POST",
          body: JSON.stringify({ phone }),
        },
        "none",
      );
      if (!response.success) {
        throw new ApiError("SMS_SEND_FAILED", "验证码发送失败", 502);
      }
      setCountdown(60);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "验证码发送失败，请稍后重试";
      setError(message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!PHONE_PATTERN.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    if (!smsCode.trim()) {
      setError("请输入验证码");
      return;
    }

    setLoading(true);
    try {
      await loginWithSms(phone, smsCode.trim());
      router.push("/tracking");
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "登录失败，请检查验证码";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const phoneValid = PHONE_PATTERN.test(phone);

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

          <div
            className="flex gap-xs p-xs mb-lg rounded-full bg-surface-elevated"
            role="tablist"
            aria-label="登录方式"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "sms"}
              onClick={() => {
                setMode("sms");
                setError("");
              }}
              className={`flex-1 py-sm px-md rounded-full text-caption font-medium transition-colors duration-200 cursor-pointer ${
                mode === "sms"
                  ? "bg-btn-primary-bg text-btn-primary-text font-medium"
                  : "text-muted hover:text-ink"
              }`}
            >
              短信登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "password"}
              onClick={() => {
                setMode("password");
                setError("");
              }}
              className={`flex-1 py-sm px-md rounded-full text-caption font-medium transition-colors duration-200 cursor-pointer ${
                mode === "password"
                  ? "bg-btn-primary-bg text-btn-primary-text font-medium"
                  : "text-muted hover:text-ink"
              }`}
            >
              密码登录
            </button>
          </div>

          {error && (
            <div
              className="bg-accent-pink/15 text-accent-pink p-md rounded-md mb-lg text-caption"
              role="alert"
            >
              {error}
            </div>
          )}

          {mode === "password" ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-lg">
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
          ) : (
            <form onSubmit={handleSmsSubmit} className="space-y-lg">
              <div>
                <label
                  htmlFor="login-phone"
                  className="block text-caption font-medium text-body mb-xs"
                >
                  手机号
                </label>
                <input
                  id="login-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  required
                  autoComplete="tel"
                  className="input-sentry"
                  placeholder="请输入手机号"
                />
              </div>
              <div>
                <label
                  htmlFor="login-sms-code"
                  className="block text-caption font-medium text-body mb-xs"
                >
                  验证码
                </label>
                <div className="flex gap-sm">
                  <input
                    id="login-sms-code"
                    type="text"
                    inputMode="numeric"
                    value={smsCode}
                    onChange={(e) =>
                      setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                    }
                    required
                    autoComplete="one-time-code"
                    className="input-sentry flex-1"
                    placeholder="请输入验证码"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    loading={sendingCode}
                    disabled={!phoneValid || countdown > 0}
                    onClick={handleSendCode}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {countdown > 0 ? `${countdown}s 后重试` : "获取验证码"}
                  </Button>
                </div>
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
          )}

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
