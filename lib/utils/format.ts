/**
 * Format utility functions for display
 * 格式化工具函数
 */

/**
 * Truncate address for display
 * 截断地址用于显示
 * @param address - Ethereum address
 * @param startChars - Characters to show at start
 * @param endChars - Characters to show at end
 * @returns Truncated address
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format timestamp to relative time
 * 格式化时间戳为相对时间
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;

  const seconds = Math.floor(Math.abs(diff) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diff > 0) {
    // Future
    if (days > 0) return `in ${days} day${days > 1 ? "s" : ""}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
    return `in ${seconds} second${seconds > 1 ? "s" : ""}`;
  } else {
    // Past
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
  }
}

/**
 * Format timestamp to date string
 * 格式化时间戳为日期字符串
 * @param timestamp - Unix timestamp
 * @returns Formatted date
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format number with commas
 * 用逗号格式化数字
 * @param value - Number or string
 * @returns Formatted string
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Format APR/APY percentage
 * 格式化 APR/APY 百分比
 * @param value - Percentage value
 * @returns Formatted string
 */
export function formatPercentage(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K%`;
  }
  return `${value.toFixed(2)}%`;
}

/**
 * Format large token balance for display
 * 格式化大数字代币余额显示
 * 当数字超过 1000 时显示为 K/M 格式，避免超长数字
 * @param value - 格式化后的数字字符串
 * @returns Formatted string with K/M suffix if applicable
 */
export function formatTokenBalance(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "0";

  // 如果数字太大，使用科学计数法或简化显示
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }

  // 小数字保持原样，但限制小数位数
  return num.toFixed(4).replace(/\.?0+$/, "");
}

/**
 * Get transaction status color
 * 获取交易状态颜色
 * @param status - Transaction status
 * @returns Tailwind color class
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "success":
    case "completed":
    case "active":
      return "text-green-600";
    case "pending":
    case "processing":
      return "text-yellow-600";
    case "error":
    case "failed":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}
