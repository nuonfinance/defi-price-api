const { ethers } = require('ethers');

const { iporVaultAbi, erc20Abi, tokenMapping, DEFAULT_SCALE, USDC_COIN_ID } = require('../config');
const { fetchCoinGeckoPriceBN } = require('../services/coingecko');

async function getIPORVaultAssetPrice(vaultAddress, provider) {
  const iporVaultContract = new ethers.Contract(vaultAddress, iporVaultAbi, provider);
  
  const decimals = await iporVaultContract.decimals();
  const underlyingAmountBN = await iporVaultContract.convertToAssets(BigInt(10 ** Number(decimals)));
  
  const underlyingAddress = await iporVaultContract.asset();
  const underlyingContract = new ethers.Contract(underlyingAddress, erc20Abi, provider);
  const underlyingDecimals = await underlyingContract.decimals();
  const underlyingAmountScaledBN = underlyingAmountBN * BigInt(10 ** (DEFAULT_SCALE - Number(underlyingDecimals)));
  
  const coinId = tokenMapping[underlyingAddress.toLowerCase()];
  if (!coinId) {
    throw new Error(`Token mapping not found for coin at address ${underlyingAddress.toLowerCase()}`);
  }
  
  let underlyingPriceBN = BigInt(1e18);
  let usdcPriceBN = BigInt(1e18);
  
  if (coinId !== USDC_COIN_ID) {
    underlyingPriceBN = await fetchCoinGeckoPriceBN(coinId);
    usdcPriceBN = await fetchCoinGeckoPriceBN(USDC_COIN_ID);
  }
  
  return (underlyingAmountScaledBN * underlyingPriceBN) / usdcPriceBN;
}

module.exports = { getIPORVaultAssetPrice };
