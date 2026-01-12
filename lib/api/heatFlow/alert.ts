// 游资行为预警API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { PaginationResponse } from '../common/response';
import { formatDateTime } from '../common/utils'; // 导入通用工具函数

export interface HeatFlowAlertParams {
  alertLevel?: 'low' | 'medium' | 'high';
  pageNum?: number;
  pageSize?: number;
}

export interface HeatFlowAlertItem {
  alertId: string;
  stockCode: string;
  stockName: string;
  alertType: string;
  alertLevel: 'low' | 'medium' | 'high';
  alertTime: string;
  alertDesc: string;
  relatedSeats: string[];
}

// 模拟预警类型
const ALERT_TYPES = [
  '协同买入',
  '对倒交易',
  '一字断魂刀',
  '大额净买入',
  '频繁交易',
  '席位联动',
  '异常放量',
  '高位出货',
  '低位吸筹'
];

// 模拟预警描述模板
const ALERT_DESC_TEMPLATES = {
  '协同买入': '监测到多个游资席位同时买入${stockName}，疑似协同操作。',
  '对倒交易': '监测到${stockName}存在异常对倒交易行为，需警惕。',
  '一字断魂刀': '${stockName}出现典型的一字断魂刀走势，可能是游资出货。',
  '大额净买入': '${stockName}被游资席位大额净买入，短期可能有上涨行情。',
  '频繁交易': '${stockName}近期交易频繁，疑似游资炒作。',
  '席位联动': '监测到${stockName}的交易席位存在联动行为，可能是同一资金控制。',
  '异常放量': '${stockName}出现异常放量，结合游资席位数据，需关注。',
  '高位出货': '${stockName}在高位出现大量卖出，疑似游资出货。',
  '低位吸筹': '${stockName}在低位出现持续买入，疑似游资吸筹。'
};

// 模拟游资席位
const RELATED_SEATS = [
  '西藏东方财富证券拉萨团结路第一营业部',
  '西藏东方财富证券拉萨团结路第二营业部',
  '华泰证券深圳益田路荣超商务中心营业部',
  '国泰君安证券上海江苏路营业部',
  '中信证券上海溧阳路营业部',
  '光大证券宁波解放南路营业部',
  '中信证券上海淮海中路营业部',
  '华泰证券厦门厦禾路营业部',
  '兴业证券陕西分公司',
  '银河证券绍兴营业部'
];

// 模拟股票名称
const stockNameMap: Record<string, string> = {
  'SH600000': '浦发银行',
  'SH600036': '招商银行',
  'SZ000001': '平安银行',
  'SZ000858': '五粮液',
  'SZ002594': '比亚迪',
};

// 生成随机股票代码
const generateRandomStockCode = (): string => {
  const prefixes = ['SH', 'SZ'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const code = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}${code}`;
};

// 生成随机预警级别
const generateRandomAlertLevel = (): 'low' | 'medium' | 'high' => {
  const levels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
  return levels[Math.floor(Math.random() * levels.length)];
};

// 生成随机预警项
const generateAlertItem = (index: number, alertLevel?: 'low' | 'medium' | 'high'): HeatFlowAlertItem => {
  const stockCode = generateRandomStockCode();
  const stockName = stockNameMap[stockCode] || `模拟股票${stockCode.slice(-4)}`;
  const alertType = ALERT_TYPES[Math.floor(Math.random() * ALERT_TYPES.length)];
  const level = alertLevel || generateRandomAlertLevel();
  
  // 生成随机预警时间（最近30天内）
  const alertTime = formatDateTime(new Date(Date.now() - Math.random() * 86400000 * 30));
  
  // 生成随机相关席位（1-5个）
  const relatedSeatsCount = Math.floor(Math.random() * 5) + 1;
  const relatedSeats: string[] = [];
  const seatsCopy = [...RELATED_SEATS];
  
  for (let i = 0; i < relatedSeatsCount; i++) {
    const seatIndex = Math.floor(Math.random() * seatsCopy.length);
    relatedSeats.push(seatsCopy.splice(seatIndex, 1)[0]);
  }
  
  return {
    alertId: `alert-${Date.now()}-${index}`,
    stockCode,
    stockName,
    alertType,
    alertLevel: level,
    alertTime,
    alertDesc: ALERT_DESC_TEMPLATES[alertType as keyof typeof ALERT_DESC_TEMPLATES].replace('${stockName}', stockName),
    relatedSeats
  };
};

// Mock数据生成器
export const generateHeatFlowAlertMock: MockDataGenerator<PaginationResponse<HeatFlowAlertItem>> = async (params: HeatFlowAlertParams) => {
  // 设置默认参数
  const pageNum = params.pageNum || 1;
  const pageSize = params.pageSize || 20;
  const alertLevel = params.alertLevel;
  
  // 生成模拟数据
  const allAlerts: HeatFlowAlertItem[] = [];
  const totalCount = 100; // 总预警数量
  
  for (let i = 0; i < totalCount; i++) {
    allAlerts.push(generateAlertItem(i, alertLevel));
  }
  
  // 按时间排序（最新的在前）
  allAlerts.sort((a, b) => new Date(b.alertTime).getTime() - new Date(a.alertTime).getTime());
  
  // 如果指定了预警级别，则过滤数据
  const filteredAlerts = alertLevel 
    ? allAlerts.filter(alert => alert.alertLevel === alertLevel)
    : allAlerts;
  
  // 分页处理
  const startIndex = (pageNum - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);
  
  return {
    list: paginatedAlerts,
    total: filteredAlerts.length,
    pageNum,
    pageSize,
    pages: Math.ceil(filteredAlerts.length / pageSize)
  };
};

export async function fetchHeatFlowAlertList(
  params: HeatFlowAlertParams
): Promise<ApiResponse<PaginationResponse<HeatFlowAlertItem>>> {
  return apiGet<PaginationResponse<HeatFlowAlertItem>>(
    '/v1/heat/flow/alert/list',
    params,
    { requiresAuth: false },
    generateHeatFlowAlertMock
  );
}
