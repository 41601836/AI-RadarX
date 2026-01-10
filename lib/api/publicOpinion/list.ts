// 舆情详情列表API
import { paginatedSuccessResponse } from '../common/response';
import { ApiResponse } from '../common/response';
import { PaginationResponse } from '../common/response';
import { stockCodeFormatError } from '../common/errors';
import { formatDateTime, isValidStockCode } from '../common/utils'; // 导入通用工具函数

export interface OpinionListParams {
  stockCode: string;
  timeRange?: string; // 时间范围（1d/3d/7d/30d），默认 7d
  sentimentType?: 'positive' | 'negative' | 'neutral'; // 舆情类型，可选
  pageNum?: number;
  pageSize?: number;
}

export interface OpinionDetail {
  opinionId: string;
  source: string;
  content: string;
  publishTime: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number; // 相关性评分（0-100）
}

// 模拟舆情来源
const OPINON_SOURCES = [
  '财经新闻网',
  '证券时报',
  '上海证券报',
  '中国证券报',
  '证券日报',
  '新浪财经',
  '腾讯财经',
  '网易财经',
  '东方财富网',
  '同花顺财经'
];

// 模拟舆情内容模板
const OPINON_CONTENT_TEMPLATES = {
  positive: [
    '${stockName}发布了最新的财报，显示公司营收和净利润均实现了同比增长。',
    '分析师预计${stockName}未来几个季度的业绩将继续保持增长态势。',
    '${stockName}获得了新的业务订单，预计将对公司未来的业绩产生积极影响。',
    '行业政策利好${stockName}所在领域，公司有望从中受益。',
    '${stockName}的新产品获得了市场的广泛认可，销售情况良好。'
  ],
  negative: [
    '${stockName}发布的财报显示公司业绩不及市场预期。',
    '分析师下调了${stockName}的评级，认为公司短期内面临较大压力。',
    '${stockName}的主要竞争对手推出了新产品，可能对公司的市场份额造成影响。',
    '行业政策调整可能对${stockName}的业务产生不利影响。',
    '${stockName}近期出现了高管离职的情况，引发市场担忧。'
  ],
  neutral: [
    '市场分析师对${stockName}的未来走势持谨慎乐观态度。',
    '${stockName}发布了关于公司治理结构调整的公告。',
    '行业研究报告显示，${stockName}所在领域的竞争格局正在发生变化。',
    '${stockName}近期举办了投资者交流活动，向市场传达了公司的发展战略。',
    '媒体对${stockName}的最新业务动态进行了报道。'
  ]
};

// 生成随机舆情详情
const generateOpinionDetail = (stockName: string, sentiment: 'positive' | 'negative' | 'neutral', index: number, baseTime: Date): OpinionDetail => {
  const templates = OPINON_CONTENT_TEMPLATES[sentiment];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // 随机生成发布时间（在baseTime之前的随机时间）
    const publishTime = new Date(baseTime.getTime() - Math.random() * 86400000 * 30);
    
    return {
      opinionId: `opinion-${Date.now()}-${index}`,
      source: OPINON_SOURCES[Math.floor(Math.random() * OPINON_SOURCES.length)],
      content: template.replace('${stockName}', stockName),
      publishTime: formatDateTime(publishTime),
      sentiment,
      relevanceScore: Math.floor(Math.random() * 50) + 50 // 50-100的相关性评分
    };
};

export async function fetchOpinionList(
  params: OpinionListParams
): Promise<ApiResponse<PaginationResponse<OpinionDetail>>> {
  try {
    // 验证股票代码格式
    if (!params.stockCode || !/^(SH|SZ)\d{6}$/.test(params.stockCode)) {
      throw stockCodeFormatError();
    }

    // 设置默认参数
    const pageNum = params.pageNum || 1;
    const pageSize = params.pageSize || 20;
    const stockName = `模拟股票${params.stockCode.slice(-4)}`;
    
    // 生成模拟数据
    const allOpinions: OpinionDetail[] = [];
    const baseTime = new Date();
    const totalCount = 100; // 总舆情数量
    
    // 根据时间范围和舆情类型生成数据
    for (let i = 0; i < totalCount; i++) {
      // 如果指定了舆情类型，则只生成该类型的数据
      const sentiment = params.sentimentType || 
        (Math.random() < 0.6 ? 'positive' : Math.random() < 0.5 ? 'negative' : 'neutral');
      
      allOpinions.push(generateOpinionDetail(stockName, sentiment, i, baseTime));
    }
    
    // 根据时间排序（最新的在前）
    allOpinions.sort((a, b) => new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime());
    
    // 分页处理
    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedOpinions = allOpinions.slice(startIndex, endIndex);
    
    // 返回模拟数据
    return paginatedSuccessResponse(
      paginatedOpinions,
      totalCount,
      pageNum,
      pageSize,
      '舆情详情列表获取成功'
    );
  } catch (error) {
    console.error('Error fetching opinion list data:', error);
    throw error;
  }
}
