// 测试响应格式和错误处理机制
import { ApiResponse, successResponse, paginatedSuccessResponse, generateRequestId } from './response';
import { ApiError, ErrorCode, ERROR_MESSAGES, errorResponse, badRequestError, internalServerError } from './errors';

// 测试响应格式是否正确
describe('API Response Format', () => {
  test('successResponse should return correct structure', () => {
    const testData = { message: 'test' };
    const response = successResponse(testData, '测试成功');

    expect(response.code).toBe(200);
    expect(response.msg).toBe('测试成功');
    expect(response.data).toEqual(testData);
    expect(response.requestId).toBeDefined();
    expect(response.timestamp).toBeDefined();
    expect(typeof response.timestamp).toBe('number');
  });

  test('paginatedSuccessResponse should return correct structure', () => {
    const testList = [{ id: 1 }, { id: 2 }];
    const response = paginatedSuccessResponse(testList, 100, 1, 10);

    expect(response.code).toBe(200);
    expect(response.msg).toBe('success');
    expect(response.data.list).toEqual(testList);
    expect(response.data.total).toBe(100);
    expect(response.data.pageNum).toBe(1);
    expect(response.data.pageSize).toBe(10);
    expect(response.data.pages).toBe(10);
    expect(response.requestId).toBeDefined();
    expect(response.timestamp).toBeDefined();
  });

  test('generateRequestId should return unique string', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();

    expect(id1).not.toBe(id2);
    expect(id1.startsWith('req-')).toBeTruthy();
  });
});

// 测试错误处理机制
describe('API Error Handling', () => {
  test('ApiError should have correct properties', () => {
    const error = new ApiError(ErrorCode.BAD_REQUEST, '参数错误');

    expect(error.code).toBe(ErrorCode.BAD_REQUEST);
    expect(error.message).toBe('参数错误');
    expect(error.requestId).toBeDefined();
    expect(error.name).toBe('ApiError');
  });

  test('errorResponse should format ApiError correctly', () => {
    const apiError = new ApiError(ErrorCode.BAD_REQUEST, '参数错误');
    const response = errorResponse(apiError);

    expect(response.code).toBe(ErrorCode.BAD_REQUEST);
    expect(response.msg).toBe('参数错误');
    expect(response.requestId).toBe(apiError.requestId);
    expect(response.timestamp).toBeDefined();
  });

  test('errorResponse should format generic Error correctly', () => {
    const genericError = new Error('未知错误');
    const response = errorResponse(genericError);

    expect(response.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(response.msg).toBe('未知错误');
    expect(response.requestId).toBeDefined();
    expect(response.timestamp).toBeDefined();
  });

  test('errorResponse should use default message when not provided', () => {
    const genericError = new Error();
    const response = errorResponse(genericError);

    expect(response.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(response.msg).toBe(ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR]);
  });

  // 测试便捷错误生成函数
  test('badRequestError should create ApiError with correct code', () => {
    const error = badRequestError('参数缺失');
    expect(error.code).toBe(ErrorCode.BAD_REQUEST);
    expect(error.message).toBe('参数缺失');
  });

  test('internalServerError should create ApiError with correct code and original error', () => {
    const originalError = new Error('数据库错误');
    const error = internalServerError(originalError);
    expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(error.message).toBe(ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR]);
    expect(error.originalError).toBe(originalError);
  });

  test('internalServerError should use custom message when provided', () => {
    const originalError = new Error('数据库错误');
    const error = internalServerError(originalError, '服务器内部错误');
    expect(error.message).toBe('服务器内部错误');
  });
});

// 测试错误码定义是否完整
describe('Error Code Definitions', () => {
  test('should have all required error codes', () => {
    // 测试200成功码
    expect(ErrorCode.SUCCESS).toBe(200);
    
    // 测试400系列客户端错误码
    expect(ErrorCode.BAD_REQUEST).toBe(400);
    expect(ErrorCode.UNAUTHORIZED).toBe(401);
    expect(ErrorCode.FORBIDDEN).toBe(403);
    expect(ErrorCode.NOT_FOUND).toBe(404);
    expect(ErrorCode.TOO_MANY_REQUESTS).toBe(429);
    
    // 测试500系列服务器错误码
    expect(ErrorCode.INTERNAL_SERVER_ERROR).toBe(500);
    expect(ErrorCode.SERVICE_UNAVAILABLE).toBe(503);
    
    // 测试600系列业务错误码
    expect(ErrorCode.STOCK_CODE_FORMAT_ERROR).toBe(60001);
    expect(ErrorCode.ACCOUNT_NOT_EXIST).toBe(60002);
    expect(ErrorCode.NO_HEAT_FLOW_DATA).toBe(60003);
    expect(ErrorCode.INVALID_LARGE_ORDER_THRESHOLD).toBe(60004);
  });

  test('should have corresponding error messages', () => {
    // 确保每个错误码都有对应的错误消息
    Object.values(ErrorCode).forEach((code) => {
      if (typeof code === 'number') {
        expect(ERROR_MESSAGES[code as ErrorCode]).toBeDefined();
        expect(typeof ERROR_MESSAGES[code as ErrorCode]).toBe('string');
      }
    });
  });
});