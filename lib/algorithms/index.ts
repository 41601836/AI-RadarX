// 算法库统一导出

// WAD 加权平均分布模型
import * as wad from './wad';
export { wad };

// 筹码分布算法
import * as chipDistribution from './chipDistribution';
export { chipDistribution };

// 重导出必要的筹码分布函数以保持向后兼容性

// 重导出必要的WAD函数以保持向后兼容性
export { calculateWAD, calculateCumulativeWAD, calculateWADEnhancedChipDistribution } from './wad';

// 分时强度和承接力度
export * from './intradayStrength';

// 特大单识别和分析
export * from './largeOrder';

// 交易意图识别
export * from './orderIntention';

// 技术指标
export * from './technicalIndicators';

// 雷达计算
import * as radarCalculations from './radarCalculations';
export { radarCalculations };

// 重导出雷达计算中与其他模块不冲突的函数
export { calculateIntradayStrengthAxis } from './radarCalculations';

// 回测系统
export * from './backtester';
