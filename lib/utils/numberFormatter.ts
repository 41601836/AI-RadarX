// 数字格式化工具函数

/**
 * 强制对数字执行toFixed(2)格式化
 * @param value 要格式化的数字
 * @returns 格式化后的字符串
 */
export function formatNumberToFixed2(value: number | string): string {
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  if (isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}

/**
 * 格式化百分比数字，保留2位小数
 * @param value 要格式化的数字
 * @returns 格式化后的百分比字符串
 */
export function formatPercentToFixed2(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return '0.00%';
  }
  const formatted = Math.abs(num).toFixed(2);
  const sign = num >= 0 ? '+' : '';
  return `${sign}${formatted}%`;
}

/**
 * 格式化金额数字，保留2位小数
 * @param value 要格式化的数字
 * @returns 格式化后的金额字符串
 */
export function formatAmountToFixed2(value: number | string): string {
  return formatNumberToFixed2(value);
}

/**
 * 格式化数字，自动转换万/亿单位，保留2位小数
 * @param value 要格式化的数字
 * @returns 格式化后的字符串
 */
export function formatNumberWithUnit(value: number | string): string {
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  if (isNaN(value)) {
    return '0.00';
  }
  
  const num = Math.abs(value);
  const sign = value >= 0 ? '' : '-';
  
  if (num >= 100000000) {
    // 亿单位
    return sign + (num / 100000000).toFixed(2) + '亿';
  } else if (num >= 10000) {
    // 万单位
    return sign + (num / 10000).toFixed(2) + '万';
  } else {
    // 直接保留2位小数
    return sign + num.toFixed(2);
  }
}