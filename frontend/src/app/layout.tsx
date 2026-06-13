'use client';

import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';

import { AuthProvider } from '@/lib/auth-context';
import { GlobalNav } from '@/components/layout/GlobalNav';

import '@/styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <title>OzonHelper - 跟卖全链路平台</title>
        <meta name="description" content="Ozon 跨境跟卖全链路平台" />
      </head>
      <body className="font-text text-ink bg-canvas antialiased">
        <AntdRegistry>
          <AuthProvider>
            <GlobalNav />
            <main className="pt-12 min-h-screen">
              {children}
            </main>
          </AuthProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
