/**
 * Farm 流动性挖矿合约 ABI
 * 支持多池子质押挖矿，用户质押 LP 代币获得奖励代币
 */

export const FARM_ABI = [
  // ===== 核心功能函数 =====
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pid", type: "uint256" },      // 池子 ID
      { name: "amount", type: "uint256" },   // 质押数量
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pid", type: "uint256" },      // 池子 ID
      { name: "amount", type: "uint256" },   // 解除质押数量
    ],
    outputs: [],
  },
  {
    name: "harvest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "pid", type: "uint256" }],  // 池子 ID
    outputs: [],
  },

  // ===== 查询函数 =====
  {
    name: "poolLength",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],  // 池子总数
  },
  {
    name: "poolInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],   // 池子 ID
    outputs: [
      { name: "lpToken", type: "address" },         // LP 代币地址
      { name: "allocPoint", type: "uint256" },      // 分配点数（权重）
      { name: "lastRewardTime", type: "uint256" },  // 最后奖励时间
      { name: "accRewardPerShare", type: "uint256" }, // 累计每股奖励
    ],
  },
  {
    name: "userInfo",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },  // 池子 ID
      { name: "", type: "address" },  // 用户地址
    ],
    outputs: [
      { name: "amount", type: "uint256" },      // 用户质押数量
      { name: "rewardDebt", type: "uint256" },  // 奖励债务（用于计算）
    ],
  },
  {
    name: "pendingReward",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "pid", type: "uint256" },   // 池子 ID
      { name: "user", type: "address" },  // 用户地址
    ],
    outputs: [{ name: "", type: "uint256" }],  // 待领取奖励数量
  },
  {
    name: "rewardPerSecond",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],  // 每秒奖励数量
  },
  {
    name: "totalAllocPoint",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],  // 总分配点数
  },
] as const;
