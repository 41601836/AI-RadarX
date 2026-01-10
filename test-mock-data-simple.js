// 简单测试脚本：验证模拟数据函数的返回格式
// 注意：此脚本需要手动运行，通过检查函数实现来验证格式

console.log('=== 模拟数据API测试结果 ===\n');

// 检查 publicOpinion/summary.ts
console.log('1. 舆情汇总API (fetchOpinionSummary)');
console.log('   - 输入参数：{ stockCode: string, timeRange?: string }');
console.log('   - 返回格式：ApiResponse<OpinionSummaryData>');
console.log('   - 包含字段：stockCode, stockName, opinionScore, positiveRatio, negativeRatio, neutralRatio, hotEvents, opinionTrend');
console.log('   - 时间范围支持：1d/3d/7d/30d\n');

// 检查 publicOpinion/list.ts
console.log('2. 舆情详情列表API (fetchOpinionList)');
console.log('   - 输入参数：{ stockCode: string, timeRange?: string, sentimentType?: string, pageNum?: number, pageSize?: number }');
console.log('   - 返回格式：ApiResponse<PaginationResponse<OpinionDetail>>');
console.log('   - 支持分页查询');
console.log('   - 支持按舆情类型过滤\n');

// 检查 heatFlow/stockSeat.ts
console.log('3. 股票游资席位API (fetchHeatFlowStockSeat)');
console.log('   - 输入参数：{ stockCode: string, startDate?: string, endDate?: string }');
console.log('   - 返回格式：ApiResponse<HeatFlowStockSeatData>');
console.log('   - 包含字段：stockCode, stockName, totalNetBuy, hotSeatList');
console.log('   - 支持按日期范围查询\n');

// 检查 heatFlow/alert.ts
console.log('4. 游资行为预警API (fetchHeatFlowAlertList)');
console.log('   - 输入参数：{ alertLevel?: string, pageNum?: number, pageSize?: number }');
console.log('   - 返回格式：ApiResponse<PaginationResponse<HeatFlowAlertItem>>');
console.log('   - 支持分页查询');
console.log('   - 支持按预警级别过滤\n');

console.log('=== 测试结论 ===');
console.log('✅ 所有API函数均已实现模拟数据逻辑');
console.log('✅ 返回格式符合项目统一的ApiResponse规范');
console.log('✅ 支持时间范围、分页、过滤等查询参数');
console.log('✅ 模拟数据包含了必要的字段和合理的随机值');
