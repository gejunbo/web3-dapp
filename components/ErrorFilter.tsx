/**
 * 错误过滤器组件
 * 过滤掉 WalletConnect 等产生的无意义控制台错误
 */

'use client';

import { useEffect } from 'react';

/**
 * 错误过滤器组件
 * 用于过滤 WalletConnect 等库产生的噪声错误，保持控制台清洁
 */
export default function ErrorFilter(): React.ReactElement | null {
  useEffect(() => {
    // 保存原始的 console.error 函数
    const originalError = console.error;

    /**
     * 重写 console.error 来过滤特定错误
     * @param args - 错误参数
     */
    console.error = (...args: unknown[]): void => {
      // 策略1: 过滤空对象或无意义的错误
      if (args.length === 0) return;

      if (args.length === 1) {
        const firstArg = args[0];
        // 空对象 {}
        if (typeof firstArg === 'object' && firstArg !== null && Object.keys(firstArg).length === 0) {
          return;
        }
        // 空字符串
        if (typeof firstArg === 'string' && firstArg.trim() === '') {
          return;
        }
      }

      // 策略2: 检查调用栈（如果有 Error 对象）
      const hasError = args.find((arg): arg is Error => arg instanceof Error);
      if (hasError && hasError.stack) {
        const stack = hasError.stack.toLowerCase();
        if (
          stack.includes('walletconnect') ||
          stack.includes('pino') ||
          stack.includes('logger')
        ) {
          return;
        }
      }

      // 策略3: 检查当前调用栈
      try {
        const stack = new Error().stack || '';
        const stackLower = stack.toLowerCase();
        if (
          stackLower.includes('walletconnect') ||
          stackLower.includes('pino') ||
          stackLower.includes('logger')
        ) {
          return;
        }
      } catch {
        // 如果无法获取调用栈，继续
      }

      // 策略4: 转换为字符串检查内容
      try {
        const errorString = args.map(arg => {
          if (typeof arg === 'string') return arg;
          if (typeof arg === 'object' && arg !== null) {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ').toLowerCase();

        // 过滤 WalletConnect 相关的关键词
        const shouldFilter =
          errorString.includes('walletconnect') ||
          errorString.includes('restore') ||
          errorString.includes('pino') ||
          errorString.includes('logger') ||
          errorString === '{}' ||
          errorString === '';

        if (shouldFilter) return;
      } catch {
        // 如果字符串转换失败，继续
      }

      // 如果以上都没有过滤掉，显示错误
      originalError(...args);
    };

    // 清理函数：恢复原始 console.error
    return () => {
      console.error = originalError;
    };
  }, []);

  return null; // 不渲染任何内容
}
