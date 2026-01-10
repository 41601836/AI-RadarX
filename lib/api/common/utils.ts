// 通用工具函数

/**
 * 将日期对象格式化为统一的时间字符串格式（yyyy-MM-dd HH:mm:ss）
 * @param date 日期对象
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * 将元转换为分（避免浮点精度问题）
 * @param yuan 元（支持数字或字符串）
 * @returns 分
 */
export function yuanToFen(yuan: number | string): number {
  const num = typeof yuan === 'string' ? parseFloat(yuan) : yuan;
  return Math.round(num * 100);
}

/**
 * 将分转换为元
 * @param fen 分
 * @returns 元
 */
export function fenToYuan(fen: number): number {
  return fen / 100;
}

/**
 * 验证股票代码格式
 * @param stockCode 股票代码
 * @returns 是否有效
 */
export function isValidStockCode(stockCode: string): boolean {
  if (!stockCode) return false;
  // 匹配SH/SZ开头的股票代码，如SH600000、SZ000001
  return /^(SH|SZ)\d{6}$/.test(stockCode);
}

/**
 * 验证日期格式
 * @param dateStr 日期字符串
 * @param format 期望的格式（默认yyyy-MM-dd HH:mm:ss）
 * @returns 是否有效
 */
export function isValidDateFormat(dateStr: string, format: 'date' | 'datetime' = 'datetime'): boolean {
  if (!dateStr) return false;
  
  if (format === 'date') {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  } else {
    return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr);
  }
}

/**
 * 生成随机数（指定范围）
 * @param min 最小值
 * @param max 最大值
 * @returns 随机数
 */
export function randomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 生成随机整数（指定范围）
 * @param min 最小值
 * @param max 最大值
 * @returns 随机整数
 */
export function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
