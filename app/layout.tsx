/**
 * 根布局组件
 * 配置全局 providers 和页面结构
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 配置 Geist Sans 字体
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// 配置 Geist Mono 等宽字体
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 页面元数据
export const metadata: Metadata = {
  title: "DeFi DApp - Web3 去中心化金融应用",
  description: "支持 Swap、Pool、Farm、LaunchPad 等功能的 DeFi 去中心化应用",
};

// 导入客户端 providers
import ClientProviders from "./ClientProviders";

/**
 * 根布局组件
 * 包裹整个应用的布局结构
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
