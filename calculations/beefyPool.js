const { ethers } = require('ethers');

const { DEFAULT_SCALE_FACTOR_BN, beefyPoolAbi, tokenMapping } = require('../config');
const { fetchCoinGeckoPriceBN } = require('../services/coingecko');
const { getFourPoolAssetPrice, isFourPool } = require('./fourPool');

async function getBeefyPoolAssetPrice(poolAddress, provider) {
  const beefyPoolContract = new ethers.Contract(poolAddress, beefyPoolAbi, provider);
  const pricePerFullShareBN = await beefyPoolContract.getPricePerFullShare();
  const underlyingAddress = await beefyPoolContract.want();
  
  let underlyingPriceBN;
  if (await isFourPool(underlyingAddress, provider)) {
    underlyingPriceBN = await getFourPoolAssetPrice(underlyingAddress, provider);
  } else {
    // Otherwise, assume it's a regular ERC20
    // Support more pool types
    const coinId = tokenMapping[underlyingAddress.toLowerCase()];
    if (!coinId) {
      throw new Error(`Token mapping not found for coin at address ${underlyingAddress.toLowerCase()}`);
    }
    underlyingPriceBN = await fetchCoinGeckoPriceBN(coinId);
  }
  
  return (pricePerFullShareBN * underlyingPriceBN) / DEFAULT_SCALE_FACTOR_BN;
}

module.exports = { getBeefyPoolAssetPrice };
