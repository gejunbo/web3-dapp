/**
 * Farm 页面 - 流动性挖矿
 *
 * 功能说明：
 * 1. 展示所有可用的农场池子列表
 * 2. 用户可以将 LP 代币质押到池子中赚取奖励
 * 3. 支持质押、解除质押、收获奖励三种操作
 * 4. 显示每个池子的 APY、TVL、用户质押数量、待领取奖励
 * 5. 支持模拟模式（合约未部署时显示模拟数据）
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { parseUnits, formatUnits } from "@/lib/utils/units";
import { formatNumber, formatTokenBalance } from "@/lib/utils/format";
import ApproveButton from "@/components/ApproveButton";
import { getProtocolAddress } from "@/lib/constants/addresses";
import { FARM_ABI, ERC20_ABI } from "@/lib/abis";

// ===== 类型定义 =====

/**
 * 农场池子数据结构
 */
interface FarmPool {
  id: number; // 池子 ID
  name: string; // 池子名称（如 TKA-TKB LP）
  lpToken: string; // LP 代币符号
  lpTokenAddress: `0x${string}`; // LP 代币合约地址
  apy: number; // 年化收益率
  tvl: number; // 总锁仓价值（USD）
}

/**
 * 农场统计数据结构
 */
interface FarmData {
  pools: FarmPool[]; // 池子列表
  totalValueLocked: number; // 总锁仓价值
  activeUsers: number; // 活跃用户数
}

/**
 * 农场池子卡片组件 Props
 */
interface FarmPoolCardProps {
  pool: FarmPool; // 池子数据
  farmAddress: `0x${string}` | undefined; // Farm 合约地址
  userAddress: `0x${string}` | undefined; // 用户钱包地址
  isMockMode: boolean; // 是否为模拟模式
}

// ===== 辅助函数 =====

/**
 * 格式化 USD 金额显示
 * @param value - USD 金额
 * @returns 格式化后的字符串（如 $1.23K, $1.23M）
 */
function formatUSD(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * 农场池子卡片组件
 * 展示单个池子的详细信息和操作界面
 */
function FarmPoolCard({
  pool,
  farmAddress,
  userAddress,
  isMockMode,
}: FarmPoolCardProps) {
  // ===== 本地状态 =====
  // 输入框金额
  const [amount, setAmount] = useState<string>("");
  // 当前激活的标签页：'deposit' 质押 | 'withdraw' 解除质押
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // ===== 链上数据读取 =====

  /**
   * 读取用户质押信息
   * 返回：{ amount: 质押数量, rewardDebt: 奖励债务 }
   */
  const { data: userInfo, refetch: refetchUserInfo } = useReadContract({
    address: farmAddress,
    abi: FARM_ABI,
    functionName: "userInfo",
    args:
      userAddress && pool.id !== undefined
        ? [BigInt(pool.id), userAddress]
        : undefined,
    query: {
      enabled: Boolean(
        farmAddress && userAddress && pool.id !== undefined && !isMockMode,
      ),
    },
  });

  /**
   * 读取用户待领取的奖励数量
   */
  const { data: pendingReward, refetch: refetchPendingReward } =
    useReadContract({
      address: farmAddress,
      abi: FARM_ABI,
      functionName: "pendingReward",
      args:
        userAddress && pool.id !== undefined
          ? [BigInt(pool.id), userAddress]
          : undefined,
      query: {
        enabled: Boolean(
          farmAddress && userAddress && pool.id !== undefined && !isMockMode,
        ),
      },
    });

  /**
   * 读取用户 LP 代币余额
   */
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: pool.lpTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: Boolean(pool.lpTokenAddress && userAddress && !isMockMode),
    },
  });

  // ===== 合约写入操作 =====

  // 质押操作
  const {
    data: depositHash,
    writeContract: deposit,
    isPending: isDepositing,
  } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash });

  // 解除质押操作
  const {
    data: withdrawHash,
    writeContract: withdraw,
    isPending: isWithdrawing,
  } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  // 收获奖励操作
  const {
    data: harvestHash,
    writeContract: harvest,
    isPending: isHarvesting,
  } = useWriteContract();
  const { isLoading: isHarvestConfirming, isSuccess: isHarvestSuccess } =
    useWaitForTransactionReceipt({ hash: harvestHash });

  // ===== 数据格式化 =====

  // 用户已质押的 LP 数量（使用格式化函数避免超长数字）
  const userStaked = userInfo
    ? formatTokenBalance(formatUnits(userInfo[0] as bigint | string, 18, 6))
    : "0";
  // 用户待领取的奖励数量
  const userPending = pendingReward
    ? formatTokenBalance(formatUnits(pendingReward as bigint | string, 18, 6))
    : "0";
  // 用户 LP 代币余额（使用格式化函数避免超长数字）
  const userLpBalance = lpBalance
    ? formatTokenBalance(formatUnits(lpBalance as bigint | string, 18, 6))
    : "0";
  // 用户 LP 代币余额（原始值，用于输入框 Max 按钮）
  const userLpBalanceRaw = lpBalance
    ? formatUnits(lpBalance as bigint | string, 18, 18)
    : "0";

  // ===== 事件处理函数 =====

  /**
   * 处理质押操作
   * 调用 Farm 合约的 deposit 函数
   */
  const handleDeposit = (): void => {
    if (!farmAddress || !amount || pool.id === undefined) return;

    const amountWei = parseUnits(amount, 18);
    deposit({
      address: farmAddress,
      abi: FARM_ABI,
      functionName: "deposit",
      args: [BigInt(pool.id), amountWei],
    });
  };

  /**
   * 处理解除质押操作
   * 调用 Farm 合约的 withdraw 函数
   */
  const handleWithdraw = (): void => {
    if (!farmAddress || !amount || pool.id === undefined) return;

    const amountWei = parseUnits(amount, 18);
    withdraw({
      address: farmAddress,
      abi: FARM_ABI,
      functionName: "withdraw",
      args: [BigInt(pool.id), amountWei],
    });
  };

  /**
   * 处理收获奖励操作
   * 调用 Farm 合约的 harvest 函数
   */
  const handleHarvest = (): void => {
    if (!farmAddress || pool.id === undefined) return;

    harvest({
      address: farmAddress,
      abi: FARM_ABI,
      functionName: "harvest",
      args: [BigInt(pool.id)],
    });
  };

  /**
   * 设置最大金额
   * 根据当前标签页设置最大可质押或最大可解除质押数量
   */
  const handleMax = (): void => {
    if (activeTab === "deposit") {
      setAmount(userLpBalanceRaw); // 使用原始值，避免格式化后的 K/M 后缀
    } else {
      setAmount(
        userInfo ? formatUnits(userInfo[0] as bigint | string, 18, 18) : "0",
      );
    }
  };

  /**
   * 交易成功后刷新数据
   */
  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess || isHarvestSuccess) {
      // 清空输入框
      setAmount("");
      // 刷新用户数据
      refetchUserInfo();
      refetchPendingReward();
      refetchLpBalance();
    }
  }, [
    isDepositSuccess,
    isWithdrawSuccess,
    isHarvestSuccess,
    refetchUserInfo,
    refetchPendingReward,
    refetchLpBalance,
  ]);

  // ===== 渲染 =====

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
      {/* 池子标题和 APY */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{pool.name}</h3>
          <p className="text-sm text-gray-600">{pool.lpToken}</p>
        </div>
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
          {pool.apy.toFixed(2)}% APY
        </span>
      </div>

      {/* 池子统计数据 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* TVL */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">总锁仓价值</div>
          <div className="text-lg font-semibold">{formatUSD(pool.tvl)}</div>
        </div>
        {/* 用户已质押 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">已质押</div>
          <div className="text-lg font-semibold">{userStaked} LP</div>
        </div>
        {/* LP 余额 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-xs text-blue-600 mb-1">LP 余额</div>
          <div className="text-lg font-semibold text-blue-700">
            {userLpBalance} LP
          </div>
        </div>
      </div>

      {/* 待领取奖励区域 */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600 mb-1">待领取奖励</div>
            <div className="text-2xl font-bold text-orange-600">
              {userPending} DRT
            </div>
          </div>
          {!isMockMode ? (
            <button
              onClick={handleHarvest}
              disabled={
                isHarvesting ||
                isHarvestConfirming ||
                parseFloat(userPending) === 0
              }
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {isHarvesting || isHarvestConfirming ? "收获中..." : "收获"}
            </button>
          ) : (
            <button
              disabled
              className="bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg cursor-not-allowed"
            >
              收获 (模拟)
            </button>
          )}
        </div>
      </div>

      {/* 收获成功提示 */}
      {isHarvestSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-semibold">收获成功！</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${harvestHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            在 Etherscan 上查看 →
          </a>
        </div>
      )}

      {/* 存取操作区域 */}
      <div className="border-t pt-4">
        {/* 标签页切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              activeTab === "deposit"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            质押
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              activeTab === "withdraw"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            解除质押
          </button>
        </div>

        {/* 金额输入框 */}
        <div className="mb-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-600">
                {activeTab === "deposit" ? "质押数量" : "解除质押数量"}
              </label>
              <button
                onClick={handleMax}
                className="text-sm text-blue-600 hover:underline"
              >
                余额:{" "}
                {activeTab === "deposit"
                  ? userLpBalanceRaw
                  : userInfo
                    ? formatUnits(userInfo[0] as bigint | string, 18, 18)
                    : "0"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // 禁止输入负数
                  if (value && parseFloat(value) < 0) {
                    return;
                  }
                  setAmount(value);
                }}
                placeholder="0.0"
                className="flex-1 text-xl font-semibold bg-transparent outline-none"
              />
              <div className="bg-white border rounded-lg px-3 py-2 font-semibold text-sm">
                LP
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        {!userAddress ? (
          // 未连接钱包
          <button className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg">
            连接钱包
          </button>
        ) : isMockMode ? (
          // 模拟模式
          <button
            disabled
            className="w-full bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
          >
            {activeTab === "deposit" ? "质押" : "解除质押"} (模拟模式 -
            合约未部署)
          </button>
        ) : activeTab === "deposit" ? (
          // 质押操作（需要授权）
          <ApproveButton
            tokenAddress={pool.lpTokenAddress}
            spenderAddress={farmAddress}
            amount={
              amount && parseFloat(amount) > 0 ? parseUnits(amount, 18) : 0n
            }
            disabled={
              !amount ||
              parseFloat(amount) <= 0 ||
              isDepositing ||
              isDepositConfirming
            }
          >
            <button
              onClick={handleDeposit}
              disabled={
                !amount ||
                parseFloat(amount) <= 0 ||
                isDepositing ||
                isDepositConfirming
              }
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isDepositing || isDepositConfirming ? "质押中..." : "质押"}
            </button>
          </ApproveButton>
        ) : (
          // 解除质押操作
          <button
            onClick={handleWithdraw}
            disabled={
              !amount ||
              parseFloat(amount) <= 0 ||
              isWithdrawing ||
              isWithdrawConfirming
            }
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isWithdrawing || isWithdrawConfirming
              ? "解除质押中..."
              : "解除质押"}
          </button>
        )}

        {/* 交易成功提示 */}
        {isDepositSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-semibold">质押成功！</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${depositHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              在 Etherscan 上查看 →
            </a>
          </div>
        )}

        {isWithdrawSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-semibold">
              解除质押成功！
            </p>
            <a
              href={`https://sepolia.etherscan.io/tx/${withdrawHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              在 Etherscan 上查看 →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 主页面组件 =====

/**
 * Farm 主页面
 * 展示所有农场池子和整体统计信息
 */
export default function FarmPage(): React.ReactElement {
  // ===== Hooks =====
  const { address } = useAccount();
  const chainId = useChainId();

  // 获取 Farm 合约地址
  const farmAddress = getProtocolAddress(chainId, "FARM") as
    | `0x${string}`
    | undefined;

  // ===== 状态管理 =====
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState<boolean>(false);

  // ===== 数据获取 =====

  /**
   * 从 API 获取农场数据
   * 包括池子列表、TVL、APY 等信息
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchFarmData() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/farm/stats");
        if (!res.ok) throw new Error("Failed to fetch farm data");
        const data: FarmData = await res.json();

        if (!cancelled) {
          setFarmData(data);
          // 如果合约未部署，启用模拟模式
          if (!farmAddress) {
            setIsMockMode(true);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching farm data:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsLoading(false);
        }
      }
    }

    fetchFarmData();

    return () => {
      cancelled = true;
    };
  }, [farmAddress]);

  // ===== 渲染状态 =====

  // 加载中状态
  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">农场</h1>
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在加载农场池子...</p>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">农场</h1>
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xl font-semibold text-gray-800 mb-2">
              加载农场数据失败
            </p>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 空数据状态
  if (!farmData || !farmData.pools || farmData.pools.length === 0) {
    return (
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">农场</h1>
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-xl font-semibold text-gray-800 mb-2">
              暂无可用农场池子
            </p>
            <p className="text-gray-600">请稍后查看 farming 机会</p>
          </div>
        </div>
      </div>
    );
  }

  // ===== 正常渲染 =====

  return (
    <div className="container py-12">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">农场</h1>
          <p className="text-gray-600">质押 LP 代币赚取 DRT 奖励</p>
        </div>

        {/* 模拟模式警告 */}
        {isMockMode && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-6 h-6 text-yellow-600 mr-3 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-semibold text-yellow-800">模拟模式已激活</p>
                <p className="text-sm text-yellow-700">
                  Farm 合约未部署或不可用。显示模拟数据。交易功能已禁用。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 整体统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* TVL 卡片 */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-1">总锁仓价值</div>
            <div className="text-3xl font-bold">
              {formatUSD(farmData.totalValueLocked)}
            </div>
          </div>

          {/* 活跃池子数卡片 */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-1">活跃农场</div>
            <div className="text-3xl font-bold">{farmData.pools.length}</div>
          </div>

          {/* 活跃用户数卡片 */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="text-sm opacity-90 mb-1">活跃用户</div>
            <div className="text-3xl font-bold">
              {formatNumber(farmData.activeUsers)}
            </div>
          </div>
        </div>

        {/* 农场池子列表 */}
        <div>
          <h2 className="text-xl font-bold mb-4">可用池子</h2>
          {farmData.pools.map((pool, index) => (
            <FarmPoolCard
              key={`pool-${pool.name}-${index}`}
              pool={pool}
              farmAddress={farmAddress}
              userAddress={address}
              isMockMode={isMockMode}
            />
          ))}
        </div>

        {/* 说明信息 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">农场工作原理</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 质押 LP 代币开始赚取 DRT 奖励</li>
            <li>• 奖励根据你在池子中的份额计算</li>
            <li>• 随时可以收获奖励，无需解除质押</li>
            <li>• 随时可以取回 LP 代币（奖励自动收获）</li>
            <li>• 高 APY 池子可能有更高风险或更低流动性</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
