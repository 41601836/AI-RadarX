import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { errorResponse, badRequestError } from '@/lib/api/common/errors';
import { configureStopRule } from '@/lib/api/risk/stopRule';


/**
 * API处理函数
 * 接口路径：/api/v1/risk/stop/rule/config
 * 请求方法：POST
 */
async function handleRiskStopRuleConfigRequest(request: NextRequest) {
  // 解析请求体
  const body = await request.json();
  
  // 验证必要参数
  if (!body.stockCode) {
    throw badRequestError('stockCode is required');
  }
  
  if (!body.stopType) {
    throw badRequestError('stopType is required');
  }
  
  if (!body.ruleType) {
    throw badRequestError('ruleType is required');
  }
  
  if (typeof body.value !== 'number') {
    throw badRequestError('value must be a number');
  }
  
  if (typeof body.isEnabled !== 'boolean') {
    throw badRequestError('isEnabled must be a boolean');
  }
  
  // 调用业务逻辑
  const result = await configureStopRule(body);
  
  return result;
}

export async function POST(request: NextRequest) {
  return apiHandler(request, handleRiskStopRuleConfigRequest);
}
