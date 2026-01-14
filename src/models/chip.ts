export interface ChipDistributionItem {
  price: number; // 价格（分）
  chipRatio: number; // 该价格区间筹码占比（0-1）
  holderCount: number; // 该区间持仓户数（估算）
}

export interface ChipPeakInfo {
  peakPrice: number; // 主峰价格（分）
  peakRatio: number; // 主峰筹码占比（0-1）
  isSinglePeak: boolean; // 是否单峰密集
}

export interface ChipDistribution {
  stockCode: string;
  stockName: string;
  date: string; // yyyy-MM-dd
  chipDistribution: ChipDistributionItem[];
  chipConcentration: number; // 筹码集中度（0-1，值越大越集中）
  mainCostPrice: number; // 主力成本价（分）
  supportPrice: number; // 筹码支撑价（分）
  resistancePrice: number; // 筹码压力价（分）
  chipPeakInfo: ChipPeakInfo;
}

export interface ChipTrendItem {
  date: string; // yyyy-MM-dd
  chipConcentration: number; // 筹码集中度（0-1）
  mainCostPrice: number; // 主力成本价（分）
}

export interface ChipTrend {
  stockCode: string;
  stockName: string;
  trendData: ChipTrendItem[];
}
