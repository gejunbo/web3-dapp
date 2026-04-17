/**
 * Wagmi 配置
 * 配置 Web3 连接、链和钱包连接器
 */

import { http, createConfig, fallback } from "wagmi";
import { sepolia, mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// 自定义 Anvil 本地链配置
import type { Chain } from "wagmi/chains";

const anvil: Chain = {
  id: 31337,
  name: "Anvil",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL_ANVIL as string],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_RPC_URL_ANVIL as string],
    },
  },
  testnet: true,
};

/**
 * Wagmi 配置
 * 支持 Sepolia 测试网、Anvil 本地链和以太坊主网
 *
 * 注意：mainnet 配置会导致请求 eth.merkle.io，产生 CORS 错误
 * 如果只在测试网操作，可以注释掉 mainnet 相关配置
 */
export const config = createConfig({
  chains: [
    sepolia,
    anvil,
    // 注意：启用 mainnet 会导致请求 eth.merkle.io，产生 CORS 错误
    // 因为 RainbowKit 会尝试连接所有配置的链，包括主网的公共 RPC 节点
    // 如果只在测试网操作，建议注释掉 mainnet
    // mainnet,
  ],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet 等浏览器钱包
  ],
  transports: {
    // Sepolia RPC 配置（多节点轮询，自动故障转移）
    // 使用 fallback 配置多个 RPC 节点，一个失败会自动切换到下一个
    [sepolia.id]: fallback([
      // 优先级1：Infura（稳定、速度快，但有速率限制）
      // 免费套餐：100,000次/天，10次/秒
      http(process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA as string),
      // 优先级2：官方公共 RPC（无限制，作为备用）
      http("https://rpc.sepolia.org"),
      // 优先级3：dRPC 公共节点（备用）
      http("https://sepolia.drpc.org"),
      // 优先级4：PublicNode 公共节点（备用）
      http("https://ethereum-sepolia.publicnode.com"),
    ]),

    [anvil.id]: http(process.env.NEXT_PUBLIC_RPC_URL_ANVIL as string),

    // 注意：mainnet 的 http() 会使用默认的公共 RPC 节点（包括 eth.merkle.io）
    // 这些节点可能没有正确配置 CORS，导致浏览器报错
    // [mainnet.id]: http(),
  },
  ssr: true,
});
