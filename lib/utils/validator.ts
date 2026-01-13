// validator.ts - 数据一致性守护工具
import { logger } from './logger';

interface ValidationResult {
  isValid: boolean;
  message?: string;
  code?: number;
}

interface ValidationOptions {
  min?: number;
  max?: number;
  allowZero?: boolean;
  allowNegative?: boolean;
  warningThreshold?: number;
}

class Validator {
  // 验证股票价格
  static validateStockPrice(price: number, options: ValidationOptions = {}): ValidationResult {
    const defaultOptions = { min: 0, max: 1000000, allowZero: false, allowNegative: false, ...options };
    
    if (typeof price !== 'number' || isNaN(price)) {
      return { isValid: false, message: '股价必须是有效数字', code: 60001 };
    }
    
    if (!defaultOptions.allowNegative && price < 0) {
      logger.error('股价验证失败', { price, error: '股价不能为负' });
      return { isValid: false, message: '股价不能为负', code: 60002 };
    }
    
    if (!defaultOptions.allowZero && price === 0) {
      logger.warn('股价警告', { price, warning: '股价为0，可能存在异常' });
      return { isValid: false, message: '股价不能为0', code: 60003 };
    }
    
    if (price < defaultOptions.min) {
      logger.error('股价验证失败', { price, min: defaultOptions.min, error: '股价低于最小值' });
      return { isValid: false, message: `股价不能低于${defaultOptions.min}`, code: 60004 };
    }
    
    if (price > defaultOptions.max) {
      logger.error('股价验证失败', { price, max: defaultOptions.max, error: '股价高于最大值' });
      return { isValid: false, message: `股价不能高于${defaultOptions.max}`, code: 60005 };
    }
    
    if (defaultOptions.warningThreshold && price > defaultOptions.warningThreshold) {
      logger.warn('股价警告', { price, threshold: defaultOptions.warningThreshold, warning: '股价接近或超过警告阈值' });
    }
    
    return { isValid: true };
  }
  
  // 验证交易金额
  static validateTradeAmount(amount: number, options: ValidationOptions = {}): ValidationResult {
    const defaultOptions = { min: 0, max: 10000000, allowZero: false, allowNegative: false, warningThreshold: 1000000, ...options };
    
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { isValid: false, message: '交易金额必须是有效数字', code: 60011 };
    }
    
    if (!defaultOptions.allowNegative && amount < 0) {
      logger.error('交易金额验证失败', { amount, error: '交易金额不能为负' });
      return { isValid: false, message: '交易金额不能为负', code: 60012 };
    }
    
    if (!defaultOptions.allowZero && amount === 0) {
      logger.warn('交易金额警告', { amount, warning: '交易金额为0，可能存在异常' });
      return { isValid: false, message: '交易金额不能为0', code: 60013 };
    }
    
    if (amount < defaultOptions.min) {
      logger.error('交易金额验证失败', { amount, min: defaultOptions.min, error: '交易金额低于最小值' });
      return { isValid: false, message: `交易金额不能低于${defaultOptions.min}`, code: 60014 };
    }
    
    if (amount > defaultOptions.max) {
      logger.error('交易金额验证失败', { amount, max: defaultOptions.max, error: '交易金额超过上限' });
      return { isValid: false, message: `交易金额不能超过${defaultOptions.max}`, code: 60015 };
    }
    
    if (defaultOptions.warningThreshold && amount > defaultOptions.warningThreshold) {
      logger.warn('交易金额警告', { amount, threshold: defaultOptions.warningThreshold, warning: '交易金额接近或超过警告阈值' });
    }
    
    return { isValid: true };
  }
  
  // 验证成交量
  static validateVolume(volume: number, options: ValidationOptions = {}): ValidationResult {
    const defaultOptions = { min: 0, max: 1000000000, allowZero: true, allowNegative: false, ...options };
    
    if (typeof volume !== 'number' || isNaN(volume)) {
      return { isValid: false, message: '成交量必须是有效数字', code: 60021 };
    }
    
    if (!defaultOptions.allowNegative && volume < 0) {
      logger.error('成交量验证失败', { volume, error: '成交量不能为负' });
      return { isValid: false, message: '成交量不能为负', code: 60022 };
    }
    
    if (!defaultOptions.allowZero && volume === 0) {
      logger.warn('成交量警告', { volume, warning: '成交量为0，可能存在异常' });
      return { isValid: false, message: '成交量不能为0', code: 60023 };
    }
    
    if (volume < defaultOptions.min) {
      logger.error('成交量验证失败', { volume, min: defaultOptions.min, error: '成交量低于最小值' });
      return { isValid: false, message: `成交量不能低于${defaultOptions.min}`, code: 60024 };
    }
    
    if (volume > defaultOptions.max) {
      logger.error('成交量验证失败', { volume, max: defaultOptions.max, error: '成交量超过上限' });
      return { isValid: false, message: `成交量不能超过${defaultOptions.max}`, code: 60025 };
    }
    
    return { isValid: true };
  }
  
  // 验证百分比值
  static validatePercentage(value: number, options: ValidationOptions = {}): ValidationResult {
    const defaultOptions = { min: -100, max: 100, allowZero: true, allowNegative: true, ...options };
    
    if (typeof value !== 'number' || isNaN(value)) {
      return { isValid: false, message: '百分比值必须是有效数字', code: 60031 };
    }
    
    if (!defaultOptions.allowNegative && value < 0) {
      logger.error('百分比值验证失败', { value, error: '百分比值不能为负' });
      return { isValid: false, message: '百分比值不能为负', code: 60032 };
    }
    
    if (!defaultOptions.allowZero && value === 0) {
      logger.warn('百分比值警告', { value, warning: '百分比值为0，可能存在异常' });
      return { isValid: false, message: '百分比值不能为0', code: 60033 };
    }
    
    if (value < defaultOptions.min) {
      logger.error('百分比值验证失败', { value, min: defaultOptions.min, error: '百分比值低于最小值' });
      return { isValid: false, message: `百分比值不能低于${defaultOptions.min}%`, code: 60034 };
    }
    
    if (value > defaultOptions.max) {
      logger.error('百分比值验证失败', { value, max: defaultOptions.max, error: '百分比值超过上限' });
      return { isValid: false, message: `百分比值不能超过${defaultOptions.max}%`, code: 60035 };
    }
    
    return { isValid: true };
  }
  
  // 批量验证多个值
  static validateBatch(validations: Array<() => ValidationResult>): ValidationResult {
    for (const validation of validations) {
      const result = validation();
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true };
  }
  
  // 验证股票代码格式
  static validateStockCode(stockCode: string): ValidationResult {
    if (!stockCode) {
      return { isValid: false, message: '股票代码不能为空', code: 60001 };
    }
    
    // 验证股票代码格式：必须以SH或SZ开头，后跟6位数字
    const stockCodeRegex = /^(SH|SZ)\d{6}$/;
    if (!stockCodeRegex.test(stockCode)) {
      return { isValid: false, message: '股票代码格式错误，应为SH/SZ开头的6位数字', code: 60001 };
    }
    
    return { isValid: true };
  }
  
  // 验证日期格式
  static validateDate(date: string, format: 'yyyy-MM-dd' | 'yyyy-MM-dd HH:mm:ss' = 'yyyy-MM-dd'): ValidationResult {
    if (!date) {
      return { isValid: false, message: '日期不能为空', code: 60041 };
    }
    
    let dateRegex;
    if (format === 'yyyy-MM-dd') {
      dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    } else {
      dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    }
    
    if (!dateRegex.test(date)) {
      return { isValid: false, message: `日期格式错误，应为${format}`, code: 60042 };
    }
    
    // 验证日期是否有效
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return { isValid: false, message: '日期无效', code: 60043 };
    }
    
    return { isValid: true };
  }
  
  // 验证分页参数
  static validatePagination(pageNum: number, pageSize: number): ValidationResult {
    // 验证页码
    if (typeof pageNum !== 'number' || isNaN(pageNum) || pageNum < 1) {
      return { isValid: false, message: '页码必须是大于0的有效数字', code: 60051 };
    }
    
    // 验证每页条数
    if (typeof pageSize !== 'number' || isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return { isValid: false, message: '每页条数必须是1-100之间的有效数字', code: 60052 };
    }
    
    return { isValid: true };
  }
  
  // 验证资金安全 - 单笔交易金额不能超过总资产的50%
  static validateTradeAmountPercentage(tradeAmount: number, totalAssets: number): ValidationResult {
    if (typeof tradeAmount !== 'number' || isNaN(tradeAmount)) {
      return { isValid: false, message: '交易金额必须是有效数字', code: 60011 };
    }
    
    if (typeof totalAssets !== 'number' || isNaN(totalAssets) || totalAssets <= 0) {
      return { isValid: false, message: '总资产必须是大于0的有效数字', code: 60011 };
    }
    
    const percentage = (tradeAmount / totalAssets) * 100;
    if (percentage > 50) {
      return { isValid: false, message: '单笔交易金额不能超过总资产的50%', code: 60061 };
    }
    
    return { isValid: true };
  }
  
  // 验证资金安全 - 价格偏差不能超过5%
  static validatePriceDeviation(tradePrice: number, marketPrice: number): ValidationResult {
    if (typeof tradePrice !== 'number' || isNaN(tradePrice)) {
      return { isValid: false, message: '交易价格必须是有效数字', code: 60001 };
    }
    
    if (typeof marketPrice !== 'number' || isNaN(marketPrice) || marketPrice <= 0) {
      return { isValid: false, message: '市场价格必须是大于0的有效数字', code: 60001 };
    }
    
    const deviation = Math.abs((tradePrice - marketPrice) / marketPrice) * 100;
    if (deviation > 5) {
      return { isValid: false, message: '交易价格与市场价格偏差不能超过5%', code: 60062 };
    }
    
    return { isValid: true };
  }
}

export { Validator, type ValidationResult, type ValidationOptions };