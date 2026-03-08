/**
 * 代币授权按钮组件
 * 处理 ERC20 代币授权检查和授权流程
 */

'use client';

import { useMemo, ReactNode, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ERC20_ABI } from '@/lib/abis';

// 组件属性接口
interface ApproveButtonProps {
  /** 代币合约地址 */
  tokenAddress: `0x${string}` | undefined;
  /**  spender 地址（如路由器、池合约） */
  spenderAddress: `0x${string}` | undefined;
  /** 授权金额（wei 单位） */
  amount: bigint;
  /** 授权成功后的回调函数 */
  onApproved?: () => void;
  /** 子元素（无需授权时显示的按钮） */
  children: ReactNode;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 代币授权按钮组件
 *
 * 功能：
 * - 检查当前授权额度
 * - 如需要则显示授权按钮
 * - 授权完成后显示子元素（通常是交易按钮）
 *
 * @param props - 组件属性
 */
export default function ApproveButton({
  tokenAddress,
  spenderAddress,
  amount,
  onApproved,
  children,
  disabled = false,
}: ApproveButtonProps): React.ReactElement {
  // 获取当前连接的钱包地址
  const { address } = useAccount();

  // 读取当前授权额度
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && spenderAddress ? [address, spenderAddress] : undefined,
    query: {
      enabled: Boolean(address && tokenAddress && spenderAddress && amount),
    },
  });

  // 授权交易写入
  const { data: approveHash, writeContract: approve, isPending: isApproving } = useWriteContract();

  // 等待授权交易确认
  const { isLoading: isConfirming, isSuccess: isApproved } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // 计算是否需要授权
  const needsApproval = useMemo(() => {
    if (amount === undefined || amount === null || allowance === undefined || allowance === null) {
      return false;
    }

    const amountBig = typeof amount === 'bigint' ? amount : BigInt(amount || 0);
    const allowanceBig = typeof allowance === 'bigint' ? allowance : BigInt(String(allowance));

    return allowanceBig < amountBig;
  }, [amount, allowance]);

  // 授权成功后刷新授权额度
  useEffect(() => {
    if (isApproved) {
      refetchAllowance();
      onApproved?.();
    }
  }, [isApproved, refetchAllowance, onApproved]);

  /**
   * 处理授权按钮点击
   * 授权最大金额以提升用户体验（用户无需重复授权）
   */
  const handleApprove = (): void => {
    if (!tokenAddress || !spenderAddress || !amount) return;

    // 授权最大金额 (uint256 最大值)
    const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    approve({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, maxUint256],
    });
  };

  // 如果不需要授权，直接显示子元素（交易按钮）
  if (!needsApproval) {
    return <>{children}</>;
  }

  // 显示授权按钮
  return (
    <button
      onClick={handleApprove}
      disabled={disabled || isApproving || isConfirming}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
    >
      {isApproving || isConfirming ? '授权中...' : '授权代币'}
    </button>
  );
}
