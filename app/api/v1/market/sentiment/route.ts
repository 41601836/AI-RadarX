import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { generateMarketSentimentMock } from '@/lib/api/market/sentiment';

/**
 * API处理函数
 * 接口路径：/v1/market/sentiment
 * 请求方法：GET
 */
async function handleMarketSentimentRequest(request: NextRequest) {
  console.log('Starting market sentiment API request at', new Date().toISOString());
  
  try {
    // 直接调用模拟数据生成器
    const mockData = await generateMarketSentimentMock();
    console.log('Successfully generated mock data for market sentiment');
    
    return mockData;
  } catch (error) {
    console.error('Error in handleMarketSentimentRequest:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  console.log('Market sentiment GET request received');
  return apiHandler(request, handleMarketSentimentRequest);
}
