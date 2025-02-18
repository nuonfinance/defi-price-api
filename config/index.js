const { ethers } = require('ethers');
require('dotenv').config();

const sourceProvider = new ethers.JsonRpcProvider(process.env.SOURCE_RPC_URL);
const targetProvider = new ethers.JsonRpcProvider(process.env.TARGET_RPC_URL);

const PORT = process.env.PORT || 3000;
const MAX_BPS_BN = BigInt(10_000);
const RAY_BN = BigInt(1e27);
const DEFAULT_SCALE = 18;
const DEFAULT_SCALE_FACTOR_BN = BigInt(10 ** DEFAULT_SCALE);

// Minimal ABIs:
const aavePoolAbi = [
  "function getReserveNormalizedIncome(address asset) view returns (uint256)"
]

const beefyPoolAbi = [
  "function getPricePerFullShare() view returns (uint256)",
  "function want() view returns (address)",
  "function decimals() view returns (uint256)"
];

const fourPoolAbi = [
  "function get_virtual_price() view returns (uint256)",
  "function coins(uint256) view returns (address)",
  "function get_balances() view returns (uint256[4])"
];

const uniswapV2Abi = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function totalSupply() view returns (uint256)"
];

const iporVaultAbi = [
  "function asset() view returns (address)",
  "function convertToAssets(uint256 shares) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

const erc20Abi = [
  "function decimals() view returns (uint256)"
];

const aggregatorAbi = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRoundOut)"
];

// Token mapping for CoinGecko:
const baseTokenMapping = {
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "usd-coin",
  "0x417ac0e078398c154edfadd9ef675d30be60af93": "crvusd",
  "0xeb466342c4d449bc9f53a865d5cb90586f405215": "axlusdc",
  "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": "bridged-usd-coin-base",
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": "dai",
};

const sepoliaTokenMapping = {
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "usd-coin",
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "tether",
  "0x6b175474e89094c44da98b954eedeac495271d0f": "dai",
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "weth",
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "wrapped-bitcoin"
};

const tokenMapping = {
  ...baseTokenMapping,
  ...sepoliaTokenMapping
};

module.exports = {
  PORT,
  MAX_BPS_BN,
  RAY_BN,
  DEFAULT_SCALE,
  DEFAULT_SCALE_FACTOR_BN,
  sourceProvider,
  targetProvider,
  aavePoolAbi,
  beefyPoolAbi,
  fourPoolAbi,
  uniswapV2Abi,
  iporVaultAbi,
  erc20Abi,
  aggregatorAbi,
  tokenMapping,
};
