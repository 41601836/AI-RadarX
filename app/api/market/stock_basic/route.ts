import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '../../../../lib/api/common/handler';
import { successResponse } from '../../../../lib/api/common/response';

// 模拟股票基本信息数据
function generateMockStockBasicList() {
  // 模拟A股股票列表
  const mockStocks = [
    { ts_code: 'SH600000', symbol: '600000', name: '浦发银行', area: '上海', industry: '银行', market: '主板', list_date: '19990114', pinyin: 'pfyh' },
    { ts_code: 'SZ000001', symbol: '000001', name: '平安银行', area: '深圳', industry: '银行', market: '主板', list_date: '19910403', pinyin: 'payh' },
    { ts_code: 'SH600036', symbol: '600036', name: '招商银行', area: '上海', industry: '银行', market: '主板', list_date: '20020409', pinyin: 'zsyh' },
    { ts_code: 'SZ002415', symbol: '02415', name: '海康威视', area: '杭州', industry: '电子', market: '中小板', list_date: '20100528', pinyin: 'hkwx' },
    { ts_code: 'SZ000858', symbol: '000858', name: '五粮液', area: '四川', industry: '食品饮料', market: '主板', list_date: '19980427', pinyin: 'wly' },
    { ts_code: 'SH600519', symbol: '600519', name: '贵州茅台', area: '贵州', industry: '食品饮料', market: '主板', list_date: '20010827', pinyin: 'gzmt' },
    { ts_code: 'SZ300750', symbol: '300750', name: '宁德时代', area: '福建', industry: '电气设备', market: '创业板', list_date: '20180611', pinyin: 'nds' },
    { ts_code: 'SH601318', symbol: '61318', name: '中国平安', area: '上海', industry: '非银金融', market: '主板', list_date: '20070301', pinyin: 'zgpa' },
    { ts_code: 'SH600031', symbol: '600031', name: '三一重工', area: '湖南', industry: '机械设备', market: '主板', list_date: '20030703', pinyin: 'syhg' },
    { ts_code: 'SZ000002', symbol: '000002', name: '万科A', area: '深圳', industry: '房地产', market: '主板', list_date: '19910129', pinyin: 'wka' },
  ];

  return {
    list: mockStocks,
    total: mockStocks.length,
    pageNum: 1,
    pageSize: 20,
    pages: 1
  };
}

// 处理股票基本信息请求
async function handleStockBasicRequest(request: NextRequest) {
  try {
    // 生成模拟数据
    const mockData = generateMockStockBasicList();
    
    // 返回成功响应
    return mockData;
  } catch (error) {
    console.error('Error handling stock basic request:', error);
    return {
      code: 500,
      msg: 'Internal Server Error',
      data: null,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  }
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleStockBasicRequest);
}
