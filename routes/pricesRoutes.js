const express = require('express');
const router = express.Router();

const { sourceProvider, tokenMapping, targetProvider} = require('../config');

const { getUniV2PoolAssetPrice } = require('../calculations/uniV2Pool');
const { getBeefyPoolAssetPrice } = require('../calculations/beefyPool');
const { getIPORVaultAssetPrice } = require('../calculations/iporVault');
const { getAAVEPoolAssetPrice } = require('../calculations/aavePool');
const { fetchCoinGeckoPriceBN } = require('../services/coingecko');

// Endpoint for fetching a token price.
// Usage: GET /token?tokenAddress=<address>
router.get('/token', async (req, res) => {
  try {
    const { tokenAddress } = req.query;
    if (!tokenAddress) {
      return res.status(400).json({ error: "Missing 'tokenAddress' query parameter" });
    }
    
    const coinId = tokenMapping[tokenAddress.toLowerCase()];
    if (!coinId) {
      return res.status(400).json({ error: `Token mapping not found for coin at address ${tokenAddress.toLowerCase()}` });
    }
    const tokenPrice = await fetchCoinGeckoPriceBN(coinId);
    res.json({ price: tokenPrice.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for fetching AAVE token price
// Usage: GET /aaveToken?poolAddress=<address>&reserveAddress=<address>
router.get('/aaveToken', async (req, res) => {
  try {
    const { poolAddress, reserveAddress } = req.query;
    if (!poolAddress) {
      return res.status(400).json({ error: "Missing 'poolAddress' query parameter" });
    }
    if (!reserveAddress) {
      return res.status(400).json({ error: "Missing 'reserveAddress' query parameter" });
    }
    const aTokenPrice = await getAAVEPoolAssetPrice(poolAddress, reserveAddress, sourceProvider);
    res.json({ price: aTokenPrice.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for fetching Uniswap V2 Pool asset price
// Usage: GET /uniV2Pool?poolAddress=<address>
router.get('/uniV2Pool', async (req, res) => {
  try {
    const { poolAddress } = req.query;
    if (!poolAddress) {
      return res.status(400).json({ error: "Missing 'poolAddress' query parameter" });
    }
    const assetPrice = await getUniV2PoolAssetPrice(poolAddress, sourceProvider);
    res.json({ price: assetPrice.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for fetching Beefy Pool asset price.
// Usage: GET /beefyPool?poolAddress=<address>
router.get('/beefyPool', async (req, res) => {
  try {
    const { poolAddress } = req.query;
    if (!poolAddress) {
      return res.status(400).json({ error: "Missing 'poolAddress' query parameter" });
    }
    
    const assetPrice = await getBeefyPoolAssetPrice(poolAddress, sourceProvider);
    res.json({ price: assetPrice.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for fetching IPOR Vault asset price.
// Usage: GET /iporVault?vaultAddress=<address>
router.get('/iporVault', async (req, res) => {
  try {
    const { vaultAddress } = req.query;
    if (!vaultAddress) {
      return res.status(400).json({ error: "Missing 'vaultAddress' query parameter" });
    }
    
    const assetPrice = await getIPORVaultAssetPrice(vaultAddress, sourceProvider);
    res.json({ price: assetPrice.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
