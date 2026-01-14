// 筹码分布API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { calculateHHI, calculateAverageCost, identifyChipPeaks, calculateSupportResistance, ChipDistributionItem } from '@/lib/algorithms/chipDistribution';
import { getTushareDailyData, getTushareStockBasic, convertTushareToChipData, convertTushareDailyToOHLCV } from '../common/tushare';
import { ApiError, stockCodeFormatError } from '../common/errors';
import { calculateCumulativeWAD, WADItem } from '@/lib/algorithms/wad'; // 导入WAD计算函数和类型
import { FinancialUnitConverter } from '@/lib/utils/data-converter'; // 导入单位转换工具
import { freeScanner, RealtimeStockData } from '../common/freeScanner'; // 导入实时行情扫描器
import { formatDateTime, isValidStockCode } from '../common/utils'; // 导入通用工具函数

export interface ChipDistributionParams {
  stockCode: string;
  startDate?: string;
  endDate?: string;
}

export interface ChipPriceRange {
  price: number; // 价格（分）
  chipRatio: number; // 该价格区间筹码占比（0-1）
  holderCount: number; // 该区间持仓户数（估算）
}

export interface ChipPeak {
  price: number;
  ratio: number;
  volume: number;
  width: number; // 峰值宽度（价格区间）
  dominance: number; // 峰值优势度（0-1）
  strength: number; // 峰值强度（0-1）
  reliability: number; // 峰值可靠性（0-1）
  centerPrice: number; // 峰值中心价格（考虑加权平均）
  volumeWeightedPrice: number; // 成交量加权价格
}

export interface ChipPeakInfo {
  peakPrice: number; // 主峰价格（分）
  peakRatio: number; // 主峰筹码占比（0-1）
  isSinglePeak: boolean; // 是否单峰密集
  peaks: ChipPeak[]; // 所有峰值
  dominantPeak: ChipPeak; // 主峰值
  secondaryPeaks: ChipPeak[]; // 次要峰值
  peakDensity: number; // 峰值密度
  peakQualityScore: number; // 峰值质量综合评分（0-1）
  priceRange: number; // 价格范围
}

export interface ChipDistributionData {
  stockCode: string;
  stockName: string;
  date: string;
  chipDistribution: ChipPriceRange[];
  chipConcentration: number; // 筹码集中度（0-1，值越大越集中）
  mainCostPrice: number; // 主力成本价（分）
  supportPrice: number; // 筹码支撑价（分）
  resistancePrice: number; // 筹码压力价（分）
  chipPeakInfo: ChipPeakInfo;
  _dataSource?: string; // 数据源标识（可选）
}

// 基于WAD的筹码分布模拟函数，融合历史数据和实时价格
function simulateChipDistributionWithWAD(dailyData: any[], stockCode: string, stockName: string, realtimeData?: RealtimeStockData): ChipDistributionData {
  // 生成当前时间
  const now = new Date();
  const date = formatDateTime(now);
  
  // 确定基准价格：优先使用实时价格，否则使用历史数据的最新收盘价
  let basePrice = 850; // 默认值
  if (realtimeData) {
    basePrice = realtimeData.currentPrice;
  } else if (dailyData.length > 0) {
    basePrice = dailyData[dailyData.length - 1].close;
  }
  
  // 计算总成交量：使用历史数据的总成交量
  const totalVolume = dailyData.reduce((sum, item) => sum + item.volume, 0) || 10000000;
  
  // 准备WAD计算所需的数据源 - 转换为元
  const wadItems: WADItem[] = dailyData.map(item => ({
    timestamp: item.timestamp,
    high: FinancialUnitConverter.centsToYuan(item.high),
    low: FinancialUnitConverter.centsToYuan(item.low),
    close: FinancialUnitConverter.centsToYuan(item.close)
  }));
  
  // 如果有实时数据，将其添加到WAD计算中 - 转换为元
  if (realtimeData) {
    wadItems.push({
      timestamp: realtimeData.timestamp,
      high: FinancialUnitConverter.centsToYuan(realtimeData.highPrice),
      low: FinancialUnitConverter.centsToYuan(realtimeData.lowPrice),
      close: FinancialUnitConverter.centsToYuan(realtimeData.currentPrice)
    });
  }
  
  // 计算累积WAD值，考虑实时数据的影响
  const cumulativeWAD = calculateCumulativeWAD(wadItems, {
    decayRate: 0.1,
    useExponentialDecay: true
  });
  
  // 基于WAD值和实时价格调整筹码分布
  const chipData: ChipDistributionItem[] = [];
  const priceRange = 30; // 价格区间范围（分）
  
  for (let i = -priceRange; i <= priceRange; i++) {
    const price = basePrice + i * 10; // 价格步长0.10元（10分）
    
    // 基础成交量分布，形成正态分布的筹码峰
    let baseVolume = Math.max(500000, Math.random() * 2000000 * (1 - Math.abs(i) / (priceRange * 1.5)));
    
    // 使用WAD指标调整筹码分布，反映资金流向
    if (cumulativeWAD.length > 0) {
      const latestWAD = cumulativeWAD[cumulativeWAD.length - 1];
      // 根据WAD值调整筹码分布的峰值位置和成交量
      const wadFactor = 1 + (latestWAD.weightedWad / 1000000);
      baseVolume *= wadFactor;
    }
    
    // 如果有实时数据，根据当前价格和涨跌幅进一步调整筹码分布
    if (realtimeData) {
      // 计算实时涨跌幅对筹码分布的影响
      const priceChangeFactor = 1 + (realtimeData.changePercent / 100);
      // 靠近当前价格的区间成交量增加
      const proximityFactor = 1 - (Math.abs(i) / (priceRange * 2));
      baseVolume *= (1 + (proximityFactor * 0.3) * priceChangeFactor);
    }
    
    chipData.push({
      price,
      volume: Math.max(100000, baseVolume), // 确保有最小成交量
      percentage: 0 // 稍后计算
    });
  }
  
  // 重新计算百分比，确保总和为1
  const totalAdjustedVolume = chipData.reduce((sum, item) => sum + item.volume, 0);
  chipData.forEach(item => {
    item.percentage = item.volume / totalAdjustedVolume;
  });
  
  // 使用我们实现的算法计算筹码指标
  // 计算筹码集中度（HHI指数）
  const chipConcentration = calculateHHI(chipData);
  
  // 计算主力成本价
  const mainCostPrice = calculateAverageCost(chipData);
  
  // 识别主筹峰值
  const peakInfo = identifyChipPeaks(chipData);
  
  // 计算支撑位和压力位
  const supportResistance = calculateSupportResistance(chipData, mainCostPrice);
  
  // 转换为API返回格式
  const normalizedRanges: ChipPriceRange[] = chipData.map(item => ({
    price: item.price,
    chipRatio: item.percentage,
    holderCount: Math.floor(item.percentage * 100000) + 50000
  }));
  
  // 获取主要支撑位和压力位
  const supportPrice = supportResistance.supportLevels.length > 0 
    ? supportResistance.supportLevels[0].price 
    : mainCostPrice * 0.95;
    
  const resistancePrice = supportResistance.resistanceLevels.length > 0 
    ? supportResistance.resistanceLevels[0].price 
    : mainCostPrice * 1.05;
  
  return {
    stockCode,
    stockName,
    date,
    chipDistribution: normalizedRanges,
    chipConcentration,
    mainCostPrice,
    supportPrice,
    resistancePrice,
    chipPeakInfo: peakInfo
  };
}

// Mock数据生成器
export const generateChipDistributionMock: MockDataGenerator<ChipDistributionData> = async (params: ChipDistributionParams) => {
  const { stockCode = 'SH600000' } = params || {};
  
  // 模拟股票名称
  const stockNameMap: Record<string, string> = {
    'SH600000': '浦发银行',
    'SH600036': '招商银行',
    'SZ000001': '平安银行',
    'SZ000858': '五粮液',
    'SZ002594': '比亚迪',
  };
  
  const stockName = stockNameMap[stockCode] || '未知股票';
  
  // 生成当前时间
  const now = new Date();
  const date = formatDateTime(now);
  
  // 生成基础筹码分布数据
  const basePrice = 850; // 8.50元（分）
  const totalVolume = 10000000;
  const chipData: ChipDistributionItem[] = [];
  
  for (let i = -15; i <= 15; i++) {
    const price = basePrice + i * 10; // 价格区间：7.00-10.00元，步长0.10元
    const volume = Math.max(500000, Math.random() * 2000000 * (1 - Math.abs(i) / 20));
    chipData.push({
      price,
      volume,
      percentage: volume / totalVolume
    });
  }
  
  // 使用我们实现的算法计算筹码指标
  // 计算筹码集中度（HHI指数）
  const chipConcentration = calculateHHI(chipData);
  
  // 计算主力成本价
  const mainCostPrice = calculateAverageCost(chipData);
  
  // 识别主筹峰值
  const peakInfo = identifyChipPeaks(chipData);
  
  // 计算支撑位和压力位
  const supportResistance = calculateSupportResistance(chipData, mainCostPrice);
  
  // 转换为API返回格式
  const normalizedRanges: ChipPriceRange[] = chipData.map(item => ({
    price: item.price,
    chipRatio: item.percentage,
    holderCount: Math.floor(item.percentage * 100000) + 50000
  }));
  
  // 获取主要支撑位和压力位
  const supportPrice = supportResistance.supportLevels.length > 0 
    ? supportResistance.supportLevels[0].price 
    : mainCostPrice * 0.95;
    
  const resistancePrice = supportResistance.resistanceLevels.length > 0 
    ? supportResistance.resistanceLevels[0].price 
    : mainCostPrice * 1.05;
  
  return {
    stockCode,
    stockName,
    date,
    chipDistribution: normalizedRanges,
    chipConcentration,
    mainCostPrice,
    supportPrice,
    resistancePrice,
    chipPeakInfo: peakInfo
  };
};

export async function fetchChipDistribution(
  params: ChipDistributionParams
): Promise<ApiResponse<ChipDistributionData>> {
  const { stockCode } = params;
  let dataSource = 'Local-API'; // 默认数据源
  
  try {
    // 1. 尝试调用本地后端API
    console.info('Trying to fetch from local backend API');
    const response = await apiGet<ChipDistributionData>(
      '/chip/distribution',
      params,
      { requiresAuth: false }
    );
    
    if (response.code === 200) {
      dataSource = 'Local-API';
      // 增强响应，添加数据源标识
      return {
        ...response,
        data: {
          ...response.data,
          _dataSource: dataSource
        }
      };
    }
  } catch (localApiError) {
    console.warn('Local backend API failed, falling back to free scanner:', localApiError);
    // 继续尝试下一级兜底
  }
  
  // 2. 使用FreeScanner获取实时数据，结合Tushare历史数据进行模拟计算
  try {
    console.info('Using FreeScanner + Tushare to simulate chip distribution');
    
    // 获取实时行情
    let realtimeData: RealtimeStockData | undefined;
    try {
      realtimeData = await freeScanner.getRealtimeQuote(stockCode);
    } catch (e) {
      console.warn('Failed to fetch realtime data:', e);
    }
    
    // 获取历史K线数据（最近60天）
    const endDate = formatDateTime(new Date());
    const startDate = formatDateTime(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));
    
    // 注意：这里需要将日期格式转换为YYYYMMDD
    const tushareStartDate = startDate.replace(/-/g, '');
    const tushareEndDate = endDate.replace(/-/g, '');
    
    const dailyData = await getTushareDailyData(stockCode, tushareStartDate, tushareEndDate);
    const stockBasic = await getTushareStockBasic(stockCode);
    const stockName = stockBasic?.name || stockCode;
    
    // 转换Tushare数据格式
    const convertedData = convertTushareDailyToOHLCV(dailyData);
    
    // 使用WAD算法模拟筹码分布
    const chipData = simulateChipDistributionWithWAD(convertedData, stockCode, stockName, realtimeData);
    dataSource = 'FreeScanner+WAD';
    
    return {
      code: 200,
      msg: 'success',
      data: {
        ...chipData,
        _dataSource: dataSource
      },
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('All real data sources failed:', error);
    throw new ApiError(500, 'Failed to fetch chip distribution data from real sources');
  }
}
