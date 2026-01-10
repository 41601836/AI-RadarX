// 止损/止盈规则配置API
import { apiPost } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { stockCodeFormatError, invalidStopRuleValueError } from '../common/errors';

export interface StopRuleConfigParams {
  stockCode: string;
  stopType: 'stopLoss' | 'stopProfit'; // stopLoss（止损）/stopProfit（止盈）
  ruleType: 'fixed' | 'moving' | 'ma'; // fixed（固定比例）/moving（移动止损）/ma（均线止损）
  value: number; // 规则值（如固定比例5%传0.05）
  isEnabled: boolean; // 是否启用该规则
}

export interface StopRuleConfigResult {
  success: boolean;
  message: string;
  ruleId?: string;
}

export async function configureStopRule(
  params: StopRuleConfigParams
): Promise<ApiResponse<StopRuleConfigResult>> {
  try {
    // 验证股票代码格式
    if (!params.stockCode || !/^(SH|SZ)\d{6}$/.test(params.stockCode)) {
      throw stockCodeFormatError();
    }

    // 验证止损/止盈值范围
    if (params.value <= 0 || params.value >= 1) {
      throw invalidStopRuleValueError('止损/止盈值必须在0-1之间');
    }

    // 使用统一的 apiPost 函数
    return await apiPost<StopRuleConfigResult>('/risk/stop/rule/config', params);
  } catch (error) {
    console.error('Error configuring stop rule:', error);
    throw error;
  }
}
