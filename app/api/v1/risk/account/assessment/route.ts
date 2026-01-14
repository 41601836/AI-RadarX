import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { errorResponse, badRequestError } from '@/lib/api/common/errors';
import { fetchAccountRiskAssessment } from '@/lib/api/risk/assessment';


/**
 * API处理函数
 * 接口路径：/api/v1/risk/account/assessment
 * 请求方法：GET
 */
async function handleRiskAccountAssessmentRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
  


  // 调用业务逻辑
  const result = await fetchAccountRiskAssessment();
  
  return result;
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleRiskAccountAssessmentRequest);
}
