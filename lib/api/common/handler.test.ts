// 测试API处理函数
import { NextRequest } from 'next/server';
import { apiHandler, apiHandlerWithValidation } from './handler';
import { successResponse, ApiResponse } from './response';
import { errorResponse, badRequestError, internalServerError } from './errors';

// 创建模拟的NextRequest
function createMockRequest(url: string): NextRequest {
  return new NextRequest(url) as NextRequest;
}

// 测试API处理函数
jest.mock('./response');
jest.mock('./errors');

describe('API Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('apiHandler should handle successful response', async () => {
    const testData = { message: 'test' };
    const mockHandler = jest.fn().mockResolvedValue(testData);
    const mockSuccessResponse = jest.fn().mockReturnValue({
      code: 200,
      msg: 'success',
      data: testData,
      requestId: 'test-request-id',
      timestamp: Date.now()
    });

    (successResponse as jest.Mock) = mockSuccessResponse;
    
    const request = createMockRequest('http://localhost/api/test');
    const response = await apiHandler(request, mockHandler);

    // 验证mockHandler被调用
    expect(mockHandler).toHaveBeenCalledWith(request);
    // 验证successResponse被调用
    expect(mockSuccessResponse).toHaveBeenCalledWith(testData);
    // 验证返回的响应是NextResponse类型
    expect(response).toBeDefined();
  });

  test('apiHandler should handle ApiResponse directly', async () => {
    const testData = { message: 'test' };
    const mockApiResponse: ApiResponse<typeof testData> = {
      code: 200,
      msg: 'success',
      data: testData,
      requestId: 'test-request-id',
      timestamp: Date.now()
    };
    const mockHandler = jest.fn().mockResolvedValue(mockApiResponse);

    const request = createMockRequest('http://localhost/api/test');
    const response = await apiHandler(request, mockHandler);

    // 验证mockHandler被调用
    expect(mockHandler).toHaveBeenCalledWith(request);
    // 验证successResponse没有被调用（因为已经是ApiResponse格式）
    expect(successResponse).not.toHaveBeenCalled();
    // 验证返回的响应是NextResponse类型
    expect(response).toBeDefined();
  });

  test('apiHandler should handle errors', async () => {
    const testError = new Error('Test error');
    const mockHandler = jest.fn().mockRejectedValue(testError);
    const mockInternalServerError = jest.fn().mockReturnValue({
      code: 500,
      message: 'Test error',
      requestId: 'test-request-id'
    });
    const mockErrorResponse = jest.fn().mockReturnValue({
      code: 500,
      msg: 'Test error',
      data: {},
      requestId: 'test-request-id',
      timestamp: Date.now()
    });

    (internalServerError as jest.Mock) = mockInternalServerError;
    (errorResponse as jest.Mock) = mockErrorResponse;

    const request = createMockRequest('http://localhost/api/test');
    const response = await apiHandler(request, mockHandler);

    // 验证mockHandler被调用
    expect(mockHandler).toHaveBeenCalledWith(request);
    // 验证internalServerError被调用
    expect(mockInternalServerError).toHaveBeenCalledWith(testError);
    // 验证errorResponse被调用
    expect(mockErrorResponse).toHaveBeenCalledWith(mockInternalServerError());
    // 验证返回的响应是NextResponse类型
    expect(response).toBeDefined();
  });

  test('apiHandlerWithValidation should handle successful validation and response', async () => {
    const testData = { message: 'test' };
    const mockValidator = jest.fn().mockResolvedValue(true);
    const mockHandler = jest.fn().mockResolvedValue(testData);
    const mockSuccessResponse = jest.fn().mockReturnValue({
      code: 200,
      msg: 'success',
      data: testData,
      requestId: 'test-request-id',
      timestamp: Date.now()
    });

    (successResponse as jest.Mock) = mockSuccessResponse;

    const request = createMockRequest('http://localhost/api/test');
    const response = await apiHandlerWithValidation(request, mockValidator, mockHandler);

    // 验证mockValidator被调用
    expect(mockValidator).toHaveBeenCalledWith(request);
    // 验证mockHandler被调用
    expect(mockHandler).toHaveBeenCalledWith(request);
    // 验证successResponse被调用
    expect(mockSuccessResponse).toHaveBeenCalledWith(testData);
    // 验证返回的响应是NextResponse类型
    expect(response).toBeDefined();
  });

  test('apiHandlerWithValidation should handle validation failure', async () => {
    const mockValidator = jest.fn().mockResolvedValue(false);
    const mockHandler = jest.fn().mockResolvedValue({});
    const mockBadRequestError = jest.fn().mockReturnValue({
      code: 400,
      message: '参数验证失败',
      requestId: 'test-request-id'
    });
    const mockErrorResponse = jest.fn().mockReturnValue({
      code: 400,
      msg: '参数验证失败',
      data: {},
      requestId: 'test-request-id',
      timestamp: Date.now()
    });

    (badRequestError as jest.Mock) = mockBadRequestError;
    (errorResponse as jest.Mock) = mockErrorResponse;

    const request = createMockRequest('http://localhost/api/test');
    const response = await apiHandlerWithValidation(request, mockValidator, mockHandler);

    // 验证mockValidator被调用
    expect(mockValidator).toHaveBeenCalledWith(request);
    // 验证mockHandler没有被调用
    expect(mockHandler).not.toHaveBeenCalled();
    // 验证errorResponse被调用
    expect(mockErrorResponse).toHaveBeenCalled();
    // 验证返回的响应是NextResponse类型
    expect(response).toBeDefined();
  });
});