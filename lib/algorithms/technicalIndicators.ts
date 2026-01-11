// 自研技术指标算法实现

// 移动平均线 (MA) 计算
export interface MACalculationParams {
  data: number[];
  period: number;
}

export function calculateMA(params: MACalculationParams): number[] {
  const { data, period } = params;
  const result = new Array(data.length);
  
  if (data.length < period) {
    // 数据不足时返回零值数组
    for (let i = 0; i < data.length; i++) {
      result[i] = 0;
    }
    return result;
  }
  
  // 计算MA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;
  
  for (let i = period; i < data.length; i++) {
    sum = sum - data[i - period] + data[i];
    result[i] = sum / period;
  }
  
  // 填充前period-1个值为零
  for (let i = 0; i < period - 1; i++) {
    result[i] = 0;
  }
  
  return result;
}

// 指数移动平均线 (EMA) 计算
export function calculateEMA(params: MACalculationParams): number[] {
  const { data, period } = params;
  const result = new Array(data.length);
  
  if (data.length < period) {
    for (let i = 0; i < data.length; i++) {
      result[i] = 0;
    }
    return result;
  }
  
  // 计算EMA
  const k = 2 / (period + 1);
  let ema = data[period - 1];
  result[period - 1] = ema;
  
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  
  // 填充前period-1个值为零
  for (let i = 0; i < period - 1; i++) {
    result[i] = 0;
  }
  
  return result;
}