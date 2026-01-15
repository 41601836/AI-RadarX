// 复盘数据导出工具

import { ThoughtLog } from '../store/useStrategyStore';
import { PortfolioPosition } from '../store/user-portfolio';
import { formatNumberToFixed2, formatNumberWithUnit } from './numberFormatter';

/**
 * 导出 AI 辩论日志为文本格式
 */
export const exportAIDebateLogs = (logs: ThoughtLog[]): string => {
  let content = '=== AI 辩论日志 ===\n\n';
  content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  if (logs.length === 0) {
    content += '暂无 AI 辩论日志\n';
    return content;
  }
  
  logs.forEach((log, index) => {
    content += `${index + 1}. [${log.timestamp.toLocaleString('zh-CN')}]\n`;
    content += `   智能体: ${log.agent}\n`;
    content += `   类型: ${log.type}\n`;
    content += `   内容: ${log.message}\n`;
    if (log.confidence) {
      content += `   置信度: ${(log.confidence * 100).toFixed(1)}%\n`;
    }
    content += '\n';
  });
  
  return content;
};

/**
 * 导出持仓盈亏为文本格式
 */
export const exportPortfolioPnL = (positions: PortfolioPosition[]): string => {
  let content = '=== 持仓盈亏报告 ===\n\n';
  content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  if (positions.length === 0) {
    content += '暂无持仓数据\n';
    return content;
  }
  
  // 计算总市值和总盈亏
  const totalMarketValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalProfitLoss = positions.reduce((sum, pos) => sum + pos.profitLoss, 0);
  
  content += `总市值: ¥ ${formatNumberWithUnit(totalMarketValue)}\n`;
  content += `总盈亏: ¥ ${formatNumberWithUnit(totalProfitLoss)}\n\n`;
  
  content += '持仓明细:\n';
  content += '--------------------------------------------------\n';
  content += '股票代码 | 股票名称 | 持仓量 | 均价 | 现价 | 市值 | 盈亏额 | 盈亏率\n';
  content += '--------------------------------------------------\n';
  
  positions.forEach(pos => {
    content += `${pos.stockCode.padEnd(8)} | `;
    content += `${pos.stockName.padEnd(8)} | `;
    content += `${pos.shares.toString().padEnd(6)} | `;
    content += `¥ ${formatNumberToFixed2(pos.averagePrice).padEnd(6)} | `;
    content += `¥ ${formatNumberToFixed2(pos.currentPrice).padEnd(6)} | `;
    content += `¥ ${formatNumberWithUnit(pos.marketValue).padEnd(8)} | `;
    content += `¥ ${formatNumberWithUnit(pos.profitLoss).padEnd(8)} | `;
    content += `${formatNumberToFixed2(pos.profitLossRate)}%\n`;
  });
  
  return content;
};

/**
 * 合并导出 AI 辩论日志和持仓盈亏
 */
export const exportPostMortemReport = (logs: ThoughtLog[], positions: PortfolioPosition[]): string => {
  let content = '=== 复牌报告 ===\n\n';
  content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  // 添加 AI 辩论日志
  content += exportAIDebateLogs(logs);
  content += '\n';
  content += '='.repeat(50);
  content += '\n\n';
  
  // 添加持仓盈亏报告
  content += exportPortfolioPnL(positions);
  
  return content;
};

/**
 * 下载文本文件
 */
export const downloadTextFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * 导出并下载复牌报告
 */
export const exportAndDownloadPostMortem = (logs: ThoughtLog[], positions: PortfolioPosition[]): void => {
  const content = exportPostMortemReport(logs, positions);
  const filename = `复牌报告_${new Date().toISOString().slice(0, 10)}_${new Date().toTimeString().slice(0, 8).replace(/:/g, '-')}.txt`;
  
  downloadTextFile(content, filename);
};