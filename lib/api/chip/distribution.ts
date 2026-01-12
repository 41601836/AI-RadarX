// 筹码分布API
import { apiGet, MockDataGenerator } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { calculateHHI, calculateAverageCost, identifyChipPeaks, calculateSupportResistance, ChipDistributionItem } from '@/lib/algorithms/chipDistribution';
import { getTushareDailyData, getTushareStockBasic, convertTushareToChipData, convertTushareDailyToOHLCV } from '../common/tushare';
import { ApiError, stockCodeFormatError } from '../common/errors';
import { calculateCumulativeWAD, WADItem } from '@/lib/algorithms/wad'; // 导入WAD计算函数和类型
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
  
  // 准备WAD计算所需的数据源
  const wadItems: WADItem[] = dailyData.map(item => ({
    timestamp: item.timestamp,
    high: item.high,
    low: item.low,
    close: item.close
  }));
  
  // 如果有实时数据，将其添加到WAD计算中
  if (realtimeData) {
    wadItems.push({
      timestamp: realtimeData.timestamp,
      high: realtimeData.highPrice,
      low: realtimeData.lowPrice,
      close: realtimeData.currentPrice
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
  let dataSource = 'Mock'; // 默认数据源
  
  try {
    // 1. 优先检查是否处于Mock模式
    if (process.env.NEXT_PUBLIC_API_MOCK === 'true') {
      console.info('Mock mode enabled, using mock data directly');
      dataSource = 'Mock';
      // 直接调用Mock数据生成器，而不是通过apiGet，避免循环调用
      const mockData = await generateChipDistributionMock(params);
      // 构造完整的ApiResponse格式
      return {
        code: 200,
        msg: 'success',
        data: mockData,
        requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        timestamp: Date.now()
      };
    }
    
    // 2. 尝试调用本地后端API
    try {
      console.info('Trying to fetch from local backend API');
      const response = await apiGet<ChipDistributionData>(
        '/v1/chip/distribution',
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
    
    // 3. 尝试从免费行情接口获取实时数据
    let realtimeData: RealtimeStockData | undefined;
    try {
      console.info('Trying to fetch realtime data from free scanner');
      realtimeData = await freeScanner.getRealtimeQuote(stockCode);
      dataSource = 'Realtime-Tencent';
    } catch (scannerError) {
      console.warn('Free scanner failed, falling back to Tushare:', scannerError);
      // 继续尝试下一级兜底
    }
    
    // 4. 尝试从Tushare获取历史日线数据
    try {
      console.info('Trying to fetch historical data from Tushare');
      const { startDate, endDate } = params;
      
      // 获取股票基本信息
      const stockBasic = await getTushareStockBasic(stockCode);
      
      // 获取历史日线数据
      const dailyData = await getTushareDailyData(stockCode, startDate, endDate);
      
      if (dailyData && dailyData.length > 0 && stockBasic) {
        // 转换Tushare数据格式
        const convertedData = convertTushareDailyToOHLCV(dailyData);
        
        // 使用WAD算法融合历史数据和实时价格
        const chipDistributionData = simulateChipDistributionWithWAD(
          convertedData, 
          stockCode, 
          stockBasic.name,
          realtimeData // 传入实时数据
        );
        
        // 返回融合后的数据，确保完整的ApiResponse格式
        return {
          code: 200,
          msg: 'success',
          data: {
            ...chipDistributionData,
            _dataSource: realtimeData ? 'Hybrid-Realtime-Tushare' : 'Baseline-Tushare'
          },
          requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          timestamp: Date.now()
        };
      }
    } catch (tushareError) {
      console.warn('Tushare failed, falling back to mock:', tushareError);
      // 继续尝试最后一级兜底
    }
  } catch (error) {
    console.error('All data sources failed:', error);
    // 所有数据源都失败，最终回退到模拟数据
  }
  
  // 5. 最终回退到模拟数据
  console.info('All data sources failed, using mock data');
  const mockResponse = await apiGet<ChipDistributionData>(
    '/v1/chip/distribution',
    params,
    { requiresAuth: false },
    generateChipDistributionMock
  );
  
  // 增强Mock响应，添加数据源标识
  return {
    ...mockResponse,
    data: {
      ...mockResponse.data,
      _dataSource: 'Mock'
    }
  };
}
