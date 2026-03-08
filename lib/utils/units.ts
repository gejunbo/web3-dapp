/**
 * 代币金额处理工具函数
 * 所有代币金额应使用 bigint 以避免精度丢失
 */

/**
 * 将人类可读的金额转换为 bigint wei 单位
 * @param amount - 人类可读金额 (例如: "1.5")
 * @param decimals - 代币精度 (默认 18)
 * @returns {bigint} wei 单位的金额
 */
export function parseUnits(amount: string | number, decimals: number = 18): bigint {
  if (!amount || amount === '' || amount === '0') return BigInt(0);

  const amountStr = amount.toString();
  const [whole, fraction = ''] = amountStr.split('.');

  // 填充或截断小数部分以匹配精度
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);

  // 合并整数和小数部分
  const combined = whole + paddedFraction;

  return BigInt(combined);
}

/**
 * 将 bigint wei 金额格式化为人类可读的字符串
 * @param value - wei 单位的金额
 * @param decimals - 代币精度 (默认 18)
 * @param displayDecimals - 显示的小数位数 (默认 4)
 * @returns {string} 人类可读的金额
 */
export function formatUnits(value: bigint | string, decimals: number = 18, displayDecimals: number = 4): string {
  if (!value || value === BigInt(0) || value === '0') return '0';

  const valueStr = value.toString().padStart(decimals + 1, '0');
  const whole = valueStr.slice(0, -decimals) || '0';
  const fraction = valueStr.slice(-decimals);

  // 去除小数部分末尾的零
  const trimmedFraction = fraction.replace(/0+$/, '');

  if (!trimmedFraction) return whole;

  // 限制显示精度
  const displayFraction = trimmedFraction.slice(0, displayDecimals);

  return `${whole}.${displayFraction}`;
}

/**
 * 格式化代币金额并添加符号
 * @param value - wei 单位的金额
 * @param decimals - 代币精度
 * @param symbol - 代币符号
 * @returns {string} 格式化后的金额带符号
 */
export function formatTokenAmount(value: bigint | string, decimals: number = 18, symbol: string = ''): string {
  const formatted = formatUnits(value, decimals);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * 格式化 USD 金额
 * @param value - USD 金额
 * @returns {string} 格式化后的 USD 金额
 */
export function formatUSD(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}K`;
  }

  return `$${num.toFixed(2)}`;
}

/**
 * 计算百分比
 * @param part - 部分值
 * @param total - 总值
 * @returns {number} 百分比 (0-100)
 */
export function calculatePercentage(part: bigint | string, total: bigint | string): number {
  if (!total || total === BigInt(0) || total === '0') return 0;

  const partBig = typeof part === 'bigint' ? part : BigInt(part);
  const totalBig = typeof total === 'bigint' ? total : BigInt(total);

  return Number((partBig * BigInt(10000)) / totalBig) / 100;
}

/**
 * 安全地相加两个 bigint 值
 * @param a - 第一个值
 * @param b - 第二个值
 * @returns {bigint} 相加结果
 */
export function addBigInt(a: bigint | string, b: bigint | string): bigint {
  const aBig = typeof a === 'bigint' ? a : BigInt(a || 0);
  const bBig = typeof b === 'bigint' ? b : BigInt(b || 0);
  return aBig + bBig;
}

/**
 * bigint 乘以数字 (用于价格 * 数量等计算)
 * @param value - 基础值
 * @param multiplier - 乘数
 * @returns {bigint} 相乘结果
 */
export function multiplyBigInt(value: bigint | string, multiplier: number): bigint {
  const valueBig = typeof value === 'bigint' ? value : BigInt(value || 0);
  const multiplierBig = BigInt(Math.floor(multiplier * 10000));
  return (valueBig * multiplierBig) / BigInt(10000);
}
