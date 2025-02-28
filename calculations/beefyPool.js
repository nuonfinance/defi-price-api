const { ethers } = require('ethers');

const { beefyPoolAbi, tokenMapping, erc20Abi, USDC_COIN_ID } = require('../config');
const { fetchCoinGeckoPriceBN } = require('../services/coingecko');
const { getFourPoolAssetPrice, isFourPool } = require('./fourPool');

async function getBeefyPoolAssetPrice(poolAddress, provider) {
  const beefyPoolContract = new ethers.Contract(poolAddress, beefyPoolAbi, provider);
  const pricePerFullShareBN = await beefyPoolContract.getPricePerFullShare();
  const underlyingAddress = (await beefyPoolContract.want()).toLowerCase();
  
  let underlyingPriceBN;
  if (await isFourPool(underlyingAddress, provider)) {
    underlyingPriceBN = await getFourPoolAssetPrice(underlyingAddress, provider);
  } else {
    // TODO: Support more pool types
    // Otherwise, assume it's a regular ERC20
    const erc20Contract = new ethers.Contract(underlyingAddress, erc20Abi, provider);
    const underlyingDecimals = await erc20Contract.decimals();
    const vaultDecimals = await beefyPoolContract.decimals();
    const scaleFactor = BigInt(10) ** BigInt(vaultDecimals - underlyingDecimals);
    
    const coinId = tokenMapping[underlyingAddress];
    if (!coinId) {
      throw new Error(`Token mapping not found for coin at address ${underlyingAddress}`);
    }
    underlyingPriceBN = (await fetchCoinGeckoPriceBN(coinId)) * scaleFactor;
  }
  
  const usdcPriceBN = await fetchCoinGeckoPriceBN(USDC_COIN_ID);
  
  return (pricePerFullShareBN * underlyingPriceBN) / usdcPriceBN;
}

module.exports = { getBeefyPoolAssetPrice };
