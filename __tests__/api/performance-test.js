import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const failureRate = new Rate('check_failure_rate');
const chipDistributionDuration = new Trend('chip_distribution_duration');
const opinionSummaryDuration = new Trend('opinion_summary_duration');
const largeOrderRealTimeDuration = new Trend('large_order_real_time_duration');
const techIndicatorDataDuration = new Trend('tech_indicator_data_duration');

export const options = {
  stages: [
    // 1. 缓慢增加到10个虚拟用户，持续30秒
    { duration: '30s', target: 10 },
    // 2. 保持10个虚拟用户，持续1分钟
    { duration: '1m', target: 10 },
    // 3. 增加到20个虚拟用户，持续30秒
    { duration: '30s', target: 20 },
    // 4. 保持20个虚拟用户，持续1分钟
    { duration: '1m', target: 20 },
    // 5. 增加到30个虚拟用户，持续30秒
    { duration: '30s', target: 30 },
    // 6. 保持30个虚拟用户，持续1分钟
    { duration: '1m', target: 30 },
    // 7. 减少到0个虚拟用户，持续30秒
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // 成功率要求95%以上
    'check_failure_rate': ['rate<0.05'],
    // 响应时间要求
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    // 自定义指标阈值
    'chip_distribution_duration': ['p(95)<500'],
    'opinion_summary_duration': ['p(95)<500'],
    'large_order_real_time_duration': ['p(95)<500'],
    'tech_indicator_data_duration': ['p(95)<500'],
  },
};

// 测试函数
export default function () {
  // 1. 测试筹码分布API
  testChipDistributionAPI();
  sleep(1);
  
  // 2. 测试舆情汇总API
  testOpinionSummaryAPI();
  sleep(1);
  
  // 3. 测试实时大单数据API
  testLargeOrderRealTimeAPI();
  sleep(1);
  
  // 4. 测试技术指标数据API
  testTechIndicatorDataAPI();
  sleep(1);
}

// 测试筹码分布API
function testChipDistributionAPI() {
  const url = 'http://localhost:3001/api/v1/chip/distribution';
  const params = {
    searchParams: {
      stockCode: 'SH600000',
    },
  };
  
  const res = http.get(url, params);
  
  // 记录响应时间
  chipDistributionDuration.add(res.timings.duration);
  
  // 检查响应
  const checkRes = check(res, {
    'chip_distribution: status is 200': (r) => r.status === 200,
    'chip_distribution: response has data': (r) => r.json().data !== undefined,
    'chip_distribution: response has correct stockCode': (r) => r.json().data.stockCode === 'SH600000',
  });
  
  failureRate.add(!checkRes);
}

// 测试舆情汇总API
function testOpinionSummaryAPI() {
  const url = 'http://localhost:3001/api/v1/public/opinion/summary';
  const params = {
    searchParams: {
      stockCode: 'SH600000',
    },
  };
  
  const res = http.get(url, params);
  
  // 记录响应时间
  opinionSummaryDuration.add(res.timings.duration);
  
  // 检查响应
  const checkRes = check(res, {
    'opinion_summary: status is 200': (r) => r.status === 200,
    'opinion_summary: response has data': (r) => r.json().data !== undefined,
    'opinion_summary: response has correct stockCode': (r) => r.json().data.stockCode === 'SH600000',
  });
  
  failureRate.add(!checkRes);
}

// 测试实时大单数据API
function testLargeOrderRealTimeAPI() {
  const url = 'http://localhost:3001/api/v1/order/large/real-time';
  const params = {
    searchParams: {
      stockCode: 'SH600000',
    },
  };
  
  const res = http.get(url, params);
  
  // 记录响应时间
  largeOrderRealTimeDuration.add(res.timings.duration);
  
  // 检查响应
  const checkRes = check(res, {
    'large_order_real_time: status is 200': (r) => r.status === 200,
    'large_order_real_time: response has data': (r) => r.json().data !== undefined,
    'large_order_real_time: response has correct stockCode': (r) => r.json().data.stockCode === 'SH600000',
  });
  
  failureRate.add(!checkRes);
}

// 测试技术指标数据API
function testTechIndicatorDataAPI() {
  const url = 'http://localhost:3001/api/v1/tech/indicator/data';
  const params = {
    searchParams: {
      stockCode: 'SH600000',
      cycleType: 'day',
    },
  };
  
  const res = http.get(url, params);
  
  // 记录响应时间
  techIndicatorDataDuration.add(res.timings.duration);
  
  // 检查响应
  const checkRes = check(res, {
    'tech_indicator_data: status is 200': (r) => r.status === 200,
    'tech_indicator_data: response has data': (r) => r.json().data !== undefined,
    'tech_indicator_data: response has correct stockCode': (r) => r.json().data.stockCode === 'SH600000',
  });
  
  failureRate.add(!checkRes);
}
