const axios = require('axios');

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

async function fetchCoinGeckoPriceBN(coinId) {
  const usdPrice = await fetchCoinGeckoPrice(coinId);
  return BigInt(Math.floor(usdPrice * 1e18));
}

module.exports = {
  fetchCoinGeckoPrice,
  fetchCoinGeckoPriceBN,
};
