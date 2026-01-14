// Basic HTTP server using Node.js built-in modules
const http = require('http');
const url = require('url');

// Create HTTP server
const server = http.createServer((req, res) => {
  // Parse URL and query parameters
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Health check route
  if (pathname === '/api/v1/health') {
    res.statusCode = 200;
    res.end(JSON.stringify({
      code: 200,
      msg: 'success',
      data: { status: 'ok', timestamp: new Date().toISOString() },
      requestId: `req-${Date.now()}`,
      timestamp: Date.now()
    }));
    return;
  }

  // Chip distribution example endpoint
  if (pathname === '/api/v1/chip/distribution') {
    const { stockCode } = query;
    
    if (!stockCode) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        code: 400,
        msg: '参数无效：股票代码不能为空',
        requestId: `req-${Date.now()}`,
        timestamp: Date.now()
      }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({
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
    }));
    return;
  }

  // Public opinion summary example endpoint
  if (pathname === '/api/v1/public/opinion/summary') {
    const { stockCode } = query;
    
    if (!stockCode) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        code: 400,
        msg: '参数无效：股票代码不能为空',
        requestId: `req-${Date.now()}`,
        timestamp: Date.now()
      }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({
      code: 200,
      msg: 'success',
      data: {
        stockCode,
        stockName: '浦发银行',
        opinionScore: 75,
        positiveRatio: 0.6,
        negativeRatio: 0.15,
        neutralRatio: 0.25
      },
      requestId: `req-${Date.now()}`,
      timestamp: Date.now()
    }));
    return;
  }

  // 404 Not Found
  res.statusCode = 404;
  res.end(JSON.stringify({
    code: 404,
    msg: '资源不存在',
    requestId: `req-${Date.now()}`,
    timestamp: Date.now()
  }));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`AI Stock Trading Software API Server is running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('GET /api/v1/health - Health check');
  console.log('GET /api/v1/chip/distribution?stockCode=SH600000 - Chip distribution example');
  console.log('GET /api/v1/public/opinion/summary?stockCode=SH600000 - Public opinion summary example');
});
