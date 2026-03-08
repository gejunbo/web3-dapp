/**
 * 客户端 Providers 组件
 * 封装所有需要客户端环境的 context providers
 */

'use client';

import { ReactNode, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmiClient';
import Navbar from '@/components/Navbar';
import ErrorFilter from '@/components/ErrorFilter';

// 导入 RainbowKit 样式
import '@rainbow-me/rainbowkit/styles.css';

// 组件属性接口
interface ClientProvidersProps {
  /** 子组件 */
  children: ReactNode;
}

/**
 * 客户端 Providers 组件
 *
 * 包含：
 * - WagmiProvider: Web3 连接管理
 * - QueryClientProvider: React Query 数据获取
 * - RainbowKitProvider: 钱包连接UI
 * - Navbar: 导航栏
 * - ErrorFilter: 错误过滤器
 */
export default function ClientProviders({ children }: ClientProvidersProps): React.ReactElement {
  // 创建 QueryClient 实例（每个会话一个）
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 数据缓存时间
        staleTime: 60 * 1000,
        // 重试次数
        retry: 2,
      },
    },
  }));

  return (
    <>
      {/* 错误过滤器：过滤 WalletConnect 等噪声错误 */}
      <ErrorFilter />
      
      {/* Wagmi Provider：Web3 连接管理 */}
      <WagmiProvider config={config}>
        {/* React Query Provider：数据获取管理 */}
        <QueryClientProvider client={queryClient}>
          {/* RainbowKit Provider：钱包连接UI */}
          <RainbowKitProvider>
            {/* 页面布局容器 */}
            <div className="min-h-screen flex flex-col">
              {/* 导航栏 */}
              <Navbar />
              
              {/* 主内容区域 */}
              <main className="flex-1">
                {children}
              </main>
            </div>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}
