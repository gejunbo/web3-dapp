/**
 * 简单的 Anvil 模拟服务器
 * 用于本地开发测试，模拟以太坊 JSON-RPC 接口
 */

// eslint-disable-next-line
const http = require("http");

// 模拟账户（10个测试账户，每个有 10000 ETH）
const accounts = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    balance: "0x21e19e0c9bab2400000", // 10000 ETH in wei
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    balance: "0x21e19e0c9bab2400000",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    balance: "0x21e19e0c9bab2400000",
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey:
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    balance: "0x21e19e0c9bab2400000",
  },
  {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey:
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f27c8cc57bf3d",
    balance: "0x21e19e0c9bab2400000",
  },
  {
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    privateKey:
      "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    balance: "0x21e19e0c9bab2400000",
  },
  {
    address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    privateKey:
      "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    balance: "0x21e19e0c9bab2400000",
  },
  {
    address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    privateKey:
      "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    balance: "0x21e19e0c9bab2400000",
  },
  {
    address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    privateKey:
      "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    balance: "0x21e19e0c9bab2400000",
  },
  {
    address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    privateKey:
      "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
    balance: "0x21e19e0c9bab2400000",
  },
];

let blockNumber = 1;
let chainId = "0x7a69"; // 31337 in hex

const server = http.createServer((req, res) => {
  // 设置 CORS 头
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      const { method, params, id } = JSON.parse(body);
      let result = null;
      let error = null;

      switch (method) {
        case "eth_chainId":
          result = chainId;
          break;

        case "eth_blockNumber":
          result = "0x" + blockNumber.toString(16);
          break;

        case "eth_accounts":
          result = accounts.map((a) => a.address);
          break;

        case "eth_getBalance":
          const [address] = params;
          const account = accounts.find(
            (a) => a.address.toLowerCase() === address.toLowerCase(),
          );
          result = account ? account.balance : "0x0";
          break;

        case "eth_getCode":
          result = "0x"; // 空合约代码
          break;

        case "eth_getTransactionCount":
          result = "0x0";
          break;

        case "eth_call":
          result = "0x";
          break;

        case "eth_estimateGas":
          result = "0x5208"; // 21000 gas
          break;

        case "eth_gasPrice":
          result = "0x1";
          break;

        case "eth_sendTransaction":
        case "eth_sendRawTransaction":
          // 模拟交易发送，返回一个随机的交易哈希
          result =
            "0x" +
            Array(64)
              .fill(0)
              .map(() => Math.floor(Math.random() * 16).toString(16))
              .join("");
          blockNumber++;
          console.log(`Transaction sent: ${result}`);
          break;

        case "eth_getTransactionReceipt":
          // 模拟交易回执
          result = {
            transactionHash: params[0],
            transactionIndex: "0x0",
            blockHash:
              "0x" +
              Array(64)
                .fill(0)
                .map(() => Math.floor(Math.random() * 16).toString(16))
                .join(""),
            blockNumber: "0x" + blockNumber.toString(16),
            from: accounts[0].address,
            to: accounts[1].address,
            cumulativeGasUsed: "0x5208",
            gasUsed: "0x5208",
            contractAddress: null,
            logs: [],
            logsBloom: "0x" + Array(512).fill(0).join(""),
            status: "0x1",
          };
          break;

        case "net_version":
          result = "31337";
          break;

        case "eth_syncing":
          result = false;
          break;

        case "eth_mining":
          result = false;
          break;

        case "eth_hashrate":
          result = "0x0";
          break;

        case "web3_clientVersion":
          result = "anvil/v0.1.0";
          break;

        default:
          error = {
            code: -32601,
            message: `Method ${method} not found`,
          };
      }

      const response = {
        jsonrpc: "2.0",
        id: id || null,
      };

      if (error) {
        response.error = error;
      } else {
        response.result = result;
      }

      res.writeHead(200);
      res.end(JSON.stringify(response));
    } catch (error) {
      console.error("Error processing request:", error);
      res.writeHead(400);
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error",
          },
        }),
      );
    }
  });
});

const PORT = 8545;
const HOST = "127.0.0.1";

server.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    Anvil 模拟服务器已启动                     ║
╠══════════════════════════════════════════════════════════════╣
║  RPC URL: http://${HOST}:${PORT}                            ║
║  Chain ID: 31337                                             ║
╠══════════════════════════════════════════════════════════════╣
║  可用账户 (每个账户有 10000 ETH):                            ║
╠══════════════════════════════════════════════════════════════╣
`);
  accounts.forEach((acc, i) => {
    console.log(`  (${i}) ${acc.address}`);
  });
  console.log(`
╠══════════════════════════════════════════════════════════════╣
║  私钥 (用于导入 MetaMask):                                   ║
╠══════════════════════════════════════════════════════════════╣
  (0) ${accounts[0].privateKey}
╚══════════════════════════════════════════════════════════════╝
`);
});

// 优雅关闭
process.on("SIGINT", () => {
  console.log("\n正在关闭服务器...");
  server.close(() => {
    console.log("服务器已关闭");
    process.exit(0);
  });
});
