const { ethers } = require('ethers');

const {
  DEFAULT_SCALE,
  DEFAULT_SCALE_FACTOR_BN,
  fourPoolAbi,
  erc20Abi,
  tokenMapping
} = require('../config');
const { fetchCoinGeckoPriceBN } = require('../services/coingecko');

async function getFourPoolAssetPrice(poolAddress, provider) {
  const fourPoolContract = new ethers.Contract(poolAddress, fourPoolAbi, provider);
  
  let totalNominalScaledBN = BigInt(0);
  let totalValueBN = BigInt(0);
  
  const virtualPriceBN = await fourPoolContract.get_virtual_price();
  const balancesBN = await fourPoolContract.get_balances();
  
  // Loop through each of 4 coins
  for (let i = 0; i < 4; i++) {
    const coinAddress = await fourPoolContract.coins(i);
    const coinId = tokenMapping[coinAddress.toLowerCase()];
    if (!coinId) {
      throw new Error(`Token mapping not found for coin at address ${coinAddress}`);
    }
    const coinPriceBN = await fetchCoinGeckoPriceBN(coinId);
    
    const erc20Contract = new ethers.Contract(coinAddress, erc20Abi, provider);
    const decimals = await erc20Contract.decimals();
    
    const scaleFactor = BigInt(10 ** (DEFAULT_SCALE - Number(decimals)));
    const nominalScaled = balancesBN[i] * scaleFactor;
    
    totalNominalScaledBN += nominalScaled;
    
    const coinValueBN = nominalScaled * coinPriceBN;
    totalValueBN = totalValueBN + coinValueBN;
  }
  
  const weightedAveragePriceBN = totalValueBN / totalNominalScaledBN;
  return (virtualPriceBN * weightedAveragePriceBN) / DEFAULT_SCALE_FACTOR_BN;
}

async function isFourPool(underlyingAddress, provider) {
  const contract = new ethers.Contract(underlyingAddress, fourPoolAbi, provider);
  try {
    await contract.get_virtual_price();
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { getFourPoolAssetPrice, isFourPool };
