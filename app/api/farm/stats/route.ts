/**
 * Farm API Route - 农场统计数据接口
 *
 * 提供农场池子的统计数据，包括：
 * - 池子列表（ID、名称、LP代币、APY、TVL）
 * - 总锁仓价值（TVL）
 * - 活跃用户数
 *
 * 支持模拟数据模式，用于合约未部署时的开发和测试
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * 农场池子数据结构
 */
interface FarmPool {
  id: number; // 池子 ID
  name: string; // 池子名称
  lpToken: string; // LP 代币符号
  lpTokenAddress: `0x${string}`; // LP 代币合约地址
  apy: number; // 年化收益率（百分比）
  tvl: number; // 总锁仓价值（USD）
}

/**
 * 农场统计数据响应结构
 */
interface FarmStatsResponse {
  pools: FarmPool[]; // 池子列表
  totalValueLocked: number; // 总锁仓价值
  activeUsers: number; // 活跃用户数
  timestamp: number; // 数据时间戳
}

/**
 * 获取 LP 代币地址
 * 使用 Swap 合约地址作为 LP 代币地址
 * 因为 Swap 合约本身也是 ERC20 代币合约（LP Token）
 */
function getLPTokenAddress(): `0x${string}` {
  // 从环境变量读取 Swap 合约地址（即 LP 代币地址）
  const swapAddress = process.env.NEXT_PUBLIC_SWAP_ADDRESS;
  if (swapAddress && swapAddress.startsWith("0x")) {
    return swapAddress as `0x${string}`;
  }
  // 默认使用配置中的地址
  return "0x1f8e4Ca3EeA8Fbf9677a17c346B5Eb4f88309866" as `0x${string}`;
}

/**
 * 模拟农场池子数据
 * 用于合约未部署时的开发和测试
 * 
 * 注意：目前 Farm 合约只配置了池子 ID 0
 * 所有池子都使用 ID 0，确保用户可以正常质押
 */
const getMockPools = (): FarmPool[] => {
  const lpTokenAddress = getLPTokenAddress();

  return [
    {
      id: 0,
      name: "TKA-TKB LP",
      lpToken: "SLP",
      lpTokenAddress: lpTokenAddress,
      apy: 125.5,
      tvl: 150000,
    },
    {
      id: 0, // 使用 ID 0，因为合约只配置了这个池子
      name: "TKA-USDC LP",
      lpToken: "SLP",
      lpTokenAddress: lpTokenAddress,
      apy: 85.2,
      tvl: 89000,
    },
    {
      id: 0, // 使用 ID 0，因为合约只配置了这个池子
      name: "TKB-USDC LP",
      lpToken: "SLP",
      lpTokenAddress: lpTokenAddress,
      apy: 95.8,
      tvl: 112000,
    },
  ];
};

/**
 * 计算总锁仓价值
 * @param pools - 池子列表
 * @returns 总锁仓价值（USD）
 */
function calculateTotalTVL(pools: FarmPool[]): number {
  return pools.reduce((total, pool) => total + pool.tvl, 0);
}

/**
 * GET /api/farm/stats
 * 获取农场统计数据
 *
 * 查询参数：
 * - mock: 是否返回模拟数据（true/false）
 *
 * 响应：
 * - 200: 成功返回 FarmStatsResponse
 * - 500: 服务器错误
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<FarmStatsResponse | { error: string }>> {
  try {
    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const useMock = searchParams.get("mock") === "true";

    // 获取环境变量中的合约地址
    const farmAddress = process.env.NEXT_PUBLIC_FARM_ADDRESS;

    // 如果没有合约地址或强制使用模拟数据，返回模拟数据
    if (!farmAddress || useMock) {
      console.log("[Farm API] Returning mock data");

      const mockPools = getMockPools();
      const mockResponse: FarmStatsResponse = {
        pools: mockPools,
        totalValueLocked: calculateTotalTVL(mockPools),
        activeUsers: 1234,
        timestamp: Date.now(),
      };

      return NextResponse.json(mockResponse);
    }

    // TODO: 从链上读取真实数据
    // 这里可以调用合约的 poolLength() 和 poolInfo() 函数
    // 获取真实的池子列表和数据

    // 目前返回模拟数据
    const mockPools = getMockPools();
    const response: FarmStatsResponse = {
      pools: mockPools,
      totalValueLocked: calculateTotalTVL(mockPools),
      activeUsers: 1234,
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Farm API] Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch farm stats" },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/farm/stats
 * 支持 CORS 预检请求
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
