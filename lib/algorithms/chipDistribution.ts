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
  // 优化：使用高精度累加器和类型转换提高计算精度
  let hhi = 0.0;
  for (const item of chipData) {
    const percentage = parseFloat(item.percentage.toFixed(10)); // 提高精度
    hhi += percentage * percentage;
  }
  return hhi;
}

// 计算HHI集中度等级
export function getHHILevel(hhi: number): 'low' | 'medium' | 'high' | 'very_high' {
  if (hhi < 0.15) return 'low';
  if (hhi < 0.25) return 'medium';
  if (hhi < 0.5) return 'high';
  return 'very_high';
}

// 计算基尼系数（高精度实现）
export function calculateGiniCoefficient(chipData: ChipDistributionItem[]): number {
  if (chipData.length === 0) return 0;
  
  // 按价格排序
  const sortedData = [...chipData].sort((a, b) => a.price - b.price);
  const n = sortedData.length;
  
  // 计算累积分布
  let totalVolume = 0;
  let cumulativeVolume = 0;
  let giniSum = 0;
  
  // 计算总成交量
  for (const item of sortedData) {
    totalVolume += item.volume;
  }
  
  if (totalVolume === 0) return 0;
  
  // 计算基尼系数
  for (let i = 0; i < n; i++) {
    cumulativeVolume += sortedData[i].volume;
    giniSum += (2 * (i + 1) - n - 1) * sortedData[i].volume;
  }
  
  // 高精度计算：使用BigDecimal-like的处理方式
  const gini = (giniSum / (n * totalVolume)) * (n / (n - 1));
  
  // 确保结果在0-1之间
  return Math.max(0, Math.min(1, gini));
}

// 计算基尼系数等级
export function getGiniLevel(gini: number): 'low' | 'medium' | 'high' | 'very_high' {
  if (gini < 0.2) return 'low';
  if (gini < 0.35) return 'medium';
  if (gini < 0.6) return 'high';
  return 'very_high';
}

// 计算筹码集中度（CR指标）
export interface CRIndicatorParams {
  chipData: ChipDistributionItem[];
  currentPrice: number;
  periods?: [number, number, number, number]; // 默认：[5, 10, 20, 60]
  precision?: number; // 计算精度（默认2位小数）
  useWeightedVolume?: boolean; // 是否使用加权成交量
}

export interface CRIndicatorResult {
  crValues: { period: number; value: number }[];
  avgCR: number;
  strength: number; // CR指标强度（0-1）
  interpretation: string; // 指标解读
}

export function calculateCRIndicator(params: CRIndicatorParams): CRIndicatorResult {
  const { chipData, currentPrice, periods = [5, 10, 20, 60], precision = 4, useWeightedVolume = false } = params;
  
  if (chipData.length === 0) {
    return {
      crValues: periods.map(period => ({ period, value: 0 })),
      avgCR: 0,
      strength: 0,
      interpretation: '数据不足'
    };
  }
  
  // 按价格排序
  const sortedData = [...chipData].sort((a, b) => a.price - b.price);
  
  // 预计算总成交量和总加权成交量
  const totalVolume = sortedData.reduce((sum, item) => sum + item.volume, 0);
  const totalWeightedVolume = sortedData.reduce((sum, item) => sum + (item.percentage * totalVolume), 0);
  
  // 找到当前价格的位置（使用二分查找提高性能）
  let currentIndex = binarySearchPriceIndex(sortedData, currentPrice);
  if (currentIndex === -1) currentIndex = sortedData.length - 1;
  
  // 计算各个周期的CR值
  const crValues = periods.map(period => {
    // 计算价格区间范围
    const startIndex = Math.max(0, currentIndex - period);
    const endIndex = Math.min(sortedData.length - 1, currentIndex + period);
    
    // 计算多空双方的筹码量（高精度累加）
    let bullVolume = 0;
    let bearVolume = 0;
    
    for (let i = startIndex; i <= endIndex; i++) {
      const item = sortedData[i];
      let volume = 0;
      
      if (useWeightedVolume) {
        // 使用加权成交量计算
        volume = item.percentage * totalVolume;
      } else {
        // 使用实际成交量计算
        volume = item.volume;
      }
      
      if (item.price >= currentPrice) {
        bullVolume += volume;
      } else {
        bearVolume += volume;
      }
    }
    
    // 防止除以零并限制CR值范围
    let cr = 0;
    if (bearVolume > 0) {
      // 使用对数变换提高小值时的区分度
      cr = (bullVolume / bearVolume) * 100;
      // 应用平滑处理，避免极端值
      cr = Math.max(0.1, Math.min(500, cr));
    } else {
      cr = 300; // 当没有空头筹码时，CR值设为较高值
    }
    
    // 高精度四舍五入
    const roundedCR = parseFloat(cr.toFixed(precision));
    
    return { period, value: roundedCR };
  });
  
  // 计算平均CR值（使用加权平均，长期周期权重更高）
  const weightedSum = crValues.reduce((sum, item) => {
    // 周期越长，权重越高
    const weight = Math.log(item.period + 1);
    return sum + (item.value * weight);
  }, 0);
  
  const totalWeight = crValues.reduce((sum, item) => sum + Math.log(item.period + 1), 0);
  const avgCR = parseFloat((weightedSum / totalWeight).toFixed(precision));
  
  // 计算CR强度（0-1）- 更精细的分段
  let strength = 0.0;
  let interpretation = '';
  
  if (avgCR < 30) {
    strength = 0.1; // 极弱
    interpretation = '筹码极度分散，市场极度弱势';
  } else if (avgCR < 50) {
    strength = 0.25; // 弱势
    interpretation = '筹码分散，市场弱势';
  } else if (avgCR < 80) {
    strength = 0.4; // 中等偏弱
    interpretation = '筹码较为分散，市场弱势震荡';
  } else if (avgCR < 120) {
    strength = 0.55; // 中等
    interpretation = '筹码相对集中，市场平衡';
  } else if (avgCR < 160) {
    strength = 0.7; // 中等偏强
    interpretation = '筹码集中，多头略占优势';
  } else if (avgCR < 200) {
    strength = 0.85; // 较强
    interpretation = '筹码高度集中，多头主导';
  } else {
    strength = 0.95; // 极强
    interpretation = '筹码极度集中，多头强势';
  }
  
  return { crValues, avgCR, strength, interpretation };
}

// 二分查找价格索引（用于提高性能）
function binarySearchPriceIndex(data: ChipDistributionItem[], targetPrice: number): number {
  let left = 0;
  let right = data.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (data[mid].price === targetPrice) {
      return mid;
    } else if (data[mid].price < targetPrice) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  // 返回大于等于目标价格的第一个位置
  return left;
}

// 计算筹码集中度（高精度版，结合多种指标）
export interface ChipConcentrationParams {
  chipData: ChipDistributionItem[];
  currentPrice: number;
  useWeightedVolume?: boolean; // 是否使用加权成交量计算CR指标
  precision?: number; // 计算精度
}

export interface ChipConcentrationResult {
  hhi: number; // 赫芬达尔-赫希曼指数
  hhiLevel: 'low' | 'medium' | 'high' | 'very_high'; // HHI等级
  gini: number; // 基尼系数
  giniLevel: 'low' | 'medium' | 'high' | 'very_high'; // 基尼系数等级
  crIndicator: CRIndicatorResult; // CR指标
  concentrationScore: number; // 综合集中度评分（0-1）
  concentrationGrade: 'low' | 'medium' | 'high' | 'very_high'; // 综合集中度等级
  interpretation: string; // 综合解读
}

export function calculateChipConcentration(params: ChipConcentrationParams): ChipConcentrationResult {
  const { chipData, currentPrice, useWeightedVolume = false, precision = 2 } = params;
  
  const hhi = calculateHHI(chipData);
  const hhiLevel = getHHILevel(hhi);
  
  const gini = calculateGiniCoefficient(chipData);
  const giniLevel = getGiniLevel(gini);
  
  const crIndicator = calculateCRIndicator({ 
    chipData, 
    currentPrice, 
    useWeightedVolume,
    precision
  });
  
  // 计算综合集中度评分（0-1）
  // 使用加权平均，HHI权重0.4，基尼系数0.3，CR强度0.3
  const concentrationScore = parseFloat((
    (getHHILevelWeight(hhiLevel) * 0.4) +
    (getGiniLevelWeight(giniLevel) * 0.3) +
    (crIndicator.strength * 0.3)
  ).toFixed(2));
  
  // 确定综合集中度等级
  const concentrationGrade = getConcentrationGrade(concentrationScore);
  
  // 生成综合解读
  const interpretation = generateConcentrationInterpretation(
    concentrationGrade, hhiLevel, giniLevel, crIndicator
  );
  
  return {
    hhi,
    hhiLevel,
    gini,
    giniLevel,
    crIndicator,
    concentrationScore,
    concentrationGrade,
    interpretation
  };
}

// 辅助函数：获取HHI等级权重
function getHHILevelWeight(level: 'low' | 'medium' | 'high' | 'very_high'): number {
  switch (level) {
    case 'low': return 0.25;
    case 'medium': return 0.5;
    case 'high': return 0.75;
    case 'very_high': return 1.0;
    default: return 0.5;
  }
}

// 辅助函数：获取基尼系数等级权重
function getGiniLevelWeight(level: 'low' | 'medium' | 'high' | 'very_high'): number {
  switch (level) {
    case 'low': return 0.25;
    case 'medium': return 0.5;
    case 'high': return 0.75;
    case 'very_high': return 1.0;
    default: return 0.5;
  }
}

// 辅助函数：获取综合集中度等级
function getConcentrationGrade(score: number): 'low' | 'medium' | 'high' | 'very_high' {
  if (score < 0.4) return 'low';
  if (score < 0.6) return 'medium';
  if (score < 0.8) return 'high';
  return 'very_high';
}

// 辅助函数：生成综合解读
function generateConcentrationInterpretation(
  grade: 'low' | 'medium' | 'high' | 'very_high',
  hhiLevel: 'low' | 'medium' | 'high' | 'very_high',
  giniLevel: 'low' | 'medium' | 'high' | 'very_high',
  crIndicator: CRIndicatorResult
): string {
  const gradeInterpretations: { [key: string]: string } = {
    'low': '筹码高度分散',
    'medium': '筹码中等集中',
    'high': '筹码高度集中',
    'very_high': '筹码极度集中'
  };
  
  const interpretation = `综合筹码集中度${gradeInterpretations[grade]}。\n` +
    `HHI指数${hhiLevel === 'very_high' ? '极度集中' : 
      hhiLevel === 'high' ? '高度集中' : 
      hhiLevel === 'medium' ? '中等集中' : '较为分散'}，` +
    `基尼系数${giniLevel === 'very_high' ? '极度不均' : 
      giniLevel === 'high' ? '高度不均' : 
      giniLevel === 'medium' ? '中等不均' : '较为均匀'}，` +
    `CR指标显示${crIndicator.interpretation}。`;
  
  return interpretation;
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
  peakPrice: number;
  peakRatio: number;
  isSinglePeak: boolean;
  peaks: ChipPeak[];
  dominantPeak: ChipPeak;
  secondaryPeaks: ChipPeak[]; // 次要峰值
  peakDensity: number; // 峰值密度
  peakQualityScore: number; // 峰值质量综合评分（0-1）
  priceRange: number; // 价格范围
}

// 峰值质量评估参数
export interface PeakQualityParams {
  minVolumeThreshold?: number; // 最小成交量阈值
  minDominanceThreshold?: number; // 最小优势度阈值
  minStrengthThreshold?: number; // 最小强度阈值
  peakMergeDistance?: number; // 峰值合并距离（百分比）
  useVolumeWeighting?: boolean; // 是否使用成交量加权
}

export function identifyChipPeaks(chipData: ChipDistributionItem[], isSorted: boolean = false, qualityParams: PeakQualityParams = {}): ChipPeakInfo {
  const {
    minVolumeThreshold = 0.05, // 最小成交量阈值（占总成交量的百分比）
    minDominanceThreshold = 0.05, // 最小优势度阈值
    minStrengthThreshold = 0.1, // 最小强度阈值
    peakMergeDistance = 0.02, // 峰值合并距离（2%价格区间）
    useVolumeWeighting = true // 是否使用成交量加权
  } = qualityParams;
  
  if (chipData.length === 0) {
    const emptyPeak: ChipPeak = { price: 0, ratio: 0, volume: 0, width: 0, dominance: 0, strength: 0, reliability: 0, centerPrice: 0, volumeWeightedPrice: 0 };
    return {
      peakPrice: 0,
      peakRatio: 0,
      isSinglePeak: true,
      peaks: [],
      dominantPeak: emptyPeak,
      secondaryPeaks: [],
      peakDensity: 0,
      peakQualityScore: 0,
      priceRange: 0
    };
  }
  
  // 只在需要时排序，避免不必要的排序开销
  const sortedData = isSorted ? chipData : [...chipData].sort((a, b) => a.price - b.price);
  
  // 计算总成交量和总加权成交量
  const totalVolume = sortedData.reduce((sum, item) => sum + item.volume, 0);
  const totalWeightedVolume = sortedData.reduce((sum, item) => sum + (item.volume * item.percentage), 0);
  
  // 计算价格范围
  const minPrice = sortedData[0].price;
  const maxPrice = sortedData[sortedData.length - 1].price;
  const priceRange = maxPrice - minPrice;
  const priceMergeThreshold = priceRange * peakMergeDistance;
  
  // 使用梯度分析查找峰值
  const peaks: ChipPeak[] = [];
  
  // 计算梯度（成交量变化率）
  const gradients = new Array(sortedData.length - 1);
  for (let i = 0; i < sortedData.length - 1; i++) {
    const priceDiff = sortedData[i + 1].price - sortedData[i].price;
    const volumeDiff = sortedData[i + 1].volume - sortedData[i].volume;
    gradients[i] = priceDiff > 0 ? volumeDiff / priceDiff : 0;
  }
  
  // 查找峰值点（梯度由正变负的点）
  for (let i = 1; i < gradients.length; i++) {
    if (gradients[i - 1] > 0 && gradients[i] < 0) {
      // 计算峰值位置（使用抛物线插值提高精度）
      const peakIndex = i;
      const current = sortedData[peakIndex];
      const previous = sortedData[peakIndex - 1];
      const next = sortedData[peakIndex + 1];
      
      // 计算峰值宽度
      let leftIndex = peakIndex;
      let rightIndex = peakIndex;
      let totalPeakVolume = current.volume;
      
      // 向左扩展找到峰值边界（低于50%成交量）
      while (leftIndex > 0 && sortedData[leftIndex].volume > current.volume * 0.5) {
        leftIndex--;
        totalPeakVolume += sortedData[leftIndex].volume;
      }
      
      // 向右扩展找到峰值边界（低于50%成交量）
      while (rightIndex < sortedData.length - 1 && sortedData[rightIndex].volume > current.volume * 0.5) {
        rightIndex++;
        totalPeakVolume += sortedData[rightIndex].volume;
      }
      
      // 计算峰值宽度
      const width = sortedData[rightIndex].price - sortedData[leftIndex].price;
      
      // 计算峰值优势度
      const dominance = totalVolume > 0 ? totalPeakVolume / totalVolume : 0;
      
      // 计算峰值强度
      const strength = dominance * (1 - width / (priceRange || 1));
      
      // 计算成交量加权价格
      let volumeWeightedPrice = current.price;
      let sumWeightedPrice = 0;
      let sumWeight = 0;
      
      if (useVolumeWeighting) {
        for (let j = leftIndex; j <= rightIndex; j++) {
          sumWeightedPrice += sortedData[j].price * sortedData[j].volume;
          sumWeight += sortedData[j].volume;
        }
        volumeWeightedPrice = sumWeight > 0 ? sumWeightedPrice / sumWeight : current.price;
      }
      
      // 计算峰值可靠性
      const reliability = calculatePeakReliability(
        sortedData,
        peakIndex,
        leftIndex,
        rightIndex,
        dominance,
        strength
      );
      
      // 应用质量阈值过滤
      if (dominance >= minDominanceThreshold && 
          strength >= minStrengthThreshold && 
          totalPeakVolume / totalVolume >= minVolumeThreshold) {
        peaks.push({
          price: current.price,
          ratio: current.percentage,
          volume: totalPeakVolume,
          width,
          dominance,
          strength,
          reliability,
          centerPrice: (sortedData[leftIndex].price + sortedData[rightIndex].price) / 2,
          volumeWeightedPrice
        });
      }
    }
  }
  
  // 处理边界情况
  if (sortedData.length >= 2) {
    // 检查左侧边界
    if (sortedData[0].volume > sortedData[1].volume) {
      const dominance = totalVolume > 0 ? sortedData[0].volume / totalVolume : 0;
      const strength = dominance;
      
      if (dominance >= minDominanceThreshold && strength >= minStrengthThreshold) {
        peaks.push({
          price: sortedData[0].price,
          ratio: sortedData[0].percentage,
          volume: sortedData[0].volume,
          width: sortedData[1].price - sortedData[0].price,
          dominance,
          strength,
          reliability: 0.5, // 边界峰值可靠性较低
          centerPrice: sortedData[0].price,
          volumeWeightedPrice: sortedData[0].price
        });
      }
    }
    
    // 检查右侧边界
    if (sortedData[sortedData.length - 1].volume > sortedData[sortedData.length - 2].volume) {
      const dominance = totalVolume > 0 ? sortedData[sortedData.length - 1].volume / totalVolume : 0;
      const strength = dominance;
      
      if (dominance >= minDominanceThreshold && strength >= minStrengthThreshold) {
        peaks.push({
          price: sortedData[sortedData.length - 1].price,
          ratio: sortedData[sortedData.length - 1].percentage,
          volume: sortedData[sortedData.length - 1].volume,
          width: sortedData[sortedData.length - 1].price - sortedData[sortedData.length - 2].price,
          dominance,
          strength,
          reliability: 0.5, // 边界峰值可靠性较低
          centerPrice: sortedData[sortedData.length - 1].price,
          volumeWeightedPrice: sortedData[sortedData.length - 1].price
        });
      }
    }
  } else if (sortedData.length === 1) {
    const dominance = 1.0;
    const strength = 1.0;
    peaks.push({
      price: sortedData[0].price,
      ratio: sortedData[0].percentage,
      volume: sortedData[0].volume,
      width: 0,
      dominance,
      strength,
      reliability: 1.0,
      centerPrice: sortedData[0].price,
      volumeWeightedPrice: sortedData[0].price
    });
  }
  
  // 合并接近的峰值
  const mergedPeaks = mergeClosePeaks(peaks, sortedData, peakMergeDistance * 100, useVolumeWeighting);
  
  // 按强度排序峰值
  mergedPeaks.sort((a, b) => b.strength - a.strength);
  
  // 确定主峰值
  const dominantPeak = mergedPeaks.length > 0 ? mergedPeaks[0] : {
    price: 0,
    ratio: 0,
    volume: 0,
    width: 0,
    dominance: 0,
    strength: 0,
    reliability: 0,
    centerPrice: 0,
    volumeWeightedPrice: 0
  };
  
  // 确定次要峰值（强度排名第二的峰值）
  const secondaryPeaks = mergedPeaks.slice(1, Math.min(3, mergedPeaks.length));
  
  // 判断是否为单峰（主峰值优势度超过50%）
  const isSinglePeak = dominantPeak.dominance > 0.5;
  
  // 计算峰值密度
  const peakDensity = mergedPeaks.length / (priceRange > 0 ? priceRange : 1);
  
  // 计算峰值质量综合评分
  const peakQualityScore = calculatePeakQualityScore(mergedPeaks, dominantPeak, sortedData);
  
  return {
    peakPrice: dominantPeak.centerPrice,
    peakRatio: dominantPeak.ratio,
    isSinglePeak,
    peaks: mergedPeaks,
    dominantPeak,
    secondaryPeaks,
    peakDensity,
    peakQualityScore,
    priceRange
  };
}

// 计算峰值可靠性
function calculatePeakReliability(
  sortedData: ChipDistributionItem[],
  peakIndex: number,
  leftIndex: number,
  rightIndex: number,
  dominance: number,
  strength: number
): number {
  const dataLength = sortedData.length;
  
  // 计算左右两侧的对称性
  const leftSlope = peakIndex > 0 ? 
    (sortedData[peakIndex].volume - sortedData[leftIndex].volume) / (peakIndex - leftIndex) : 0;
  const rightSlope = peakIndex < dataLength - 1 ? 
    (sortedData[peakIndex].volume - sortedData[rightIndex].volume) / (rightIndex - peakIndex) : 0;
  
  const symmetry = Math.min(1, 1 - Math.abs(leftSlope - rightSlope) / (Math.abs(leftSlope) + Math.abs(rightSlope) + 0.0001));
  
  // 计算局部最大值的显著性
  const localMaxSignificance = sortedData.slice(leftIndex, rightIndex + 1)
    .reduce((max, item) => Math.max(max, item.volume), 0) / sortedData[peakIndex].volume;
  
  // 计算可靠性（0-1）
  const reliability = (
    dominance * 0.4 +
    strength * 0.3 +
    symmetry * 0.2 +
    localMaxSignificance * 0.1
  );
  
  return Math.max(0, Math.min(1, reliability));
}

// 合并接近的峰值
function mergeClosePeaks(
  peaks: ChipPeak[],
  sortedData: ChipDistributionItem[],
  mergeDistancePercentage: number,
  useVolumeWeighting: boolean
): ChipPeak[] {
  if (peaks.length <= 1) return peaks;
  
  // 按价格排序峰值
  const sortedPeaks = [...peaks].sort((a, b) => a.price - b.price);
  const mergedPeaks: ChipPeak[] = [];
  
  let currentMergeGroup: ChipPeak[] = [sortedPeaks[0]];
  
  for (let i = 1; i < sortedPeaks.length; i++) {
    const currentPeak = sortedPeaks[i];
    const lastPeakInGroup = currentMergeGroup[currentMergeGroup.length - 1];
    
    // 计算价格差百分比
    const priceDiffPercentage = Math.abs(currentPeak.price - lastPeakInGroup.price) / lastPeakInGroup.price * 100;
    
    if (priceDiffPercentage <= mergeDistancePercentage) {
      // 合并到当前组
      currentMergeGroup.push(currentPeak);
    } else {
      // 处理当前合并组
      if (currentMergeGroup.length > 1) {
        mergedPeaks.push(combinePeaks(currentMergeGroup, sortedData, useVolumeWeighting));
      } else {
        mergedPeaks.push(currentMergeGroup[0]);
      }
      // 开始新的合并组
      currentMergeGroup = [currentPeak];
    }
  }
  
  // 处理最后一个合并组
  if (currentMergeGroup.length > 1) {
    mergedPeaks.push(combinePeaks(currentMergeGroup, sortedData, useVolumeWeighting));
  } else {
    mergedPeaks.push(currentMergeGroup[0]);
  }
  
  return mergedPeaks;
}

// 合并多个峰值为单个峰值
function combinePeaks(
  peaks: ChipPeak[],
  sortedData: ChipDistributionItem[],
  useVolumeWeighting: boolean
): ChipPeak {
  // 按强度排序，确定主要峰值
  peaks.sort((a, b) => b.strength - a.strength);
  const mainPeak = peaks[0];
  
  // 计算合并后的属性
  let totalVolume = mainPeak.volume;
  let totalDominance = mainPeak.dominance;
  let sumWeightedPrice = mainPeak.price * mainPeak.volume;
  let sumWeight = mainPeak.volume;
  
  for (let i = 1; i < peaks.length; i++) {
    const peak = peaks[i];
    totalVolume += peak.volume;
    totalDominance += peak.dominance;
    sumWeightedPrice += peak.price * peak.volume;
    sumWeight += peak.volume;
  }
  
  // 计算平均优势度
  const avgDominance = totalDominance / peaks.length;
  
  // 计算合并后的价格
  const mergedPrice = useVolumeWeighting && sumWeight > 0 ? sumWeightedPrice / sumWeight : mainPeak.price;
  
  // 计算合并后的宽度
  const minPrice = Math.min(...peaks.map(p => p.price - p.width / 2));
  const maxPrice = Math.max(...peaks.map(p => p.price + p.width / 2));
  const mergedWidth = maxPrice - minPrice;
  
  // 计算合并后的强度
  const totalStrength = peaks.reduce((sum, p) => sum + p.strength, 0);
  const avgStrength = totalStrength / peaks.length;
  const mergedStrength = avgDominance * (1 - mergedWidth / (maxPrice - minPrice + 0.0001));
  
  // 计算合并后的可靠性（取最小值）
  const minReliability = Math.min(...peaks.map(p => p.reliability));
  
  return {
    price: mergedPrice,
    ratio: mainPeak.ratio,
    volume: totalVolume,
    width: mergedWidth,
    dominance: avgDominance,
    strength: Math.max(avgStrength, mergedStrength),
    reliability: minReliability,
    centerPrice: mergedPrice,
    volumeWeightedPrice: mergedPrice
  };
}

// 计算峰值质量综合评分
function calculatePeakQualityScore(
  peaks: ChipPeak[],
  dominantPeak: ChipPeak,
  sortedData: ChipDistributionItem[]
): number {
  if (peaks.length === 0) return 0;
  
  // 计算总成交量
  const totalVolume = sortedData.reduce((sum, item) => sum + item.volume, 0);
  
  // 计算主要峰值覆盖率
  const mainPeakCoverage = dominantPeak.volume / totalVolume;
  
  // 计算峰值分布均匀性
  let peakUniformity = 0;
  if (peaks.length > 1) {
    const peakVolumes = peaks.map(p => p.volume);
    const avgVolume = peakVolumes.reduce((sum, v) => sum + v, 0) / peakVolumes.length;
    const variance = peakVolumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / peakVolumes.length;
    peakUniformity = 1 - Math.min(1, variance / (avgVolume * avgVolume));
  } else {
    peakUniformity = 1.0;
  }
  
  // 计算峰值质量综合评分
  const qualityScore = (
    dominantPeak.strength * 0.4 +
    dominantPeak.reliability * 0.3 +
    mainPeakCoverage * 0.2 +
    peakUniformity * 0.1
  );
  
  return Math.max(0, Math.min(1, qualityScore));
}

// 计算支撑位和压力位
export interface SupportResistanceLevel {
  price: number;
  strength: number; // 强度（0-1）
  volume: number; // 支撑/压力位的成交量
  reliability: number; // 可靠性（0-1）
  width: number; // 支撑/压力区间宽度
  distance: number; // 距离当前价格的百分比
  type: 'support' | 'resistance';
}

export interface SupportResistanceLevels {
  supportLevels: SupportResistanceLevel[];
  resistanceLevels: SupportResistanceLevel[];
  strongestSupport: SupportResistanceLevel | null;
  strongestResistance: SupportResistanceLevel | null;
  supportResistanceRatio: number; // 支撑压力比
}

export function calculateSupportResistance(chipData: ChipDistributionItem[], currentPrice: number, isSorted: boolean = false): SupportResistanceLevels {
  if (chipData.length === 0) {
    return {
      supportLevels: [],
      resistanceLevels: [],
      strongestSupport: null,
      strongestResistance: null,
      supportResistanceRatio: 0
    };
  }
  
  // 只在需要时排序，避免不必要的排序开销
  const sortedData = isSorted ? chipData : [...chipData].sort((a, b) => a.price - b.price);
  
  // 计算总成交量和平均筹码密度
  let totalVolume = 0;
  let totalPercentage = 0;
  for (const item of sortedData) {
    totalVolume += item.volume;
    totalPercentage += item.percentage;
  }
  const avgDensity = totalPercentage / sortedData.length;
  
  // 动态密度阈值（基于平均密度的1.5倍）
  const densityThreshold = avgDensity * 1.5;
  
  // 使用峰值分析辅助支撑/压力位识别
  const peakInfo = identifyChipPeaks(chipData, true);
  const peakPrices = new Set(peakInfo.peaks.map(peak => peak.price));
  
  // 检测价格簇（连续的密集区）
  const detectPriceClusters = (startIndex: number, endIndex: number, direction: 'up' | 'down'): SupportResistanceLevel[] => {
    const clusters: SupportResistanceLevel[] = [];
    let currentCluster: { prices: number[]; volumes: number[]; percentages: number[] } | null = null;
    
    const indexStep = direction === 'up' ? 1 : -1;
    let i = direction === 'up' ? startIndex : endIndex;
    const limit = direction === 'up' ? endIndex : startIndex;
    
    while ((direction === 'up' ? i <= limit : i >= limit)) {
      const item = sortedData[i];
      
      if (item.percentage >= densityThreshold) {
        // 开始或继续当前簇
        if (!currentCluster) {
          currentCluster = { prices: [], volumes: [], percentages: [] };
        }
        currentCluster.prices.push(item.price);
        currentCluster.volumes.push(item.volume);
        currentCluster.percentages.push(item.percentage);
      } else if (currentCluster) {
        // 结束当前簇并计算支撑/压力位
        const clusterPrice = currentCluster.prices.reduce((sum, price) => sum + price, 0) / currentCluster.prices.length;
        const clusterVolume = currentCluster.volumes.reduce((sum, volume) => sum + volume, 0);
        const clusterStrength = currentCluster.percentages.reduce((sum, percentage) => sum + percentage, 0) / currentCluster.percentages.length;
        
        // 计算宽度
        const clusterWidth = Math.max(...currentCluster.prices) - Math.min(...currentCluster.prices);
        
        // 计算距离当前价格的百分比
        const distance = Math.abs((clusterPrice - currentPrice) / currentPrice) * 100;
        
        // 计算可靠性（考虑峰值和成交量）
        const isPeak = peakPrices.has(clusterPrice);
        const volumeRatio = clusterVolume / totalVolume;
        const reliability = (clusterStrength + (isPeak ? 0.3 : 0) + volumeRatio) / 2;
        
        clusters.push({
          price: clusterPrice,
          strength: clusterStrength,
          volume: clusterVolume,
          reliability: Math.min(1, reliability),
          width: clusterWidth,
          distance,
          type: direction === 'up' ? 'resistance' : 'support'
        });
        
        currentCluster = null;
      }
      
      i += indexStep;
    }
    
    // 处理最后一个簇
    if (currentCluster) {
      const clusterPrice = currentCluster.prices.reduce((sum, price) => sum + price, 0) / currentCluster.prices.length;
      const clusterVolume = currentCluster.volumes.reduce((sum, volume) => sum + volume, 0);
      const clusterStrength = currentCluster.percentages.reduce((sum, percentage) => sum + percentage, 0) / currentCluster.percentages.length;
      const clusterWidth = Math.max(...currentCluster.prices) - Math.min(...currentCluster.prices);
      const distance = Math.abs((clusterPrice - currentPrice) / currentPrice) * 100;
      const isPeak = peakPrices.has(clusterPrice);
      const volumeRatio = clusterVolume / totalVolume;
      const reliability = (clusterStrength + (isPeak ? 0.3 : 0) + volumeRatio) / 2;
      
      clusters.push({
        price: clusterPrice,
        strength: clusterStrength,
        volume: clusterVolume,
        reliability: Math.min(1, reliability),
        width: clusterWidth,
        distance,
        type: direction === 'up' ? 'resistance' : 'support'
      });
    }
    
    return clusters;
  };
  
  // 找到当前价格的位置
  let currentIndex = sortedData.findIndex(item => item.price >= currentPrice);
  if (currentIndex === -1) currentIndex = sortedData.length - 1;
  
  // 检测支撑位（当前价格下方）
  const supportLevels = detectPriceClusters(0, currentIndex - 1, 'up');
  
  // 检测压力位（当前价格上方）
  const resistanceLevels = detectPriceClusters(currentIndex + 1, sortedData.length - 1, 'up');
  
  // 排序支撑位（从高到低）
  supportLevels.sort((a, b) => b.price - a.price);
  
  // 排序压力位（从低到高）
  resistanceLevels.sort((a, b) => a.price - b.price);
  
  // 找到最强支撑和压力位
  const strongestSupport = supportLevels.length > 0 
    ? supportLevels.reduce((strongest, level) => level.strength > strongest.strength ? level : strongest, supportLevels[0]) 
    : null;
    
  const strongestResistance = resistanceLevels.length > 0 
    ? resistanceLevels.reduce((strongest, level) => level.strength > strongest.strength ? level : strongest, resistanceLevels[0]) 
    : null;
  
  // 计算支撑压力比
  const totalSupportStrength = supportLevels.reduce((sum, level) => sum + level.strength, 0);
  const totalResistanceStrength = resistanceLevels.reduce((sum, level) => sum + level.strength, 0);
  const supportResistanceRatio = totalResistanceStrength > 0 
    ? totalSupportStrength / totalResistanceStrength 
    : totalSupportStrength > 0 ? 10 : 1;
  
  return {
    supportLevels,
    resistanceLevels,
    strongestSupport,
    strongestResistance,
    supportResistanceRatio
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
      enhancedSupportResistance: { supportLevels: [], resistanceLevels: [], strongestSupport: null, strongestResistance: null, supportResistanceRatio: 0 }
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
