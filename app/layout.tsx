/**
 * 根布局组件
 * 配置全局 providers 和页面结构
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 配置 Inter 字体
const inter = Inter({
  variable: "--font-inter",
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
      <body className={`${inter.variable} antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
