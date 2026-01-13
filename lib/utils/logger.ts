// logger.ts - 全局日志工具

interface LoggerOptions {
  category?: string;
  isDevelopment?: boolean;
  requestId?: string;
}

const COLORS = {
  INFO: '\x1b[32m', // Green
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  DEBUG: '\x1b[36m', // Cyan
  RESET: '\x1b[0m', // Reset color
};

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogData {
  [key: string]: any;
  requestId?: string;
  duration?: number;
  stack?: string;
  message?: string;
}

// 日志条目接口
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: LogData;
}

class Logger {
  private category: string;
  private isDevelopment: boolean;
  private timers: Map<string, number> = new Map();
  private requestId?: string;
  // 保存日志记录的静态数组
  private static logs: LogEntry[] = [];
  // 最大日志条目数
  private static maxLogEntries = 10000;

  constructor(options: LoggerOptions = {}) {
    this.category = options.category || 'APP';
    this.isDevelopment = options.isDevelopment ?? process.env.NODE_ENV === 'development';
    this.requestId = options.requestId;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  // 生成唯一的requestId
  static generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private formatMessage(level: LogLevel, message: string, data?: LogData): string {
    const timestamp = this.getTimestamp();
    const color = this.isDevelopment ? COLORS[level] : '';
    const reset = this.isDevelopment ? COLORS.RESET : '';
    
    // 合并requestId到数据中
    const logData = { ...data, requestId: this.requestId || data?.requestId };
    
    let formatted = `${color}[${timestamp}] [${level}] [${this.category}]`;
    
    // 添加requestId（如果存在）
    if (logData.requestId) {
      formatted += ` [REQ:${logData.requestId}]`;
    }
    
    formatted += ` ${message}${reset}`;
    
    if (logData && Object.keys(logData).length > 0) {
      formatted += ` ${JSON.stringify(logData, null, 2)}`;
    }
    
    return formatted;
  }

  // 保存日志条目到静态数组
  private saveLogEntry(level: LogLevel, message: string, data?: LogData): void {
    const timestamp = this.getTimestamp();
    const logEntry: LogEntry = {
      timestamp,
      level,
      category: this.category,
      message,
      data: { ...data, requestId: this.requestId || data?.requestId }
    };
    
    // 添加到日志数组
    Logger.logs.push(logEntry);
    
    // 如果日志条目数超过最大值，移除最旧的条目
    if (Logger.logs.length > Logger.maxLogEntries) {
      Logger.logs.shift();
    }
  }

  info(message: string, data?: LogData): void {
    this.saveLogEntry('INFO', message, data);
    console.log(this.formatMessage('INFO', message, data));
  }

  warn(message: string, data?: LogData): void {
    this.saveLogEntry('WARN', message, data);
    console.warn(this.formatMessage('WARN', message, data));
  }

  error(message: string, error?: Error | LogData): void {
    const errorData = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    this.saveLogEntry('ERROR', message, errorData);
    console.error(this.formatMessage('ERROR', message, errorData));
  }

  debug(message: string, data?: LogData): void {
    if (this.isDevelopment) {
      this.saveLogEntry('DEBUG', message, data);
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  time(label: string): void {
    this.timers.set(label, performance.now());
  }

  timeEnd(label: string): void {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.info(`${label} took ${duration.toFixed(2)}ms`, { duration });
      this.timers.delete(label);
    }
  }

  // 创建带有特定分类的Logger实例
  withCategory(category: string): Logger {
    return new Logger({ category, isDevelopment: this.isDevelopment, requestId: this.requestId });
  }

  // 创建带有特定requestId的Logger实例
  withRequestId(requestId: string): Logger {
    return new Logger({ category: this.category, isDevelopment: this.isDevelopment, requestId });
  }

  // 设置当前Logger实例的requestId
  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  // 获取当前Logger实例的requestId
  getRequestId(): string | undefined {
    return this.requestId;
  }

  // 导出所有日志
  static exportLogs(): string {
    return JSON.stringify(Logger.logs, null, 2);
  }

  // 下载日志文件
  static downloadLogs(): void {
    const logsJson = Logger.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  // 清除所有日志
  static clearLogs(): void {
    Logger.logs = [];
  }

  // 获取所有日志
  static getLogs(): LogEntry[] {
    return [...Logger.logs];
  }
}

// 默认Logger实例
export const logger = new Logger();

// 导出Logger类以便创建自定义实例
export { Logger };