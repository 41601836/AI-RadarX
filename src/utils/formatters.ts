import dayjs from 'dayjs';

/**
 * Format date to yyyy-MM-dd HH:mm:ss format
 * @param date Date object or string
 * @returns Formatted date string
 */
export function formatDateTime(date: Date | string | number): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Format date to yyyy-MM-dd format
 * @param date Date object or string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * Convert price from yuan to cents
 * @param yuan Price in yuan
 * @returns Price in cents
 */
export function yuanToCents(yuan: number | string): number {
  const numYuan = typeof yuan === 'string' ? parseFloat(yuan) : yuan;
  return Math.round(numYuan * 100);
}

/**
 * Convert price from cents to yuan
 * @param cents Price in cents
 * @returns Price in yuan
 */
export function centsToYuan(cents: number | string): number {
  const numCents = typeof cents === 'string' ? parseInt(cents, 10) : cents;
  return numCents / 100;
}

/**
 * Validate stock code format
 * @param stockCode Stock code
 * @returns True if valid, false otherwise
 */
export function validateStockCode(stockCode: string): boolean {
  return /^(SH|SZ)\d{6}$/.test(stockCode);
}

/**
 * Generate request ID
 * @returns Request ID
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}
