import { NextRequest } from 'next/server';
import { apiHandler } from '../../../../../../lib/api/common/handler';

// 生成模拟跌幅榜数据
function generateMockTopLosers() {
  const mockData = [];
  const prefixes = ['000', '002', '300', '600', '601', '603'];
  
  for (let i = 0; i < 10; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const stockCode = `${prefix}${suffix}`;
    
    mockData.push({
      ts_code: stockCode,
      name: `股票${i + 1}`,
      close: (Math.random() * 200 + 10).toFixed(2),
      change: (Math.random() * -10).toFixed(2),
      pct_change: (Math.random() * -10).toFixed(2),
      volume: Math.floor(Math.random() * 100000000) + 1000000,
      amount: (Math.random() * 1000000000 + 10000000).toFixed(2),
    });
  }
  
  // 按跌幅排序（负数越小，跌幅越大，排在前面）
  return mockData.sort((a, b) => parseFloat(a.pct_change) - parseFloat(b.pct_change));
}

// 处理跌幅榜请求
async function handleTopLosersRequest(request: NextRequest) {
  try {
    // 生成模拟数据
    const mockData = generateMockTopLosers();
    
    // 返回成功响应
    return mockData;
  } catch (error) {
    console.error('Error handling top losers request:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleTopLosersRequest);
}
