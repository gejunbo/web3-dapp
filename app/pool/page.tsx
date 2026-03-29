/**
 * Pool 页面组件
 * 流动性池功能页面，支持添加和移除流动性
 *
 * 功能：
 * - 添加流动性（按比例存入 TKA 和 TKB）
 * - 移除流动性（燃烧 LP 代币取回 TKA 和 TKB）
 * - 显示池子统计信息（TVL、储备量）
 * - 双代币授权流程
 */

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { parseUnits, formatUnits } from "@/lib/utils/units";
import ApproveButton from "@/components/ApproveButton";
import { getTokenAddress, getProtocolAddress } from "@/lib/constants/addresses";
import { SWAP_ABI, ERC20_ABI } from "@/lib/abis";

// 池子数据接口
interface PoolData {
  pools?: Array<{
    tvl: string;
    apr: string;
  }>;
}

/**
 * Pool 页面
 *
 * 主要功能：
 * 1. 添加流动性 - 用户存入 TKA 和 TKB 获得 LP 代币
 * 2. 移除流动性 - 用户燃烧 LP 代币取回 TKA 和 TKB
 * 3. 显示池子统计 - TVL、储备量、用户份额
 */
export default function PoolPage(): React.ReactElement {
  // 获取钱包连接状态和链 ID
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // 获取合约地址
  const swapAddress = getProtocolAddress(chainId, "SWAP") as
    | `0x${string}`
    | undefined;
  const tokenAAddress = getTokenAddress(chainId, "TKA") as
    | `0x${string}`
    | undefined;
  const tokenBAddress = getTokenAddress(chainId, "TKB") as
    | `0x${string}`
    | undefined;

  // ===== 状态管理 =====
  // 当前模式：'add' 添加流动性 | 'remove' 移除流动性
  const [mode, setMode] = useState<"add" | "remove">("add");
  // 添加流动性时的代币数量
  const [amountA, setAmountA] = useState<string>("");
  const [amountB, setAmountB] = useState<string>("");
  // 移除流动性时的 LP 代币数量
  const [lpAmount, setLpAmount] = useState<string>("");
  // 是否使用模拟模式（合约未部署时）
  const [isMockMode, setIsMockMode] = useState<boolean>(false);
  // 池子数据
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  // 跟踪最后一次修改的输入框，避免无限循环
  const lastModifiedInput = useRef<"A" | "B" | null>(null);

  // ===== 合约数据读取 =====

  /**
   * 读取流动性池储备量
   * 返回 [reserveA, reserveB] 两个代币的储备量
   */
  const {
    data: reserves,
    isError: reservesError,
    refetch: refetchReserves,
  } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: "getReserves",
    query: {
      enabled: Boolean(swapAddress),
    },
  });

  /**
   * 读取用户 LP 代币余额
   */
  const { data: lpBalance, refetch: refetchLPBalance } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(swapAddress && address),
    },
  });

  /**
   * 读取用户 TKA 余额
   */
  const { data: balanceTKA, refetch: refetchBalanceTKA } = useReadContract({
    address: tokenAAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(tokenAAddress && address),
    },
  });

  /**
   * 读取用户 TKB 余额
   */
  const { data: balanceTKB, refetch: refetchBalanceTKB } = useReadContract({
    address: tokenBAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(tokenBAddress && address),
    },
  });

  // ===== 合约写入 =====

  /**
   * 添加流动性交易
   */
  const {
    data: addHash,
    writeContract: addLiquidity,
    isPending: isAdding,
  } = useWriteContract();

  /**
   * 等待添加流动性交易确认
   */
  const { isLoading: isAddConfirming, isSuccess: isAddSuccess } =
    useWaitForTransactionReceipt({
      hash: addHash,
    });

  /**
   * 移除流动性交易
   */
  const {
    data: removeHash,
    writeContract: removeLiquidity,
    isPending: isRemoving,
  } = useWriteContract();

  /**
   * 等待移除流动性交易确认
   */
  const { isLoading: isRemoveConfirming, isSuccess: isRemoveSuccess } =
    useWaitForTransactionReceipt({
      hash: removeHash,
    });

  // ===== 副作用 =====

  /**
   * 获取池子数据
   * 从 API 获取 TVL 等信息
   */
  useEffect(() => {
    fetch("/api/stake/pools")
      .then((res) => res.json())
      .then((data: PoolData) => setPoolData(data))
      .catch(console.error);
  }, []);

  /**
   * 检查是否使用模拟模式
   * 当合约地址不存在或读取储备量失败时启用
   */
  useEffect(() => {
    if (!swapAddress || reservesError) {
      setIsMockMode(true);
    } else {
      setIsMockMode(false);
    }
  }, [swapAddress, reservesError]);

  /**
   * 双向联动自动计算
   * - 修改 TKA 时自动计算 TKB
   * - 修改 TKB 时自动计算 TKA
   */
  useEffect(() => {
    if (mode !== "add") {
      return;
    }

    // 用户修改了 TKA，计算 TKB
    if (
      lastModifiedInput.current === "A" &&
      amountA &&
      parseFloat(amountA) > 0
    ) {
      if (reserves && Array.isArray(reserves)) {
        const [reserve0, reserve1] = reserves as [bigint, bigint];
        if (reserve0 > 0n && reserve1 > 0n) {
          const reserveA = Number(reserve0) / 1e18;
          const reserveB = Number(reserve1) / 1e18;
          const ratio = reserveB / reserveA;
          const calculatedB = parseFloat(amountA) * ratio;
          setAmountB(calculatedB.toFixed(6));
          return;
        }
      }
      const calculatedB = parseFloat(amountA) * 1.5;
      setAmountB(calculatedB.toFixed(6));
      return;
    }

    // 用户修改了 TKB，计算 TKA
    if (
      lastModifiedInput.current === "B" &&
      amountB &&
      parseFloat(amountB) > 0
    ) {
      if (reserves && Array.isArray(reserves)) {
        const [reserve0, reserve1] = reserves as [bigint, bigint];
        if (reserve0 > 0n && reserve1 > 0n) {
          const reserveA = Number(reserve0) / 1e18;
          const reserveB = Number(reserve1) / 1e18;
          const ratio = reserveA / reserveB; // 反向比例
          const calculatedA = parseFloat(amountB) * ratio;
          setAmountA(calculatedA.toFixed(6));
          return;
        }
      }
      const calculatedA = parseFloat(amountB) / 1.5;
      setAmountA(calculatedA.toFixed(6));
      return;
    }
  }, [amountA, amountB, reserves, mode]);

  /**
   * 添加流动性成功后刷新数据
   * 刷新余额、储备量和清空输入框
   */
  useEffect(() => {
    if (isAddSuccess) {
      // 刷新所有相关数据
      refetchBalanceTKA();
      refetchBalanceTKB();
      refetchLPBalance();
      refetchReserves();
      // 清空输入框
      setAmountA("");
      setAmountB("");
    }
  }, [
    isAddSuccess,
    refetchBalanceTKA,
    refetchBalanceTKB,
    refetchLPBalance,
    refetchReserves,
  ]);

  /**
   * 移除流动性成功后刷新数据
   * 刷新余额、储备量和清空输入框
   */
  useEffect(() => {
    if (isRemoveSuccess) {
      // 刷新所有相关数据
      refetchBalanceTKA();
      refetchBalanceTKB();
      refetchLPBalance();
      refetchReserves();
      // 清空输入框
      setLpAmount("");
    }
  }, [
    isRemoveSuccess,
    refetchBalanceTKA,
    refetchBalanceTKB,
    refetchLPBalance,
    refetchReserves,
  ]);

  // ===== 计算函数 =====

  /**
   * 计算移除流动性时可获得的代币数量
   * 根据 LP 代币数量按比例计算可获得的 TKA 和 TKB
   */
  const removeAmounts = useMemo(() => {
    if (!lpAmount || parseFloat(lpAmount) <= 0 || !reserves || !lpBalance) {
      return { amountA: "0", amountB: "0" };
    }

    const lpAmountBig = parseUnits(lpAmount, 18);
    const lpBalanceBig = BigInt(lpBalance as bigint | string);

    if (lpAmountBig > lpBalanceBig) {
      return { amountA: "0", amountB: "0" };
    }

    // 计算按比例可获得的代币数量
    const [reserve0, reserve1] = reserves as [bigint, bigint];
    const reserveA = BigInt(reserve0);
    const reserveB = BigInt(reserve1);

    // 公式: (lpAmount / totalLP) * reserve
    const amountABig = (lpAmountBig * reserveA) / lpBalanceBig;
    const amountBBig = (lpAmountBig * reserveB) / lpBalanceBig;

    return {
      amountA: formatUnits(amountABig, 18, 6),
      amountB: formatUnits(amountBBig, 18, 6),
    };
  }, [lpAmount, reserves, lpBalance]);

  // ===== 事件处理函数 =====

  /**
   * 处理添加流动性
   * 调用合约的 addLiquidity 函数
   */
  const handleAddLiquidity = (): void => {
    if (!swapAddress || !amountA || !amountB) return;

    const amountAWei = parseUnits(amountA, 18);
    const amountBWei = parseUnits(amountB, 18);

    addLiquidity({
      address: swapAddress,
      abi: SWAP_ABI,
      functionName: "addLiquidity",
      args: [amountAWei, amountBWei],
    });
  };

  /**
   * 处理移除流动性
   * 调用合约的 removeLiquidity 函数
   */
  const handleRemoveLiquidity = (): void => {
    if (!swapAddress || !lpAmount) return;

    const lpAmountWei = parseUnits(lpAmount, 18);

    removeLiquidity({
      address: swapAddress,
      abi: SWAP_ABI,
      functionName: "removeLiquidity",
      args: [lpAmountWei],
    });
  };

  /**
   * 设置最大 LP 数量
   */
  const handleMaxLP = (): void => {
    if (lpBalance) {
      setLpAmount(formatUnits(lpBalance as bigint | string, 18, 6));
    }
  };

  /**
   * 设置最大 TKA 数量
   */
  const handleMaxTKA = (): void => {
    if (balanceTKA) {
      lastModifiedInput.current = "A";
      setAmountA(formatUnits(balanceTKA as bigint | string, 18, 6));
    }
  };

  /**
   * 设置最大 TKB 数量
   */
  const handleMaxTKB = (): void => {
    if (balanceTKB) {
      lastModifiedInput.current = "B";
      setAmountB(formatUnits(balanceTKB as bigint | string, 18, 6));
    }
  };

  // ===== 渲染 =====

  return (
    <div className="container max-w-2xl mx-auto py-12">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">流动性池</h1>
        <p className="text-gray-600">添加或移除流动性以赚取交易手续费</p>
      </div>

      {/* 池子统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* TVL 卡片 */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="text-sm opacity-90 mb-1">总锁仓价值 (TVL)</div>
          <div className="text-2xl font-bold">
            {poolData?.pools?.[0]?.tvl
              ? `$${parseFloat(poolData.pools[0].tvl).toLocaleString()}`
              : "$0"}
          </div>
        </div>

        {/* Reserve A 卡片 */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="text-sm opacity-90 mb-1">TKA 储备量</div>
          <div className="text-2xl font-bold">
            {reserves && Array.isArray(reserves)
              ? formatUnits(reserves[0], 18, 2)
              : "0"}{" "}
            TKA
          </div>
        </div>

        {/* Reserve B 卡片 */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="text-sm opacity-90 mb-1">TKB 储备量</div>
          <div className="text-2xl font-bold">
            {reserves && Array.isArray(reserves)
              ? formatUnits(reserves[1], 18, 2)
              : "0"}{" "}
            TKB
          </div>
        </div>
      </div>

      {/* 主操作卡片 */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* 模式切换按钮 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode("add")}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              mode === "add"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            添加流动性
          </button>
          <button
            onClick={() => setMode("remove")}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              mode === "remove"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            移除流动性
          </button>
        </div>

        {/* 模拟模式提示 */}
        {isMockMode && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>模拟模式：</strong>Swap 合约未部署，使用模拟数据。
            </p>
          </div>
        )}

        {/* 添加流动性模式 */}
        {mode === "add" && (
          <>
            {/* TKA 输入框 */}
            <div className="mb-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-600">Token A</label>
                  <button
                    onClick={handleMaxTKA}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    余额:{" "}
                    {balanceTKA
                      ? formatUnits(balanceTKA as bigint | string, 18, 4)
                      : "0"}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={amountA}
                    onChange={(e) => {
                      lastModifiedInput.current = "A";
                      setAmountA(e.target.value);
                    }}
                    placeholder="0.0"
                    className="flex-1 text-2xl font-semibold bg-transparent outline-none"
                  />
                  <div className="bg-white border rounded-lg px-3 py-2 font-semibold">
                    TKA
                  </div>
                </div>
              </div>
            </div>

            {/* 加号图标 */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-white border-4 border-gray-50 rounded-xl p-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
            </div>

            {/* TKB 输入框 */}
            <div className="mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-600">Token B</label>
                  <button
                    onClick={handleMaxTKB}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    余额:{" "}
                    {balanceTKB
                      ? formatUnits(balanceTKB as bigint | string, 18, 4)
                      : "0"}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={amountB}
                    onChange={(e) => {
                      lastModifiedInput.current = "B";
                      setAmountB(e.target.value);
                    }}
                    placeholder="0.0"
                    className="flex-1 text-2xl font-semibold bg-transparent outline-none"
                  />
                  <div className="bg-white border rounded-lg px-3 py-2 font-semibold">
                    TKB
                  </div>
                </div>
              </div>
            </div>

            {/* 价格信息 */}
            {amountA && amountB && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">汇率</span>
                  <span className="font-semibold">
                    1 TKA ={" "}
                    {(parseFloat(amountB) / parseFloat(amountA)).toFixed(4)} TKB
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">您的份额</span>
                  <span className="font-semibold">~0.1%</span>
                </div>
              </div>
            )}

            {/* 操作按钮 - 双授权流程 */}
            {!isConnected ? (
              <button className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg">
                连接钱包
              </button>
            ) : !swapAddress || isMockMode ? (
              <button
                disabled
                className="w-full bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
              >
                {isMockMode
                  ? "添加流动性（模拟模式 - 合约未部署）"
                  : "Swap 合约不可用"}
              </button>
            ) : (
              <ApproveButton
                tokenAddress={tokenAAddress}
                spenderAddress={swapAddress}
                amount={amountA ? parseUnits(amountA, 18) : BigInt(0)}
                disabled={!amountA || !amountB || isAdding || isAddConfirming}
              >
                <ApproveButton
                  tokenAddress={tokenBAddress}
                  spenderAddress={swapAddress}
                  amount={amountB ? parseUnits(amountB, 18) : BigInt(0)}
                  disabled={!amountA || !amountB || isAdding || isAddConfirming}
                >
                  <button
                    onClick={handleAddLiquidity}
                    disabled={
                      !amountA || !amountB || isAdding || isAddConfirming
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    {isAdding || isAddConfirming
                      ? "添加流动性中..."
                      : "添加流动性"}
                  </button>
                </ApproveButton>
              </ApproveButton>
            )}

            {/* 成功消息 */}
            {isAddSuccess && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold">流动性添加成功！</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${addHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  在 Etherscan 上查看 →
                </a>
              </div>
            )}
          </>
        )}

        {/* 移除流动性模式 */}
        {mode === "remove" && (
          <>
            {/* LP 代币输入框 */}
            <div className="mb-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-600">LP 代币</label>
                  <button
                    onClick={handleMaxLP}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    余额:{" "}
                    {lpBalance
                      ? formatUnits(lpBalance as bigint | string, 18, 4)
                      : "0"}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={lpAmount}
                    onChange={(e) => setLpAmount(e.target.value)}
                    placeholder="0.0"
                    className="flex-1 text-2xl font-semibold bg-transparent outline-none"
                  />
                  <div className="bg-white border rounded-lg px-3 py-2 font-semibold">
                    LP
                  </div>
                </div>
              </div>
            </div>

            {/* 向下箭头 */}
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-white border-4 border-gray-50 rounded-xl p-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            </div>

            {/* 输出数量显示 */}
            <div className="mb-6 space-y-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">您将获得</div>
                <div className="text-xl font-semibold">
                  {removeAmounts.amountA} TKA
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">您将获得</div>
                <div className="text-xl font-semibold">
                  {removeAmounts.amountB} TKB
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            {!isConnected ? (
              <button className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg">
                连接钱包
              </button>
            ) : !swapAddress || isMockMode ? (
              <button
                disabled
                className="w-full bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
              >
                {isMockMode
                  ? "移除流动性（模拟模式 - 合约未部署）"
                  : "Swap 合约不可用"}
              </button>
            ) : (
              <button
                onClick={handleRemoveLiquidity}
                disabled={!lpAmount || isRemoving || isRemoveConfirming}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isRemoving || isRemoveConfirming
                  ? "移除流动性中..."
                  : "移除流动性"}
              </button>
            )}

            {/* 成功消息 */}
            {isRemoveSuccess && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold">流动性移除成功！</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${removeHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  在 Etherscan 上查看 →
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {/* 说明区域 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">工作原理</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 按 1:1 比例添加流动性以赚取交易手续费</li>
          <li>• 获得代表您池子份额的 LP 代币</li>
          <li>• 随时可以通过燃烧 LP 代币移除流动性</li>
          <li>• 按份额比例赚取所有兑换的 0.3% 手续费</li>
        </ul>
      </div>
    </div>
  );
}
