"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, apiClient, setUnauthorizedHandler } from "./api-client";

interface User {
  user_id: string;
  email: string;
  name: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithSms: (phone: string, code: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PHONE_PATTERN = /^1[3-9]\d{9}$/;

function readStoredUser(): User | null {
  const stored = localStorage.getItem("user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    setHasToken(false);
    router.push("/");
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const storedUser = readStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
      setHasToken(true);
    } else {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      setUser(null);
      setHasToken(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.request<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      "none"
    );

    if (!response.success || !response.data) {
      throw new ApiError("LOGIN_FAILED", "登录失败", 401);
    }

    localStorage.setItem("access_token", response.data.access_token);
    const userData: User = { user_id: "", email, name: email };
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setHasToken(true);
  }, []);

  const loginWithSms = useCallback(async (phone: string, code: string) => {
    if (!PHONE_PATTERN.test(phone)) {
      throw new ApiError("INVALID_PHONE", "请输入正确的手机号", 422);
    }

    const response = await apiClient.request<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>(
      "/auth/sms/login",
      {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      },
      "none"
    );

    if (!response.success || !response.data) {
      throw new ApiError("LOGIN_FAILED", "登录失败", 401);
    }

    localStorage.setItem("access_token", response.data.access_token);
    const userData: User = {
      user_id: "",
      email: `${phone}@sms.ozonhelper.local`,
      name: `用户${phone.slice(-4)}`,
      phone,
    };
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setHasToken(true);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const response = await apiClient.request<{
        user_id: string;
        email: string;
        name: string;
        created_at: string;
      }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ email, password, name }),
        },
        "none"
      );

      if (!response.success || !response.data) {
        throw new ApiError("REGISTER_FAILED", "注册失败", 400);
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && hasToken,
        login,
        loginWithSms,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { PHONE_PATTERN };
