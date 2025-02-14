// server.js

const express = require('express');
const { ethers } = require('ethers');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// RAY is 1e27 in Aave.
const RAY = 1e27;
const scale = BigInt(1e18);

const sourceProvider = new ethers.JsonRpcProvider(process.env.SOURCE_RPC_URL);
const targetProvider = new ethers.JsonRpcProvider(process.env.TARGET_RPC_URL);

// Minimal ABI for Harvest Pool
const harvestPoolAbi = [
  "function getPricePerFullShare() view returns (uint256)",
  "function underlying() view returns (address)",
  "function decimals() view returns (uint256)"
];

// Minimal ABI for Uniswap V2 Pair ABI
const uniswapPairAbi = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function totalSupply() external view returns (uint256)"
];

// Minimal ABI for AggregatorV3Interface
const aggregatorAbi = [
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRoundOut)"
];

// Token Mapping for CoinGecko
const tokenMapping = {
  // Mapping token contract addresses (lowercased) to CoinGecko IDs
  // NOTE: Update it when necessary and restart the server
  // Sepolia
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "usd-coin",        // USDC
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "tether",          // USDT
  "0x6b175474e89094c44da98b954eedeac495271d0f": "dai",             // DAI
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "weth",            // WETH
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "wrapped-bitcoin",  // WBTC
  // Base
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "usd-coin",        // USDC
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": "dai",             // DAI
};

// Fetch latest round data from AggregatorV3Interface
async function fetchCurrentPrice(aggregatorAddress) {
  const priceFeed = new ethers.Contract(aggregatorAddress, aggregatorAbi, targetProvider);
  const roundData = await priceFeed.latestRoundData();
  
  return roundData.answer;
}

// Fetch Uniswap V2 Pair Data from The Graph
async function fetchUniswapPairData(pairAddress) {
  const graphApiKey = process.env.GRAPH_API_KEY;
  const uniswapV2SubgraphId = process.env.UNISWAP_SUBGRAPH_ID;
  
  const url = `https://gateway.thegraph.com/api/${graphApiKey}/subgraphs/id/${uniswapV2SubgraphId}`;
  const query = `
    {
      pair(id: "${pairAddress.toLowerCase()}") {
        id
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
        reserve0
        reserve1
        totalSupply
      }
    }
  `;
  try {
    const response = await axios.post(url, { query });
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    return response.data.data.pair;
  } catch (error) {
    throw new Error(`Error fetching pair data: ${error.message}`);
  }
}

// Fetch AAVE Reserve Data from The Graph
async function fetchAaveReserveData(underlyingAsset) {
  const graphApiKey = process.env.GRAPH_API_KEY;
  const aaveSubgraphId = process.env.AAVE_SUBGRAPH_ID;
  const url = `https://gateway.thegraph.com/api/${graphApiKey}/subgraphs/id/${aaveSubgraphId}`;
  const query = `
    {
      reserves(where: { underlyingAsset: "${underlyingAsset.toLowerCase()}" }) {
        id
        symbol
        liquidityIndex
      }
    }
  `;
  try {
    const response = await axios.post(url, { query });
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    const reserves = response.data.data.reserves;
    if (!reserves || reserves.length === 0) {
      throw new Error("No reserve found for the provided underlying asset");
    }
    return reserves[0]; // Use the first matching reserve.
  } catch (error) {
    throw new Error(`Error fetching Aave reserve data: ${error.message}`);
  }
}

// Fetch Token Prices from CoinGecko
async function fetchCoinGeckoPrice(coinId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
  try {
    const response = await axios.get(url);
    if (response.data[coinId] && response.data[coinId].usd) {
      return response.data[coinId].usd;
    } else {
      throw new Error(`No price data found for ${coinId}`);
    }
  } catch (error) {
    throw new Error(`Error fetching price for ${coinId}: ${error.message}`);
  }
}

// Compute LP Token Price
async function getLPTokenPrice(pairAddress) {
  const pairData = await fetchUniswapPairData(pairAddress);
  if (!pairData) {
    throw new Error("Pair data not found");
  }
  // Get token addresses and corresponding CoinGecko IDs.
  const token0Address = pairData.token0.id;
  const token1Address = pairData.token1.id;
  const coinId0 = tokenMapping[token0Address.toLowerCase()];
  const coinId1 = tokenMapping[token1Address.toLowerCase()];
  
  if (!coinId0 || !coinId1) {
    throw new Error("Token mapping not found for one or both tokens");
  }
  
  // Fetch USD prices.
  const price0 = await fetchCoinGeckoPrice(coinId0);
  const price1 = await fetchCoinGeckoPrice(coinId1);
  
  // Parse reserves and totalSupply as numbers.
  const reserve0 = parseFloat(pairData.reserve0);
  const reserve1 = parseFloat(pairData.reserve1);
  const totalSupply = parseFloat(pairData.totalSupply);
  
  // Calculate the total pool value in USD and then the LP token price.
  const totalValue = (reserve0 * price0) + (reserve1 * price1);
  return totalValue / totalSupply;
}

// [DO NOT USE]
async function getLPTokenPriceOnChain(pairAddress) {
  const pairContract = new ethers.Contract(pairAddress, uniswapPairAbi, sourceProvider);
  
  // Get token addresses and corresponding CoinGecko IDs.
  const token0Address = await pairContract.token0();
  const token1Address = await pairContract.token1();
  const coinId0 = tokenMapping[token0Address.toLowerCase()];
  const coinId1 = tokenMapping[token1Address.toLowerCase()];
  
  if (!coinId0 || !coinId1) {
    throw new Error("Token mapping not found for one or both tokens");
  }
  
  // Fetch USD prices.
  const price0 = BigInt(Math.floor(await fetchCoinGeckoPrice(coinId0) * 1e18));
  const price1 = BigInt(Math.floor(await fetchCoinGeckoPrice(coinId1) * 1e18));
  
  // Parse reserves and totalSupply as numbers.
  const [reserve0, reserve1, ] = await pairContract.getReserves();
  const totalSupply = await pairContract.totalSupply();
  
  // Calculate the total pool value in USD and then the LP token price.
  const totalValue = (reserve0 * price0 + reserve1 * price1) / scale;
  return Number(totalValue / totalSupply) / 1e18;
}

// Compute Harvest Pool asset price
async function getHarvestPoolAssetPrice(poolAddress) {
  const harvestPoolContract = new ethers.Contract(poolAddress, harvestPoolAbi, sourceProvider);
  const pricePerFullShareBN = await harvestPoolContract.getPricePerFullShare();
  const underlyingAddress = await harvestPoolContract.underlying();
  const decimals = await harvestPoolContract.decimals();
  
  const coinId = tokenMapping[underlyingAddress.toLowerCase()];
  if (!coinId) {
    throw new Error("Token mapping not found for underlying asset in Harvest Pool");
  }
  const underlyingPriceUSD = await fetchCoinGeckoPrice(coinId);
  
  const pricePerFullShare = parseFloat(pricePerFullShareBN.toString()) / (10 ** Number(decimals));
  // Asset price in USD: each share is worth (pricePerFullShare * underlyingPrice)
  return (pricePerFullShare * underlyingPriceUSD);
}

async function getAAVETokenPrice(reserveAddress) {
  const reserveData = await fetchAaveReserveData(reserveAddress);
  // Convert liquidityIndex (in RAY) to a number.
  const liquidityIndex = parseFloat(reserveData.liquidityIndex);

  const coinId = tokenMapping[reserveAddress.toLowerCase()];
  if (!coinId) {
    throw new Error("Token mapping not found for the provided reserve address");
  }
  const underlyingPrice = await fetchCoinGeckoPrice(coinId);
  
  return underlyingPrice * (liquidityIndex / RAY);
}

// API Endpoints

// Endpoint for fetching LP Token price
// Usage: GET /lpPrice?pairAddress=<uniswap_V2_pair_address>
app.get('/lpPrice', async (req, res) => {
  try {
    const { pairAddress } = req.query;
    if (!pairAddress) {
      return res.status(400).json({ error: "Missing 'pairAddress' query parameter" });
    }
    const lpPrice = await getLPTokenPrice(pairAddress);
    return res.json({ lpPrice });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint for fetching AAVE aToken price.
// Usage: GET /aavePrice?reserveAddress=<underlying_asset_address>
app.get('/aavePrice', async (req, res) => {
  try {
    const { reserveAddress } = req.query;
    if (!reserveAddress) {
      return res.status(400).json({ error: "Missing 'reserveAddress' query parameter" });
    }
    const aTokenPrice = await getAAVETokenPrice(reserveAddress);
    return res.json({
      aTokenPrice
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint for fetching Harvest Pool asset price.
// Usage: GET /harvestPrice?poolAddress=<harvest_pool_address>
app.get('/harvestPrice', async (req, res) => {
  try {
    const { poolAddress } = req.query;
    if (!poolAddress) {
      return res.status(400).json({ error: "Missing 'poolAddress' query parameter" });
    }
    const assetPrice = await getHarvestPoolAssetPrice(poolAddress);
    return res.json({
      assetPrice
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint for fetching a token price.
// Usage: GET /tokenPrice?tokenAddress=<token_address>
app.get('/tokenPrice', async (req, res) => {
  try {
    const { tokenAddress } = req.query;
    if (!tokenAddress) {
      return res.status(400).json({ error: "Missing 'tokenAddress' query parameter" });
    }
    const coinId = tokenMapping[tokenAddress.toLowerCase()];
    if (!coinId) {
      return res.status(400).json({ error: "Token mapping not found for the provided token address" });
    }
    const tokenPrice = await fetchCoinGeckoPrice(coinId);
    return res.json({
      tokenPrice
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint for a fake flat price
// Usage: GET /fakePrice/flat?aggregatorAddress=<address>
app.get("/fakePrice/flat", async (req, res) => {
  try {
    const { aggregatorAddress } = req.query;
    if (!aggregatorAddress) {
      return res.status(400).json({ error: "Missing 'aggregatorAddress' query parameter" });
    }
    const currentPrice = BigInt(await fetchCurrentPrice(aggregatorAddress));
    res.json({ price: Number(currentPrice) / 1e18 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint for a fake increasing price
// Query parameter: step in wei (optional, default = 1 gwei)
// Usage: GET /fakePrice/increase?aggregatorAddress=<address>&step=<step>
app.get("/fakePrice/increase", async (req, res) => {
  try {
    const { aggregatorAddress } = req.query;
    if (!aggregatorAddress) {
      return res.status(400).json({ error: "Missing 'aggregatorAddress' query parameter" });
    }
    const step = BigInt(req.query.step) || BigInt(1_000_000_000);
    const currentPrice = BigInt(await fetchCurrentPrice(aggregatorAddress));
    res.json({ price: Number(currentPrice + step) / 1e18 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint for a fake decreasing price
// Query parameter: step in wei (optional, default = 1 gwei)
// Usage: GET /fakePrice/decrease?aggregatorAddress=<address>&step=<step>
app.get("/fakePrice/decrease", async (req, res) => {
  try {
    const { aggregatorAddress } = req.query;
    if (!aggregatorAddress) {
      return res.status(400).json({ error: "Missing 'aggregatorAddress' query parameter" });
    }
    const step = BigInt(req.query.step) || BigInt(1_000_000_000);
    const currentPrice = BigInt(await fetchCurrentPrice(aggregatorAddress));
    res.json({ price: Math.max(0, Number(currentPrice - step) / 1e18) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint for a fake fluctuating price.
// Query parameter: range in BPS (optional, default = 1000 means +/-10% fluctuation)
// Usage: GET /fakePrice/fluctuating?aggregatorAddress=<address>&range=<range>
app.get("/fakePrice/fluctuating", async (req, res) => {
  try {
    const { aggregatorAddress } = req.query;
    if (!aggregatorAddress) {
      return res.status(400).json({ error: "Missing 'aggregatorAddress' query parameter" });
    }
    const range = Number(req.query.range) || 1000;
    const randomFactor = (Math.random() * 2 - 1) * (range / 10000); // -range% and +range%
    const currentPrice = BigInt(await fetchCurrentPrice(aggregatorAddress));
    res.json({ price: (Number(currentPrice) * (1 + randomFactor)) / 1e18 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Root endpoint indicating that the API is running
app.get('/', (req, res) => {
  res.send("DeFi Price API is running.");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
