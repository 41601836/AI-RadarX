// 账户风险评估API
import { ApiResponse } from '../common/response';
import { apiGet } from '../common/fetch';
import { accountNotExistError } from '../common/errors';

export interface PositionRiskItem {
  stockCode: string;
  stockName: string;
  positionRatio: number; // 持仓占比（0-1）
  riskLevel: 'low' | 'medium' | 'high'; // 风险等级
  stopLossPrice: number; // 建议止损价（分）
  stopProfitPrice: number; // 建议止盈价（分）
}

export interface AccountRiskAssessmentData {
  accountId: string;
  totalMarketValue: number; // 账户总市值（分）
  totalAvailableFunds: number; // 可用资金（分）
  varValue: number; // VaR值（95%置信区间，日最大潜在损失，分）
  cvarValue: number; // 尾部风险值（分）
  sharpRatio: number; // 夏普比率
  maxDrawdown: number; // 最大回撤（0-1）
  positionRiskList: PositionRiskItem[];
  riskWarning: string[]; // 风险预警提示
}

export async function fetchAccountRiskAssessment(): Promise<ApiResponse<AccountRiskAssessmentData>> {
  try {
    // 实现账户风险评估数据获取逻辑
    const response = await apiGet<AccountRiskAssessmentData>('/risk/account/assessment');
    
    // 如果账户不存在，返回特定错误
    if (!response.data.accountId) {
      throw accountNotExistError();
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching account risk assessment:', error);
    throw error;
  }
}
