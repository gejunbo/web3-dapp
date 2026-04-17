/**
 * LaunchPad 页面 - 代币销售发射台
 *
 * 功能说明：
 * 1. 展示所有 LaunchPad 项目列表
 * 2. 支持项目筛选：进行中/即将开始/已结束
 * 3. 显示项目详细信息：价格、进度、时间等
 * 4. 支持代币购买功能
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
import { formatNumber } from "@/lib/utils/format";
import ApproveButton from "@/components/ApproveButton";
import { getProtocolAddress } from "@/lib/constants/addresses";
import { LAUNCHPAD_ABI, ERC20_ABI } from "@/lib/abis";

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
 * 项目卡片组件 Props
 */
interface ProjectCardProps {
  project: LaunchPadProject;
  launchPadAddress: `0x${string}` | undefined;
  userAddress: `0x${string}` | undefined;
  isMockMode: boolean;
  onPurchaseClick: (project: LaunchPadProject) => void;
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
 * 格式化倒计时显示
 * @param targetTime - 目标时间戳
 * @returns 倒计时字符串
 */
function formatCountdown(targetTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = targetTime - now;

  if (diff <= 0) return "已结束";

  const days = Math.floor(diff / (24 * 60 * 60));
  const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((diff % (60 * 60)) / 60);

  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  return `${minutes}分钟`;
}

/**
 * 格式化日期显示
 * @param timestamp - 时间戳
 * @returns 格式化后的日期字符串
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 获取状态标签样式
 * @param status - 项目状态
 * @returns CSS 类名字符串
 */
function getStatusStyle(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "upcoming":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "ended":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * 获取状态文本
 * @param status - 项目状态
 * @returns 状态文本
 */
function getStatusText(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "进行中";
    case "upcoming":
      return "即将开始";
    case "ended":
      return "已结束";
    default:
      return "未知";
  }
}

// ===== 组件 =====

/**
 * 项目卡片组件
 * 展示单个项目的详细信息和操作按钮
 */
function ProjectCard({
  project,
  launchPadAddress,
  userAddress,
  isMockMode,
  onPurchaseClick,
}: ProjectCardProps) {
  // ===== 链上数据读取 =====

  /**
   * 读取用户购买记录
   */
  const { data: userPurchase } = useReadContract({
    address: launchPadAddress,
    abi: LAUNCHPAD_ABI,
    functionName: "getUserPurchase",
    args:
      launchPadAddress && userAddress
        ? [BigInt(project.id), userAddress]
        : undefined,
    query: {
      enabled: Boolean(launchPadAddress && userAddress && !isMockMode),
    },
  });

  // ===== 计算值 =====

  // 计算已筹集金额
  const raisedAmount =
    (parseFloat(project.soldAmount) * parseFloat(project.tokenPrice)) / 1e6;

  // 计算目标金额
  const targetAmount =
    (parseFloat(project.totalSupply) * parseFloat(project.tokenPrice)) / 1e6;

  // 用户已购买数量
  const userPurchasedAmount = userPurchase
    ? formatUnits(userPurchase[0], 18)
    : "0";

  // 是否已购买
  const hasPurchased = parseFloat(userPurchasedAmount) > 0;

  // 是否可以购买
  const canPurchase = project.status === "active" && !isMockMode;

  // ===== 渲染 =====

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* 项目头部 */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* 项目图标 */}
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
              {project.tokenSymbol.slice(0, 2)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {project.name}
              </h3>
              <p className="text-sm text-gray-500">{project.tokenSymbol}</p>
            </div>
          </div>
          {/* 状态标签 */}
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusStyle(
              project.status
            )}`}
          >
            {getStatusText(project.status)}
          </span>
        </div>

        {/* 项目描述 */}
        <p className="text-gray-600 text-sm line-clamp-2">
          {project.description}
        </p>
      </div>

      {/* 销售进度 */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500">销售进度</span>
          <span className="text-sm font-semibold text-gray-900">
            {project.progress}%
          </span>
        </div>
        {/* 进度条 */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>
        {/* 筹集金额 */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            已筹集: {formatUSD(raisedAmount)}
          </span>
          <span className="text-gray-500">
            目标: {formatUSD(targetAmount)}
          </span>
        </div>
      </div>

      {/* 项目详情 */}
      <div className="p-6 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          {/* 代币价格 */}
          <div>
            <p className="text-xs text-gray-500 mb-1">代币价格</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatNumber(parseFloat(project.tokenPrice) / 1e6)}{" "}
              {project.paymentTokenSymbol}
            </p>
          </div>
          {/* 总供应量 */}
          <div>
            <p className="text-xs text-gray-500 mb-1">总供应量</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatNumber(parseFloat(project.totalSupply))} {project.tokenSymbol}
            </p>
          </div>
          {/* 开始时间 */}
          <div>
            <p className="text-xs text-gray-500 mb-1">开始时间</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(project.startTime)}
            </p>
          </div>
          {/* 结束时间 */}
          <div>
            <p className="text-xs text-gray-500 mb-1">结束时间</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(project.endTime)}
            </p>
          </div>
        </div>

        {/* 倒计时 */}
        {project.status === "active" && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-800 text-center">
              距离结束还有: {" "}
              <span className="font-bold">
                {formatCountdown(project.endTime)}
              </span>
            </p>
          </div>
        )}
        {project.status === "upcoming" && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              距离开始还有: {" "}
              <span className="font-bold">
                {formatCountdown(project.startTime)}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* 用户购买信息 */}
      {hasPurchased && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-sm text-gray-600">
            您已购买: {" "}
            <span className="font-semibold text-gray-900">
              {formatNumber(parseFloat(userPurchasedAmount))} {project.tokenSymbol}
            </span>
          </p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="p-6">
        {isMockMode ? (
          <button
            disabled
            className="w-full bg-gray-300 text-gray-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
          >
            模拟模式 - 合约未部署
          </button>
        ) : (
          <button
            onClick={() => onPurchaseClick(project)}
            disabled={!canPurchase}
            className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${
              canPurchase
                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {project.status === "active"
              ? "立即购买"
              : project.status === "upcoming"
              ? "即将开始"
              : "已结束"}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 购买弹窗组件 Props
 */
interface PurchaseModalProps {
  project: LaunchPadProject | null;
  isOpen: boolean;
  onClose: () => void;
  launchPadAddress: `0x${string}` | undefined;
  userAddress: `0x${string}` | undefined;
}

/**
 * 购买弹窗组件
 * 用于输入购买金额和确认购买
 */
function PurchaseModal({
  project,
  isOpen,
  onClose,
  launchPadAddress,
  userAddress,
}: PurchaseModalProps) {
  // ===== 本地状态 =====
  const [amount, setAmount] = useState<string>("");
  const [isApproved, setIsApproved] = useState<boolean>(false);

  // ===== 链上数据读取 =====

  /**
   * 读取支付代币精度
   */
  const { data: paymentTokenDecimals } = useReadContract({
    address: project?.paymentToken,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: Boolean(project?.paymentToken && !project.paymentTokenSymbol.includes("ETH")),
    },
  });

  /**
   * 读取用户支付代币余额
   */
  const { data: paymentBalance } = useReadContract({
    address: project?.paymentToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: Boolean(project?.paymentToken && userAddress && !project.paymentTokenSymbol.includes("ETH")),
    },
  });

  /**
   * 读取用户支付代币授权额度
   */
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: project?.paymentToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      userAddress && launchPadAddress
        ? [userAddress, launchPadAddress]
        : undefined,
    query: {
      enabled: Boolean(
        project?.paymentToken && userAddress && launchPadAddress && !project.paymentTokenSymbol.includes("ETH")
      ),
    },
  });

  // ===== 合约写入 =====

  /**
   * 购买代币交易
   */
  const {
    writeContract: purchase,
    data: purchaseHash,
    isPending: isPurchasing,
    error: purchaseError,
  } = useWriteContract();

  /**
   * 等待购买交易确认
   */
  const { isLoading: isPurchaseConfirming, isSuccess: isPurchaseSuccess } =
    useWaitForTransactionReceipt({
      hash: purchaseHash,
    });

  // ===== 计算值 =====

  // 代币精度
  const decimals: number = (paymentTokenDecimals as number) || 6;

  // 计算需要支付的金额
  const paymentAmount =
    amount && project
      ? (parseFloat(amount) * parseFloat(project.tokenPrice)) / Math.pow(10, decimals)
      : 0;

  // 检查授权额度是否足够
  const needsApproval =
    !project?.paymentTokenSymbol.includes("ETH") &&
    (!allowance ||
      parseFloat(formatUnits(allowance as bigint, decimals)) < paymentAmount);

  // 是否可以购买
  const canPurchase =
    amount &&
    parseFloat(amount) > 0 &&
    project &&
    parseFloat(amount) >= parseFloat(project.minPurchase) / 1e18 &&
    parseFloat(amount) <= parseFloat(project.maxPurchase) / 1e18 &&
    (project.paymentTokenSymbol.includes("ETH") || isApproved || !needsApproval);

  // ===== 事件处理 =====

  /**
   * 处理购买
   */
  const handlePurchase = () => {
    if (!launchPadAddress || !amount || !project) return;

    purchase({
      address: launchPadAddress,
      abi: LAUNCHPAD_ABI,
      functionName: "purchase",
      args: [BigInt(project.id), parseUnits(amount, 18)],
    });
  };

  /**
   * 处理授权成功
   */
  const handleApproveSuccess = () => {
    setIsApproved(true);
    refetchAllowance();
  };

  /**
   * 关闭弹窗时重置状态
   */
  const handleClose = () => {
    setAmount("");
    setIsApproved(false);
    onClose();
  };

  // 购买成功后关闭弹窗
  useEffect(() => {
    if (isPurchaseSuccess) {
      setTimeout(handleClose, 2000);
    }
  }, [isPurchaseSuccess]);

  // ===== 渲染 =====

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        {/* 标题 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">购买代币</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 项目信息 */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
            {project.tokenSymbol.slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{project.name}</p>
            <p className="text-sm text-gray-500">
              价格: {formatNumber(parseFloat(project.tokenPrice) / 1e6)}{" "}
              {project.paymentTokenSymbol} / {project.tokenSymbol}
            </p>
          </div>
        </div>

        {/* 购买输入 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            购买数量 ({project.tokenSymbol})
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                if (value && parseFloat(value) < 0) return;
                setAmount(value);
                setIsApproved(false);
              }}
              placeholder="0.0"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
            <button
              onClick={() => {
                setAmount(formatUnits(BigInt(project.maxPurchase), 18));
                setIsApproved(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 text-sm font-medium hover:text-purple-700"
            >
              最大
            </button>
          </div>
          {/* 限额提示 */}
          <p className="text-xs text-gray-500 mt-2">
            最小: {formatNumber(parseFloat(project.minPurchase) / 1e18)} {" "}
            {project.tokenSymbol} | 最大:{" "}
            {formatNumber(parseFloat(project.maxPurchase) / 1e18)} {" "}
            {project.tokenSymbol}
          </p>
        </div>

        {/* 支付信息 */}
        {amount && parseFloat(amount) > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">支付金额</span>
              <span className="font-semibold">
                {formatNumber(paymentAmount)} {project.paymentTokenSymbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">获得代币</span>
              <span className="font-semibold">
                {formatNumber(parseFloat(amount))} {project.tokenSymbol}
              </span>
            </div>
          </div>
        )}

        {/* 授权按钮（如果需要） */}
        {needsApproval && project.paymentTokenSymbol !== "ETH" && (
          <div className="mb-4">
            <ApproveButton
              tokenAddress={project.paymentToken}
              spenderAddress={launchPadAddress}
              amount={parseUnits(paymentAmount.toString(), decimals)}
              onApproved={handleApproveSuccess}
            >
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors">
                授权 {project.paymentTokenSymbol}
              </button>
            </ApproveButton>
          </div>
        )}

        {/* 购买按钮 */}
        <button
          onClick={handlePurchase}
          disabled={!canPurchase || isPurchasing || isPurchaseConfirming}
          className={`w-full font-semibold py-3 px-6 rounded-xl transition-colors ${
            canPurchase && !isPurchasing && !isPurchaseConfirming
              ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isPurchasing || isPurchaseConfirming
            ? "处理中..."
            : isPurchaseSuccess
            ? "购买成功！"
            : "确认购买"}
        </button>

        {/* 错误提示 */}
        {purchaseError && (
          <p className="mt-4 text-sm text-red-600 text-center">
            购买失败: {purchaseError.message}
          </p>
        )}
      </div>
    </div>
  );
}

// ===== 主页面组件 =====

/**
 * LaunchPad 主页面
 * 展示所有代币销售项目
 */
export default function LaunchPadPage(): React.ReactElement {
  // ===== 钱包和链状态 =====
  const { address } = useAccount();
  const chainId = useChainId();

  // ===== 本地状态 =====
  const [projects, setProjects] = useState<LaunchPadProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<LaunchPadProject[]>(
    []
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMockMode, setIsMockMode] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | "all">(
    "all"
  );
  const [selectedProject, setSelectedProject] =
    useState<LaunchPadProject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // ===== 合约地址 =====
  const launchPadAddress = getProtocolAddress(chainId, "LAUNCHPAD") as
    | `0x${string}`
    | undefined;

  // ===== 数据获取 =====

  /**
   * 获取项目列表
   */
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/launchpad/projects");
        const data = await response.json();
        setProjects(data.projects);
        setIsMockMode(data.isMockMode);
      } catch (error) {
        console.error("[LaunchPad] 获取项目列表失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  /**
   * 根据筛选条件过滤项目
   */
  useEffect(() => {
    if (activeFilter === "all") {
      setFilteredProjects(projects);
    } else {
      setFilteredProjects(
        projects.filter((project) => project.status === activeFilter)
      );
    }
  }, [projects, activeFilter]);

  // ===== 事件处理 =====

  /**
   * 打开购买弹窗
   */
  const handlePurchaseClick = (project: LaunchPadProject) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  /**
   * 关闭购买弹窗
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  // ===== 渲染 =====

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">代币发射台</h1>
        <p className="text-gray-600">参与优质项目的代币销售，把握早期投资机会</p>
      </div>

      {/* 模拟模式提示 */}
      {isMockMode && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-yellow-800 text-center text-sm">
            <span className="font-semibold">模拟模式</span> - 当前显示的是模拟数据，合约未部署或连接失败
          </p>
        </div>
      )}

      {/* 筛选标签 */}
      <div className="flex justify-center gap-2 mb-8">
        {[
          { key: "all", label: "全部" },
          { key: "active", label: "进行中" },
          { key: "upcoming", label: "即将开始" },
          { key: "ended", label: "已结束" },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key as ProjectStatus | "all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === filter.key
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* 项目列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无项目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={`project-${project.id}-${project.name}`}
              project={project}
              launchPadAddress={launchPadAddress}
              userAddress={address}
              isMockMode={isMockMode}
              onPurchaseClick={handlePurchaseClick}
            />
          ))}
        </div>
      )}

      {/* 购买弹窗 */}
      <PurchaseModal
        project={selectedProject}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        launchPadAddress={launchPadAddress}
        userAddress={address}
      />
    </div>
  );
}
