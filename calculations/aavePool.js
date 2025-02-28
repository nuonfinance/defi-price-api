const { ethers } = require('ethers');

const { RAY_BN, aavePoolAbi, tokenMapping, USDC_COIN_ID, DEFAULT_SCALE_FACTOR_BN } = require('../config');
const { fetchCoinGeckoPriceBN } = require('../services/coingecko');

async function getAAVEPoolAssetPrice(poolAddress, reserveAddress, provider) {
  const aavePoolContract = new ethers.Contract(poolAddress, aavePoolAbi, provider);
  const liquidityIndexBN = await aavePoolContract.getReserveNormalizedIncome(reserveAddress);
  
  const coinId = tokenMapping[reserveAddress.toLowerCase()];
  if (!coinId) {
    throw new Error(`Token mapping not found for coin at address ${reserveAddress.toLowerCase()}`);
  }
  const reservePriceBN = await fetchCoinGeckoPriceBN(coinId);
  const usdcPriceBN = await fetchCoinGeckoPriceBN(USDC_COIN_ID);
  
  return (reservePriceBN * liquidityIndexBN * DEFAULT_SCALE_FACTOR_BN) / usdcPriceBN / RAY_BN;
}

module.exports = { getAAVEPoolAssetPrice };
