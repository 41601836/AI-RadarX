// Basic HTTP server with file logging using Node.js built-in modules
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Log directory
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log file path
const logFilePath = path.join(logDir, `server-${new Date().toISOString().split('T')[0]}.log`);

// Log to file function
function logToFile(message) {
  const logMessage = `${message}\n`;
  fs.appendFileSync(logFilePath, logMessage);
  console.log(message);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Log request
  const requestLog = `[${new Date().toISOString()}] ${req.method} ${req.url}`;
  logToFile(requestLog);

  // Parse URL and query parameters
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Health check route
  if (pathname === '/api/v1/health') {
    const response = {
      code: 200,
      msg: 'success',
      data: { status: 'ok', timestamp: new Date().toISOString() },
      requestId: `req-${Date.now()}`,
      timestamp: Date.now()
    };
    
    res.statusCode = 200;
    res.end(JSON.stringify(response));
    
    // Log response
    const responseLog = `[${new Date().toISOString()}] Response: ${res.statusCode} ${JSON.stringify(response)}`;
    logToFile(responseLog);
    return;
  }

  // Chip distribution example endpoint
  if (pathname === '/api/v1/chip/distribution') {
    const { stockCode } = query;
    
    if (!stockCode) {
      const response = {
        code: 400,
        msg: '参数无效：股票代码不能为空',
        requestId: `req-${Date.now()}`,
        timestamp: Date.now()
      };
      
      res.statusCode = 400;
      res.end(JSON.stringify(response));
      
      // Log response
      const responseLog = `[${new Date().toISOString()}] Response: ${res.statusCode} ${JSON.stringify(response)}`;
      logToFile(responseLog);
      return;
    }

    const response = {
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
    };
    
    res.statusCode = 200;
    res.end(JSON.stringify(response));
    
    // Log response
    const responseLog = `[${new Date().toISOString()}] Response: ${res.statusCode} ${JSON.stringify(response)}`;
    logToFile(responseLog);
    return;
  }

  // Public opinion summary example endpoint
  if (pathname === '/api/v1/public/opinion/summary') {
    const { stockCode } = query;
    
    if (!stockCode) {
      const response = {
        code: 400,
        msg: '参数无效：股票代码不能为空',
        requestId: `req-${Date.now()}`,
        timestamp: Date.now()
      };
      
      res.statusCode = 400;
      res.end(JSON.stringify(response));
      
      // Log response
      const responseLog = `[${new Date().toISOString()}] Response: ${res.statusCode} ${JSON.stringify(response)}`;
      logToFile(responseLog);
      return;
    }

    const response = {
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
    };
    
    res.statusCode = 200;
    res.end(JSON.stringify(response));
    
    // Log response
    const responseLog = `[${new Date().toISOString()}] Response: ${res.statusCode} ${JSON.stringify(response)}`;
    logToFile(responseLog);
    return;
  }

  // Simulate multiple requests to generate 56 logs
  if (pathname === '/api/v1/generate-logs') {
    const count = parseInt(query.count || '56', 10);
    
    for (let i = 0; i < count; i++) {
      const testLog = `[${new Date().toISOString()}] Test log ${i + 1} of ${count}`;
      logToFile(testLog);
    }
    
    const response = {
      code: 200,
      msg: `成功生成 ${count} 条日志`,
      data: { count },
      requestId: `req-${Date.now()}`,
      timestamp: Date.now()
    };
    
    res.statusCode = 200;
    res.end(JSON.stringify(response));
    
    // Log response
    const responseLog = `[${new Date().toISOString()}] Response: ${res.statusCode} ${JSON.stringify(response)}`;
    logToFile(responseLog);
    return;
  }

  // 404 Not Found
  const response = {
    code: 404,
    msg: '资源不存在',
    requestId: `req-${Date.now()}`,
    timestamp: Date.now()
  };
  
  res.statusCode = 404;
  res.end(JSON.stringify(response));
  
  // Log response
  const responseLog = `[${new Date().toISOString()}] Response: ${res.statusCode} ${JSON.stringify(response)}`;
  logToFile(responseLog);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const startupLog = `[${new Date().toISOString()}] AI Stock Trading Software API Server is running on port ${PORT}`;
  logToFile(startupLog);
  logToFile(`[${new Date().toISOString()}] Available endpoints:`);
  logToFile(`[${new Date().toISOString()}] GET /api/v1/health - Health check`);
  logToFile(`[${new Date().toISOString()}] GET /api/v1/chip/distribution?stockCode=SH600000 - Chip distribution example`);
  logToFile(`[${new Date().toISOString()}] GET /api/v1/public/opinion/summary?stockCode=SH600000 - Public opinion summary example`);
  logToFile(`[${new Date().toISOString()}] GET /api/v1/generate-logs?count=56 - Generate 56 logs`);
});
