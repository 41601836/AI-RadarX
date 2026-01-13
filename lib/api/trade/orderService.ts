// 交易订单服务API
import { apiPost, apiGet, apiDelete, MockDataGenerator } from '../common/fetch';
import { ApiResponse } from '../common/response';
import { ApiError } from '../common/errors';

// 交易状态枚举
export enum OrderStatus {
  SUBMITTED = '已报',
  PARTIALLY_FILLED = '部成',
  FILLED = '全成',
  CANCELLED = '撤单',
  REJECTED = '拒单'
}

// 订单类型枚举
export enum OrderType {
  MARKET = '市价',
  LIMIT = '限价',
  STOP = '止损',
  STOP_LIMIT = '止损限价'
}

// 订单方向枚举
export enum OrderDirection {
  BUY = '买入',
  SELL = '卖出'
}

// 下单请求参数接口
export interface SubmitOrderParams {
  stockCode: string;
  stockName: string;
  direction: OrderDirection;
  orderType: OrderType;
  price: number;
  quantity: number;
  remark?: string;
}

// 下单响应数据接口
export interface SubmitOrderResponse {
  orderId: string;
  stockCode: string;
  stockName: string;
  direction: OrderDirection;
  orderType: OrderType;
  price: number;
  quantity: number;
  filledQuantity: number;
  status: OrderStatus;
  orderTime: string;
  orderNo: string;
  remark?: string;
}

// 撤单请求参数接口
export interface CancelOrderParams {
  orderId: string;
  stockCode?: string;
}

// 撤单响应数据接口
export interface CancelOrderResponse {
  orderId: string;
  status: OrderStatus;
  cancelTime: string;
  result: string;
}

// 持仓数据接口
export interface Position {
  stockCode: string;
  stockName: string;
  shares: number;
  availableShares: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  cost: number;
  profitLoss: number;
  profitLossRate: number;
  positionRatio: number;
}

// 持仓列表响应数据接口
export interface FetchPositionsResponse {
  positions: Position[];
  totalMarketValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
  availableCash: number;
}

// Mock数据生成器 - 下单
export const generateSubmitOrderMock: MockDataGenerator<SubmitOrderResponse> = async (params: SubmitOrderParams) => {
  const { stockCode, stockName, direction, orderType, price, quantity } = params;
  
  // 模拟交易状态，80%概率全成，15%概率部成，5%概率已报
  const statusRandom = Math.random();
  let status: OrderStatus;
  let filledQuantity: number;
  
  if (statusRandom < 0.8) {
    status = OrderStatus.FILLED;
    filledQuantity = quantity;
  } else if (statusRandom < 0.95) {
    status = OrderStatus.PARTIALLY_FILLED;
    filledQuantity = Math.floor(quantity * 0.5);
  } else {
    status = OrderStatus.SUBMITTED;
    filledQuantity = 0;
  }
  
  return {
    orderId: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
    stockCode,
    stockName,
    direction,
    orderType,
    price,
    quantity,
    filledQuantity,
    status,
    orderTime: new Date().toISOString(),
    orderNo: `NO${Date.now()}${Math.floor(Math.random() * 1000)}`,
    remark: params.remark
  };
};

// Mock数据生成器 - 撤单
export const generateCancelOrderMock: MockDataGenerator<CancelOrderResponse> = async (params: CancelOrderParams) => {
  const { orderId } = params;
  
  return {
    orderId,
    status: OrderStatus.CANCELLED,
    cancelTime: new Date().toISOString(),
    result: '撤单成功'
  };
};

// Mock数据生成器 - 获取持仓
export const generateFetchPositionsMock: MockDataGenerator<FetchPositionsResponse> = async () => {
  // 模拟持仓数据
  const mockPositions: Position[] = [
    {
      stockCode: 'SH600000',
      stockName: '浦发银行',
      shares: 1000,
      availableShares: 800,
      averagePrice: 8.5,
      currentPrice: 8.75,
      marketValue: 8750,
      cost: 8500,
      profitLoss: 250,
      profitLossRate: 2.94,
      positionRatio: 0.25
    },
    {
      stockCode: 'SZ000001',
      stockName: '平安银行',
      shares: 2000,
      availableShares: 2000,
      averagePrice: 12.3,
      currentPrice: 12.8,
      marketValue: 25600,
      cost: 24600,
      profitLoss: 1000,
      profitLossRate: 4.07,
      positionRatio: 0.75
    }
  ];
  
  const totalMarketValue = mockPositions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalCost = mockPositions.reduce((sum, pos) => sum + pos.cost, 0);
  const totalProfitLoss = mockPositions.reduce((sum, pos) => sum + pos.profitLoss, 0);
  const totalProfitLossRate = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
  
  return {
    positions: mockPositions,
    totalMarketValue,
    totalCost,
    totalProfitLoss,
    totalProfitLossRate,
    availableCash: 50000
  };
};

// 下单接口
export async function submitOrder(params: SubmitOrderParams): Promise<ApiResponse<SubmitOrderResponse>> {
  try {
    // 1. 计算订单金额
    const orderAmount = params.price * params.quantity;
    
    // 2. 风控检查 - 导入风控模块
    const { checkOrderRiskControl } = await import('../../services/risk-control');
    
    // 3. 准备风控参数
    const riskParams = {
      ...params,
      orderAmount
    };
    
    // 4. 执行风控检查
    const riskCheckResult = await checkOrderRiskControl(riskParams);
    
    // 5. 处理风控检查结果
    if (!riskCheckResult.passed) {
      // 可以在这里抛出特定的风控错误，由上层处理
      console.warn('风控检查未通过:', riskCheckResult.reason);
      // 注意：这里不直接拦截，而是由上层组件根据needsConfirmation决定是否需要用户确认
    }
    
    // 6. 实现下单逻辑
    const response = await apiPost<SubmitOrderResponse>('/trade/order/submit', params, {
      requiresAuth: true
    }, generateSubmitOrderMock);
    
    return response;
  } catch (error) {
    console.error('下单失败:', error);
    throw error;
  }
}

// 撤单接口
export async function cancelOrder(params: CancelOrderParams): Promise<ApiResponse<CancelOrderResponse>> {
  try {
    // 实现撤单逻辑
    const response = await apiDelete<CancelOrderResponse>('/trade/order/cancel', {
      params,
      requiresAuth: true
    }, generateCancelOrderMock);
    
    return response;
  } catch (error) {
    console.error('撤单失败:', error);
    throw error;
  }
}

// 获取持仓接口
export async function fetchPositions(): Promise<ApiResponse<FetchPositionsResponse>> {
  try {
    // 实现获取持仓逻辑
    const response = await apiGet<FetchPositionsResponse>('/trade/positions', {
      requiresAuth: true
    }, undefined, generateFetchPositionsMock);
    
    return response;
  } catch (error) {
    console.error('获取持仓失败:', error);
    throw error;
  }
}

// 导出默认对象
export default {
  submitOrder,
  cancelOrder,
  fetchPositions
};
