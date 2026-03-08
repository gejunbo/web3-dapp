/**
 * 首页组件
 * DeFi DApp 应用的首页，展示主要功能入口
 */

import Link from 'next/link';

// 功能卡片数据接口
interface FeatureCard {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

/**
 * 首页组件
 * 展示 DeFi DApp 的主要功能入口
 */
export default function Home(): JSX.Element {
  // 功能模块配置
  const features: FeatureCard[] = [
    {
      title: '兑换 (Swap)',
      description: '快速兑换代币，支持多种交易对',
      href: '/swap',
      icon: '💱',
      color: 'bg-blue-500',
    },
    {
      title: '流动性池 (Pool)',
      description: '添加流动性，赚取交易手续费',
      href: '/pool',
      icon: '💧',
      color: 'bg-green-500',
    },
    {
      title: '农场 (Farm)',
      description: '质押 LP 代币，获得额外奖励',
      href: '/farm',
      icon: '🌾',
      color: 'bg-yellow-500',
    },
    {
      title: '发射台 (LaunchPad)',
      description: '参与新项目代币销售',
      href: '/launchpad',
      icon: '🚀',
      color: 'bg-purple-500',
    },
    {
      title: '跨链桥 (Bridge)',
      description: '在不同链之间转移资产',
      href: '/bridge',
      icon: '🌉',
      color: 'bg-indigo-500',
    },
    {
      title: '仪表盘 (Dashboard)',
      description: '查看资产和收益概览',
      href: '/dashboard',
      icon: '📊',
      color: 'bg-pink-500',
    },
  ];

  return (
    <div className="container mx-auto py-12 px-4">
      {/* 欢迎区域 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          欢迎来到 DeFi DApp
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          去中心化金融应用，提供安全、高效的代币兑换、流动性挖矿和项目发射服务
        </p>
      </div>

      {/* 功能卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group block p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
              {feature.icon}
            </div>
            <h2 className="text-xl font-bold mb-2 text-gray-800 group-hover:text-blue-600 transition-colors">
              {feature.title}
            </h2>
            <p className="text-gray-600">
              {feature.description}
            </p>
          </Link>
        ))}
      </div>

      {/* 特色介绍 */}
      <div className="mt-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">为什么选择我们</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              🔒
            </div>
            <h3 className="font-semibold mb-2">安全可靠</h3>
            <p className="text-gray-600 text-sm">
              智能合约经过审计，资金安全有保障
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ⚡
            </div>
            <h3 className="font-semibold mb-2">快速高效</h3>
            <p className="text-gray-600 text-sm">
              低延迟交易，最优价格执行
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              💰
            </div>
            <h3 className="font-semibold mb-2">收益丰厚</h3>
            <p className="text-gray-600 text-sm">
              多种收益方式，让资产持续增值
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
