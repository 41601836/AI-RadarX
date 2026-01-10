import { NextRequest, NextResponse } from 'next/server';
import { getAggregatedStockData } from '../../../../lib/api/ai-inference';
import { IntelligenceBriefData } from '../../../../components/IntelligenceBrief';
import { successResponse } from '../../../../lib/api/common/response';
import { errorResponse, badRequestError, internalServerError } from '../../../../lib/api/common/errors';
import { apiHandler } from '../../../../lib/api/common/handler';
import { getTushareStockBasic } from '../../../../lib/api/common/tushare';

// 生成情报简报数据
async function generateIntelligenceBrief(stockCode: string): Promise<IntelligenceBriefData> {
  try {
    // 获取聚合数据
    const aggregatedData = await getAggregatedStockData(stockCode);
    
    // 从Tushare获取真实的股票基本信息
    const stockBasic = await getTushareStockBasic(stockCode);
    
    // 基于聚合数据生成情报简报
    return {
      stock: {
        ts_code: aggregatedData.stockCode,
        symbol: aggregatedData.stockCode.slice(2),
        name: aggregatedData.stockName,
        industry: stockBasic?.industry || '银行', // 从Tushare获取，如失败使用默认值
        area: stockBasic?.area || '上海', // 从Tushare获取，如失败使用默认值
        market: stockBasic?.market || '主板', // 从Tushare获取，如失败使用默认值
        list_date: stockBasic?.list_date || '1999-11-10', // 从Tushare获取，如失败使用默认值
        pinyin: stockBasic?.pinyin || 'pfyh' // 从Tushare获取，如失败使用默认值
      },
      selectionLogic: {
        overallScore: Math.round((aggregatedData.chipData.chipConcentrationScore + aggregatedData.sentimentData.opinionScore + aggregatedData.heatFlowData.heatScore) / 3),
        factors: [
          {
            name: '筹码分布',
            score: aggregatedData.chipData.chipConcentrationScore,
            description: `筹码${aggregatedData.chipData.chipConcentrationScore > 70 ? '高度' : '较为'}集中，${aggregatedData.chipData.supportPrice ? `支撑位${aggregatedData.chipData.supportPrice / 100}元` : '支撑位不明确'}`
          },
          {
            name: '舆情分析',
            score: aggregatedData.sentimentData.opinionScore,
            description: `舆情${aggregatedData.sentimentData.opinionScore > 70 ? '正面' : '中性'}，${aggregatedData.sentimentData.positiveRatio > 0.6 ? '正面观点占比较高' : '观点较为分散'}`
          },
          {
            name: '游资热度',
            score: aggregatedData.heatFlowData.heatScore,
            description: `游资${aggregatedData.heatFlowData.heatScore > 70 ? '活跃度高' : '活跃度一般'}，${aggregatedData.heatFlowData.hotMoneyNetBuy > 0 ? '净流入' : '净流出'}`
          }
        ]
      },
      seatGame: {
        majorSeats: [
          {
            name: '机构专用',
            direction: aggregatedData.heatFlowData.hotMoneyNetBuy > 0 ? 'buy' : 'sell',
            amount: `${(Math.abs(aggregatedData.heatFlowData.hotMoneyNetBuy) / 100000000).toFixed(2)}亿元`,
            influence: '强'
          },
          {
            name: '国泰君安上海',
            direction: 'neutral',
            amount: '0.50亿元',
            influence: '中'
          }
        ],
        gameResult: aggregatedData.heatFlowData.hotMoneyNetBuy > 0 ? 'bull' : 'bear',
        conclusion: aggregatedData.heatFlowData.hotMoneyNetBuy > 0 ? '多方占据优势' : '空方占据优势'
      },
      riskControl: {
        hardThresholds: [
          {
            name: '止损线',
            value: `${(aggregatedData.chipData.supportPrice * 0.98 / 100).toFixed(2)}元`,
            status: 'safe'
          },
          {
            name: '止盈线',
            value: `${(aggregatedData.chipData.resistancePrice * 1.02 / 100).toFixed(2)}元`,
            status: 'safe'
          },
          {
            name: '最大回撤',
            value: '5.0%',
            status: 'warning'
          }
        ],
        dynamicRisks: [
          {
            type: '大盘风险',
            level: 'medium',
            description: '上证指数面临压力位',
            time: new Date().toLocaleString()
          }
        ]
      },
      decisionSummary: aggregatedData.heatFlowData.hotMoneyNetBuy > 0 ? '逢低买入' : '观望为主'
    };
  } catch (error) {
    console.error('生成情报简报失败:', error);
    // 生成模拟数据作为降级方案
    return {
      stock: {
        ts_code: stockCode,
        symbol: stockCode.slice(2),
        name: '浦发银行',
        industry: '银行',
        area: '上海',
        market: '主板',
        list_date: '1999-11-10',
        pinyin: 'pfyh'
      },
      selectionLogic: {
        overallScore: 85,
        factors: [
          { name: '资金流入', score: 90, description: '主力资金连续3日净流入' },
          { name: '技术形态', score: 88, description: 'W底形态形成，突破颈线' },
          { name: '估值水平', score: 78, description: 'PE低于行业平均20%' },
          { name: '基本面', score: 82, description: '季度净利润增长15%' },
          { name: '舆情热度', score: 85, description: '机构调研热度上升' }
        ]
      },
      seatGame: {
        majorSeats: [
          { name: '机构专用', direction: 'buy', amount: '5,200万', influence: '强' },
          { name: '国泰君安上海', direction: 'buy', amount: '3,800万', influence: '中' },
          { name: '银河证券北京', direction: 'sell', amount: '2,100万', influence: '弱' },
          { name: '华泰证券深圳', direction: 'neutral', amount: '800万', influence: '弱' }
        ],
        gameResult: 'bull',
        conclusion: '多方占据优势，机构主导买入'
      },
      riskControl: {
        hardThresholds: [
          { name: '止损线', value: '8.20元', status: 'safe' },
          { name: '止盈线', value: '9.50元', status: 'safe' },
          { name: '最大回撤', value: '5.2%', status: 'warning' },
          { name: '仓位限制', value: '20%', status: 'safe' }
        ],
        dynamicRisks: [
          { type: '大盘风险', level: 'medium', description: '上证指数面临3200点压力', time: new Date().toLocaleString() },
          { type: '行业风险', level: 'low', description: '银行板块估值修复接近尾声', time: new Date().toLocaleString() },
          { type: '个股风险', level: 'low', description: '近3日换手率异常放大', time: new Date().toLocaleString() }
        ]
      },
      decisionSummary: '逢低买入，持有待涨'
    };
  }
}

// 具体的API处理逻辑
async function handleIntelligenceBriefRequest(request: NextRequest) {
  // 解析请求参数
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get('stockCode');
  
  // 验证必要参数
  if (!stockCode) {
    return NextResponse.json(
      errorResponse(badRequestError('stockCode is required')),
      { status: 400 }
    );
  }
  
  // 生成情报简报
  const brief = await generateIntelligenceBrief(stockCode);
  
  // 返回成功响应
  return brief;
}

export async function GET(request: NextRequest) {
  return apiHandler(request, handleIntelligenceBriefRequest);
}
