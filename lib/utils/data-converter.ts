// 金融数据单位转换工具
export class FinancialUnitConverter {
  // 分转元（严格处理精度）
  static centsToYuan(cents: number): number {
    if (typeof cents !== 'number' || isNaN(cents)) return 0;
    return Math.round(cents) / 100;
  }
  
  // 元转分
  static yuanToCents(yuan: number): number {
    if (typeof yuan !== 'number' || isNaN(yuan)) return 0;
    return Math.round(yuan * 100);
  }
  
  // 成交量单位转换（手转股）
  static lotsToShares(lots: number): number {
    if (typeof lots !== 'number' || isNaN(lots)) return 0;
    return Math.round(lots * 100);
  }
  
  // 股转手
  static sharesToLots(shares: number): number {
    if (typeof shares !== 'number' || isNaN(shares)) return 0;
    return Math.round(shares / 100);
  }
  
  // 金额转换（分转亿）
  static centsToBillions(cents: number): number {
    if (typeof cents !== 'number' || isNaN(cents)) return 0;
    return cents / 10000000000; // 分转亿
  }
  
  // 价格数据转换（Tushare 分转系统元）
  static convertPriceFromTushare(tusharePrice: number): number {
    // Tushare 返回的是元，需要确保精度
    return this.convertPriceFromApi(tusharePrice * 100);
  }
  
  // 筹码数据转换（分转元）
  static convertChipPriceFromApi(apiPrice: number): number {
    // API 返回的是分，转换为元
    return this.centsToYuan(apiPrice);
  }
  
  // 通用API价格数据转换（分转元）
  static convertPriceFromApi(apiPrice: number): number {
    // API 返回的是分，转换为元
    return this.centsToYuan(apiPrice);
  }
  
  // 验证价格数据
  static validatePrice(price: number, min: number = 0, max: number = 10000): boolean {
    return typeof price === 'number' && price >= min && price <= max && !isNaN(price);
  }
  
  // 验证成交量数据
  static validateVolume(volume: number): boolean {
    return typeof volume === 'number' && volume >= 0 && !isNaN(volume);
  }
  
  // 判断是否为价格相关字段
  static isPriceField(key: string): boolean {
    // 检查字段名是否与价格相关
    const priceFieldPatterns = [
      /price/i,      // 价格
      /cost/i,       // 成本
      /level/i,      // 价格水平
      /value/i,      // 价值
      /amount/i,     // 金额
      /open/i,       // 开盘价
      /high/i,       // 最高价
      /low/i,        // 最低价
      /close/i,      // 收盘价
      /preclose/i,   // 前收盘价
      /avg/i,        // 均价
      /target/i,     // 目标价
      /stoploss/i,   // 止损价
      /profit/i,     // 利润
      /loss/i,       // 亏损
      /volume/i,     // 成交量（特殊处理，需要转换单位）
    ];
    
    // 检查字段名是否匹配价格模式
    return priceFieldPatterns.some(pattern => pattern.test(key));
  }
}
