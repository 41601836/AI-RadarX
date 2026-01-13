// Java 接口压测脚本
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 压测配置
const config = {
  // Java 后端基础 URL
  baseUrl: 'http://localhost:8080/api/v1',
  
  // 测试接口列表
  endpoints: [
    {
      name: '获取K线数据',
      path: '/market/kline',
      method: 'GET',
      params: { symbol: 'SH600000', interval: '1d', limit: 100 },
      body: null
    },
    {
      name: '获取股票基本信息',
      path: '/market/stock_basic',
      method: 'GET',
      params: { exchange: 'SSE,SZSE', list_status: 'L' },
      body: null
    },
    {
      name: '获取实时行情',
      path: '/market/quote',
      method: 'GET',
      params: { symbols: 'SH600000,SZ000001' },
      body: null
    },
    {
      name: '获取筹码分布',
      path: '/chip/distribution',
      method: 'GET',
      params: { stockCode: 'SH600000', days: 30 },
      body: null
    },
    {
      name: '获取技术指标',
      path: '/tech/indicator/data',
      method: 'GET',
      params: { stockCode: 'SH600000', indicators: 'ma,macd,rsi' },
      body: null
    }
  ],
  
  // 压测参数
  concurrentUsers: 50,      // 并发用户数
  requestPerUser: 10,       // 每个用户发送的请求数
  testDuration: 60,         // 测试持续时间（秒）
  rampUpTime: 10,           // 预热时间（秒）
  
  // 输出配置
  outputFile: 'java-api-benchmark-results.json',
  printInterval: 5          // 打印间隔（秒）
};

// 性能指标收集
class MetricsCollector {
  constructor() {
    this.startTime = 0;
    this.endTime = 0;
    this.requests = [];
    this.errors = [];
    this.currentRequests = 0;
    this.maxConcurrentRequests = 0;
  }
  
  start() {
    this.startTime = Date.now();
  }
  
  end() {
    this.endTime = Date.now();
  }
  
  addRequest(request) {
    this.requests.push(request);
  }
  
  addError(error) {
    this.errors.push(error);
  }
  
  incrementConcurrent() {
    this.currentRequests++;
    if (this.currentRequests > this.maxConcurrentRequests) {
      this.maxConcurrentRequests = this.currentRequests;
    }
  }
  
  decrementConcurrent() {
    this.currentRequests--;
  }
  
  getResults() {
    const totalTime = this.endTime - this.startTime;
    const totalRequests = this.requests.length;
    const successfulRequests = this.requests.filter(req => req.success).length;
    const errorRate = this.errors.length / totalRequests;
    
    // 计算响应时间分位数
    const responseTimes = this.requests.filter(req => req.success).map(req => req.responseTime);
    responseTimes.sort((a, b) => a - b);
    
    const p50 = this.getPercentile(responseTimes, 50);
    const p90 = this.getPercentile(responseTimes, 90);
    const p95 = this.getPercentile(responseTimes, 95);
    const p99 = this.getPercentile(responseTimes, 99);
    
    return {
      totalTime: totalTime,
      totalRequests: totalRequests,
      successfulRequests: successfulRequests,
      errorRate: errorRate,
      avgResponseTime: this.getAverage(responseTimes),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50: p50,
      p90: p90,
      p95: p95,
      p99: p99,
      maxConcurrentRequests: this.maxConcurrentRequests,
      throughput: (totalRequests / (totalTime / 1000)).toFixed(2),
      requests: this.requests,
      errors: this.errors
    };
  }
  
  getAverage(arr) {
    if (arr.length === 0) return 0;
    return (arr.reduce((sum, val) => sum + val, 0) / arr.length).toFixed(2);
  }
  
  getPercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const index = Math.floor((percentile / 100) * arr.length);
    return arr[index] || 0;
  }
}

// 测试客户端
class TestClient {
  constructor(baseUrl) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  async sendRequest(endpoint) {
    const startTime = Date.now();
    
    try {
      let response;
      
      switch (endpoint.method.toUpperCase()) {
        case 'GET':
          response = await this.client.get(endpoint.path, { params: endpoint.params });
          break;
        case 'POST':
          response = await this.client.post(endpoint.path, endpoint.body, { params: endpoint.params });
          break;
        case 'PUT':
          response = await this.client.put(endpoint.path, endpoint.body, { params: endpoint.params });
          break;
        case 'DELETE':
          response = await this.client.delete(endpoint.path, { params: endpoint.params });
          break;
        default:
          throw new Error(`不支持的请求方法: ${endpoint.method}`);
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        endpoint: endpoint.name,
        method: endpoint.method,
        status: response.status,
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        endpoint: endpoint.name,
        method: endpoint.method,
        error: error.message,
        responseTime: responseTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 压测引擎
class BenchmarkEngine {
  constructor(config) {
    this.config = config;
    this.client = new TestClient(config.baseUrl);
    this.metrics = new MetricsCollector();
    this.isRunning = false;
  }
  
  async start() {
    console.log('=== Java 接口压测开始 ===');
    console.log(`基础 URL: ${this.config.baseUrl}`);
    console.log(`并发用户数: ${this.config.concurrentUsers}`);
    console.log(`每个用户请求数: ${this.config.requestPerUser}`);
    console.log(`测试持续时间: ${this.config.testDuration}秒`);
    console.log(`预热时间: ${this.config.rampUpTime}秒`);
    console.log('\n接口列表:');
    this.config.endpoints.forEach((endpoint, index) => {
      console.log(`${index + 1}. ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
    });
    console.log('\n' + '='.repeat(50) + '\n');
    
    this.isRunning = true;
    this.metrics.start();
    
    // 启动性能监控
    this.startMonitoring();
    
    // 执行压测
    try {
      await this.runTest();
    } catch (error) {
      console.error('压测执行失败:', error);
    }
    
    this.metrics.end();
    this.isRunning = false;
    
    // 生成测试报告
    await this.generateReport();
  }
  
  async runTest() {
    const { concurrentUsers, requestPerUser, testDuration } = this.config;
    const totalRequests = concurrentUsers * requestPerUser;
    
    console.log(`总请求数: ${totalRequests}`);
    console.log('压测开始...\n');
    
    // 预热阶段
    if (this.config.rampUpTime > 0) {
      console.log(`预热阶段 (${this.config.rampUpTime}秒)...`);
      await this.runRampUp();
    }
    
    // 主测试阶段
    console.log('主测试阶段开始...');
    const startTime = Date.now();
    const endTime = startTime + (testDuration * 1000);
    
    const userPromises = [];
    for (let i = 0; i < concurrentUsers; i++) {
      userPromises.push(this.simulateUser(endTime));
    }
    
    await Promise.all(userPromises);
  }
  
  async runRampUp() {
    const rampUpUsers = Math.floor(this.config.concurrentUsers * 0.3);
    const rampUpRequests = Math.floor(this.config.requestPerUser * 0.2);
    
    const userPromises = [];
    for (let i = 0; i < rampUpUsers; i++) {
      userPromises.push(this.simulateUser(Date.now() + (this.config.rampUpTime * 1000), rampUpRequests));
    }
    
    await Promise.all(userPromises);
  }
  
  async simulateUser(endTime, maxRequests = this.config.requestPerUser) {
    let requestCount = 0;
    
    while (this.isRunning && Date.now() < endTime && requestCount < maxRequests) {
      // 随机选择一个接口
      const endpoint = this.config.endpoints[Math.floor(Math.random() * this.config.endpoints.length)];
      
      this.metrics.incrementConcurrent();
      
      try {
        const result = await this.client.sendRequest(endpoint);
        this.metrics.addRequest(result);
        
        if (!result.success) {
          this.metrics.addError(result);
        }
      } catch (error) {
        this.metrics.addError({
          success: false,
          endpoint: endpoint.name,
          method: endpoint.method,
          error: error.message,
          responseTime: 0,
          timestamp: new Date().toISOString()
        });
      } finally {
        this.metrics.decrementConcurrent();
      }
      
      requestCount++;
      
      // 添加随机延迟，模拟真实用户行为
      await this.sleep(Math.random() * 1000);
    }
  }
  
  async startMonitoring() {
    const printInterval = this.config.printInterval * 1000;
    
    const monitor = async () => {
      if (!this.isRunning) return;
      
      const results = this.metrics.getResults();
      
      console.clear();
      console.log('=== Java 接口压测进行中 ===');
      console.log(`已执行请求数: ${results.totalRequests}`);
      console.log(`成功请求数: ${results.successfulRequests}`);
      console.log(`错误率: ${(results.errorRate * 100).toFixed(2)}%`);
      console.log(`平均响应时间: ${results.avgResponseTime}ms`);
      console.log(`最大并发请求数: ${results.maxConcurrentRequests}`);
      console.log(`吞吐量: ${results.throughput} 请求/秒`);
      console.log('\n' + '='.repeat(50));
      
      setTimeout(monitor, printInterval);
    };
    
    setTimeout(monitor, printInterval);
  }
  
  async generateReport() {
    const results = this.metrics.getResults();
    
    console.clear();
    console.log('=== Java 接口压测报告 ===');
    console.log('\n基本信息:');
    console.log(`测试时间: ${new Date(results.requests[0]?.timestamp || new Date()).toLocaleString()}`);
    console.log(`测试持续时间: ${(results.totalTime / 1000).toFixed(2)}秒`);
    console.log(`总请求数: ${results.totalRequests}`);
    console.log(`成功请求数: ${results.successfulRequests}`);
    console.log(`错误率: ${(results.errorRate * 100).toFixed(2)}%`);
    console.log(`最大并发请求数: ${results.maxConcurrentRequests}`);
    console.log(`吞吐量: ${results.throughput} 请求/秒`);
    
    console.log('\n响应时间统计:');
    console.log(`平均响应时间: ${results.avgResponseTime}ms`);
    console.log(`最小响应时间: ${results.minResponseTime}ms`);
    console.log(`最大响应时间: ${results.maxResponseTime}ms`);
    console.log(`50% 响应时间 (P50): ${results.p50}ms`);
    console.log(`90% 响应时间 (P90): ${results.p90}ms`);
    console.log(`95% 响应时间 (P95): ${results.p95}ms`);
    console.log(`99% 响应时间 (P99): ${results.p99}ms`);
    
    console.log('\n接口性能详情:');
    this.config.endpoints.forEach(endpoint => {
      const endpointRequests = results.requests.filter(req => req.endpoint === endpoint.name);
      const successfulRequests = endpointRequests.filter(req => req.success);
      const avgResponseTime = successfulRequests.length > 0 
        ? (successfulRequests.reduce((sum, req) => sum + req.responseTime, 0) / successfulRequests.length).toFixed(2)
        : 'N/A';
      
      console.log(`\n${endpoint.name}:`);
      console.log(`  请求数: ${endpointRequests.length}`);
      console.log(`  成功率: ${((successfulRequests.length / endpointRequests.length) * 100).toFixed(2)}%`);
      console.log(`  平均响应时间: ${avgResponseTime}ms`);
    });
    
    // 保存结果到文件
    const reportFile = path.join(__dirname, this.config.outputFile);
    const reportData = {
      config: this.config,
      results: results,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    console.log(`\n测试报告已保存到: ${reportFile}`);
    
    console.log('\n=== 压测完成 ===');
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 启动压测
const engine = new BenchmarkEngine(config);
engine.start();
