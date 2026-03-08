/**
 * 导航栏组件
 * 提供网站主要导航功能和钱包连接按钮
 */

"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// 导航项配置接口
interface NavItem {
  name: string;
  href: string;
}

/**
 * 导航栏组件
 * 包含品牌Logo、导航链接和钱包连接按钮
 */
export default function Navbar(): React.ReactElement {
  // 导航菜单项配置
  const navItems: NavItem[] = [
    { name: "LaunchPad", href: "/launchpad" },
    { name: "Bridge", href: "/bridge" },
    { name: "Swap", href: "/swap" },
    { name: "Pool", href: "/pool" },
    { name: "Farm", href: "/farm" },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* 左侧：Logo 和导航链接 */}
        <div className="flex items-center gap-6">
          {/* 品牌 Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              DeFi DApp
            </span>
          </Link>

          {/* 桌面端导航菜单 */}
          <div className="hidden md:flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* 右侧：钱包连接按钮 */}
        <div className="flex items-center gap-4">
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
