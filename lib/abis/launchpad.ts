/**
 * LaunchPad 合约 ABI
 * 
 * 功能说明：
 * LaunchPad 合约用于管理代币销售项目，支持：
 * 1. 项目创建和管理
 * 2. 用户购买代币
 * 3. 销售进度追踪
 * 4. 时间控制和额度限制
 * 
 * 主要方法：
 * - getProjectInfo: 获取项目详细信息
 * - getUserPurchase: 获取用户购买记录
 * - purchase: 购买代币
 * - claim: 领取购买的代币
 * - projectCount: 获取项目总数
 * - owner: 获取合约所有者
 */

export const LAUNCHPAD_ABI = [
  // ===== 视图函数（只读）=====
  
  /**
   * 获取项目总数
   * @returns 项目数量
   */
  {
    inputs: [],
    name: "projectCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  
  /**
   * 获取项目详细信息
   * @param projectId - 项目ID
   * @returns 项目信息结构体
   */
  {
    inputs: [
      {
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
    ],
    name: "getProjectInfo",
    outputs: [
      {
        components: [
          {
            internalType: "string",
            name: "name",
            type: "string",
          },
          {
            internalType: "string",
            name: "description",
            type: "string",
          },
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "address",
            name: "paymentToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "tokenPrice",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "totalSupply",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "soldAmount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "startTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "endTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "minPurchase",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "maxPurchase",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "active",
            type: "bool",
          },
        ],
        internalType: "struct LaunchPad.Project",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  
  /**
   * 获取用户购买记录
   * @param projectId - 项目ID
   * @param user - 用户地址
   * @returns 购买数量和是否已领取
   */
  {
    inputs: [
      {
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserPurchase",
    outputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "claimed",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  
  /**
   * 获取合约所有者
   * @returns 所有者地址
   */
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  
  // ===== 写入函数 =====
  
  /**
   * 购买代币
   * @param projectId - 项目ID
   * @param tokenAmount - 购买的代币数量
   */
  {
    inputs: [
      {
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "tokenAmount",
        type: "uint256",
      },
    ],
    name: "purchase",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  
  /**
   * 领取购买的代币
   * @param projectId - 项目ID
   */
  {
    inputs: [
      {
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  
  // ===== 事件 =====
  
  /**
   * 项目创建事件
   */
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        indexed: false,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
    ],
    name: "ProjectCreated",
    type: "event",
  },
  
  /**
   * 购买事件
   */
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "tokenAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "paymentAmount",
        type: "uint256",
      },
    ],
    name: "Purchased",
    type: "event",
  },
  
  /**
   * 领取事件
   */
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "claimer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Claimed",
    type: "event",
  },
] as const;
