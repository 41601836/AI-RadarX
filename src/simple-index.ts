// Simple Express server without additional dependencies
const express = require('express');

// Create Express application
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'AI Stock Trading Software API is running'
  });
});

// Simple chip analysis endpoint
app.get('/api/v1/chip/distribution', (req, res) => {
  const { stockCode } = req.query;
  
  if (!stockCode) {
    return res.status(400).json({
      code: 400,
      msg: '参数无效：股票代码不能为空',
      requestId: `req-${Date.now()}`,
      timestamp: Date.now()
    });
  }

  res.json({
    code: 200,
    msg: 'success',
    data: {
      stockCode,
      stockName: '浦发银行',
      date: new Date().toISOString().split('T')[0],
      chipDistribution: [
        { price: 850, chipRatio: 0.05, holderCount: 12000 },
        { price: 860, chipRatio: 0.15, holderCount: 36000 },
        { price: 870, chipRatio: 0.30, holderCount: 72000 }
      ],
      chipConcentration: 0.89,
      mainCostPrice: 820
    },
    requestId: `req-${Date.now()}`,
    timestamp: Date.now()
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('GET /api/v1/health - Health check');
  console.log('GET /api/v1/chip/distribution?stockCode=SH600000 - Chip distribution example');
});
