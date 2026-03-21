/**
 * 合约地址配置
 * 集中管理所有智能合约地址
 */

import { sepolia } from 'wagmi/chains';

// 代币合约地址配置
export const TOKEN_ADDRESSES: Record<number, Record<string, string | undefined>> = {
  [sepolia.id]: {
    REWARD_TOKEN: process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS,
    TOKEN_A: process.env.NEXT_PUBLIC_TOKEN_A_ADDRESS,
    TOKEN_B: process.env.NEXT_PUBLIC_TOKEN_B_ADDRESS,
    TOKEN_C: process.env.NEXT_PUBLIC_TOKEN_C_ADDRESS,
    TOKEN_D: process.env.NEXT_PUBLIC_TOKEN_D_ADDRESS,
    PAYMENT_TOKEN: process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS,
  },
};

// DeFi 协议合约地址配置
export const PROTOCOL_ADDRESSES: Record<number, Record<string, string | undefined>> = {
  [sepolia.id]: {
    SWAP: process.env.NEXT_PUBLIC_SWAP_ADDRESS,
    STAKE_POOL: process.env.NEXT_PUBLIC_STAKE_POOL_ADDRESS,
    FARM: process.env.NEXT_PUBLIC_FARM_ADDRESS,
    LAUNCHPAD: process.env.NEXT_PUBLIC_LAUNCHPAD_ADDRESS,
  },
};

// 代币配置（包含元数据）
export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  getAddress: (chainId: number) => string | undefined;
}

export const TOKENS: Record<string, TokenConfig> = {
  TKA: {
    symbol: 'TKA',
    name: 'Token A',
    decimals: 18,
    getAddress: (chainId: number) => TOKEN_ADDRESSES[chainId]?.TOKEN_A,
  },
  TKB: {
    symbol: 'TKB',
    name: 'Token B',
    decimals: 18,
    getAddress: (chainId: number) => TOKEN_ADDRESSES[chainId]?.TOKEN_B,
  },
  TKC: {
    symbol: 'TKC',
    name: 'Token C',
    decimals: 18,
    getAddress: (chainId: number) => TOKEN_ADDRESSES[chainId]?.TOKEN_C,
  },
  TKD: {
    symbol: 'TKD',
    name: 'Token D',
    decimals: 18,
    getAddress: (chainId: number) => TOKEN_ADDRESSES[chainId]?.TOKEN_D,
  },
  DRT: {
    symbol: 'DRT',
    name: 'DeFi Reward Token',
    decimals: 18,
    getAddress: (chainId: number) => TOKEN_ADDRESSES[chainId]?.REWARD_TOKEN,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
    getAddress: (chainId: number) => TOKEN_ADDRESSES[chainId]?.PAYMENT_TOKEN,
  },
};

/**
 * 获取代币地址
 * @param chainId - 链ID
 * @param tokenSymbol - 代币符号
 * @returns {string | undefined} 代币地址
 */
export function getTokenAddress(chainId: number, tokenSymbol: string): string | undefined {
  return TOKENS[tokenSymbol]?.getAddress(chainId);
}

/**
 * 获取协议合约地址
 * @param chainId - 链ID
 * @param protocol - 协议名称
 * @returns {string | undefined} 合约地址
 */
export function getProtocolAddress(chainId: number, protocol: string): string | undefined {
  return PROTOCOL_ADDRESSES[chainId]?.[protocol];
}
