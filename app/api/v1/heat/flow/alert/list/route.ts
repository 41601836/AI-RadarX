import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/common/handler';
import { errorResponse, badRequestError } from '@/lib/api/common/errors';
import { generateHeatFlowAlertMock } from '@/lib/api/heatFlow/alert';
import { successResponse } from '@/lib/api/common/response';


/**
 * API处理函数
 * 接口路径：/v1/heat/flow/alert/list
 * 请求方法：GET
 */
async function handleHeatFlowAlertListRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
  
  const alertLevel = searchParams.get('alertLevel') as "high" | "medium" | "low" | undefined;
  const pageNum = searchParams.get('pageNum');
  const pageSize = searchParams.get('pageSize');

  // 直接调用Mock数据生成器，避免循环调用
  const mockData = await generateHeatFlowAlertMock({
    alertLevel,
    pageNum: pageNum ? parseInt(pageNum, 10) : 1,
    pageSize: pageSize ? parseInt(pageSize, 10) : 20
  });
  
  return mockData;
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleHeatFlowAlertListRequest);
}
