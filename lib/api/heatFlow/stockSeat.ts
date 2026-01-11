// 股票游资席位API
import { successResponse } from '../common/response';
import { ApiResponse } from '../common/response';
import { stockCodeFormatError, noHeatFlowDataError } from '../common/errors';
import { formatDateTime, isValidStockCode } from '../common/utils'; // 导入通用工具函数
import { SeatTag, getSeatTags } from './seatTags'; // 导入席位标签库

export interface HeatFlowStockSeatParams {
  stockCode: string;
  startDate?: string;
  endDate?: string;
  lazyLoad?: boolean; // 是否使用懒加载模式，true时不返回详细的AI推理数据
}

export interface SeatOperationRecord {
  tradeDate: string;
  buyAmount: number;
  sellAmount: number;
  stockCode: string;
  stockName: string;
  profitLoss: number;
  profitLossRate: number;
  holdDays: number;
}

export interface SeatPerformanceStats {
  totalTrades: number;
  profitableTrades: number;
  losingTrades: number;
  totalProfitLoss: number;
  averageProfitLoss: number;
  averageProfitLossRate: number;
  averageHoldDays: number;
  biggestWin: number;
  biggestLoss: number;
  winRate: number;
}

export interface HotSeatItem {
  seatId: string;
  seatName: string;
  seatType: 'hotMoney' | 'institution'; // hotMoney（游资）/institution（机构）
  netBuy: number; // 该席位净买入（分）
  operationStyle: 'shortTerm' | 'longTerm'; // 操作风格
  successRate: number; // 该席位历史操作成功率
  performanceStats: SeatPerformanceStats; // 详细战绩统计
  operationRecord: SeatOperationRecord[];
  tags: SeatTag[]; // 席位标签
}

export interface HeatFlowStockSeatData {
  stockCode: string;
  stockName: string;
  totalNetBuy: number; // 游资总净买入（分）
  hotSeatList: HotSeatItem[];
  lasaTeamSeatCount: number; // 拉萨天团席位数量
  riskLevel: 'safe' | 'warning' | 'danger'; // 风险等级
  riskAdvice: string; // 风险建议
}

// 席位风险扫描接口
export interface SeatRiskScanParams {
  stockCode?: string; // 可选，指定股票代码，不指定则扫描全部龙虎榜股票
  date?: string; // 可选，指定日期，默认当天
}

export interface SeatRiskScanItem {
  stockCode: string;
  stockName: string;
  lasaTeamSeatCount: number;
  riskLevel: 'safe' | 'warning' | 'danger';
  riskAdvice: string;
  totalSeatCount: number;
}

export interface SeatRiskScanResponse {
  scanTime: string;
  totalScanned: number;
  highRiskCount: number;
  riskScanList: SeatRiskScanItem[];
}

// 拉萨天团席位列表
const LASA_TEAM_SEATS = [
  '西藏东方财富证券拉萨团结路第一营业部',
  '西藏东方财富证券拉萨团结路第二营业部',
  '西藏东方财富证券拉萨东环路第一营业部',
  '西藏东方财富证券拉萨东环路第二营业部',
  '西藏东方财富证券拉萨金珠西路第一营业部',
  '西藏东方财富证券拉萨江苏路营业部'
];

// 模拟游资席位名称
const HOT_SEAT_NAMES = [
  '西藏东方财富证券拉萨团结路第一营业部',
  '西藏东方财富证券拉萨团结路第二营业部',
  '西藏东方财富证券拉萨东环路第一营业部',
  '西藏东方财富证券拉萨东环路第二营业部',
  '西藏东方财富证券拉萨金珠西路第一营业部',
  '西藏东方财富证券拉萨江苏路营业部',
  '华泰证券深圳益田路荣超商务中心营业部',
  '国泰君安证券上海江苏路营业部',
  '中信证券上海溧阳路营业部',
  '光大证券宁波解放南路营业部',
  '中信证券上海淮海中路营业部',
  '华泰证券厦门厦禾路营业部',
  '兴业证券陕西分公司',
  '银河证券绍兴营业部'
];

// 模拟机构席位名称
const INSTITUTION_SEAT_NAMES = [
  '中国国际金融股份有限公司上海分公司',
  '中信证券股份有限公司总部',
  '华泰证券股份有限公司总部',
  '国泰君安证券股份有限公司总部',
  '海通证券股份有限公司总部',
  '招商证券股份有限公司深圳深南东路营业部',
  '国信证券股份有限公司深圳泰然九路营业部',
  '广发证券股份有限公司深圳民田路营业部',
  '申万宏源证券有限公司上海闵行区东川路营业部',
  '方正证券股份有限公司长沙建湘路营业部'
];

// 模拟东方财富龙虎榜数据响应接口
interface EastMoneyLHBData {
  stockCode: string;
  stockName: string;
  tradeDate: string;
  buySeatList: Array<{
    seatName: string;
    buyAmount: number;
    buyAmountRank: number;
  }>;
  sellSeatList: Array<{
    seatName: string;
    sellAmount: number;
    sellAmountRank: number;
  }>;
  totalBuyAmount: number;
  totalSellAmount: number;
}

// 获取东方财富龙虎榜数据（模拟真实API调用）
async function fetchEastMoneyLHBData(
  stockCode: string,
  startDate: Date,
  endDate: Date
): Promise<EastMoneyLHBData[]> {
  // 由于无法直接调用东方财富API，这里模拟API响应
  // 实际项目中，这里应该使用真实的API调用
  console.log(`[EastMoney API] Fetching LHB data for ${stockCode} from ${formatDateTime(startDate)} to ${formatDateTime(endDate)}`);
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 生成模拟的东方财富龙虎榜数据
  const mockLHBData: EastMoneyLHBData[] = [];
  
  // 生成最近5天的龙虎榜数据
  for (let i = 0; i < 5; i++) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - i);
    
    // 随机决定当天是否有龙虎榜数据
    if (Math.random() > 0.3) {
      const buySeatList = [];
      const sellSeatList = [];
      const totalBuyAmount = Math.floor(Math.random() * 500000000) + 100000000; // 1亿-6亿
      const totalSellAmount = Math.floor(Math.random() * totalBuyAmount * 0.8) + totalBuyAmount * 0.2; // 总卖出为总买入的20%-100%
      
      // 生成买入席位数据
      for (let j = 0; j < 5; j++) {
        const isHotMoney = Math.random() > 0.3;
        const seatNames = isHotMoney ? HOT_SEAT_NAMES : INSTITUTION_SEAT_NAMES;
        const seatName = seatNames[Math.floor(Math.random() * seatNames.length)];
        
        buySeatList.push({
          seatName,
          buyAmount: Math.floor(Math.random() * totalBuyAmount * 0.3) + 10000000, // 100万-总买入的30%
          buyAmountRank: j + 1
        });
      }
      
      // 生成卖出席位数据
      for (let j = 0; j < 5; j++) {
        const isHotMoney = Math.random() > 0.3;
        const seatNames = isHotMoney ? HOT_SEAT_NAMES : INSTITUTION_SEAT_NAMES;
        const seatName = seatNames[Math.floor(Math.random() * seatNames.length)];
        
        sellSeatList.push({
          seatName,
          sellAmount: Math.floor(Math.random() * totalSellAmount * 0.3) + 10000000, // 100万-总卖出的30%
          sellAmountRank: j + 1
        });
      }
      
      mockLHBData.push({
        stockCode,
        stockName: `股票${stockCode.slice(-4)}`,
        tradeDate: formatDateTime(date),
        buySeatList,
        sellSeatList,
        totalBuyAmount,
        totalSellAmount
      });
    }
  }
  
  return mockLHBData;
}

// 计算席位战绩统计
const calculateSeatPerformanceStats = (records: SeatOperationRecord[]): SeatPerformanceStats => {
  const totalTrades = records.length;
  const profitableTrades = records.filter(record => record.profitLoss > 0).length;
  const losingTrades = records.filter(record => record.profitLoss < 0).length;
  const totalProfitLoss = records.reduce((sum, record) => sum + record.profitLoss, 0);
  const averageProfitLoss = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;
  const profitableRecords = records.filter(record => record.profitLoss > 0);
  const averageProfitLossRate = profitableRecords.length > 0 
    ? profitableRecords.reduce((sum, record) => sum + record.profitLossRate, 0) / profitableRecords.length
    : 0;
  const averageHoldDays = totalTrades > 0 
    ? records.reduce((sum, record) => sum + record.holdDays, 0) / totalTrades
    : 0;
  const biggestWin = Math.max(...records.map(record => record.profitLoss), 0);
  const biggestLoss = Math.min(...records.map(record => record.profitLoss), 0);
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
  
  return {
    totalTrades,
    profitableTrades,
    losingTrades,
    totalProfitLoss,
    averageProfitLoss,
    averageProfitLossRate,
    averageHoldDays,
    biggestWin,
    biggestLoss,
    winRate
  };
};

export async function fetchHeatFlowStockSeat(
  params: HeatFlowStockSeatParams
): Promise<ApiResponse<HeatFlowStockSeatData>> {
  try {
    // 验证股票代码格式
    if (!params.stockCode || !/^(SH|SZ)\d{6}$/.test(params.stockCode)) {
      throw stockCodeFormatError();
    }

    // 设置默认日期范围（最近30天）
    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    const startDate = params.startDate ? new Date(params.startDate) : new Date(endDate.getTime() - 86400000 * 30);
    
    // 获取东方财富龙虎榜数据
    const lhbDataList = await fetchEastMoneyLHBData(params.stockCode, startDate, endDate);
    
    // 如果没有龙虎榜数据，抛出错误
    if (lhbDataList.length === 0) {
      throw noHeatFlowDataError();
    }
    
    // 初始化结果数据
    const resultData: HeatFlowStockSeatData = {
      stockCode: params.stockCode,
      stockName: lhbDataList[0].stockName,
      totalNetBuy: 0,
      hotSeatList: [],
      lasaTeamSeatCount: 0,
      riskLevel: 'safe',
      riskAdvice: '正常'
    };
    
    // 聚合席位数据
    const seatMap = new Map<string, { buyAmount: number; sellAmount: number; seatType: 'hotMoney' | 'institution' }>();
    
    // 处理每个交易日的龙虎榜数据
    for (const lhbData of lhbDataList) {
      // 处理买入席位
      for (const buySeat of lhbData.buySeatList) {
        const existingSeat = seatMap.get(buySeat.seatName) || {
          buyAmount: 0,
          sellAmount: 0,
          seatType: buySeat.seatName.includes('机构') ? 'institution' : 'hotMoney'
        };
        
        existingSeat.buyAmount += buySeat.buyAmount * 100; // 转换为分
        seatMap.set(buySeat.seatName, existingSeat);
      }
      
      // 处理卖出席位
      for (const sellSeat of lhbData.sellSeatList) {
        const existingSeat = seatMap.get(sellSeat.seatName) || {
          buyAmount: 0,
          sellAmount: 0,
          seatType: sellSeat.seatName.includes('机构') ? 'institution' : 'hotMoney'
        };
        
        existingSeat.sellAmount += sellSeat.sellAmount * 100; // 转换为分
        seatMap.set(sellSeat.seatName, existingSeat);
      }
    }
    
    // 转换席位数据为HotSeatItem格式
    let seatIndex = 0;
    for (const [seatName, seatInfo] of seatMap) {
      const netBuy = seatInfo.buyAmount - seatInfo.sellAmount;
      
      // 获取席位标签
      const tags = getSeatTags(seatName);
      
      // 根据懒加载参数决定是否生成详细数据
      const operationRecords = params.lazyLoad ? [] : [];
      
      // 计算战绩统计（懒加载时使用默认值）
      const performanceStats = params.lazyLoad ? {
        totalTrades: 0,
        profitableTrades: 0,
        losingTrades: 0,
        totalProfitLoss: 0,
        averageProfitLoss: 0,
        averageProfitLossRate: 0,
        averageHoldDays: 0,
        biggestWin: 0,
        biggestLoss: 0,
        winRate: 0
      } : calculateSeatPerformanceStats(operationRecords);
      
      const hotSeatItem: HotSeatItem = {
        seatId: `seat-${Date.now()}-${seatIndex++}`,
        seatName,
        seatType: seatInfo.seatType,
        netBuy,
        operationStyle: Math.random() > 0.4 ? 'shortTerm' : 'longTerm',
        successRate: Math.floor(Math.random() * 40) + 40, // 40%-80%的成功率
        performanceStats,
        operationRecord: operationRecords,
        tags
      };
      
      resultData.hotSeatList.push(hotSeatItem);
      resultData.totalNetBuy += netBuy;
    }
    
    // 按净买入金额排序（从大到小）
    resultData.hotSeatList.sort((a, b) => b.netBuy - a.netBuy);
    
    // 计算拉萨天团席位数量
    const lasaTeamSeatCount = resultData.hotSeatList.filter(seat => 
      LASA_TEAM_SEATS.includes(seat.seatName)
    ).length;
    
    // 评估风险等级和建议
    let riskLevel: 'safe' | 'warning' | 'danger';
    let riskAdvice: string;
    
    if (lasaTeamSeatCount > 4) {
      riskLevel = 'danger';
      riskAdvice = '规避';
    } else if (lasaTeamSeatCount >= 3) {
      riskLevel = 'warning';
      riskAdvice = '谨慎关注';
    } else {
      riskLevel = 'safe';
      riskAdvice = '正常';
    }
    
    // 更新结果数据
    resultData.lasaTeamSeatCount = lasaTeamSeatCount;
    resultData.riskLevel = riskLevel;
    resultData.riskAdvice = riskAdvice;
    
    // 如果没有游资数据，抛出特定错误
    if (resultData.hotSeatList.length === 0) {
      throw noHeatFlowDataError();
    }
    
    return successResponse(resultData, '股票游资席位数据获取成功');
  } catch (error) {
    console.error('Error fetching heat flow stock seat data:', error);
    throw error;
  }
}

// 生成随机股票代码列表
const generateRandomStockCodes = (count: number): string[] => {
  const codes: string[] = [];
  const prefixes = ['SH', 'SZ'];
  
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const code = Math.floor(Math.random() * 9000) + 1000;
    codes.push(`${prefix}${code}`);
  }
  
  return codes;
};

// 席位风险扫描API
export async function fetchSeatRiskScan(
  params: SeatRiskScanParams
): Promise<ApiResponse<SeatRiskScanResponse>> {
  try {
    // 生成模拟的龙虎榜股票列表（20-30只股票）
    const scannedStockCodes = params.stockCode 
      ? [params.stockCode] 
      : generateRandomStockCodes(Math.floor(Math.random() * 11) + 20);
    
    const riskScanList: SeatRiskScanItem[] = [];
    let highRiskCount = 0;
    
    // 模拟扫描每只股票的龙虎榜席位
    for (const stockCode of scannedStockCodes) {
      // 模拟席位数量（5-15个）
      const totalSeatCount = Math.floor(Math.random() * 11) + 5;
      
      // 模拟拉萨天团席位数量（0-6个）
      const lasaTeamSeatCount = Math.floor(Math.random() * 7);
      
      // 评估风险等级和建议
      let riskLevel: 'safe' | 'warning' | 'danger';
      let riskAdvice: string;
      
      if (lasaTeamSeatCount > 4) {
        riskLevel = 'danger';
        riskAdvice = '规避';
        highRiskCount++;
      } else if (lasaTeamSeatCount >= 3) {
        riskLevel = 'warning';
        riskAdvice = '谨慎关注';
      } else {
        riskLevel = 'safe';
        riskAdvice = '正常';
      }
      
      // 添加到扫描结果列表
      riskScanList.push({
        stockCode,
        stockName: `模拟股票${stockCode.slice(-4)}`,
        lasaTeamSeatCount,
        riskLevel,
        riskAdvice,
        totalSeatCount
      });
    }
    
    // 生成响应数据
    const responseData: SeatRiskScanResponse = {
      scanTime: formatDateTime(new Date()),
      totalScanned: scannedStockCodes.length,
      highRiskCount,
      riskScanList: riskScanList.sort((a, b) => b.lasaTeamSeatCount - a.lasaTeamSeatCount) // 按拉萨天团席位数量降序排序
    };
    
    return successResponse(responseData, '席位风险扫描完成');
  } catch (error) {
    console.error('Error fetching seat risk scan data:', error);
    throw error;
  }
}
