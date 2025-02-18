const { ethers } = require('ethers');

const {
  DEFAULT_SCALE,
  DEFAULT_SCALE_FACTOR_BN,
  uniswapV2Abi,
  tokenMapping, erc20Abi
} = require('../config');
const { fetchCoinGeckoPriceBN } = require('../services/coingecko');

async function getUniV2PoolAssetPrice(poolAddress, provider) {
  const pairContract = new ethers.Contract(poolAddress, uniswapV2Abi, provider);
  
  const token0Address = await pairContract.token0();
  const token1Address = await pairContract.token1();
  
  const coinId0 = tokenMapping[token0Address.toLowerCase()];
  const coinId1 = tokenMapping[token1Address.toLowerCase()];
  if (!coinId0) {
    throw new Error(`Token mapping not found for coin at address ${token0Address.toLowerCase()}`);
  }
  if (!coinId1) {
    throw new Error(`Token mapping not found for coin at address ${token1Address.toLowerCase()}`);
  }
  
  const price0 = await fetchCoinGeckoPriceBN(coinId0);
  const price1 = await fetchCoinGeckoPriceBN(coinId1);
  
  const [reserve0, reserve1] = await pairContract.getReserves();
  const totalSupply = await pairContract.totalSupply();
  
  const decimals0 = await (new ethers.Contract(token0Address, erc20Abi, provider)).decimals();
  const decimals1 = await (new ethers.Contract(token1Address, erc20Abi, provider)).decimals();
  
  const scaleFactor0 = BigInt(10 ** (DEFAULT_SCALE - Number(decimals0)));
  const scaleFactor1 = BigInt(10 ** (DEFAULT_SCALE - Number(decimals1)));
  
  const reserveScaled0 = reserve0 * scaleFactor0;
  const reserveScaled1 = reserve1 * scaleFactor1;
  
  const totalValue = reserveScaled0 * price0 + reserveScaled1 * price1;
  return totalValue / totalSupply;
}

module.exports = { getUniV2PoolAssetPrice };
