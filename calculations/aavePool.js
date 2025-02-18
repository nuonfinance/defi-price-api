const { ethers } = require('ethers');

const { RAY_BN, aavePoolAbi, tokenMapping } = require('../config');
const { fetchCoinGeckoPriceBN } = require('../services/coingecko');

async function getAAVEPoolAssetPrice(poolAddress, reserveAddress, provider) {
  const aavePoolContract = new ethers.Contract(poolAddress, aavePoolAbi, provider);
  const liquidityIndexBN = await aavePoolContract.getReserveNormalizedIncome(reserveAddress);
  
  const coinId = tokenMapping[reserveAddress.toLowerCase()];
  if (!coinId) {
    throw new Error(`Token mapping not found for coin at address ${reserveAddress.toLowerCase()}`);
  }
  const reservePriceBN = await fetchCoinGeckoPriceBN(coinId);
  
  return (reservePriceBN * liquidityIndexBN) / RAY_BN;
}

module.exports = { getAAVEPoolAssetPrice };
