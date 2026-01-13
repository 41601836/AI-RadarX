// 风险控制服务
import { useUserStore } from '../store/user-portfolio';
import { fetchStockRiskAssessment, StockRiskAssessmentData } from '../api/risk/assessment';
import { OrderDirection } from '../api/trade/orderService';

// 风险等级枚举
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXTREME = 'extreme'
}

// 风控检查结果接口
export interface RiskControlCheckResult {
  passed: boolean; // 是否通过风控检查
  reason?: string; // 未通过原因
  riskLevel?: RiskLevel; // 风险等级
  suggestedAction?: string; // 建议操作
  needsConfirmation?: boolean; // 是否需要用户确认
}

// 订单风险参数接口
export interface OrderRiskParams {
  stockCode: string;
  stockName: string;
  direction: OrderDirection;
  price: number;
  quantity: number;
  orderAmount: number;
}

// 风险控制代理类
export class RiskControlAgent {
  // 实时风险评估
  async assessRealTimeRisk(stockCode: string): Promise<{
    riskLevel: RiskLevel;
    reasoning: string;
    extremeRisk: boolean;
  }> {
    try {
      // 调用真实的风险评估API
      const riskData = await fetchStockRiskAssessment(stockCode);
      const data = riskData.data;
      
      // 根据风险数据评估风险等级
      let riskLevel: RiskLevel = RiskLevel.MEDIUM;
      let extremeRisk = false;
      let reasoning = '';
      
      if (data) {
        // 基于波动率、VaR、流动性等指标评估风险
        const volatility = data.volatility || 0;
        const liquidity = data.liquidity || 0.5;
        const maxDrawdown = data.maxDrawdown || 0;
        
        // 计算综合风险分数 (0-1)
        const riskScore = (
          volatility * 0.4 + 
          (1 - liquidity) * 0.3 + 
          maxDrawdown * 0.3
        );
        
        // 根据分数确定风险等级
        if (riskScore > 0.7) {
          riskLevel = RiskLevel.EXTREME;
          extremeRisk = true;
          reasoning = '波动率过高、流动性不足且最大回撤较大，存在极高风险';
        } else if (riskScore > 0.5) {
          riskLevel = RiskLevel.HIGH;
          reasoning = '波动率和最大回撤较大，存在高风险';
        } else if (riskScore > 0.3) {
          riskLevel = RiskLevel.MEDIUM;
          reasoning = '风险指标处于中等水平，风险可控';
        } else {
          riskLevel = RiskLevel.LOW;
          reasoning = '风险指标处于较低水平，风险较低';
        }
      } else {
        // 模拟风险评估（当API不可用时）
        const randomRisk = Math.random();
        if (randomRisk < 0.1) {
          riskLevel = RiskLevel.EXTREME;
          extremeRisk = true;
          reasoning = '模拟检测到极端风险信号';
        } else if (randomRisk < 0.3) {
          riskLevel = RiskLevel.HIGH;
          reasoning = '模拟检测到高风险信号';
        } else if (randomRisk < 0.6) {
          riskLevel = RiskLevel.MEDIUM;
          reasoning = '模拟风险评估为中等风险';
        } else {
          riskLevel = RiskLevel.LOW;
          reasoning = '模拟风险评估为低风险';
        }
      }
      
      return {
        riskLevel,
        reasoning,
        extremeRisk
      };
    } catch (error) {
      console.error('实时风险评估失败:', error);
      
      // 失败时返回默认中等风险
      return {
        riskLevel: RiskLevel.MEDIUM,
        reasoning: '风险评估服务暂时不可用，默认中等风险',
        extremeRisk: false
      };
    }
  }
  
  // 检查单票持仓比例限制
  checkSingleStockPositionLimit(
    orderAmount: number,
    stockCode: string
  ): { passed: boolean; reason?: string; currentRatio?: number; newRatio?: number } {
    const userStore = useUserStore.getState();
    const { positions, totalMarketValue, availableCash } = userStore;
    
    // 获取风险偏好设置
    const { maxSingleStockPosition } = userStore.riskPreference;
    
    // 计算当前账户总价值（持仓市值 + 可用现金）
    const totalAccountValue = totalMarketValue + availableCash;
    
    // 计算该股票当前持仓市值
    const currentStockPosition = positions.find(pos => pos.stockCode === stockCode);
    const currentStockMarketValue = currentStockPosition ? currentStockPosition.marketValue : 0;
    
    // 计算当前持仓比例
    const currentRatio = totalAccountValue > 0 ? currentStockMarketValue / totalAccountValue : 0;
    
    // 计算下单后的新持仓市值和比例
    const newStockMarketValue = currentStockMarketValue + orderAmount;
    const newRatio = totalAccountValue > 0 ? newStockMarketValue / totalAccountValue : orderAmount / 10000; // 避免除以0
    
    // 检查是否超过单票持仓比例限制
    if (newRatio > maxSingleStockPosition) {
      return {
        passed: false,
        reason: `下单后该股票持仓比例将达到${(newRatio * 100).toFixed(2)}%，超过了您设置的最大单票持仓比例限制${(maxSingleStockPosition * 100).toFixed(2)}%`,
        currentRatio,
        newRatio
      };
    }
    
    return {
      passed: true
    };
  }
  
  // 综合风控检查
  async checkOrderRisk(params: OrderRiskParams): Promise<RiskControlCheckResult> {
    const { stockCode, orderAmount } = params;
    
    // 1. 检查风险偏好设置
    const userStore = useUserStore.getState();
    const { riskPreference } = userStore;
    
    // 2. 检查单票持仓比例限制
    const positionLimitCheck = this.checkSingleStockPositionLimit(orderAmount, stockCode);
    if (!positionLimitCheck.passed) {
      return {
        passed: false,
        reason: positionLimitCheck.reason,
        riskLevel: RiskLevel.HIGH,
        suggestedAction: '请调整下单金额或修改单票持仓比例限制',
        needsConfirmation: true // 超过限制但允许用户确认继续
      };
    }
    
    // 3. 实时风险评估
    const riskAssessment = await this.assessRealTimeRisk(stockCode);
    
    // 4. 极高风险检查
    if (riskAssessment.extremeRisk || riskAssessment.riskLevel === RiskLevel.EXTREME) {
      return {
        passed: false,
        reason: `该股票当前风险等级为${riskAssessment.riskLevel}，${riskAssessment.reasoning}`,
        riskLevel: RiskLevel.EXTREME,
        suggestedAction: '建议暂时避免操作该股票',
        needsConfirmation: true // 极高风险但允许用户确认继续
      };
    }
    
    // 5. 高风险检查
    if (riskAssessment.riskLevel === RiskLevel.HIGH) {
      return {
        passed: true,
        reason: `该股票当前风险等级为${riskAssessment.riskLevel}，${riskAssessment.reasoning}`,
        riskLevel: RiskLevel.HIGH,
        suggestedAction: '建议控制仓位，谨慎操作',
        needsConfirmation: false
      };
    }
    
    // 6. 低/中等风险，直接通过
    return {
      passed: true,
      reason: `该股票当前风险等级为${riskAssessment.riskLevel}，${riskAssessment.reasoning}`,
      riskLevel: riskAssessment.riskLevel,
      suggestedAction: '风险可控，可以正常操作'
    };
  }
}

// 导出单例实例
export const riskControlAgent = new RiskControlAgent();

// 导出风险控制检查函数
export async function checkOrderRiskControl(params: OrderRiskParams): Promise<RiskControlCheckResult> {
  return await riskControlAgent.checkOrderRisk(params);
}
