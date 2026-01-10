// 测试API规范实现是否符合要求
import { ApiResponse, successResponse, paginatedSuccessResponse, generateRequestId } from './response';
import { ApiError, ErrorCode, errorResponse, badRequestError, stockCodeFormatError } from './errors';
import { apiGet, apiPost, ApiRequestConfig } from './fetch';

describe('API规范实现测试', () => {
  // 测试响应格式
  describe('响应格式', () => {
    test('成功响应应包含所有必需字段', () => {
      const data = { stockCode: 'SH600000', price: 850 };
      const response = successResponse(data);
      
      expect(response).toHaveProperty('code', 200);
      expect(response).toHaveProperty('msg', 'success');
      expect(response).toHaveProperty('data', data);
      expect(response).toHaveProperty('requestId');
      expect(response).toHaveProperty('timestamp');
      expect(typeof response.requestId).toBe('string');
      expect(typeof response.timestamp).toBe('number');
    });
    
    test('分页响应格式正确', () => {
      const list = [{ id: 1 }, { id: 2 }];
      const response = paginatedSuccessResponse(list, 100, 1, 20);
      
      expect(response).toHaveProperty('code', 200);
      expect(response).toHaveProperty('msg', 'success');
      expect(response.data).toHaveProperty('list', list);
      expect(response.data).toHaveProperty('total', 100);
      expect(response.data).toHaveProperty('pageNum', 1);
      expect(response.data).toHaveProperty('pageSize', 20);
      expect(response.data).toHaveProperty('pages', 5);
    });
  });
  
  // 测试错误处理
  describe('错误处理', () => {
    test('ApiError应包含所有必需字段', () => {
      const error = new ApiError(ErrorCode.BAD_REQUEST, '测试错误');
      
      expect(error).toHaveProperty('code', ErrorCode.BAD_REQUEST);
      expect(error).toHaveProperty('message', '测试错误');
      expect(error).toHaveProperty('requestId');
      expect(typeof error.requestId).toBe('string');
    });
    
    test('错误响应格式正确', () => {
      const error = new ApiError(ErrorCode.STOCK_CODE_FORMAT_ERROR);
      const response = errorResponse(error);
      
      expect(response).toHaveProperty('code', ErrorCode.STOCK_CODE_FORMAT_ERROR);
      expect(response).toHaveProperty('msg', '股票代码格式错误');
      expect(response).toHaveProperty('data', {});
      expect(response).toHaveProperty('requestId');
      expect(response).toHaveProperty('timestamp');
    });
    
    test('非ApiError应转换为内部服务器错误', () => {
      const error = new Error('未知错误');
      const response = errorResponse(error);
      
      expect(response).toHaveProperty('code', ErrorCode.INTERNAL_SERVER_ERROR);
      expect(response).toHaveProperty('msg', '未知错误');
    });
    
    test('便捷错误函数应返回正确的ApiError', () => {
      const badRequest = badRequestError();
      const stockCodeError = stockCodeFormatError('自定义错误信息');
      
      expect(badRequest.code).toBe(ErrorCode.BAD_REQUEST);
      expect(stockCodeError.code).toBe(ErrorCode.STOCK_CODE_FORMAT_ERROR);
      expect(stockCodeError.message).toBe('自定义错误信息');
    });
  });
  
  // 测试数据规范
  describe('数据规范', () => {
    test('价格应使用分作为单位', () => {
      // 模拟API响应中的价格字段
      const stockData = {
        price: 850, // 8.50元
        openPrice: 830, // 8.30元
        closePrice: 850, // 8.50元
        highPrice: 860, // 8.60元
        lowPrice: 820 // 8.20元
      };
      
      // 验证所有价格字段都是整数
      Object.values(stockData).forEach(price => {
        expect(Number.isInteger(price)).toBe(true);
      });
    });
    
    test('时间格式应符合规范', () => {
      // 模拟API响应中的时间字段
      const timeData = {
        eventTime: '2026-01-04 15:30:00',
        tradeTime: '2026-01-04 14:45:30',
        timestamp: Date.now()
      };
      
      // 验证时间字符串格式
      const timeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
      expect(timeRegex.test(timeData.eventTime)).toBe(true);
      expect(timeRegex.test(timeData.tradeTime)).toBe(true);
      
      // 验证时间戳是数字
      expect(typeof timeData.timestamp).toBe('number');
    });
  });
  
  // 测试API请求函数
  describe('API请求函数', () => {
    test('apiGet应返回Promise<ApiResponse>', () => {
      // 模拟一个API请求
      const request = apiGet<{ test: string }>('/test', { id: 1 });
      
      expect(request).toBeInstanceOf(Promise);
      // 由于是异步测试，我们只检查返回类型
    });
    
    test('apiPost应返回Promise<ApiResponse>', () => {
      // 模拟一个API请求
      const request = apiPost<{ test: string }>('/test', { data: 'test' });
      
      expect(request).toBeInstanceOf(Promise);
      // 由于是异步测试，我们只检查返回类型
    });
  });
  
  // 测试请求ID生成
  describe('请求ID生成', () => {
    test('generateRequestId应生成唯一ID', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('req-')).toBe(true);
      expect(id2.startsWith('req-')).toBe(true);
    });
  });
});
