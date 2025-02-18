const express = require('express');
const pricesRoutes = require('./routes/pricesRoutes.js');
const fakePricesRoutes = require('./routes/fakePricesRoutes.js');

const { PORT } = require('./config');

const app = express();

app.use(express.json());
app.use('/prices', pricesRoutes);
app.use('/fakePrices', fakePricesRoutes);

app.get('/', (req, res) => {
  res.send("DeFi Price API is running.");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
