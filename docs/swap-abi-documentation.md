# Swap 合约 ABI 详细技术文档

> **文件**: `lib/abis/swap.ts`  
> **用途**: 定义 DEX (去中心化交易所) Swap 合约的 ABI (Application Binary Interface)  
> **语言**: TypeScript  
> **更新时间**: 2026-03-08

---

## 📋 目录

1. [概述](#概述)
2. [ABI 架构设计](#abi-架构设计)
3. [数据流程图](#数据流程图)
4. [函数详解](#函数详解)
5. [事件详解](#事件详解)
6. [与 Wagmi 的集成](#与-wagmi-的集成)
7. [使用示例](#使用示例)
8. [安全注意事项](#安全注意事项)

---

## 概述

### 什么是 ABI？

ABI (Application Binary Interface) 是智能合约的接口定义，它描述了：
- 合约有哪些函数可以调用
- 每个函数的参数类型和返回值类型
- 合约定义了哪些事件
- 函数是只读 (view) 还是需要交易 (nonpayable/payable)

### 本文档目标

本文档详细解释 `lib/abis/swap.ts` 中的 ABI 定义，帮助开发者理解：
- 每个函数的作用和使用场景
- 参数和返回值的含义
- 如何在前端代码中正确使用这些 ABI
- 与 Wagmi 库的集成方式

---

## ABI 架构设计

### 整体结构

```
┌─────────────────────────────────────────────────────────────┐
│                    SWAP_ABI 结构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              交易类函数 (写入区块链)                  │   │
│  │  • swap()          - 执行代币交换                     │   │
│  │  • addLiquidity()  - 添加流动性                      │   │
│  │  • removeLiquidity() - 移除流动性                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              查询类函数 (只读调用)                    │   │
│  │  • getAmountOut()  - 计算输出金额                     │   │
│  │  • getReserves()   - 获取流动性池储备                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              事件定义 (日志监听)                      │   │
│  │  • Swapped         - 交换完成事件                     │   │
│  │  • LiquidityAdded  - 添加流动性事件                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 函数分类表

| 分类 | 函数名 | stateMutability | 用途 |
|------|--------|-----------------|------|
| **交易类** | `swap` | `nonpayable` | 执行代币交换，需要签名交易 |
| **交易类** | `addLiquidity` | `nonpayable` | 添加流动性，需要签名交易 |
| **交易类** | `removeLiquidity` | `nonpayable` | 移除流动性，需要签名交易 |
| **查询类** | `getAmountOut` | `view` | 计算可获得的输出金额，无需gas |
| **查询类** | `getReserves` | `view` | 获取流动性池储备量，无需gas |

---

## 数据流程图

### 代币交换完整流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         代币交换数据流程                                 │
└─────────────────────────────────────────────────────────────────────────┘

     用户操作                          前端处理                           区块链交互
        │                                 │                                  │
        │  1. 输入交换数量                 │                                  │
        │ ───────────────────────────────>│                                  │
        │                                 │                                  │
        │                                 │  2. 调用 getAmountOut()          │
        │                                 │ ────────────────────────────────>│
        │                                 │                                  │
        │                                 │  3. 返回预估输出金额              │
        │                                 │ <────────────────────────────────│
        │                                 │                                  │
        │  4. 显示预估结果                 │                                  │
        │ <───────────────────────────────│                                  │
        │                                 │                                  │
        │  5. 点击"交换"按钮               │                                  │
        │ ───────────────────────────────>│                                  │
        │                                 │                                  │
        │                                 │  6. 调用 swap() 函数             │
        │                                 │ ────────────────────────────────>│
        │                                 │                                  │
        │                                 │  7. 等待交易确认                  │
        │                                 │ <────────────────────────────────│
        │                                 │                                  │
        │  8. 显示成功/失败                │                                  │
        │ <───────────────────────────────│                                  │
        │                                 │                                  │
        ▼                                 ▼                                  ▼
```

### ABI 与前端组件交互图

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        ABI 与组件交互关系图                               │
└──────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   lib/abis/swap.ts  │
                    │    (ABI 定义文件)    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │  useReadContract │ │useWriteContract│ │  useWatchContractEvent │
    │   (读取数据)      │ │  (写入数据)   │ │    (监听事件)    │
    └────────┬────────┘ └──────┬──────┘ └────────┬────────┘
             │                 │                 │
             ▼                 ▼                 ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │  getAmountOut   │ │    swap     │ │  监听 Swapped   │
    │  getReserves    │ │addLiquidity │ │  事件更新UI      │
    │                 │ │removeLiquidity│ │                 │
    └─────────────────┘ └─────────────┘ └─────────────────┘
             │                 │                 │
             └────────────────┬─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   app/swap/page.tsx │
                    │    (Swap 页面组件)   │
                    └─────────────────────┘
```

---

## 函数详解

### 1. swap 函数

#### 函数定义

```typescript
{
  name: 'swap',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'amountIn', type: 'uint256' },      // 输入金额
    { name: 'amountOutMin', type: 'uint256' },  // 最小输出金额（滑点保护）
    { name: 'path', type: 'address[]' },        // 交换路径
    { name: 'to', type: 'address' },            // 接收地址
    { name: 'deadline', type: 'uint256' },      // 交易截止时间
  ],
  outputs: [
    { name: 'amounts', type: 'uint256[]' },     // 实际输出金额数组
  ],
}
```

#### 参数详解

| 参数名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `amountIn` | `uint256` | 输入的代币数量（wei单位） | `1000000000000000000` (1 ETH) |
| `amountOutMin` | `uint256` | 最小可接受的输出数量，用于滑点保护 | `990000000000000000` (0.99 ETH) |
| `path` | `address[]` | 交换路径，包含代币合约地址数组 | `[WETH, USDC]` |
| `to` | `address` | 接收输出代币的地址 | `0x1234...` |
| `deadline` | `uint256` | Unix时间戳，超过此时间交易失败 | `1709836800` |

#### 返回值详解

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `amounts` | `uint256[]` | 每一步交换的实际输出金额数组 |

#### 使用场景

```typescript
// 示例：将 1 WETH 交换为 USDC
const { writeContract } = useWriteContract();

await writeContract({
  address: SWAP_ROUTER_ADDRESS,
  abi: SWAP_ABI,
  functionName: 'swap',
  args: [
    BigInt('1000000000000000000'),           // amountIn: 1 WETH
    BigInt('2500000000'),                     // amountOutMin: 2500 USDC (假设)
    [WETH_ADDRESS, USDC_ADDRESS],             // path
    userAddress,                              // to
    BigInt(Math.floor(Date.now() / 1000) + 300), // deadline: 5分钟后
  ],
});
```

#### 关键实现逻辑

1. **滑点保护**: `amountOutMin` 确保即使价格波动，用户也能获得至少这个数量的代币
2. **路径交换**: `path` 支持多跳交换，如 WETH -> USDC -> DAI
3. **截止时间**: `deadline` 防止交易长时间pending导致不利执行
4. **非支付函数**: `nonpayable` 表示不需要发送ETH，但需要支付gas

---

### 2. getAmountOut 函数

#### 函数定义

```typescript
{
  name: 'getAmountOut',
  type: 'function',
  stateMutability: 'view',
  inputs: [
    { name: 'amountIn', type: 'uint256' },      // 输入金额
    { name: 'reserveIn', type: 'uint256' },     // 输入代币储备量
    { name: 'reserveOut', type: 'uint256' },    // 输出代币储备量
  ],
  outputs: [
    { name: 'amountOut', type: 'uint256' },     // 预估输出金额
  ],
}
```

#### 参数详解

| 参数名 | 类型 | 说明 | 计算方式 |
|--------|------|------|----------|
| `amountIn` | `uint256` | 用户想要输入的代币数量 | 用户输入 × 10^decimals |
| `reserveIn` | `uint256` | 流动性池中输入代币的储备量 | 通过 getReserves() 获取 |
| `reserveOut` | `uint256` | 流动性池中输出代币的储备量 | 通过 getReserves() 获取 |

#### 返回值详解

| 返回值 | 类型 | 说明 | 计算原理 |
|--------|------|------|----------|
| `amountOut` | `uint256` | 基于恒定乘积公式计算的输出金额 | `amountOut = (amountIn × 997 × reserveOut) / (reserveIn × 1000 + amountIn × 997)` |

#### 使用场景

```typescript
// 示例：获取交换预估金额
const { data: amountOut } = useReadContract({
  address: SWAP_ROUTER_ADDRESS,
  abi: SWAP_ABI,
  functionName: 'getAmountOut',
  args: [
    BigInt('1000000000000000000'),  // 输入 1 WETH
    BigInt('5000000000000000000'),  // WETH 储备 5 ETH
    BigInt('12500000000000'),       // USDC 储备 12500 USDC
  ],
  query: {
    enabled: !!reserveIn && !!reserveOut,
  },
});

// amountOut 将是预估获得的 USDC 数量
```

#### 关键实现逻辑

1. **恒定乘积公式**: 基于 `x × y = k` 的 AMM 模型
2. **0.3% 手续费**: 公式中的 997/1000 表示扣除 0.3% 交易手续费
3. **只读调用**: `view` 函数不需要 gas，可在链下自由调用
4. **价格影响**: 输入金额越大，价格滑点越大

---

### 3. getReserves 函数

#### 函数定义

```typescript
{
  name: 'getReserves',
  type: 'function',
  stateMutability: 'view',
  inputs: [
    { name: 'tokenA', type: 'address' },        // 代币A地址
    { name: 'tokenB', type: 'address' },        // 代币B地址
  ],
  outputs: [
    { name: 'reserveA', type: 'uint256' },      // 代币A储备量
    { name: 'reserveB', type: 'uint256' },      // 代币B储备量
    { name: 'blockTimestampLast', type: 'uint256' }, // 最后更新时间
  ],
}
```

#### 参数详解

| 参数名 | 类型 | 说明 |
|--------|------|------|
| `tokenA` | `address` | 流动性池中第一个代币的合约地址 |
| `tokenB` | `address` | 流动性池中第二个代币的合约地址 |

#### 返回值详解

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `reserveA` | `uint256` | 代币A在池中的储备数量 |
| `reserveB` | `uint256` | 代币B在池中的储备数量 |
| `blockTimestampLast` | `uint256` | 储备量最后更新的区块时间戳 |

#### 使用场景

```typescript
// 示例：获取 WETH/USDC 流动性池储备
const { data: reserves } = useReadContract({
  address: PAIR_ADDRESS,
  abi: SWAP_ABI,
  functionName: 'getReserves',
  args: [WETH_ADDRESS, USDC_ADDRESS],
});

if (reserves) {
  const [reserveWETH, reserveUSDC, lastUpdate] = reserves;
  console.log('WETH 储备:', formatEther(reserveWETH));
  console.log('USDC 储备:', formatUnits(reserveUSDC, 6));
}
```

#### 关键实现逻辑

1. **流动性池状态**: 反映当前交易对的深度和流动性
2. **价格计算**: `price = reserveA / reserveB` 可计算当前汇率
3. **无常损失监控**: LP 提供者可通过储备变化监控无常损失
4. **时间戳验证**: 用于确保价格预言机数据的时效性

---

### 4. addLiquidity 函数

#### 函数定义

```typescript
{
  name: 'addLiquidity',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'tokenA', type: 'address' },
    { name: 'tokenB', type: 'address' },
    { name: 'amountADesired', type: 'uint256' },
    { name: 'amountBDesired', type: 'uint256' },
    { name: 'amountAMin', type: 'uint256' },
    { name: 'amountBMin', type: 'uint256' },
    { name: 'to', type: 'address' },
    { name: 'deadline', type: 'uint256' },
  ],
  outputs: [
    { name: 'amountA', type: 'uint256' },
    { name: 'amountB', type: 'uint256' },
    { name: 'liquidity', type: 'uint256' },
  ],
}
```

#### 参数详解

| 参数名 | 类型 | 说明 |
|--------|------|------|
| `tokenA` | `address` | 第一个代币地址 |
| `tokenB` | `address` | 第二个代币地址 |
| `amountADesired` | `uint256` | 期望添加的代币A数量 |
| `amountBDesired` | `uint256` | 期望添加的代币B数量 |
| `amountAMin` | `uint256` | 可接受的最小代币A数量（滑点保护） |
| `amountBMin` | `uint256` | 可接受的最小代币B数量（滑点保护） |
| `to` | `address` | 接收 LP 代币的地址 |
| `deadline` | `uint256` | 交易截止时间 |

#### 返回值详解

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `amountA` | `uint256` | 实际添加的代币A数量 |
| `amountB` | `uint256` | 实际添加的代币B数量 |
| `liquidity` | `uint256` | 获得的 LP 代币数量 |

#### 使用场景

```typescript
// 示例：添加 WETH/USDC 流动性
await writeContract({
  address: ROUTER_ADDRESS,
  abi: SWAP_ABI,
  functionName: 'addLiquidity',
  args: [
    WETH_ADDRESS,
    USDC_ADDRESS,
    BigInt('1000000000000000000'),  // 1 WETH
    BigInt('2500000000'),            // 2500 USDC
    BigInt('990000000000000000'),    // 最小 0.99 WETH
    BigInt('2475000000'),            // 最小 2475 USDC
    userAddress,
    BigInt(Math.floor(Date.now() / 1000) + 300),
  ],
});
```

---

### 5. removeLiquidity 函数

#### 函数定义

```typescript
{
  name: 'removeLiquidity',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'tokenA', type: 'address' },
    { name: 'tokenB', type: 'address' },
    { name: 'liquidity', type: 'uint256' },
    { name: 'amountAMin', type: 'uint256' },
    { name: 'amountBMin', type: 'uint256' },
    { name: 'to', type: 'address' },
    { name: 'deadline', type: 'uint256' },
  ],
  outputs: [
    { name: 'amountA', type: 'uint256' },
    { name: 'amountB', type: 'uint256' },
  ],
}
```

#### 参数详解

| 参数名 | 类型 | 说明 |
|--------|------|------|
| `tokenA` | `address` | 第一个代币地址 |
| `tokenB` | `address` | 第二个代币地址 |
| `liquidity` | `uint256` | 要移除的 LP 代币数量 |
| `amountAMin` | `uint256` | 可接受的最小代币A数量 |
| `amountBMin` | `uint256` | 可接受的最小代币B数量 |
| `to` | `address` | 接收代币的地址 |
| `deadline` | `uint256` | 交易截止时间 |

#### 返回值详解

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `amountA` | `uint256` | 实际获得的代币A数量 |
| `amountB` | `uint256` | 实际获得的代币B数量 |

---

## 事件详解

### 事件架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      事件监听架构                                │
└─────────────────────────────────────────────────────────────────┘

    区块链交易
         │
         │ 执行 swap / addLiquidity
         ▼
    ┌─────────────────┐
    │  智能合约执行    │
    └────────┬────────┘
             │
             │ 触发事件
             ▼
    ┌─────────────────┐
    │   emit Event    │
    └────────┬────────┘
             │
             │ 写入日志
             ▼
    ┌─────────────────┐
             │
             │ 前端监听
             ▼
    ┌─────────────────────────────────────┐
    │      useWatchContractEvent          │
    │  ┌─────────────┐ ┌─────────────┐   │
    │  │  Swapped    │ │LiquidityAdded│   │
    │  │  事件处理   │ │  事件处理    │   │
    │  └─────────────┘ └─────────────┘   │
    └─────────────────────────────────────┘
             │
             ▼
    ┌─────────────────┐
    │    UI 更新      │
    │  (刷新余额等)    │
    └─────────────────┘
```

### 1. Swapped 事件

#### 事件定义

```typescript
{
  name: 'Swapped',
  type: 'event',
  inputs: [
    { name: 'sender', type: 'address', indexed: true },      // 发送者（可索引）
    { name: 'amountIn', type: 'uint256', indexed: false },   // 输入金额
    { name: 'amountOut', type: 'uint256', indexed: false },  // 输出金额
    { name: 'path', type: 'address[]', indexed: false },     // 交换路径
  ],
}
```

#### 参数详解

| 参数名 | 类型 | indexed | 说明 |
|--------|------|---------|------|
| `sender` | `address` | ✅ | 发起交换的用户地址，可索引用于过滤 |
| `amountIn` | `uint256` | ❌ | 实际输入的代币数量 |
| `amountOut` | `uint256` | ❌ | 实际输出的代币数量 |
| `path` | `address[]` | ❌ | 完整的交换路径 |

#### 监听示例

```typescript
import { useWatchContractEvent } from 'wagmi';

useWatchContractEvent({
  address: SWAP_ROUTER_ADDRESS,
  abi: SWAP_ABI,
  eventName: 'Swapped',
  onLogs: (logs) => {
    logs.forEach((log) => {
      const { sender, amountIn, amountOut, path } = log.args;
      console.log('交换完成:', {
        发送者: sender,
        输入: amountIn,
        输出: amountOut,
        路径: path,
      });
      // 触发 UI 刷新，如更新余额
      refetchBalances();
    });
  },
});
```

#### 使用场景

1. **交易确认通知**: 用户提交交换后，通过事件确认交易成功
2. **历史记录**: 记录用户的交换历史
3. **数据分析**: 统计交易量、价格走势等
4. **UI 同步**: 交易完成后自动刷新余额显示

---

### 2. LiquidityAdded 事件

#### 事件定义

```typescript
{
  name: 'LiquidityAdded',
  type: 'event',
  inputs: [
    { name: 'provider', type: 'address', indexed: true },    // 流动性提供者（可索引）
    { name: 'tokenA', type: 'address', indexed: false },     // 代币A地址
    { name: 'tokenB', type: 'address', indexed: false },     // 代币B地址
    { name: 'amountA', type: 'uint256', indexed: false },    // 代币A数量
    { name: 'amountB', type: 'uint256', indexed: false },    // 代币B数量
    { name: 'liquidity', type: 'uint256', indexed: false },  // LP代币数量
  ],
}
```

#### 参数详解

| 参数名 | 类型 | indexed | 说明 |
|--------|------|---------|------|
| `provider` | `address` | ✅ | 添加流动性的用户地址 |
| `tokenA` | `address` | ❌ | 代币A的合约地址 |
| `tokenB` | `address` | ❌ | 代币B的合约地址 |
| `amountA` | `uint256` | ❌ | 添加的代币A数量 |
| `amountB` | `uint256` | ❌ | 添加的代币B数量 |
| `liquidity` | `uint256` | ❌ | 铸造的LP代币数量 |

#### 监听示例

```typescript
useWatchContractEvent({
  address: ROUTER_ADDRESS,
  abi: SWAP_ABI,
  eventName: 'LiquidityAdded',
  onLogs: (logs) => {
    logs.forEach((log) => {
      const { provider, tokenA, tokenB, amountA, amountB, liquidity } = log.args;
      console.log('流动性添加成功:', {
        提供者: provider,
        代币对: `${tokenA}/${tokenB}`,
        数量A: amountA,
        数量B: amountB,
        LP代币: liquidity,
      });
    });
  },
});
```

---

## 与 Wagmi 的集成

### 集成架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Wagmi + ABI 集成架构                                │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────┐
    │                        React 应用层                              │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
    │  │  SwapPage   │  │ PoolPage    │  │ 其他页面                 │  │
    │  │  交换页面    │  │ 流动性页面   │  │                         │  │
    │  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
    └─────────┼────────────────┼─────────────────────┼────────────────┘
              │                │                     │
              ▼                ▼                     ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                        Wagmi Hooks 层                          │
    │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
    │  │ useReadContract │ │useWriteContract │ │useWatchContract │   │
    │  │   读取数据       │ │   写入数据       │ │   Event         │   │
    │  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘   │
    └───────────┼───────────────────┼───────────────────┼────────────┘
                │                   │                   │
                └───────────────────┼───────────────────┘
                                    │
                                    ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                        ABI 定义层                                │
    │                   lib/abis/swap.ts                              │
    │  ┌─────────────────────────────────────────────────────────┐   │
    │  │  const SWAP_ABI = [                                     │   │
    │  │    { name: 'swap', ... },                               │   │
    │  │    { name: 'getAmountOut', ... },                       │   │
    │  │    { name: 'getReserves', ... },                        │   │
    │  │    { name: 'Swapped', type: 'event', ... },             │   │
    │  │    ...                                                  │   │
    │  │  ];                                                     │   │
    │  └─────────────────────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                      以太坊网络层                                │
    │              Anvil (本地) / Sepolia (测试) / Mainnet            │
    └─────────────────────────────────────────────────────────────────┘
```

### Hook 使用对照表

| ABI 函数/事件 | Wagmi Hook | 用途 |
|--------------|------------|------|
| `getAmountOut` | `useReadContract` | 获取交换预估金额 |
| `getReserves` | `useReadContract` | 获取流动性池储备 |
| `swap` | `useWriteContract` | 执行代币交换交易 |
| `addLiquidity` | `useWriteContract` | 添加流动性 |
| `removeLiquidity` | `useWriteContract` | 移除流动性 |
| `Swapped` | `useWatchContractEvent` | 监听交换事件 |
| `LiquidityAdded` | `useWatchContractEvent` | 监听添加流动性事件 |

### 配置示例

```typescript
// lib/wagmiClient.ts
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

// 使用 ABI
import { SWAP_ABI } from './abis/swap';

// 读取示例
const { data: amountOut } = useReadContract({
  address: ROUTER_ADDRESS,
  abi: SWAP_ABI,
  functionName: 'getAmountOut',
  args: [amountIn, reserveIn, reserveOut],
});

// 写入示例
const { writeContract } = useWriteContract();
writeContract({
  address: ROUTER_ADDRESS,
  abi: SWAP_ABI,
  functionName: 'swap',
  args: [amountIn, amountOutMin, path, to, deadline],
});
```

---

## 使用示例

### 完整交换流程示例

```typescript
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import { SWAP_ABI } from '@/lib/abis/swap';
import { SWAP_ROUTER_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from '@/lib/constants/addresses';
import { parseEther, formatUnits } from 'viem';

function useSwap() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  // 1. 获取储备量
  const { data: reserves } = useReadContract({
    address: PAIR_ADDRESS,
    abi: SWAP_ABI,
    functionName: 'getReserves',
    args: [WETH_ADDRESS, USDC_ADDRESS],
  });

  // 2. 计算输出金额
  const { data: amountOut } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: SWAP_ABI,
    functionName: 'getAmountOut',
    args: reserves ? [
      parseEther('1'),      // 输入 1 WETH
      reserves[0],          // WETH 储备
      reserves[1],          // USDC 储备
    ] : undefined,
    query: {
      enabled: !!reserves,
    },
  });

  // 3. 监听交换事件
  useWatchContractEvent({
    address: ROUTER_ADDRESS,
    abi: SWAP_ABI,
    eventName: 'Swapped',
    onLogs: (logs) => {
      logs.forEach((log) => {
        console.log('交换成功:', log.args);
      });
    },
  });

  // 4. 执行交换
  const executeSwap = async (amountIn: bigint, minAmountOut: bigint) => {
    await writeContract({
      address: ROUTER_ADDRESS,
      abi: SWAP_ABI,
      functionName: 'swap',
      args: [
        amountIn,
        minAmountOut,
        [WETH_ADDRESS, USDC_ADDRESS],
        address!,
        BigInt(Math.floor(Date.now() / 1000) + 300),
      ],
    });
  };

  return {
    amountOut: amountOut ? formatUnits(amountOut, 6) : '0',
    executeSwap,
    isPending,
  };
}
```

---

## 安全注意事项

### 1. 滑点保护

```typescript
// 始终设置最小输出金额，防止三明治攻击
const slippage = 0.5; // 0.5% 滑点
const amountOutMin = (amountOut * BigInt(1000 - slippage * 10)) / BigInt(1000);
```

### 2. 截止时间

```typescript
// 设置合理的截止时间，防止交易长时间pending
const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5分钟
```

### 3. 代币授权

```typescript
// 在执行 swap 前，确保已获得代币授权
const { data: allowance } = useReadContract({
  address: TOKEN_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'allowance',
  args: [userAddress, ROUTER_ADDRESS],
});

// 如果 allowance < amountIn，先执行 approve
```

### 4. 输入验证

```typescript
// 验证输入参数
if (amountIn <= BigInt(0)) {
  throw new Error('输入金额必须大于0');
}

if (path.length < 2) {
  throw new Error('交换路径至少需要两个代币');
}
```

---

## 总结

### ABI 设计要点

| 要点 | 说明 |
|------|------|
| **函数分类清晰** | 交易函数 vs 查询函数分离，便于权限管理 |
| **事件索引优化** | 关键地址参数使用 `indexed`，提高查询效率 |
| **滑点保护** | 所有交易函数都包含最小输出参数 |
| **截止时间** | 防止交易无限期pending |

### 前端集成最佳实践

1. **使用 TypeScript**: 获得完整的类型提示和编译时检查
2. **错误处理**: 所有合约调用都要包裹 try-catch
3. **加载状态**: 交易pending时显示loading状态
4. **事件监听**: 使用事件监听替代轮询查询
5. **乐观更新**: UI 可以先更新，失败后再回滚

---

*文档结束*
