import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '../../../../../lib/api/common/handler';
import { errorResponse, badRequestError } from '../../../../../lib/api/common/errors';
import { updateRiskStopRuleConfig } from '../../../../../lib/api/risk/stopRule';


/**
 * API处理函数
 * 接口路径：/v1/risk/stop/rule/config
 * 请求方法：POST
 */
async function handleRiskStopRuleConfigRequest(request: NextRequest) {
  // 解析请求体
  const body = await request.json();
  
  // 调用业务逻辑
  const result = await updateRiskStopRuleConfig(body);
  
  return result;
}

export async function POST(request: NextRequest) {
  return apiHandler(request, handleRiskStopRuleConfigRequest);
}
