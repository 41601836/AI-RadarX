import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { errorResponse, badRequestError } from '@/lib/api/common/errors';
import { AccountRiskAssessmentData } from '@/lib/api/risk/assessment';

// 生成模拟账户风险评估数据
async function generateAccountRiskAssessmentMock(): Promise<AccountRiskAssessmentData> {
  // 模拟持仓股票数据
  const positionRiskList = [
    {
      stockCode: 'SH600000',
      stockName: '浦发银行',
      positionRatio: 0.25,
      riskLevel: 'low' as const,
      stopLossPrice: 850,
      stopProfitPrice: 980
    },
    {
      stockCode: 'SZ000858',
      stockName: '五粮液',
      positionRatio: 0.45,
      riskLevel: 'high' as const,
      stopLossPrice: 17500,
      stopProfitPrice: 20500
    },
    {
      stockCode: 'SZ002594',
      stockName: '比亚迪',
      positionRatio: 0.30,
      riskLevel: 'medium' as const,
      stopLossPrice: 23500,
      stopProfitPrice: 27800
    }
  ];

  // 生成随机风险评估数据
  return {
    accountId: 'user-123456',
    totalMarketValue: 12580000, // 125.8万（分）
    totalAvailableFunds: 3850000, // 38.5万（分）
    varValue: 450000, // VaR值4.5万（分）
    cvarValue: 680000, // 尾部风险值6.8万（分）
    sharpRatio: 1.25,
    maxDrawdown: 0.18, // 最大回撤18%
    positionRiskList,
    riskWarning: [
      '五粮液持仓占比过高，建议适当降低仓位',
      '整体账户风险等级为中等，需关注市场波动',
      '最大回撤接近预警线，建议设置止损策略'
    ]
  };
}


/**
 * API处理函数
 * 接口路径：/v1/risk/account/assessment
 * 请求方法：GET
 */
async function handleRiskAccountAssessmentRequest(request: NextRequest) {
  // 直接调用Mock数据生成器，避免循环调用
  const mockData = await generateAccountRiskAssessmentMock();
  
  return mockData;
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleRiskAccountAssessmentRequest);
}
