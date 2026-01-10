// 筹码分布算法实现
import { calculateCumulativeWAD, WADItem, WADCalculationOptions } from './wad';

export interface ChipDistributionItem {
  price: number;
  volume: number;
  percentage: number;
  timestamp?: number;
}

// 扩展的筹码分布项，包含WAD指标
export interface ChipDistributionWithWADItem extends ChipDistributionItem {
  wadValue: number;
  weightedWadValue: number;
  wadWeight: number;
}

// WAD增强的筹码分布计算选项
export interface WADEnhancedChipOptions {
  wadOptions?: WADCalculationOptions;
  wadWeightFactor?: number; // WAD对筹码分布的影响权重
  volumeWeightFactor?: number; // 成交量对筹码分布的影响权重
}

// 计算筹码集中度（赫芬达尔-赫希曼指数 HHIndex）
export function calculateHHI(chipData: ChipDistributionItem[]): number {
  if (chipData.length === 0) return 0;
  
  // 计算赫芬达尔-赫希曼指数：HHI = Σ(percentage^2)
  return chipData.reduce((hhi, item) => hhi + Math.pow(item.percentage, 2), 0);
}

// 计算筹码集中度（基尼系数）
export function calculateGiniCoefficient(chipData: ChipDistributionItem[]): number {
  if (chipData.length === 0) return 0;
  
  // 按价格排序
  const sortedData = [...chipData].sort((a, b) => a.price - b.price);
  
  // 计算累积分布
  const n = sortedData.length;
  let cumulativePercentage = 0;
  let gini = 0;
  
  for (let i = 0; i < n; i++) {
    cumulativePercentage += sortedData[i].percentage;
    gini += (2 * (i + 1) - n - 1) * sortedData[i].percentage;
  }
  
  return gini / (n * cumulativePercentage);
}

// 计算平均成本
export function calculateAverageCost(chipData: ChipDistributionItem[]): number {
  if (chipData.length === 0) return 0;
  
  // 合并为单个循环，减少迭代次数
  let totalValue = 0;
  let totalVolume = 0;
  
  for (const item of chipData) {
    totalValue += item.price * item.volume;
    totalVolume += item.volume;
  }
  
  return totalVolume > 0 ? totalValue / totalVolume : 0;
}

// 计算主筹峰值
export interface ChipPeakInfo {
  peakPrice: number;
  peakRatio: number;
  isSinglePeak: boolean;
  peaks: Array<{ price: number; ratio: number; volume: number }>;
}

export function identifyChipPeaks(chipData: ChipDistributionItem[], isSorted: boolean = false): ChipPeakInfo {
  if (chipData.length === 0) {
    return { peakPrice: 0, peakRatio: 0, isSinglePeak: true, peaks: [] };
  }
  
  // 只在需要时排序，避免不必要的排序开销
  const sortedData = isSorted ? chipData : [...chipData].sort((a, b) => a.price - b.price);
  
  // 预分配峰值数组，避免频繁push操作
  const peaks: Array<{ price: number; ratio: number; volume: number }> = [];
  const peakCount = sortedData.length;
  peaks.length = peakCount; // 预分配空间
  let peaksIndex = 0;
  
  // 查找所有峰值点（局部最大值）
  for (let i = 1; i < sortedData.length - 1; i++) {
    const current = sortedData[i];
    const previous = sortedData[i - 1];
    const next = sortedData[i + 1];
    
    if (current.volume > previous.volume && current.volume > next.volume) {
      peaks[peaksIndex++] = {
        price: current.price,
        ratio: current.percentage,
        volume: current.volume
      };
    }
  }
  
  // 处理边界情况
  if (sortedData.length >= 2) {
    if (sortedData[0].volume > sortedData[1].volume) {
      peaks[peaksIndex++] = {
        price: sortedData[0].price,
        ratio: sortedData[0].percentage,
        volume: sortedData[0].volume
      };
    }
    if (sortedData[sortedData.length - 1].volume > sortedData[sortedData.length - 2].volume) {
      peaks[peaksIndex++] = {
        price: sortedData[sortedData.length - 1].price,
        ratio: sortedData[sortedData.length - 1].percentage,
        volume: sortedData[sortedData.length - 1].volume
      };
    }
  } else if (sortedData.length === 1) {
    peaks[peaksIndex++] = {
      price: sortedData[0].price,
      ratio: sortedData[0].percentage,
      volume: sortedData[0].volume
    };
  }
  
  // 截断数组到实际峰值数量
  peaks.length = peaksIndex;
  
  // 按交易量排序峰值（使用更高效的排序方式）
  peaks.sort((a, b) => b.volume - a.volume);
  
  // 确定主峰值
  const mainPeak = peaks.length > 0 ? peaks[0] : { price: 0, ratio: 0, volume: 0 };
  
  // 计算总成交量（避免重复计算）
  let totalVolume = 0;
  for (const item of chipData) {
    totalVolume += item.volume;
  }
  
  // 判断是否为单峰（主峰值占比超过50%）
  const mainPeakRatio = totalVolume > 0 ? mainPeak.volume / totalVolume : 0;
  const isSinglePeak = mainPeakRatio > 0.5;
  
  return {
    peakPrice: mainPeak.price,
    peakRatio: mainPeak.ratio,
    isSinglePeak,
    peaks
  };
}

// 计算支撑位和压力位
export interface SupportResistanceLevels {
  supportLevels: Array<{ price: number; strength: number }>;
  resistanceLevels: Array<{ price: number; strength: number }>;
}

export function calculateSupportResistance(chipData: ChipDistributionItem[], currentPrice: number, isSorted: boolean = false): SupportResistanceLevels {
  if (chipData.length === 0) {
    return { supportLevels: [], resistanceLevels: [] };
  }
  
  // 只在需要时排序，避免不必要的排序开销
  const sortedData = isSorted ? chipData : [...chipData].sort((a, b) => a.price - b.price);
  
  // 计算价格区间的筹码密度
  const densityThreshold = 0.05; // 密度阈值，超过该值的区间视为密集区
  
  // 预分配数组，避免频繁push操作
  const supportLevels: Array<{ price: number; strength: number }> = [];
  const resistanceLevels: Array<{ price: number; strength: number }> = [];
  
  // 合并过滤和映射操作，减少迭代次数
  for (const item of sortedData) {
    if (item.percentage > densityThreshold) {
      if (item.price < currentPrice) {
        supportLevels.push({
          price: item.price,
          strength: item.percentage
        });
      } else if (item.price > currentPrice) {
        resistanceLevels.push({
          price: item.price,
          strength: item.percentage
        });
      }
    }
  }
  
  // 排序支撑位（从高到低）
  supportLevels.sort((a, b) => b.price - a.price);
  
  // 排序压力位（从低到高）
  resistanceLevels.sort((a, b) => a.price - b.price);
  
  return {
    supportLevels,
    resistanceLevels
  };
}

// 计算筹码趋势
export interface ChipTrendData {
  date: string;
  concentration: number;
  mainCost: number;
  peakPrice: number;
}

export function calculateChipTrend(chipDataHistory: Array<{ date: string; chipData: ChipDistributionItem[] }>): ChipTrendData[] {
  return chipDataHistory.map(item => {
    const { date, chipData } = item;
    const hhi = calculateHHI(chipData);
    const avgCost = calculateAverageCost(chipData);
    const peakInfo = identifyChipPeaks(chipData);
    
    return {
      date,
      concentration: hhi,
      mainCost: avgCost,
      peakPrice: peakInfo.peakPrice
    };
  });
}

// 基于WAD指标增强的筹码分布计算
export interface EnhancedChipDistributionResult {
  chipDistribution: ChipDistributionWithWADItem[];
  wadData: ReturnType<typeof calculateCumulativeWAD>;
  enhancedConcentration: number; // 考虑WAD的增强集中度
  enhancedMainCost: number; // 考虑WAD的增强主力成本
  enhancedSupportResistance: ReturnType<typeof calculateSupportResistance>;
}

export function calculateEnhancedChipDistribution(
  priceData: Array<{ timestamp: number; high: number; low: number; close: number; volume: number }>,
  options: WADEnhancedChipOptions = {}
): EnhancedChipDistributionResult {
  const { 
    wadOptions = { decayRate: 0.1, weightType: 'volume' },
    wadWeightFactor = 0.3,
    volumeWeightFactor = 0.7
  } = options;
  
  if (priceData.length === 0) {
    return {
      chipDistribution: [],
      wadData: [],
      enhancedConcentration: 0,
      enhancedMainCost: 0,
      enhancedSupportResistance: { supportLevels: [], resistanceLevels: [] }
    };
  }
  
  // 1. 计算WAD指标
  const wadData = calculateCumulativeWAD(priceData as WADItem[], wadOptions);
  
  // 2. 计算基础筹码分布
  const priceRange = 0.2; // 价格区间范围（20%）
  
  // 计算价格范围的最小值和最大值，同时构建价格数组
  const dataLength = priceData.length;
  const prices = new Array(dataLength);
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  
  for (let i = 0; i < dataLength; i++) {
    const price = priceData[i].close;
    prices[i] = price;
    if (price < minPrice) minPrice = price;
    if (price > maxPrice) maxPrice = price;
  }
  
  const priceStep = (maxPrice - minPrice) * 0.01; // 1%的价格步长
  const priceStart = minPrice * (1 - priceRange);
  const priceEnd = maxPrice * (1 + priceRange);
  
  // 计算价格区间数量
  const numPriceIntervals = Math.ceil((priceEnd - priceStart) / priceStep);
  
  // 创建价格区间
  const baseChipDistribution: ChipDistributionItem[] = new Array(numPriceIntervals);
  const firstPrice = priceStart;
  
  for (let i = 0; i < numPriceIntervals; i++) {
    baseChipDistribution[i] = {
      price: Math.round(priceStart + i * priceStep),
      volume: 0,
      percentage: 0
    };
  }
  
  // 3. 根据成交数据填充筹码分布
  // 使用更快的索引计算方式
  for (const data of priceData) {
    const priceIndex = Math.round((data.close - firstPrice) / priceStep);
    if (priceIndex >= 0 && priceIndex < numPriceIntervals) {
      baseChipDistribution[priceIndex].volume += data.volume;
    }
  }
  
  // 4. 计算WAD增强的筹码分布
  // 计算总成交量
  let totalVolume = 0;
  for (const item of baseChipDistribution) {
    totalVolume += item.volume;
  }
  
  // 计算总WAD权重
  let totalWADWeight = 0;
  const wadDataLength = wadData.length;
  for (let i = 0; i < wadDataLength; i++) {
    totalWADWeight += wadData[i].weight;
  }
  
  // 预分配增强筹码数据数组
  const enhancedChipData: ChipDistributionWithWADItem[] = new Array(numPriceIntervals);
  
  // 构建价格到WAD索引的映射，避免重复查找
  const priceToWadIndexMap = new Map<number, number>();
  for (let i = 0; i < prices.length; i++) {
    priceToWadIndexMap.set(prices[i], i);
  }
  
  // 匹配WAD数据和筹码分布
  for (let i = 0; i < numPriceIntervals; i++) {
    const chip = baseChipDistribution[i];
    const chipPrice = chip.price;
    
    // 快速查找最接近的WAD数据点
    let closestIndex: number;
    if (priceToWadIndexMap.has(chipPrice)) {
      closestIndex = priceToWadIndexMap.get(chipPrice) || 0;
    } else {
      // 线性搜索最接近的价格
      let closestDiff = Infinity;
      closestIndex = 0;
      for (let j = 0; j < prices.length; j++) {
        const diff = Math.abs(prices[j] - chipPrice);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = j;
          if (diff === 0) break;
        }
      }
    }
    
    const closestWAD = wadData[closestIndex];
    const wadValue = closestWAD.weightedWad;
    
    // 计算增强的成交量（考虑WAD和原始成交量）
    const baseVolumeWeight = totalVolume > 0 ? chip.volume / totalVolume : 0;
    const wadInfluence = totalWADWeight > 0 ? (wadValue / totalWADWeight) * wadWeightFactor : 0;
    const enhancedVolume = chip.volume * (1 + wadInfluence);
    
    // 直接构造对象，避免展开运算符的开销
    enhancedChipData[i] = {
      price: chip.price,
      volume: enhancedVolume,
      percentage: 0, // 稍后计算
      wadValue: closestWAD.wad,
      weightedWadValue: closestWAD.weightedWad,
      wadWeight: closestWAD.weight
    };
  }
  
  // 重新计算百分比
  let enhancedTotalVolume = 0;
  for (const item of enhancedChipData) {
    enhancedTotalVolume += item.volume;
  }
  
  if (enhancedTotalVolume > 0) {
    for (const item of enhancedChipData) {
      item.percentage = item.volume / enhancedTotalVolume;
    }
  }
  
  // 5. 计算增强的筹码指标
  const enhancedConcentration = calculateHHI(enhancedChipData);
  const enhancedMainCost = calculateAverageCost(enhancedChipData);
  const enhancedSupportResistance = calculateSupportResistance(enhancedChipData, enhancedMainCost, true);
  
  return {
    chipDistribution: enhancedChipData,
    wadData,
    enhancedConcentration,
    enhancedMainCost,
    enhancedSupportResistance
  };
}

// 计算综合筹码强度（结合WAD和筹码分布）（性能优化版）
export function calculateCompositeChipStrength(
  enhancedChipData: EnhancedChipDistributionResult
): { strength: number; factors: { concentration: number; wad: number; supportResistance: number } } {
  const { chipDistribution, wadData, enhancedConcentration, enhancedSupportResistance } = enhancedChipData;
  
  if (chipDistribution.length === 0 || wadData.length === 0) {
    return { strength: 0, factors: { concentration: 0, wad: 0, supportResistance: 0 } };
  }
  
  // 1. 筹码集中度因子（值越大越集中，强度越高）
  const concentrationFactor = Math.min(1, enhancedConcentration);
  
  // 2. WAD因子（值越大，资金流入越强，强度越高）
  const latestWAD = wadData[wadData.length - 1].weightedWad;
  
  // 性能优化：使用循环替代map和spread操作，减少内存分配
  let maxWAD = -Infinity;
  let minWAD = Infinity;
  for (const item of wadData) {
    const value = item.weightedWad;
    if (value > maxWAD) maxWAD = value;
    if (value < minWAD) minWAD = value;
  }
  
  const wadRange = maxWAD - minWAD;
  const wadFactor = wadRange > 0 ? (latestWAD - minWAD) / wadRange : 0;
  
  // 3. 支撑压力因子（支撑位和压力位的强度）
  let supportStrength = 0;
  if (enhancedSupportResistance.supportLevels.length > 0) {
    // 性能优化：使用循环替代map和max操作
    supportStrength = enhancedSupportResistance.supportLevels[0].strength;
    for (let i = 1; i < enhancedSupportResistance.supportLevels.length; i++) {
      if (enhancedSupportResistance.supportLevels[i].strength > supportStrength) {
        supportStrength = enhancedSupportResistance.supportLevels[i].strength;
      }
    }
  }
  
  let resistanceStrength = 0;
  if (enhancedSupportResistance.resistanceLevels.length > 0) {
    // 性能优化：使用循环替代map和max操作
    resistanceStrength = enhancedSupportResistance.resistanceLevels[0].strength;
    for (let i = 1; i < enhancedSupportResistance.resistanceLevels.length; i++) {
      if (enhancedSupportResistance.resistanceLevels[i].strength > resistanceStrength) {
        resistanceStrength = enhancedSupportResistance.resistanceLevels[i].strength;
      }
    }
  }
  
  const supportResistanceFactor = (supportStrength + resistanceStrength) / 2;
  
  // 综合强度（加权平均）
  const strength = (concentrationFactor * 0.4) + (wadFactor * 0.4) + (supportResistanceFactor * 0.2);
  
  return {
    strength,
    factors: {
      concentration: concentrationFactor,
      wad: wadFactor,
      supportResistance: supportResistanceFactor
    }
  };
}
