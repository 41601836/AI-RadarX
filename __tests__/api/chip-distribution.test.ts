// 测试筹码分析模块API
import { NextRequest } from 'next/server';
import { GET as getChipDistribution } from '../../app/api/v1/chip/distribution/route';
import { fetchChipDistribution } from '../../lib/api/chip/distribution';
import { badRequestError, stockCodeFormatError } from '../../lib/api/common/errors';

// 创建模拟的NextRequest
function createMockRequest(url: string): NextRequest {
  return new NextRequest(url) as NextRequest;
}

// 测试筹码分布API
jest.mock('../../lib/api/chip/distribution');
jest.mock('../../lib/api/common/errors');

describe('Chip Distribution API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should require stockCode parameter', async () => {
    const request = createMockRequest('http://localhost/api/v1/chip/distribution');
    const response = await getChipDistribution(request);
    const responseJson = await response.json();

    // 验证返回400错误
    expect(response.status).toBe(400);
    expect(responseJson.code).toBe(400);
    expect(responseJson.msg).toBeDefined();
  });

  test('should validate stockCode format', async () => {
    const request = createMockRequest('http://localhost/api/v1/chip/distribution?stockCode=invalid-code');
    const response = await getChipDistribution(request);
    const responseJson = await response.json();

    // 验证返回60001错误
    expect(response.status).toBe(400);
    expect(responseJson.code).toBe(60001);
    expect(responseJson.msg).toBeDefined();
  });

  test('should return chip distribution data for valid stockCode', async () => {
    const testData = {
      stockCode: 'SH600000',
      stockName: '浦发银行',
      date: '2026-01-04',
      chipDistribution: [
        { price: 850, chipRatio: 0.05, holderCount: 12000 }
      ],
      chipConcentration: 0.89,
      mainCostPrice: 820,
      supportPrice: 790,
      resistancePrice: 900,
      chipPeakInfo: {
        peakPrice: 830,
        peakRatio: 0.65,
        isSinglePeak: true,
        peaks: [],
        dominantPeak: {
          price: 830,
          ratio: 0.65,
          volume: 1000000,
          width: 10,
          dominance: 0.8,
          strength: 0.9,
          reliability: 0.95,
          centerPrice: 830,
          volumeWeightedPrice: 830
        },
        secondaryPeaks: [],
        peakDensity: 0.1,
        peakQualityScore: 0.85,
        priceRange: 200
      },
      _dataSource: 'mock'
    };

    // 模拟fetchChipDistribution函数，返回ApiResponse格式
    (fetchChipDistribution as jest.Mock).mockResolvedValue({
      code: 200,
      msg: 'success',
      data: testData,
      requestId: 'test-request-id',
      timestamp: Date.now()
    });

    const request = createMockRequest('http://localhost/api/v1/chip/distribution?stockCode=SH600000');
    const response = await getChipDistribution(request);
    const responseJson = await response.json();

    // 验证fetchChipDistribution被调用
    expect(fetchChipDistribution).toHaveBeenCalledWith({
      stockCode: 'SH600000',
      startDate: undefined,
      endDate: undefined
    });

    // 验证返回200成功
    expect(response.status).toBe(200);
    expect(responseJson.code).toBe(200);
    expect(responseJson.msg).toBe('success');
    expect(responseJson.data).toEqual(testData);
    expect(responseJson.requestId).toBeDefined();
    expect(responseJson.timestamp).toBeDefined();
  });

  test('should handle startDate and endDate parameters', async () => {
    const testData = {
      stockCode: 'SH600000',
      stockName: '浦发银行',
      date: '2026-01-04',
      chipDistribution: [
        { price: 850, chipRatio: 0.05, holderCount: 12000 }
      ],
      chipConcentration: 0.89,
      mainCostPrice: 820,
      supportPrice: 790,
      resistancePrice: 900,
      chipPeakInfo: {
        peakPrice: 830,
        peakRatio: 0.65,
        isSinglePeak: true,
        peaks: [],
        dominantPeak: {
          price: 830,
          ratio: 0.65,
          volume: 1000000,
          width: 10,
          dominance: 0.8,
          strength: 0.9,
          reliability: 0.95,
          centerPrice: 830,
          volumeWeightedPrice: 830
        },
        secondaryPeaks: [],
        peakDensity: 0.1,
        peakQualityScore: 0.85,
        priceRange: 200
      },
      _dataSource: 'mock'
    };

    // 模拟fetchChipDistribution函数，返回ApiResponse格式
    (fetchChipDistribution as jest.Mock).mockResolvedValue({
      code: 200,
      msg: 'success',
      data: testData,
      requestId: 'test-request-id',
      timestamp: Date.now()
    });

    const request = createMockRequest('http://localhost/api/v1/chip/distribution?stockCode=SH600000&startDate=2025-12-01&endDate=2026-01-04');
    const response = await getChipDistribution(request);
    const responseJson = await response.json();

    // 验证fetchChipDistribution被调用并传递了日期参数
    expect(fetchChipDistribution).toHaveBeenCalledWith({
      stockCode: 'SH600000',
      startDate: '2025-12-01',
      endDate: '2026-01-04'
    });

    // 验证返回200成功
    expect(response.status).toBe(200);
    expect(responseJson.code).toBe(200);
    expect(responseJson.data).toEqual(testData);
  });

  test('should handle internal server errors', async () => {
    const testError = new Error('Internal server error');

    // 模拟fetchChipDistribution函数抛出错误
    (fetchChipDistribution as jest.Mock).mockRejectedValue(testError);

    const request = createMockRequest('http://localhost/api/v1/chip/distribution?stockCode=SH600000');
    const response = await getChipDistribution(request);
    const responseJson = await response.json();

    // 验证返回500错误
    expect(response.status).toBe(500);
    expect(responseJson.code).toBe(500);
    expect(responseJson.msg).toBeDefined();
  });
});
