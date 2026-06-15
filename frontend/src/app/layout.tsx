"use client";

import React from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";

import { AuthProvider } from "@/lib/auth-context";
import { THEME_STORAGE_KEY, ThemeProvider } from "@/lib/theme-context";
import { GlobalNav } from "@/components/layout/GlobalNav";

import "@/styles/globals.css";

const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=false;if(t==="dark")d=true;else if(t==="system")d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <title>OzonHelper - 跟卖全链路平台</title>
        <meta name="description" content="Ozon 跨境跟卖全链路平台" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-text text-ink bg-canvas antialiased">
        <AntdRegistry>
          <ThemeProvider>
            <AuthProvider>
              <GlobalNav />
              <main className="pt-12 min-h-screen">{children}</main>
            </AuthProvider>
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
