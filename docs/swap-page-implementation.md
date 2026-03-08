# Swap 页面实现文档 (app/swap/page.tsx)

## 目录

1. [功能概述](#功能概述)
2. [架构设计](#架构设计)
3. [数据流程图](#数据流程图)
4. [组件结构图](#组件结构图)
5. [状态管理](#状态管理)
6. [合约交互](#合约交互)
7. [代码逐行解析](#代码逐行解析)
8. [关键方法详解](#关键方法详解)

---

## 功能概述

Swap 页面是一个去中心化代币兑换界面，允许用户在 TokenA 和 TokenB 之间进行兑换。主要功能包括：

- **代币选择**：支持多种代币（TKA、TKB、DRT、USDC）之间的切换
- **实时报价**：从链上获取兑换汇率，失败时回退到模拟计算
- **授权机制**：使用 ApproveButton 组件处理代币授权
- **滑点设置**：用户可自定义交易滑点容差（0.1%、0.5%、1%或自定义）
- **交易执行**：通过智能合约执行兑换操作
- **状态追踪**：显示交易进度和结果

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        Swap Page 架构                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   UI Layer   │    │  State Layer │    │  Contract    │      │
│  │              │    │              │    │   Layer      │      │
│  │ ┌──────────┐ │    │ ┌──────────┐ │    │ ┌──────────┐ │      │
│  │ │TokenInput│ │◄──►│ │useState  │ │    │ │useRead   │ │      │
│  │ └──────────┘ │    │ │          │ │◄──►│ │Contract  │ │      │
│  │ ┌──────────┐ │    │ └──────────┘ │    │ └──────────┘ │      │
│  │ │TokenOutput│ │   │ ┌──────────┐ │    │ ┌──────────┐ │      │
│  │ └──────────┘ │◄──►│ │useMemo   │ │    │ │useWrite  │ │      │
│  │ ┌──────────┐ │    │ └──────────┘ │◄──►│ │Contract  │ │      │
│  │ │SwapButton│ │    │ ┌──────────┐ │    │ └──────────┘ │      │
│  │ └──────────┘ │◄──►│ │useEffect │ │    │              │      │
│  │ ┌──────────┐ │    │ └──────────┘ │    │              │      │
│  │ │Settings  │ │    │              │    │              │      │
│  │ └──────────┘ │    │              │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         └───────────────────┴───────────────────┘               │
│                         │                                       │
│                    ┌────┴────┐                                  │
│                    │Wagmi    │                                  │
│                    │Provider │                                  │
│                    └─────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 数据流程图

```
用户输入金额
     │
     ▼
┌─────────────────┐
│  防抖处理(500ms) │
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│  检查链上报价(合约调用)   │
│  getAmountOut()          │
└────────┬─────────────────┘
         │
    ┌────┴────┐
    │         │
  成功       失败
    │         │
    ▼         ▼
┌────────┐  ┌──────────────┐
│使用链上 │  │使用模拟汇率   │
│报价     │  │1:1.5计算     │
└────┬───┘  └──────┬───────┘
     │             │
     └──────┬──────┘
            ▼
    ┌───────────────┐
    │ 显示兑换金额   │
    └───────┬───────┘
            ▼
    ┌───────────────┐
    │ 用户点击兑换   │
    └───────┬───────┘
            ▼
    ┌───────────────┐
    │ 检查授权额度   │
    │ (ApproveButton)│
    └───────┬───────┘
            │
    ┌───────┴───────┐
    │               │
  已授权          未授权
    │               │
    ▼               ▼
┌────────┐     ┌──────────┐
│执行swap │     │ 请求授权  │
│合约调用 │     │ approve() │
└────┬───┘     └────┬─────┘
     │              │
     └──────┬───────┘
            ▼
    ┌───────────────┐
    │ 等待交易确认   │
    └───────┬───────┘
            ▼
    ┌───────────────┐
    │ 显示成功/失败  │
    └───────────────┘
```

---

## 组件结构图

```
SwapPage (主组件)
│
├── 状态管理
│   ├── tokenIn: 输入代币符号
│   ├── tokenOut: 输出代币符号
│   ├── amountIn: 输入金额
│   ├── amountOut: 输出金额
│   ├── slippage: 滑点容差
│   └── showSlippageModal: 设置弹窗显示状态
│
├── 数据获取 (Hooks)
│   ├── useAccount() - 获取钱包连接状态
│   ├── useChainId() - 获取当前链ID
│   ├── useConnect() - 连接钱包功能
│   ├── useReadContract() - 读取合约数据
│   │   ├── getReserves() - 获取流动性储备
│   │   └── getAmountOut() - 获取兑换报价
│   └── useWriteContract() - 写入合约
│       └── swap() - 执行兑换
│
├── 子组件/元素
│   ├── TokenInput (输入区域)
│   │   ├── 金额输入框
│   │   └── 代币选择下拉框
│   │
│   ├── SwitchButton (切换按钮)
│   │   └── 交换输入输出代币
│   │
│   ├── TokenOutput (输出区域)
│   │   ├── 金额显示(只读)
│   │   └── 代币选择下拉框
│   │
│   ├── PriceInfo (价格信息)
│   │   ├── 汇率显示
│   │   ├── 流动性信息
│   │   ├── 价格影响
│   │   ├── 滑点容差
│   │   └── 最少收到金额
│   │
│   └── ActionButton (操作按钮)
│       ├── 未连接钱包 → 连接钱包按钮
│       ├── 合约不可用 → 禁用状态按钮
│       └── 可交易 → ApproveButton + Swap按钮
│
└── SettingsModal (设置弹窗)
    ├── 滑点预设按钮 (0.1%, 0.5%, 1%)
    ├── 自定义滑点输入
    └── 滑点说明
```

---

## 状态管理

### 本地状态 (useState)

| 状态名            | 类型    | 初始值 | 说明             |
| ----------------- | ------- | ------ | ---------------- |
| tokenIn           | string  | 'TKA'  | 输入代币符号     |
| tokenOut          | string  | 'TKB'  | 输出代币符号     |
| amountIn          | string  | ''     | 输入金额         |
| amountOut         | string  | ''     | 输出金额         |
| isMockMode        | boolean | false  | 是否使用模拟报价 |
| slippage          | number  | 0.5    | 滑点容差百分比   |
| showSlippageModal | boolean | false  | 设置弹窗显示状态 |
| customSlippage    | string  | ''     | 自定义滑点值     |

### 派生状态 (useMemo)

```typescript
// 代币数据对象 - 包含地址、符号、精度等信息
const tokenInData = useMemo(
  () => ({
    ...TOKENS[tokenIn],
    address: getTokenAddress(chainId, tokenIn),
  }),
  [chainId, tokenIn],
);

const tokenOutData = useMemo(
  () => ({
    ...TOKENS[tokenOut],
    address: getTokenAddress(chainId, tokenOut),
  }),
  [chainId, tokenOut],
);
```

### 合约数据 (Wagmi Hooks)

```typescript
// 读取流动性池储备
const { data: reserves } = useReadContract({
  address: swapAddress,
  abi: SWAP_ABI,
  functionName: "getReserves",
});

// 读取兑换报价
const { data: chainQuote } = useReadContract({
  address: swapAddress,
  abi: SWAP_ABI,
  functionName: "getAmountOut",
  args: [tokenInData.address, amountInWei],
});
```

---

## 合约交互

### 读取操作

| 方法         | 用途               | 参数              | 返回值               |
| ------------ | ------------------ | ----------------- | -------------------- |
| getReserves  | 获取流动性池储备量 | 无                | [reserveA, reserveB] |
| getAmountOut | 计算输出金额       | tokenIn, amountIn | amountOut            |

### 写入操作

| 方法    | 用途         | 参数              | 事件     |
| ------- | ------------ | ----------------- | -------- |
| swap    | 执行代币兑换 | tokenIn, amountIn | Swapped  |
| approve | 授权代币使用 | spender, amount   | Approval |

---

## 代码逐行解析

### 1. 导入部分

```typescript
"use client"; // 标记为客户端组件，使用浏览器API

import { useState, useEffect, useMemo } from "react"; // React核心Hooks
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"; // Wagmi连接和合约交互
import { useChainId, useConnect } from "wagmi"; // 链ID和连接功能
import { parseUnits, formatUnits } from "@/lib/utils/units"; // 金额转换工具
import ApproveButton from "@/components/ApproveButton"; // 授权按钮组件
import {
  TOKENS,
  getTokenAddress,
  getProtocolAddress,
} from "@/lib/constants/addresses"; // 代币配置
import { SWAP_ABI } from "@/lib/abis"; // Swap合约ABI
```

**逐行说明：**

- `'use client'`: Next.js 13+ 指令，声明此组件在客户端渲染
- `useState`: 管理组件本地状态
- `useEffect`: 处理副作用（如防抖报价计算）
- `useMemo`: 缓存计算结果，避免重复计算
- `useAccount`: 获取当前连接的钱包账户信息
- `useReadContract`: 读取智能合约数据
- `useWriteContract`: 写入智能合约（发送交易）
- `useWaitForTransactionReceipt`: 等待交易确认
- `parseUnits`: 将人类可读金额转为wei单位
- `formatUnits`: 将wei单位转为人类可读金额

### 2. 类型定义

```typescript
// 代币数据接口
interface TokenData {
  symbol: string; // 代币符号，如 "TKA"
  name: string; // 代币全称
  decimals: number; // 精度，如 18
  address: `0x${string}` | undefined; // 合约地址
}
```

**说明：**

- `symbol`: 代币简称，用于UI显示
- `name`: 代币完整名称
- `decimals`: 小数位数，用于金额计算
- `address`: 以太坊地址类型，使用模板字符串类型确保格式正确

### 3. 组件主体

```typescript
export default function SwapPage(): React.ReactElement {
  // 获取钱包连接状态和当前链ID
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const chainId = useChainId();
```

**逐行说明：**

- `export default`: 导出默认组件
- `SwapPage`: 组件名称
- `React.ReactElement`: 返回类型，表示React元素
- `useAccount()`: 获取账户连接状态
- `isConnected`: 布尔值，表示钱包是否已连接
- `useConnect()`: 获取连接功能和可用连接器列表
- `connect`: 连接钱包的函数
- `connectors`: 可用的钱包连接器数组
- `useChainId()`: 获取当前连接的区块链ID

### 4. 状态定义

```typescript
// ===== 状态管理 =====
const [tokenIn, setTokenIn] = useState<string>("TKA");
const [tokenOut, setTokenOut] = useState<string>("TKB");
const [amountIn, setAmountIn] = useState<string>("");
const [amountOut, setAmountOut] = useState<string>("");
const [isMockMode, setIsMockMode] = useState<boolean>(false);

// 滑点设置
const [slippage, setSlippage] = useState<number>(0.5);
const [showSlippageModal, setShowSlippageModal] = useState<boolean>(false);
const [customSlippage, setCustomSlippage] = useState<string>("");
```

**逐行说明：**

- `useState<string>('TKA')`: 定义字符串状态，初始值为'TKA'
- `tokenIn`: 输入代币符号
- `setTokenIn`: 更新输入代币的函数
- `tokenOut`: 输出代币符号
- `amountIn`: 用户输入的金额（字符串类型，保留精确输入）
- `amountOut`: 计算后的输出金额
- `isMockMode`: 标记是否使用模拟报价（链上调用失败时）
- `slippage`: 滑点容差，默认0.5%
- `showSlippageModal`: 控制设置弹窗显示
- `customSlippage`: 用户自定义滑点值（字符串用于输入控制）

### 5. 代币数据计算 (useMemo)

```typescript
// 获取代币数据 - 使用 useMemo 避免重复创建对象
const tokenInData: TokenData = useMemo(
  () => ({
    ...TOKENS[tokenIn],
    address: getTokenAddress(chainId, tokenIn) as `0x${string}` | undefined,
  }),
  [chainId, tokenIn],
);

const tokenOutData: TokenData = useMemo(
  () => ({
    ...TOKENS[tokenOut],
    address: getTokenAddress(chainId, tokenOut) as `0x${string}` | undefined,
  }),
  [chainId, tokenOut],
);

const swapAddress = getProtocolAddress(chainId, "SWAP") as
  | `0x${string}`
  | undefined;
```

**逐行说明：**

- `useMemo`: 缓存计算结果，只有依赖项变化时才重新计算
- `...TOKENS[tokenIn]`: 展开运算符，复制代币配置对象
- `getTokenAddress(chainId, tokenIn)`: 根据链ID和代币符号获取合约地址
- `as 0x${string}`: TypeScript类型断言，确保地址格式正确
- 依赖项 `[chainId, tokenIn]`: 当链ID或输入代币变化时重新计算
- `getProtocolAddress(chainId, 'SWAP')`: 获取Swap合约地址

### 6. 合约读取 - 流动性储备

```typescript
// ===== 合约读取 =====
// 读取流动性池储备量
const { data: reserves } = useReadContract({
  address: swapAddress,
  abi: SWAP_ABI,
  functionName: "getReserves",
  query: {
    enabled: Boolean(swapAddress),
  },
});
```

**逐行说明：**

- `useReadContract`: Wagmi hook，用于读取智能合约数据
- `address`: 合约地址
- `abi`: 合约ABI（应用二进制接口）
- `functionName`: 要调用的合约函数名
- `query.enabled`: 控制查询是否执行，只有swapAddress存在时才查询
- `data: reserves`: 解构赋值，将返回数据命名为reserves
- `reserves`: 格式为 [reserveA, reserveB] 的数组

### 7. 合约读取 - 兑换报价

```typescript
// 从链上获取报价
const { data: chainQuote, isError: isQuoteError } = useReadContract({
  address: swapAddress,
  abi: SWAP_ABI,
  functionName: "getAmountOut",
  args:
    amountIn && tokenInData.address
      ? [tokenInData.address, parseUnits(amountIn, tokenInData.decimals)]
      : undefined,
  query: {
    enabled: Boolean(swapAddress && amountIn && parseFloat(amountIn) > 0),
  },
});
```

**逐行说明：**

- `functionName: 'getAmountOut'`: 调用合约的getAmountOut函数
- `args`: 函数参数数组
  - `tokenInData.address`: 输入代币合约地址
  - `parseUnits(amountIn, tokenInData.decimals)`: 将输入金额转为wei单位
- `args: ... ? ... : undefined`: 条件参数，只有条件满足时才传递参数
- `isError: isQuoteError`: 解构出错误状态
- `enabled`: 启用条件：合约地址存在、有输入金额、金额大于0

### 8. 合约写入 - 兑换交易

```typescript
// ===== 合约写入 =====
// 兑换交易
const {
  data: swapHash,
  writeContract: swap,
  isPending: isSwapping,
} = useWriteContract();

// 等待交易确认
const { isLoading: isConfirming, isSuccess: isSwapSuccess } =
  useWaitForTransactionReceipt({
    hash: swapHash,
  });
```

**逐行说明：**

- `useWriteContract`: Wagmi hook，用于发送交易
- `data: swapHash`: 交易哈希
- `writeContract: swap`: 重命名为swap，用于触发交易
- `isPending: isSwapping`: 交易是否正在发送中
- `useWaitForTransactionReceipt`: 等待交易被区块链确认
- `hash: swapHash`: 要等待确认的交易哈希
- `isLoading: isConfirming`: 交易是否在确认中
- `isSuccess: isSwapSuccess`: 交易是否成功确认

### 9. 报价计算 Effect

```typescript
// ===== 报价计算 =====
useEffect(() => {
  const getQuote = (): void => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setAmountOut("");
      return;
    }

    // 优先使用链上报价
    if (chainQuote && !isQuoteError) {
      setAmountOut(formatUnits(chainQuote as bigint, tokenOutData.decimals));
      setIsMockMode(false);
      return;
    }

    // 链上报价失败，使用模拟计算
    try {
      // 模拟汇率：1:1.5
      const mockRate = tokenIn === "TKA" ? 1.5 : 1 / 1.5;
      const calculatedOut = parseFloat(amountIn) * mockRate;
      setAmountOut(calculatedOut.toFixed(6));
      setIsMockMode(true);
    } catch (error) {
      console.error("获取报价错误:", error);
      setAmountOut("");
    }
  };

  // 防抖处理
  const timer = setTimeout(getQuote, 500);
  return () => clearTimeout(timer);
}, [amountIn, chainQuote, isQuoteError, tokenIn, tokenOutData.decimals]);
```

**逐行说明：**

- `useEffect`: 副作用hook，处理异步操作
- `getQuote`: 内部函数，计算兑换报价
- `if (!amountIn || parseFloat(amountIn) <= 0)`: 检查输入有效性
- `setAmountOut('')`: 清空输出金额
- `if (chainQuote && !isQuoteError)`: 检查链上报价是否成功
- `formatUnits(chainQuote as bigint, tokenOutData.decimals)`: 将链上返回的wei转为可读金额
- `setIsMockMode(false)`: 标记使用真实链上报价
- `mockRate`: 模拟汇率，TKA到TKB是1:1.5，反向是1:0.666
- `calculatedOut.toFixed(6)`: 保留6位小数
- `setIsMockMode(true)`: 标记使用模拟报价
- `clearTimeout(timer)`: 清理函数，组件卸载或依赖变化时取消定时器
- 依赖项 `[amountIn, chainQuote, isQuoteError, tokenIn, tokenOutData.decimals]`: 这些值变化时重新计算

### 10. 处理函数

```typescript
/**
 * 执行兑换
 */
const handleSwap = (): void => {
  if (!swapAddress || !tokenInData.address || !amountIn) return;

  const amountInWei = parseUnits(amountIn, tokenInData.decimals);

  swap({
    address: swapAddress,
    abi: SWAP_ABI,
    functionName: "swap",
    args: [tokenInData.address, amountInWei],
  });
};
```

**逐行说明：**

- `handleSwap`: 兑换按钮点击处理函数
- `if (!swapAddress || !tokenInData.address || !amountIn) return`: 前置条件检查
- `parseUnits(amountIn, tokenInData.decimals)`: 将输入金额转为wei单位
- `swap({...})`: 调用合约的swap函数
  - `address`: 合约地址
  - `abi`: 合约ABI
  - `functionName`: 函数名
  - `args`: 参数 [输入代币地址, 输入金额]

```typescript
/**
 * 切换输入输出代币
 */
const switchTokens = (): void => {
  setTokenIn(tokenOut);
  setTokenOut(tokenIn);
  setAmountIn(amountOut);
  setAmountOut("");
};
```

**逐行说明：**

- `switchTokens`: 切换按钮点击处理
- `setTokenIn(tokenOut)`: 输入代币变为原来的输出代币
- `setTokenOut(tokenIn)`: 输出代币变为原来的输入代币
- `setAmountIn(amountOut)`: 输入金额变为计算出的输出金额
- `setAmountOut('')`: 清空输出金额，等待重新计算

```typescript
/**
 * 处理连接钱包
 * 优先使用 injected 连接器（MetaMask 等），如果没有则使用第一个可用连接器
 */
const handleConnectWallet = (): void => {
  const injectedConnector = connectors.find((c) => c.id === "injected");
  if (injectedConnector) {
    connect({ connector: injectedConnector });
  } else if (connectors.length > 0) {
    connect({ connector: connectors[0] });
  }
};
```

**逐行说明：**

- `handleConnectWallet`: 连接钱包按钮处理
- `connectors.find((c) => c.id === "injected")`: 查找浏览器注入的钱包（如MetaMask）
- `connect({ connector: injectedConnector })`: 使用找到的连接器连接
- `connectors[0]`: 如果没有injected，使用第一个可用连接器

### 11. 派生计算

```typescript
// 计算最小输出金额（考虑滑点）
const minAmountOut = amountOut
  ? (parseFloat(amountOut) * (1 - slippage / 100)).toFixed(6)
  : "0";

// 计算价格影响（简化版）
const priceImpact =
  reserves && amountIn
    ? (
        (parseFloat(amountIn) /
          (Number((reserves as bigint[])[tokenIn === "TKA" ? 0 : 1]) / 1e18)) *
        100
      ).toFixed(2)
    : "0";
```

**逐行说明：**

- `minAmountOut`: 考虑滑点后的最小输出金额
  - `1 - slippage / 100`: 计算保留比例，如0.5%滑点对应99.5%
  - `toFixed(6)`: 保留6位小数
- `priceImpact`: 交易对价格的影响程度
  - `reserves as bigint[]`: 类型断言，将reserves转为bigint数组
  - `tokenIn === 'TKA' ? 0 : 1`: 根据输入代币选择对应的储备量
  - `/ 1e18`: 将wei转为ETH单位
  - `* 100`: 转为百分比

### 12. 滑点处理

```typescript
// 滑点预设值
const slippagePresets: number[] = [0.1, 0.5, 1.0];

/**
 * 选择滑点预设值
 */
const handleSlippagePreset = (value: number): void => {
  setSlippage(value);
  setCustomSlippage("");
};

/**
 * 处理自定义滑点输入
 */
const handleCustomSlippage = (value: string): void => {
  setCustomSlippage(value);
  const numValue = parseFloat(value);
  if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
    setSlippage(numValue);
  }
};
```

**逐行说明：**

- `slippagePresets`: 预设滑点值数组
- `handleSlippagePreset`: 点击预设按钮时的处理
  - `setSlippage(value)`: 设置滑点值
  - `setCustomSlippage('')`: 清空自定义输入
- `handleCustomSlippage`: 自定义滑点输入处理
  - `parseFloat(value)`: 将字符串转为数字
  - `!isNaN(numValue)`: 检查是否为有效数字
  - `numValue >= 0 && numValue <= 50`: 限制范围在0-50%

---

## 关键方法详解

### getQuote (报价计算)

**用途**：计算代币兑换的输出金额

**逻辑流程**：

1. 检查输入金额是否有效
2. 优先使用链上合约返回的报价
3. 链上失败时回退到模拟计算（固定汇率1:1.5）
4. 设置对应的模式标记

**关键点**：

- 使用防抖避免频繁调用
- 区分真实报价和模拟报价

### handleSwap (执行兑换)

**用途**：触发智能合约执行代币兑换

**前置条件**：

- 合约地址存在
- 代币地址存在
- 有输入金额

**执行流程**：

1. 检查前置条件
2. 转换金额为wei单位
3. 调用合约swap函数
4. 等待交易确认

### switchTokens (切换代币)

**用途**：交换输入和输出代币

**数据变化**：
| 变量 | 变化前 | 变化后 |
|------|--------|--------|
| tokenIn | TKA | TKB |
| tokenOut | TKB | TKA |
| amountIn | 1 | 1.5 |
| amountOut | 1.5 | '' |

---

## 注意事项

1. **金额精度**：所有链上交互使用wei单位，UI显示使用ether单位
2. **错误处理**：链上调用失败时自动回退到模拟模式
3. **性能优化**：使用useMemo缓存代币数据，useEffect防抖报价计算
4. **安全性**：滑点保护防止三明治攻击
5. **用户体验**：显示价格影响警告，交易状态反馈

---

## 滑点详解

### 什么是滑点？

**滑点 (Slippage)** 是指交易的实际执行价格与用户下单时看到的价格之间的差异。在去中心化交易所 (DEX) 中，滑点主要由以下因素造成：

1. **价格波动**：交易执行前，其他用户的交易改变了流动性池的储备比例
2. **流动性深度**：小额流动性池更容易因单笔交易产生大幅价格变动
3. **三明治攻击**：恶意矿工或套利者在用户交易前后插入交易，操纵价格

### 滑点计算公式

```
最小输出金额 = 预期输出金额 × (1 - 滑点百分比)

例如：
- 预期输出：1000 USDC
- 滑点设置：0.5%
- 最小输出 = 1000 × (1 - 0.005) = 995 USDC
```

### 代码实现

```typescript
// 计算最小输出金额（考虑滑点）
const minAmountOut = amountOut
  ? (parseFloat(amountOut) * (1 - slippage / 100)).toFixed(6)
  : "0";
```

### 滑点设置流程

```
┌─────────────────────────────────────────────────────────────┐
│                       滑点设置流程                           │
└─────────────────────────────────────────────────────────────┘

用户点击设置按钮
        │
        ▼
┌─────────────────┐
│ 显示设置弹窗     │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ 选择预设滑点 (0.1%, 0.5%, 1.0%)          │
│ 或输入自定义滑点                          │
└────────┬─────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  预设滑点   自定义滑点
    │         │
    ▼         ▼
┌────────┐ ┌─────────────────┐
│直接应用 │ │ 验证范围 0-50%  │
└────┬───┘ └────────┬────────┘
     │              │
     └──────┬───────┘
            ▼
    ┌───────────────┐
    │ 更新 slippage │
    │ 状态变量      │
    └───────┬───────┘
            ▼
    ┌───────────────┐
    │ 重新计算      │
    │ minAmountOut  │
    └───────────────┘
```

### 滑点保护机制

#### 1. 交易执行时的保护

```typescript
// 执行兑换时传入最小输出金额
swap({
  address: swapAddress,
  abi: SWAP_ABI,
  functionName: "swap",
  args: [
    tokenInData.address,
    amountInWei,
    minAmountOutWei, // 滑点保护参数
  ],
});
```

#### 2. 智能合约层面的保护

智能合约在执行交易时会检查：

```solidity
require(amountOut >= minAmountOut, "INSUFFICIENT_OUTPUT_AMOUNT");
```

如果实际输出金额小于用户设置的最小值，交易将回滚。

### 滑点设置建议

| 场景              | 建议滑点    | 原因                     |
| ----------------- | ----------- | ------------------------ |
| 主流代币/高流动性 | 0.1% - 0.5% | 价格波动小，套利者多     |
| 小众代币/低流动性 | 1% - 3%     | 价格波动大，需要更大容差 |
| 大额交易          | 0.5% - 1%   | 本身对价格影响大         |
| 网络拥堵时        | 适当提高    | 交易可能延迟执行         |

### 滑点过高或过低的风险

#### 滑点过低的风险：

- **交易频繁失败**：价格波动导致实际输出低于预期
- **用户体验差**：需要多次尝试才能成功交易

#### 滑点过高的风险：

- **三明治攻击**：攻击者看到高滑点设置，进行夹心套利
  ```
  攻击者前序交易 → 推高价格
         ↓
  用户交易（接受高价）
         ↓
  攻击者后续交易 → 价格回落，获利
  ```
- **资金损失**：以不利价格成交

### 前端滑点UI实现

```typescript
// 滑点预设值
const slippagePresets: number[] = [0.1, 0.5, 1.0];

// 选择滑点预设值
const handleSlippagePreset = (value: number): void => {
  setSlippage(value);
  setCustomSlippage("");
};

// 处理自定义滑点输入（限制 0-50%）
const handleCustomSlippage = (value: string): void => {
  setCustomSlippage(value);
  const numValue = parseFloat(value);
  if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
    setSlippage(numValue);
  }
};
```

### 价格影响与滑点的关系

```
价格影响：交易本身对价格的影响程度
滑点：可接受的价格变动范围

关系：
价格影响 > 滑点 → 交易可能失败或不利
价格影响 < 滑点 → 交易可以正常执行

示例：
- 价格影响：0.3%
- 滑点设置：0.5%
- 结果：交易可以执行，有 0.2% 的安全缓冲
```

### 最佳实践

1. **显示价格影响警告**
   - 价格影响 > 1%：黄色警告
   - 价格影响 > 5%：红色警告
   - 价格影响 > 10%：阻止交易

2. **智能滑点推荐**

   ```typescript
   const recommendedSlippage = Math.max(0.5, priceImpact * 2);
   ```

3. **交易确认前显示详细信息**
   - 预期输出
   - 最小输出（考虑滑点）
   - 价格影响百分比
   - 滑点容差

---

## 相关文件

- `lib/abis/swap.ts` - Swap合约ABI定义
- `lib/constants/addresses.ts` - 合约地址配置
- `components/ApproveButton.tsx` - 授权按钮组件
- `lib/utils/units.ts` - 金额转换工具函数
