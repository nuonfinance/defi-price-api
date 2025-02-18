const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

const { targetProvider, aggregatorAbi, MAX_BPS_BN } = require('../config');

// Fake flat price endpoint
// Usage: GET /flat?aggregatorAddress=<address>
router.get("/flat", async (req, res) => {
  try {
    const { aggregatorAddress } = req.query;
    if (!aggregatorAddress) {
      return res.status(400).json({ error: "Missing 'aggregatorAddress' query parameter" });
    }
    const priceFeed = new ethers.Contract(aggregatorAddress, aggregatorAbi, targetProvider);
    const { answer: currentPrice } = await priceFeed.latestRoundData();
    
    res.json({ price: currentPrice.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fake increasing price endpoint
// Query parameter: step in wei (optional, default = 1 gwei)
// Usage: GET /increase?aggregatorAddress=<address>&step=<step>
router.get("/increase", async (req, res) => {
  try {
    const { aggregatorAddress } = req.query;
    if (!aggregatorAddress) {
      return res.status(400).json({ error: "Missing 'aggregatorAddress' query parameter" });
    }
    const step = BigInt(req.query.step || 1_000_000_000); // default: 1 gwei
    const priceFeed = new ethers.Contract(aggregatorAddress, aggregatorAbi, targetProvider);
    
    const { answer: currentPrice } = await priceFeed.latestRoundData();
    const fakePrice = currentPrice + step;
    res.json({ price: fakePrice.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fake decreasing price endpoint
// Query parameter: step in wei (optional, default = 1 gwei)
// Usage: GET /decrease?aggregatorAddress=<address>&step=<step>
router.get("/decrease", async (req, res) => {
  try {
    const { aggregatorAddress } = req.query;
    if (!aggregatorAddress) {
      return res.status(400).json({ error: "Missing 'aggregatorAddress' query parameter" });
    }
    const step = BigInt(req.query.step || 1_000_000_000); // default: 1 gwei
    const priceFeed = new ethers.Contract(aggregatorAddress, aggregatorAbi, targetProvider);
    
    const { answer: currentPrice } = await priceFeed.latestRoundData();
    const fakePrice = currentPrice > step ? currentPrice - step : BigInt(0);
    
    res.json({ price: fakePrice.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fake fluctuating price endpoint
// Query parameter: range in BPS (optional, default = 1000 means +/-10% fluctuation)
// Usage: GET /fluctuating?aggregatorAddress=<address>&range=<range>
router.get("/fluctuating", async (req, res) => {
  try {
    const { aggregatorAddress } = req.query;
    if (!aggregatorAddress) {
      return res.status(400).json({ error: "Missing 'aggregatorAddress' query parameter" });
    }
    const rangeBPS = Number(req.query.range) || 1_000;
    const priceFeed = new ethers.Contract(aggregatorAddress, aggregatorAbi, targetProvider);
    
    const { answer: currentPrice } = await priceFeed.latestRoundData();
    const fluctuationBPS = Math.floor((Math.random() * 2 - 1) * rangeBPS);
    const fakePrice = (currentPrice * (MAX_BPS_BN + BigInt(fluctuationBPS))) / MAX_BPS_BN;
    
    res.json({ price: fakePrice.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
