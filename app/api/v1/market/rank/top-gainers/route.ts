import { NextRequest } from 'next/server';
import { apiHandler } from '../../../../../../lib/api/common/handler';

// 生成模拟涨幅榜数据
function generateMockTopGainers() {
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
      change: (Math.random() * 10).toFixed(2),
      pct_change: (Math.random() * 10).toFixed(2),
      volume: Math.floor(Math.random() * 100000000) + 1000000,
      amount: (Math.random() * 1000000000 + 10000000).toFixed(2),
    });
  }
  
  // 按涨跌幅排序
  return mockData.sort((a, b) => parseFloat(b.pct_change) - parseFloat(a.pct_change));
}

// 处理涨幅榜请求
async function handleTopGainersRequest(request: NextRequest) {
  try {
    // 生成模拟数据
    const mockData = generateMockTopGainers();
    
    // 返回成功响应
    return mockData;
  } catch (error) {
    console.error('Error handling top gainers request:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleTopGainersRequest);
}
