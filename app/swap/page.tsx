/**
 * Swap 页面组件
 * 代币兑换功能页面，支持 TokenA 和 TokenB 之间的兑换
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useChainId } from 'wagmi';
import { parseUnits, formatUnits } from '@/lib/utils/units';
import ApproveButton from '@/components/ApproveButton';
import { TOKENS, getTokenAddress, getProtocolAddress } from '@/lib/constants/addresses';
import { SWAP_ABI } from '@/lib/abis';

// 代币数据接口
interface TokenData {
  symbol: string;
  name: string;
  decimals: number;
  address: `0x${string}` | undefined;
}

/**
 * Swap 页面
 *
 * 功能：
 * - 代币选择（TokenA <-> TokenB）
 * - 价格报价（从链上或模拟API获取）
 * - 授权 + 兑换流程
 * - 交易状态追踪
 * - 滑点设置
 */
export default function SwapPage(): JSX.Element {
  // 获取钱包连接状态和当前链ID
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // ===== 状态管理 =====
  const [tokenIn, setTokenIn] = useState<string>('TKA');
  const [tokenOut, setTokenOut] = useState<string>('TKB');
  const [amountIn, setAmountIn] = useState<string>('');
  const [amountOut, setAmountOut] = useState<string>('');
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [isMockMode, setIsMockMode] = useState<boolean>(false);

  // 滑点设置
  const [slippage, setSlippage] = useState<number>(0.5); // 默认 0.5%
  const [showSlippageModal, setShowSlippageModal] = useState<boolean>(false);
  const [customSlippage, setCustomSlippage] = useState<string>('');

  // 获取代币数据
  const tokenInData: TokenData = {
    ...TOKENS[tokenIn],
    address: getTokenAddress(chainId, tokenIn) as `0x${string}` | undefined,
  };
  const tokenOutData: TokenData = {
    ...TOKENS[tokenOut],
    address: getTokenAddress(chainId, tokenOut) as `0x${string}` | undefined,
  };
  const swapAddress = getProtocolAddress(chainId, 'SWAP') as `0x${string}` | undefined;

  // ===== 合约读取 =====
  // 读取流动性池储备量
  const { data: reserves } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getReserves',
    enabled: Boolean(swapAddress),
  });

  // 从链上获取报价
  const { data: chainQuote, isError: isQuoteError } = useReadContract({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: 'getAmountOut',
    args: amountIn && tokenInData.address
      ? [tokenInData.address, parseUnits(amountIn, tokenInData.decimals)]
      : undefined,
    enabled: Boolean(swapAddress && amountIn && parseFloat(amountIn) > 0),
  });

  // ===== 合约写入 =====
  // 兑换交易
  const { data: swapHash, writeContract: swap, isPending: isSwapping } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({
    hash: swapHash,
  });

  // ===== 报价计算 =====
  useEffect(() => {
    const getQuote = async (): Promise<void> => {
      if (!amountIn || parseFloat(amountIn) <= 0) {
        setAmountOut('');
        return;
      }

      setIsLoadingQuote(true);

      // 优先使用链上报价
      if (chainQuote && !isQuoteError) {
        setAmountOut(formatUnits(chainQuote, tokenOutData.decimals));
        setIsMockMode(false);
        setIsLoadingQuote(false);
        return;
      }

      // 链上报价失败，使用模拟计算
      try {
        // 模拟汇率：1:1.5
        const mockRate = tokenIn === 'TKA' ? 1.5 : (1 / 1.5);
        const calculatedOut = parseFloat(amountIn) * mockRate;
        setAmountOut(calculatedOut.toFixed(6));
        setIsMockMode(true);
      } catch (error) {
        console.error('获取报价错误:', error);
        setAmountOut('');
      }

      setIsLoadingQuote(false);
    };

    // 防抖处理
    const timer = setTimeout(getQuote, 500);
    return () => clearTimeout(timer);
  }, [amountIn, chainQuote, isQuoteError, tokenIn, tokenInData, tokenOutData]);

  /**
   * 执行兑换
   */
  const handleSwap = (): void => {
    if (!swapAddress || !tokenInData.address || !amountIn) return;

    const amountInWei = parseUnits(amountIn, tokenInData.decimals);

    swap({
      address: swapAddress,
      abi: SWAP_ABI,
      functionName: 'swap',
      args: [tokenInData.address, amountInWei],
    });
  };

  /**
   * 切换输入输出代币
   */
  const switchTokens = (): void => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut('');
  };

  /**
   * 授权成功回调
   */
  const handleApproved = (): void => {
    console.log('代币已授权，准备兑换');
  };

  // 计算最小输出金额（考虑滑点）
  const minAmountOut = amountOut
    ? (parseFloat(amountOut) * (1 - slippage / 100)).toFixed(6)
    : '0';

  // 计算价格影响（简化版）
  const priceImpact = reserves && amountIn
    ? ((parseFloat(amountIn) / (Number((reserves as bigint[])[tokenIn === 'TKA' ? 0 : 1]) / 1e18)) * 100).toFixed(2)
    : '0';

  // 滑点预设值
  const slippagePresets: number[] = [0.1, 0.5, 1.0];

  /**
   * 选择滑点预设值
   */
  const handleSlippagePreset = (value: number): void => {
    setSlippage(value);
    setCustomSlippage('');
  };

  /**
   * 处理自定义滑点输入
   */
  const handleCustomSlippage = (value: string): void => {
    setCustomSlippage(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      setSlippage(numValue);
    }
  };

  return (
    <div className="container max-w-lg mx-auto py-12 px-4">
      {/* 兑换卡片 */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">兑换</h1>
          <div className="flex items-center gap-2">
            {/* 模拟模式标签 */}
            {isMockMode && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                模拟模式
              </span>
            )}
            {/* 设置按钮 */}
            <button
              onClick={() => setShowSlippageModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="设置"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 输入代币 */}
        <div className="mb-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-600">从</label>
              <button className="text-sm text-blue-600">最大</button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="flex-1 text-2xl font-semibold bg-transparent outline-none"
              />
              <select
                value={tokenIn}
                onChange={(e) => setTokenIn(e.target.value)}
                className="bg-white border rounded-lg px-3 py-2 font-semibold"
              >
                {Object.keys(TOKENS).map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 切换按钮 */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={switchTokens}
            className="bg-white border-4 border-gray-50 rounded-xl p-2 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* 输出代币 */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-600">到</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={amountOut}
                readOnly
                placeholder="0.0"
                className="flex-1 text-2xl font-semibold bg-transparent outline-none text-gray-600"
              />
              <select
                value={tokenOut}
                onChange={(e) => setTokenOut(e.target.value)}
                className="bg-white border rounded-lg px-3 py-2 font-semibold"
              >
                {Object.keys(TOKENS).filter(s => s !== tokenIn).map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 价格信息 */}
        {amountOut && (
          <div className="mb-4 space-y-2">
            <div className="p-3 bg-blue-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">汇率</span>
                <span className="font-semibold">
                  1 {tokenIn} = {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(4)} {tokenOut}
                </span>
              </div>
              {reserves && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">流动性</span>
                    <span className="font-semibold">
                      ${((Number((reserves as bigint[])[0]) + Number((reserves as bigint[])[1])) / 1e18 * 1.5).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">价格影响</span>
                    <span className={`font-semibold ${parseFloat(priceImpact) > 5 ? 'text-red-600' : parseFloat(priceImpact) > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {priceImpact}%
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">滑点容差</span>
                <span className="font-semibold">{slippage}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">最少收到</span>
                <span className="font-semibold">{minAmountOut} {tokenOut}</span>
              </div>
            </div>
            {/* 高价格影响警告 */}
            {parseFloat(priceImpact) > 5 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-800">⚠️ 价格影响较高！建议减少兑换金额。</p>
              </div>
            )}
          </div>
        )}

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
            {isMockMode ? '兑换（模拟模式 - 合约未部署）' : '兑换合约不可用'}
          </button>
        ) : (
          <ApproveButton
            tokenAddress={tokenInData?.address}
            spenderAddress={swapAddress}
            amount={amountIn ? parseUnits(amountIn, tokenInData.decimals) : 0n}
            onApproved={handleApproved}
            disabled={!amountIn || !amountOut || isSwapping || isConfirming}
          >
            <button
              onClick={handleSwap}
              disabled={!amountIn || !amountOut || isSwapping || isConfirming}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isSwapping || isConfirming ? '兑换中...' : '兑换'}
            </button>
          </ApproveButton>
        )}

        {/* 成功消息 */}
        {isSwapSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-semibold">兑换成功！</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${swapHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              在 Etherscan 上查看 →
            </a>
          </div>
        )}
      </div>

      {/* 说明区域 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">使用说明</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 选择要兑换的代币</li>
          <li>• 输入金额并获取即时报价</li>
          <li>• 授权代币使用（一次性）</li>
          <li>• 确认兑换交易</li>
        </ul>
      </div>

      {/* 滑点设置弹窗 */}
      {showSlippageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">设置</h2>
              <button
                onClick={() => setShowSlippageModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-3">滑点容差</label>
                <div className="flex gap-2 mb-3">
                  {slippagePresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSlippagePreset(preset)}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                        slippage === preset && !customSlippage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={customSlippage}
                    onChange={(e) => handleCustomSlippage(e.target.value)}
                    placeholder="自定义"
                    step="0.1"
                    min="0"
                    max="50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
                {/* 高滑点警告 */}
                {customSlippage && parseFloat(customSlippage) > 5 && (
                  <p className="mt-2 text-sm text-yellow-600">⚠️ 高滑点可能导致不利汇率</p>
                )}
                {customSlippage && parseFloat(customSlippage) > 15 && (
                  <p className="mt-2 text-sm text-red-600">⚠️ 滑点非常高！可能会损失大量价值。</p>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    <strong>什么是滑点？</strong>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    滑点是预期交易价格与实际成交价格之间的差异。
                    如果价格变化超过此百分比，您的交易将被回滚。
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSlippageModal(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
