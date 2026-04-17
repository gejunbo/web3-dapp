/**
 * LaunchPad 项目列表 API
 *
 * 功能说明：
 * 1. 获取所有 LaunchPad 项目列表
 * 2. 支持模拟模式（合约未部署时返回模拟数据）
 * 3. 返回项目详细信息，包括销售进度、时间状态等
 *
 * API 端点：GET /api/launchpad/projects
 * 返回格式：{ projects: LaunchPadProject[], isMockMode: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { LAUNCHPAD_ABI } from "@/lib/abis";

// ===== 类型定义 =====

/**
 * 项目状态类型
 */
type ProjectStatus = "upcoming" | "active" | "ended";

/**
 * LaunchPad 项目数据结构
 */
interface LaunchPadProject {
  id: number;
  name: string;
  description: string;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  paymentToken: `0x${string}`;
  paymentTokenSymbol: string;
  tokenPrice: string;
  totalSupply: string;
  soldAmount: string;
  startTime: number;
  endTime: number;
  minPurchase: string;
  maxPurchase: string;
  active: boolean;
  status: ProjectStatus;
  progress: number;
}

/**
 * API 响应数据结构
 */
interface ProjectsResponse {
  projects: LaunchPadProject[];
  isMockMode: boolean;
}

// ===== 配置 =====

/**
 * Sepolia 网络 RPC 配置
 * 使用公共 RPC 节点
 */
const SEPOLIA_RPC = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA || "https://rpc.sepolia.org";

/**
 * LaunchPad 合约地址
 * 从环境变量读取
 */
const LAUNCHPAD_ADDRESS = process.env.NEXT_PUBLIC_LAUNCHPAD_ADDRESS as `0x${string}`;

// ===== 辅助函数 =====

/**
 * 获取项目状态
 * 根据当前时间和项目时间参数判断状态
 *
 * @param startTime - 开始时间（时间戳）
 * @param endTime - 结束时间（时间戳）
 * @param active - 项目是否激活
 * @returns 项目状态
 */
function getProjectStatus(
  startTime: number,
  endTime: number,
  active: boolean
): ProjectStatus {
  const now = Math.floor(Date.now() / 1000);

  if (!active) return "ended";
  if (now < startTime) return "upcoming";
  if (now > endTime) return "ended";
  return "active";
}

/**
 * 计算销售进度百分比
 *
 * @param soldAmount - 已售数量
 * @param totalSupply - 总供应量
 * @returns 进度百分比（0-100）
 */
function calculateProgress(soldAmount: bigint, totalSupply: bigint): number {
  if (totalSupply === 0n) return 0;
  return Number((soldAmount * 100n) / totalSupply);
}

/**
 * 格式化代币数量（考虑精度）
 *
 * @param amount - 原始数量
 * @param decimals - 代币精度（默认18）
 * @returns 格式化后的字符串
 */
function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  return (Number(amount) / 10 ** decimals).toString();
}

/**
 * 模拟项目数据
 * 用于合约未部署时的开发和测试
 */
const getMockProjects = (): LaunchPadProject[] => {
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 24 * 60 * 60;

  return [
    {
      id: 0,
      name: "New DeFi Token",
      description: "下一代去中心化金融协议代币，提供高收益流动性挖矿和治理权益",
      tokenAddress: "0x1234567890123456789012345678901234567890",
      tokenSymbol: "NDT",
      paymentToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      paymentTokenSymbol: "USDC",
      tokenPrice: "1000000", // 1 USDC (6位精度)
      totalSupply: "1000000000000000000000000", // 1,000,000 NDT
      soldAmount: "450000000000000000000000", // 450,000 NDT
      startTime: now - oneDay * 2, // 2天前开始
      endTime: now + oneDay * 5, // 5天后结束
      minPurchase: "1000000000000000000", // 1 NDT
      maxPurchase: "50000000000000000000", // 50 NDT
      active: true,
      status: "active",
      progress: 45,
    },
    {
      id: 1,
      name: "GameFi Platform",
      description: "区块链游戏平台代币，用于游戏内购买、奖励和治理",
      tokenAddress: "0x2345678901234567890123456789012345678901",
      tokenSymbol: "GFT",
      paymentToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      paymentTokenSymbol: "USDC",
      tokenPrice: "500000", // 0.5 USDC
      totalSupply: "5000000000000000000000000", // 5,000,000 GFT
      soldAmount: "0",
      startTime: now + oneDay * 3, // 3天后开始
      endTime: now + oneDay * 10, // 10天后结束
      minPurchase: "10000000000000000000", // 10 GFT
      maxPurchase: "100000000000000000000", // 100 GFT
      active: true,
      status: "upcoming",
      progress: 0,
    },
    {
      id: 2,
      name: "NFT Marketplace",
      description: "NFT 交易市场代币，用于交易手续费折扣和平台治理",
      tokenAddress: "0x3456789012345678901234567890123456789012",
      tokenSymbol: "NMT",
      paymentToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      paymentTokenSymbol: "USDC",
      tokenPrice: "2000000", // 2 USDC
      totalSupply: "200000000000000000000000", // 200,000 NMT
      soldAmount: "200000000000000000000000", // 全部售罄
      startTime: now - oneDay * 10, // 10天前开始
      endTime: now - oneDay * 2, // 2天前结束
      minPurchase: "500000000000000000", // 0.5 NMT
      maxPurchase: "10000000000000000000", // 10 NMT
      active: false,
      status: "ended",
      progress: 100,
    },
  ];
};

// ===== API 处理函数 =====

/**
 * GET 请求处理
 * 获取 LaunchPad 项目列表
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ProjectsResponse>> {
  try {
    // 检查合约地址是否配置
    if (!LAUNCHPAD_ADDRESS) {
      console.log("[LaunchPad API] 合约地址未配置，返回模拟数据");
      return NextResponse.json({
        projects: getMockProjects(),
        isMockMode: true,
      });
    }

    // 创建 Viem 客户端
    const client = createPublicClient({
      chain: sepolia,
      transport: http(SEPOLIA_RPC),
    });

    // 获取项目总数
    let projectCount: bigint;
    try {
      projectCount = await client.readContract({
        address: LAUNCHPAD_ADDRESS,
        abi: LAUNCHPAD_ABI,
        functionName: "projectCount",
      });
    } catch (error) {
      console.log("[LaunchPad API] 读取项目数量失败，返回模拟数据:", error);
      return NextResponse.json({
        projects: getMockProjects(),
        isMockMode: true,
      });
    }

    // 如果没有项目，返回模拟数据
    if (projectCount === 0n) {
      console.log("[LaunchPad API] 项目数量为0，返回模拟数据");
      return NextResponse.json({
        projects: getMockProjects(),
        isMockMode: true,
      });
    }

    // 获取所有项目信息
    const projects: LaunchPadProject[] = [];

    for (let i = 0; i < Number(projectCount); i++) {
      try {
        const projectInfo = await client.readContract({
          address: LAUNCHPAD_ADDRESS,
          abi: LAUNCHPAD_ABI,
          functionName: "getProjectInfo",
          args: [BigInt(i)],
        });

        // 解析项目信息（结构体返回为对象）
        const projectData = projectInfo as {
          name: string;
          description: string;
          tokenAddress: `0x${string}`;
          paymentToken: `0x${string}`;
          tokenPrice: bigint;
          totalSupply: bigint;
          soldAmount: bigint;
          startTime: bigint;
          endTime: bigint;
          minPurchase: bigint;
          maxPurchase: bigint;
          active: boolean;
        };

        // 确定支付代币符号（简化处理，实际应该从合约读取）
        const paymentTokenSymbol =
          projectData.paymentToken.toLowerCase() ===
          "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48".toLowerCase()
            ? "USDC"
            : "ETH";

        projects.push({
          id: i,
          name: projectData.name,
          description: projectData.description,
          tokenAddress: projectData.tokenAddress,
          tokenSymbol: projectData.name.slice(0, 3).toUpperCase(), // 简化处理
          paymentToken: projectData.paymentToken,
          paymentTokenSymbol,
          tokenPrice: projectData.tokenPrice.toString(),
          totalSupply: formatTokenAmount(projectData.totalSupply),
          soldAmount: formatTokenAmount(projectData.soldAmount),
          startTime: Number(projectData.startTime),
          endTime: Number(projectData.endTime),
          minPurchase: formatTokenAmount(projectData.minPurchase),
          maxPurchase: formatTokenAmount(projectData.maxPurchase),
          active: projectData.active,
          status: getProjectStatus(
            Number(projectData.startTime),
            Number(projectData.endTime),
            projectData.active
          ),
          progress: calculateProgress(projectData.soldAmount, projectData.totalSupply),
        });
      } catch (error) {
        console.error(`[LaunchPad API] 获取项目 ${i} 失败:`, error);
      }
    }

    // 如果未能获取任何项目，返回模拟数据
    if (projects.length === 0) {
      console.log("[LaunchPad API] 未能获取任何项目，返回模拟数据");
      return NextResponse.json({
        projects: getMockProjects(),
        isMockMode: true,
      });
    }

    return NextResponse.json({
      projects,
      isMockMode: false,
    });
  } catch (error) {
    console.error("[LaunchPad API] 获取项目列表失败:", error);

    // 发生错误时返回模拟数据
    return NextResponse.json({
      projects: getMockProjects(),
      isMockMode: true,
    });
  }
}
