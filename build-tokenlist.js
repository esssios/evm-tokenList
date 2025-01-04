/**
 * build-tokenlist.js
 *
 * 多链兼容示例脚本：从 CoinGecko（或其他数据源）拉取指定链上的代币信息，
 * 生成符合 Uniswap Token List 规范的 JSON 文件。
 */

const fs = require("fs");
const axios = require("axios");

// 测试

// 1. 针对不同 EVM 链的基础配置
//    - chainId: 唯一的网络标识
//    - coingeckoPlatform: 在 CoinGecko 上对应的 "platform" 参数值（可在 CG 的 API docs 或 coins/list 接口中获取）
//    - name: Token List 的默认名称
//    - decimals: 大部分代币默认 18，如果有特别案例需单独处理
const CHAIN_CONFIG = {
  // Base 主网
  base: {
    chainId: 8453,
    coingeckoPlatform: "base",
    name: "Base Token List",
    decimals: 18,
  },
  // BNB Smart Chain
  bsc: {
    chainId: 56,
    coingeckoPlatform: "binance-smart-chain",
    name: "BSC Token List",
    decimals: 18,
  },
  // 以太坊主网
  ethereum: {
    chainId: 1,
    coingeckoPlatform: "ethereum",
    name: "Ethereum Token List",
    decimals: 18,
  },
  // Polygon (PoS)
  polygon: {
    chainId: 137,
    coingeckoPlatform: "polygon-pos",
    name: "Polygon Token List",
    decimals: 18,
  },
  // 你可以在此处继续添加更多 EVM 链配置...
};

/**
 * 2. 根据命令行参数获取要处理的链 key
 *    示例： node build-tokenlist.js base
 */
const chainKey = process.argv[2] || "base"; // 若不传参，默认为 'base'

/**
 * 若配置中不存在该 chainKey，则提示错误并退出
 */
if (!CHAIN_CONFIG[chainKey]) {
  console.error(`Unsupported chain key: ${chainKey}. Please check CHAIN_CONFIG.`);
  process.exit(1);
}

// 3. 定义要生成的 Token List 规范的基础结构
function createTokenListBase(chainCfg) {
  return {
    name: chainCfg.name,
    logoURI: "https://example.com/logo.png",
    keywords: [chainKey, "tokenlist"],
    timestamp: new Date().toISOString(),
    version: {
      major: 1,
      minor: 0,
      patch: 0,
    },
    tokens: [],
  };
}

/**
 * 4. 拉取指定链在 CoinGecko 的代币数据
 *    https://api.coingecko.com/api/v3/coins/list?platform=<coingeckoPlatform>
 */
async function fetchTokensFromCoinGecko(platform) {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/list?platform=${platform}`;
    const { data } = await axios.get(url);
    return data;
  } catch (err) {
    console.error("抓取 CoinGecko 数据失败:", err.message);
    return [];
  }
}

/**
 * 5. 将 CoinGecko 返回的数据转换为 Token List 的 tokens 数组
 */
function transformCoinGeckoData(geckoData, chainCfg) {
  const tokens = [];
  for (let item of geckoData) {
    // item 示例：
    // {
    //   id: 'mytoken',
    //   symbol: 'myt',
    //   name: 'MyToken',
    //   platforms: { [chainCfg.coingeckoPlatform]: '0xabc123...' }
    // }
    const address = item.platforms?.[chainCfg.coingeckoPlatform];
    if (!address) continue; // 如果没有对应链的合约地址，则跳过

    tokens.push({
      chainId: chainCfg.chainId,
      address: address, // 合约地址
      name: item.name,
      symbol: item.symbol?.toUpperCase() || "", // 规范化 symbol
      decimals: chainCfg.decimals, // 大多数 ERC-20 默认 18；若需区分，可改为更灵活的逻辑
      logoURI: "", // 可酌情设置 logo
    });
  }
  return tokens;
}

/**
 * 6. 主流程：构建 Token List
 */
async function buildTokenList() {
  // 6.1 获取当前链配置
  const chainCfg = CHAIN_CONFIG[chainKey];

  // 6.2 初始化 TokenList 结构
  const tokenListBase = createTokenListBase(chainCfg);

  // 6.3 拉取该链的代币数据
  const geckoData = await fetchTokensFromCoinGecko(chainCfg.coingeckoPlatform);

  // 6.4 转换为 TokenList 格式
  const tokenItems = transformCoinGeckoData(geckoData, chainCfg);

  // 6.5 整合到 tokenListBase
  tokenListBase.timestamp = new Date().toISOString();
  tokenListBase.tokens = tokenItems;

  // 6.6 写出到本地文件
  const outputFileName = `${chainKey}-tokenlist.json`;
  fs.writeFileSync(outputFileName, JSON.stringify(tokenListBase, null, 2));

  console.log(`Token List for [${chainKey}] 构建完成, 文件已生成: ${outputFileName}`);
}

// 入口函数
buildTokenList();


// gitHub 合并测试
