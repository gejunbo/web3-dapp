/**
 * Bridge 跨链转账 API 路由
 *
 * 功能：
 * - POST: 创建新的跨链转账
 * - GET: 查询转账状态
 *
 * 注意：当前为演示模式，转账状态为模拟数据
 * 实际跨链桥需要集成 LayerZero、Wormhole 等跨链协议
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * 转账状态类型
 */
type TransferStatus = "queued" | "inflight" | "complete" | "failed";

/**
 * 转账记录数据结构
 */
interface TransferRecord {
  transferId: string; // 转账唯一ID
  sourceChain: string; // 源链名称
  targetChain: string; // 目标链名称
  token: string; // 代币符号
  amount: string; // 转账数量
  recipient: string; // 接收地址
  fee: string; // 手续费
  estimatedTime: number; // 预计时间（分钟）
  status: TransferStatus; // 当前状态
  progress: number; // 进度百分比（0-100）
  createdAt: string; // 创建时间
  updatedAt: string; // 更新时间
}

/**
 * 内存存储（演示模式使用，生产环境应使用数据库）
 * 键：transferId，值：转账记录
 */
const transferStore = new Map<string, TransferRecord>();

/**
 * 支持的链配置
 */
const SUPPORTED_CHAINS = [
  { id: 1, name: "Ethereum", symbol: "ETH" },
  { id: 11155111, name: "Sepolia", symbol: "SEP" },
  { id: 137, name: "Polygon", symbol: "MATIC" },
  { id: 42161, name: "Arbitrum", symbol: "ARB" },
  { id: 10, name: "Optimism", symbol: "OP" },
];

/**
 * 支持的代币配置
 */
const SUPPORTED_TOKENS = [
  { symbol: "TKA", name: "Token A", decimals: 18 },
  { symbol: "TKB", name: "Token B", decimals: 18 },
  { symbol: "DRT", name: "Reward Token", decimals: 18 },
];

/**
 * 生成唯一转账ID
 * 格式：bridge_时间戳_随机数
 */
function generateTransferId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `bridge_${timestamp}_${random}`;
}

/**
 * 计算跨链转账手续费
 * 根据源链、目标链和金额计算
 *
 * @param sourceChain - 源链名称
 * @param targetChain - 目标链名称
 * @param amount - 转账金额
 * @returns 手续费金额（字符串）
 */
function calculateFee(
  sourceChain: string,
  targetChain: string,
  amount: string
): string {
  // 基础手续费（演示模式固定值）
  const baseFee = 0.001;

  // 根据链的复杂度调整手续费
  let chainMultiplier = 1;

  // 主网手续费更高
  if (sourceChain === "Ethereum" || targetChain === "Ethereum") {
    chainMultiplier = 2;
  }

  // L2 网络手续费较低
  if (
    sourceChain === "Polygon" ||
    sourceChain === "Arbitrum" ||
    sourceChain === "Optimism"
  ) {
    chainMultiplier = 0.8;
  }

  const fee = baseFee * chainMultiplier;
  return fee.toFixed(6);
}

/**
 * 计算预计转账时间（分钟）
 *
 * @param sourceChain - 源链名称
 * @param targetChain - 目标链名称
 * @returns 预计时间（分钟）
 */
function calculateEstimatedTime(
  sourceChain: string,
  targetChain: string
): number {
  // 基础时间
  let baseTime = 5;

  // 主网确认时间较长
  if (sourceChain === "Ethereum" || targetChain === "Ethereum") {
    baseTime += 10;
  }

  // L2 网络较快
  if (
    sourceChain === "Polygon" ||
    sourceChain === "Arbitrum" ||
    sourceChain === "Optimism"
  ) {
    baseTime -= 2;
  }

  return Math.max(1, baseTime);
}

/**
 * POST 请求处理 - 创建新的跨链转账
 *
 * 请求体：
 * {
 *   sourceChain: string,  // 源链名称
 *   targetChain: string,  // 目标链名称
 *   token: string,        // 代币符号
 *   amount: string,       // 转账数量
 *   recipient: string     // 接收地址
 * }
 *
 * 响应：
 * {
 *   success: boolean,
 *   transferId: string,
 *   ...转账详情
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const { sourceChain, targetChain, token, amount, recipient } = body;

    // ===== 参数验证 =====

    // 验证必填字段
    if (!sourceChain || !targetChain || !token || !amount || !recipient) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必要参数：sourceChain, targetChain, token, amount, recipient",
        },
        { status: 400 }
      );
    }

    // 验证源链和目标链是否有效
    const validSourceChain = SUPPORTED_CHAINS.find(
      (c) => c.name === sourceChain
    );
    const validTargetChain = SUPPORTED_CHAINS.find(
      (c) => c.name === targetChain
    );

    if (!validSourceChain) {
      return NextResponse.json(
        {
          success: false,
          error: `不支持的源链: ${sourceChain}`,
        },
        { status: 400 }
      );
    }

    if (!validTargetChain) {
      return NextResponse.json(
        {
          success: false,
          error: `不支持的目标链: ${targetChain}`,
        },
        { status: 400 }
      );
    }

    // 验证源链和目标链不能相同
    if (sourceChain === targetChain) {
      return NextResponse.json(
        {
          success: false,
          error: "源链和目标链不能相同",
        },
        { status: 400 }
      );
    }

    // 验证代币是否支持
    const validToken = SUPPORTED_TOKENS.find((t) => t.symbol === token);
    if (!validToken) {
      return NextResponse.json(
        {
          success: false,
          error: `不支持的代币: ${token}`,
        },
        { status: 400 }
      );
    }

    // 验证转账金额
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "转账金额必须大于 0",
        },
        { status: 400 }
      );
    }

    // 验证接收地址格式（简单验证）
    if (!recipient.startsWith("0x") || recipient.length !== 42) {
      return NextResponse.json(
        {
          success: false,
          error: "无效的接收地址格式",
        },
        { status: 400 }
      );
    }

    // ===== 创建转账记录 =====

    const transferId = generateTransferId();
    const fee = calculateFee(sourceChain, targetChain, amount);
    const estimatedTime = calculateEstimatedTime(sourceChain, targetChain);
    const now = new Date().toISOString();

    const transferRecord: TransferRecord = {
      transferId,
      sourceChain,
      targetChain,
      token,
      amount,
      recipient,
      fee,
      estimatedTime,
      status: "queued",
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    // 存储转账记录
    transferStore.set(transferId, transferRecord);

    // ===== 模拟转账进度（演示模式） =====
    // 实际项目中，这里应该调用跨链桥合约或第三方服务

    // 3秒后进入处理中状态
    setTimeout(() => {
      const record = transferStore.get(transferId);
      if (record && record.status === "queued") {
        record.status = "inflight";
        record.progress = 10;
        record.updatedAt = new Date().toISOString();
        transferStore.set(transferId, record);
      }
    }, 3000);

    // 10秒后进度到 50%
    setTimeout(() => {
      const record = transferStore.get(transferId);
      if (record && record.status === "inflight") {
        record.progress = 50;
        record.updatedAt = new Date().toISOString();
        transferStore.set(transferId, record);
      }
    }, 10000);

    // 20秒后完成
    setTimeout(() => {
      const record = transferStore.get(transferId);
      if (record && record.status === "inflight") {
        record.status = "complete";
        record.progress = 100;
        record.updatedAt = new Date().toISOString();
        transferStore.set(transferId, record);
      }
    }, 20000);

    // 返回成功响应
    return NextResponse.json({
      success: true,
      ...transferRecord,
      message: "转账已提交，正在处理中",
    });
  } catch (error) {
    console.error("[Bridge API] 创建转账失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}

/**
 * GET 请求处理 - 查询转账状态
 *
 * 查询参数：
 * - transferId: string  // 转账ID
 *
 * 响应：
 * {
 *   success: boolean,
 *   ...转账详情
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const transferId = searchParams.get("transferId");

    // 验证参数
    if (!transferId) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必要参数：transferId",
        },
        { status: 400 }
      );
    }

    // 查询转账记录
    const record = transferStore.get(transferId);

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: "转账记录不存在",
        },
        { status: 404 }
      );
    }

    // 模拟进度更新（演示模式）
    // 实际项目中，这里应该查询跨链桥合约或第三方服务
    if (record.status === "inflight") {
      // 根据时间计算进度
      const createdTime = new Date(record.createdAt).getTime();
      const now = Date.now();
      const elapsed = now - createdTime;
      const totalTime = record.estimatedTime * 60 * 1000; // 转换为毫秒

      // 计算进度（最大 95%，留到 complete 状态才显示 100%）
      const calculatedProgress = Math.min(
        95,
        Math.floor((elapsed / totalTime) * 100)
      );

      // 如果进度超过阈值，更新状态
      if (calculatedProgress >= 95 && record.status === "inflight") {
        record.status = "complete";
        record.progress = 100;
      } else {
        record.progress = Math.max(record.progress, calculatedProgress);
      }

      record.updatedAt = new Date().toISOString();
      transferStore.set(transferId, record);
    }

    // 返回转账记录
    return NextResponse.json({
      success: true,
      ...record,
    });
  } catch (error) {
    console.error("[Bridge API] 查询转账状态失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}
