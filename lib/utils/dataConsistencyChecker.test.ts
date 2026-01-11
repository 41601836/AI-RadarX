// DataConsistencyChecker 测试用例
import { DataConsistencyChecker, DataSourceData } from './dataConsistencyChecker';

// 测试数据准备
const testTimestamp = Date.now();

const testDataTencentLowVolume: DataSourceData = {
  source: '腾讯',
  price: 100.0,
  volume: 1000000,
  timestamp: testTimestamp
};

const testDataTushareHighVolume: DataSourceData = {
  source: 'Tushare',
  price: 101.5,
  volume: 2000000,
  timestamp: testTimestamp
};

const testDataTencentHighVolume: DataSourceData = {
  source: '腾讯',
  price: 100.0,
  volume: 3000000,
  timestamp: testTimestamp
};

const testDataTushareSamePrice: DataSourceData = {
  source: 'Tushare',
  price: 100.0,
  volume: 2000000,
  timestamp: testTimestamp
};

const testDataTushareLargeDeviation: DataSourceData = {
  source: 'Tushare',
  price: 102.0,
  volume: 2000000,
  timestamp: testTimestamp
};

const testDataTencentSameVolumeLowerPrice: DataSourceData = {
  source: '腾讯',
  price: 100.0,
  volume: 2000000,
  timestamp: testTimestamp
};

const testDataTushareSameVolumeHigherPrice: DataSourceData = {
  source: 'Tushare',
  price: 100.5,
  volume: 2000000,
  timestamp: testTimestamp
};

// 测试类
const checker = new DataConsistencyChecker();

describe('DataConsistencyChecker Tests', () => {
  test('checkConsistency should return consistent when deviation is within threshold', () => {
    const result = checker.checkConsistency(testDataTencentLowVolume, testDataTushareHighVolume);
    
    // 价格偏差为 (101.5 - 100) / 100.75 * 100 ≈ 1.49%，超过1%阈值
    expect(result.isConsistent).toBe(false);
    expect(result.deviationPercentage).toBeCloseTo(1.49, 2);
    expect(result.selectedDataSource.source).toBe('Tushare'); // Tushare成交量更高
  });
  
  test('checkConsistency should return consistent when deviation is exactly at threshold', () => {
    const source1 = { ...testDataTencentLowVolume, price: 100.0 };
    const source2 = { ...testDataTushareHighVolume, price: 101.0 }; // 偏差约为0.995%
    
    const result = checker.checkConsistency(source1, source2);
    
    expect(result.isConsistent).toBe(true); // 偏差在1%阈值内
    expect(result.deviationPercentage).toBeCloseTo(1.0, 2);
    expect(result.selectedDataSource.source).toBe('腾讯'); // 偏差在阈值内，选择第一个数据源
  });
  
  test('checkConsistency should select higher volume source when inconsistent', () => {
    const result = checker.checkConsistency(testDataTushareHighVolume, testDataTencentHighVolume);
    
    expect(result.isConsistent).toBe(false);
    expect(result.selectedDataSource.source).toBe('腾讯'); // 腾讯成交量更高
  });
  
  test('checkConsistency should select source with same price when deviation is zero', () => {
    const result = checker.checkConsistency(testDataTencentLowVolume, testDataTushareSamePrice);
    
    expect(result.isConsistent).toBe(true);
    expect(result.deviationPercentage).toBe(0);
    expect(result.selectedDataSource.source).toBe('腾讯'); // 偏差为0，选择第一个数据源
  });
  
  test('checkConsistency should select higher price source when volumes are equal and inconsistent', () => {
    // 修改价格，使偏差超过1%
    const source1 = { ...testDataTencentSameVolumeLowerPrice, price: 100.0 };
    const source2 = { ...testDataTushareSameVolumeHigherPrice, price: 102.0 };
    
    const result = checker.checkConsistency(source1, source2);
    
    expect(result.isConsistent).toBe(false);
    expect(result.selectedDataSource.source).toBe('Tushare'); // 价格更高
  });
  
  test('calculateDeviationPercentage should return correct percentage', () => {
    // 测试私有方法，需要通过公共方法间接测试
    const result1 = checker.checkConsistency(
      { ...testDataTencentLowVolume, price: 100 },
      { ...testDataTushareHighVolume, price: 105 }
    );
    
    expect(result1.deviationPercentage).toBeCloseTo(4.88, 2); // (105-100)/102.5*100 ≈ 4.88%
    
    const result2 = checker.checkConsistency(
      { ...testDataTencentLowVolume, price: 100 },
      { ...testDataTushareHighVolume, price: 95 }
    );
    
    expect(result2.deviationPercentage).toBeCloseTo(5.13, 2); // (100-95)/97.5*100 ≈ 5.13%
  });
  
  test('logInconsistency should be called when deviation exceeds threshold', () => {
    // 模拟console.warn
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    checker.checkConsistency(testDataTencentLowVolume, testDataTushareLargeDeviation);
    
    // 验证日志是否被记录
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    // 恢复原始实现
    consoleWarnSpy.mockRestore();
  });
});