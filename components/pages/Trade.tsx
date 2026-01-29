'use client';

import React, { useState, useEffect } from 'react';
import { useUserStore, PortfolioPosition } from '../../lib/store/user-portfolio';
import { useNotifications, notifications } from '../NotificationCenter';
import { fetchStockBasicList, StockBasicInfo } from '../../lib/api/market';
import { formatNumberToFixed2, formatNumberWithUnit } from '../../lib/utils/numberFormatter';
import { useMarketStore } from '../../lib/store/useMarketStore';
import { useStockContext } from '../../lib/context/StockContext';
import { useStrategyStore } from '../../lib/store/useStrategyStore';
import { fetchPositions, submitOrder, OrderType, OrderDirection, OrderStatus } from '../../lib/api/trade/orderService';
import { exportAndDownloadPostMortem } from '../../lib/utils/exporter';

const Trade: React.FC = () => {
  // 添加客户端仅渲染模式
  const [mounted, setMounted] = useState(false);

  // 从用户存储获取资产信息和更新方法
  const { availableCash, positions, addPosition, updatePosition } = useUserStore();
  // 从通知中心获取添加通知方法
  const { addNotification } = useNotifications();
  // 从市场存储获取实时价格信息
  const { marketData, fetchQuote, updateQuote } = useMarketStore();
  // 从股票上下文获取当前股票
  const { currentTicker } = useStockContext();
  // 从策略存储获取风险控制相关功能
  const { getStockConsensus } = useStrategyStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // 在组件挂载前不渲染任何内容
  if (!mounted) return null;

  // 表单状态
  const [stockCode, setStockCode] = useState<string>('');
  const [stockName, setStockName] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(100);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [totalAmount, setTotalAmount] = useState<number>(0);

  // 监听当前股票变化，自动填充表单
  useEffect(() => {
    if (currentTicker) {
      setStockCode(currentTicker.ts_code);
      setStockName(currentTicker.name);
      // 自动获取实时价格
      fetchQuote(currentTicker.ts_code).then(quote => {
        if (quote) {
          setPrice(quote.price);
        }
      });
    }
  }, [currentTicker, fetchQuote]);

  // 获取真实持仓
  useEffect(() => {
    const loadPositions = async () => {
      try {
        const response = await fetchPositions();
        if (response.code === 200 && response.data) {
          // 清空现有持仓
          // 注意：这里需要根据实际store实现来决定如何清空
          // 暂时先不处理清空逻辑，直接添加或更新

          // 将获取到的持仓添加到用户存储
          response.data.positions.forEach(position => {
            // 检查是否已有该股票的持仓
            const existingPosition = positions.find(pos => pos.stockCode === position.stockCode);

            const portfolioPosition: PortfolioPosition = {
              stockCode: position.stockCode,
              stockName: position.stockName,
              shares: position.shares,
              availableShares: position.availableShares,
              averagePrice: position.averagePrice,
              currentPrice: position.currentPrice,
              marketValue: position.marketValue,
              profitLoss: position.profitLoss,
              profitLossRate: position.profitLossRate
            };

            if (existingPosition) {
              // 更新现有持仓
              updatePosition(position.stockCode, portfolioPosition);
            } else {
              // 添加新持仓
              addPosition(portfolioPosition);
            }
          });
        }
      } catch (error) {
        console.error('获取持仓失败:', error);
        addNotification(notifications.error('获取持仓失败', '无法加载您的持仓信息'));
      }
    };

    loadPositions();
  }, []);

  // 风控确认对话框状态
  const [showRiskConfirm, setShowRiskConfirm] = useState<boolean>(false);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [riskReasoning, setRiskReasoning] = useState<string | undefined>(undefined);
  const [riskConfirmInput, setRiskConfirmInput] = useState<string>(''); // 用户输入的确认文本

  // 股票搜索相关
  const [stockList, setStockList] = useState<StockBasicInfo[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<StockBasicInfo[]>([]);
  const [showStockList, setShowStockList] = useState<boolean>(false);

  // 加载股票列表
  useEffect(() => {
    const loadStockList = async () => {
      try {
        const response = await fetchStockBasicList();
        setStockList(response?.data?.list || []);
      } catch (error) {
        console.error('Error loading stock list:', error);
      }
    };

    loadStockList();
  }, []);

  // 过滤股票列表
  useEffect(() => {
    if (stockCode.length > 0) {
      const filtered = stockList.filter(stock =>
        stock.ts_code.includes(stockCode.toUpperCase()) ||
        stock.name.includes(stockCode) ||
        stock.symbol.includes(stockCode)
      );
      setFilteredStocks(filtered.slice(0, 10));
      setShowStockList(true);
    } else {
      setFilteredStocks([]);
      setShowStockList(false);
    }
  }, [stockCode, stockList]);

  // 计算总金额
  useEffect(() => {
    const amount = price * quantity;
    setTotalAmount(amount);
  }, [price, quantity]);

  // 设置买入百分比
  const setBuyPercentage = (percentage: number) => {
    if (price <= 0) return;
    const maxQuantity = Math.floor((availableCash * percentage) / price / 100) * 100;
    setQuantity(maxQuantity);
  };

  // 选择股票
  const selectStock = async (stock: StockBasicInfo) => {
    setStockCode(stock.ts_code);
    setStockName(stock.name);
    // 从市场存储获取实时价格
    const quote = await fetchQuote(stock.ts_code);
    if (quote) {
      setPrice(quote.price);
    } else {
      // 如果获取失败，使用模拟价格
      setPrice(Math.round((Math.random() * 100 + 10) * 100) / 100);
    }
    setShowStockList(false);
  };

  // 执行买入操作的核心逻辑
  const executeBuy = async () => {
    if (!stockCode || !stockName || price <= 0 || quantity <= 0) {
      addNotification(notifications.error('交易失败', '请填写完整的交易信息'));
      return;
    }

    if (totalAmount > availableCash) {
      addNotification(notifications.error('交易失败', '可用资金不足'));
      return;
    }

    try {
      // price单位校验：确保价格是两位小数
      const formattedPrice = Math.round(price * 100) / 100;

      // 准备下单参数 - 价格单位转换：元转分
      const priceInCents = Math.round(formattedPrice * 100);

      const orderParams = {
        stockCode,
        stockName,
        direction: OrderDirection.BUY,
        orderType: orderType === 'limit' ? OrderType.LIMIT : OrderType.MARKET,
        price: priceInCents,
        quantity
      };

      // 调用submitOrder接口
      const response = await submitOrder(orderParams);

      if (response.code === 200 && response.data) {
        // 下单成功后，更新持仓
        const order = response.data;

        // 查找是否已有持仓
        const existingPosition = positions.find(pos => pos.stockCode === stockCode);

        if (existingPosition) {
          // 更新现有持仓
          const newShares = existingPosition.shares + order.filledQuantity;
          const newAveragePrice = (existingPosition.averagePrice * existingPosition.shares + order.price * order.filledQuantity) / newShares;
          const newMarketValue = newShares * order.price;
          const newProfitLoss = newMarketValue - (existingPosition.shares * existingPosition.averagePrice + order.price * order.filledQuantity);
          const newProfitLossRate = (newProfitLoss / (existingPosition.shares * existingPosition.averagePrice + order.price * order.filledQuantity)) * 100;

          updatePosition(stockCode, {
            shares: newShares,
            availableShares: existingPosition.availableShares + order.filledQuantity,
            averagePrice: newAveragePrice,
            currentPrice: order.price,
            marketValue: newMarketValue,
            profitLoss: newProfitLoss,
            profitLossRate: newProfitLossRate
          });
        } else if (order.filledQuantity > 0) {
          // 添加新持仓
          const newPosition: PortfolioPosition = {
            stockCode,
            stockName,
            shares: order.filledQuantity,
            availableShares: order.filledQuantity,
            averagePrice: order.price,
            currentPrice: order.price,
            marketValue: order.price * order.filledQuantity,
            profitLoss: 0,
            profitLossRate: 0
          };

          addPosition(newPosition);
        }

        // 触发成交广播
        const statusText = order.status;

        addNotification(notifications.success('交易成功', `已成功买入 ${stockName} ${order.filledQuantity} 股，成交金额 ${(order.price * order.filledQuantity).toFixed(2)} 元，状态：${statusText}`));

        // 重置表单
        setQuantity(100);
        // 关闭风控确认对话框
        setShowRiskConfirm(false);
      } else {
        // 下单失败
        addNotification(notifications.error('交易失败', response.msg || '下单请求失败，请稍后重试'));
      }
    } catch (error) {
      console.error('下单失败:', error);
      addNotification(notifications.error('交易失败', '下单处理失败，请稍后重试'));
    }
  };

  // 买入股票
  const handleBuy = () => {
    // 先进行风控检查
    const consensus = getStockConsensus(stockCode);

    if (consensus) {
      // 检查风险等级
      if (consensus.riskLevel === 'high') {
        // 风险等级为high，显示警告框
        setRiskLevel(consensus.riskLevel);
        setRiskReasoning(consensus.reasoning);
        setShowRiskConfirm(true);
      } else {
        // 风险等级较低，直接执行买入
        executeBuy();
      }
    } else {
      // 如果没有共识结果，直接执行买入
      executeBuy();
    }
  };

  // 确认风险后执行买入
  const handleRiskConfirm = () => {
    if (riskConfirmInput === 'CONFIRM') {
      executeBuy();
      setRiskConfirmInput(''); // 重置输入
    }
  };

  // 取消风险确认
  const handleRiskCancel = () => {
    setShowRiskConfirm(false);
    setRiskConfirmInput(''); // 重置输入
  };

  return (
    <div className="h-full flex flex-col bg-black text-slate-300 font-sans">
      {/* 风控确认对话框 */}
      {showRiskConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-red-500 max-w-md w-full p-6">
            <div className="text-red-500 text-2xl font-bold mb-4 flex items-center">
              <span className="mr-2">⚠️</span>
              高风险警告
            </div>
            <div className="mb-4 text-slate-300">
              <p className="mb-2 font-medium">当前股票：{stockName} ({stockCode})</p>
              <p className="mb-2">风险等级：<span className="text-red-400 font-semibold">{riskLevel}</span></p>
              <p className="text-sm text-slate-400">{riskReasoning}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                风险评分 &gt; 80%，请输入 "CONFIRM" 确认交易
              </label>
              <input
                type="text"
                value={riskConfirmInput}
                onChange={(e) => setRiskConfirmInput(e.target.value.toUpperCase())}
                placeholder="请输入 CONFIRM"
                className="w-full p-3 bg-black text-slate-200 border border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 p-3 bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                onClick={handleRiskCancel}
              >
                取消交易
              </button>
              <button
                className="flex-1 p-3 bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                onClick={handleRiskConfirm}
                disabled={riskConfirmInput !== 'CONFIRM'}
              >
                确认买入
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center p-6 border-b border-slate-800">
        <h2 className="text-2xl font-semibold text-cyan-300">交易终端</h2>
        <div className="flex gap-6">
          <div className="text-right">
            <span className="block text-xs text-slate-400 mb-1">可用资金</span>
            <span className="block text-lg font-semibold text-emerald-300">¥ {formatNumberToFixed2(availableCash)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 p-6 overflow-hidden">
        {/* 交易表单 */}
        <div className={`flex-1 max-w-lg p-6 bg-black ${side === 'buy' ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-rose-500/5 border border-rose-500/20'}`}>
          {/* 股票代码输入 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-400 mb-2">股票代码/名称</label>
            <div className="relative">
              <input
                type="text"
                value={stockCode}
                onChange={(e) => setStockCode(e.target.value)}
                placeholder="输入股票代码或名称"
                className="w-full p-3 bg-slate-800 text-slate-200 rounded border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              {showStockList && filteredStocks.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 z-50 max-h-[300px] overflow-y-auto">
                  {filteredStocks.map((stock) => (
                    <div
                      key={stock.ts_code}
                      className="p-3 cursor-pointer hover:bg-slate-700 flex justify-between"
                      onClick={() => selectStock(stock)}
                    >
                      <span className="font-medium text-cyan-300">{stock.ts_code}</span>
                      <span className="text-slate-200">{stock.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 买卖方向 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-400 mb-2">买卖方向</label>
            <div className="flex gap-3">
              <button
                className={`flex-1 p-3 text-sm font-medium rounded border transition-all ${side === 'buy' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
                onClick={() => setSide('buy')}
              >
                买入
              </button>
              <button
                className={`flex-1 p-3 text-sm font-medium rounded border transition-all ${side === 'sell' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
                onClick={() => setSide('sell')}
                disabled
              >
                卖出
              </button>
            </div>
          </div>

          {/* 订单类型 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-400 mb-2">订单类型</label>
            <div className="flex gap-3">
              <button
                className={`flex-1 p-3 text-sm font-medium rounded border transition-all ${orderType === 'market' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
                onClick={() => setOrderType('market')}
                disabled
              >
                市价单
              </button>
              <button
                className={`flex-1 p-3 text-sm font-medium rounded border transition-all ${orderType === 'limit' ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}`}
                onClick={() => setOrderType('limit')}
              >
                限价单
              </button>
            </div>
          </div>

          {/* 价格和数量 */}
          <div className="flex gap-5 mb-5">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-400 mb-2">价格 (元)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                className="w-full p-3 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-400 mb-2">数量 (股)</label>
              <div className="flex items-center gap-2">
                <button
                  className="w-10 h-10 flex items-center justify-center bg-slate-800 text-slate-200 rounded border border-slate-700 hover:bg-slate-700"
                  onClick={() => setQuantity(Math.max(100, quantity - 100))}
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(100, parseInt(e.target.value) || 0))}
                  step="100"
                  min="100"
                  className="flex-1 p-3 bg-slate-800 text-slate-200 rounded border border-slate-700 text-center font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <button
                  className="w-10 h-10 flex items-center justify-center bg-slate-800 text-slate-200 rounded border border-slate-700 hover:bg-slate-700"
                  onClick={() => setQuantity(quantity + 100)}
                >
                  +
                </button>
              </div>

              {/* 快捷百分比按钮 */}
              <div className="flex gap-2 mt-3">
                <button
                  className="flex-1 p-2 text-xs font-medium bg-slate-800 text-slate-200 rounded hover:bg-slate-700 hover:text-cyan-300 transition-colors"
                  onClick={() => setBuyPercentage(0.25)}
                >
                  25%
                </button>
                <button
                  className="flex-1 p-2 text-xs font-medium bg-slate-800 text-slate-200 rounded hover:bg-slate-700 hover:text-cyan-300 transition-colors"
                  onClick={() => setBuyPercentage(0.5)}
                >
                  50%
                </button>
                <button
                  className="flex-1 p-2 text-xs font-medium bg-slate-800 text-slate-200 rounded hover:bg-slate-700 hover:text-cyan-300 transition-colors"
                  onClick={() => setBuyPercentage(1.0)}
                >
                  100%
                </button>
              </div>
            </div>
          </div>

          {/* 总金额 */}
          <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded">
            <label className="block text-sm font-medium text-slate-400 mb-1">总金额</label>
            <div className="text-2xl font-semibold text-cyan-300 font-mono">
              ¥ {formatNumberToFixed2(totalAmount)}
            </div>
          </div>

          {/* 交易按钮 */}
          <div className="flex gap-4">
            <button
              className="flex-1 p-4 text-lg font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleBuy}
              disabled={side !== 'buy'}
              title="买入 (B)"
            >
              买入
              <span className="text-xs text-emerald-200 ml-1 opacity-70">(B)</span>
            </button>
            <button
              className="flex-1 p-4 text-lg font-semibold bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled
              title="卖出 (S)"
            >
              卖出
              <span className="text-xs text-rose-200 ml-1 opacity-70">(S)</span>
            </button>
          </div>
        </div>

        {/* 持仓看板 */}
        <div className="flex-1 p-6 bg-black overflow-y-auto">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-cyan-300">我的持仓</h3>
            <button
              className="bg-transparent border-none text-cyan-300 font-mono text-sm font-bold hover:text-cyan-100 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.6)]"
              onClick={() => exportAndDownloadPostMortem(useStrategyStore.getState().thoughtLogs, positions)}
            >
              导出复盘报告
            </button>
          </div>
          {positions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              暂无持仓
            </div>
          ) : (
            <div className="fincept-table">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">股票代码</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">股票名称</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">持仓量</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">可用量</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">现价</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">盈亏额</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">盈亏率</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => {
                    // 从市场数据获取实时价格
                    const realtimeQuote = marketData.quotes[position.stockCode];
                    const realtimePrice = realtimeQuote?.price || position.currentPrice;

                    // 更新盈亏和盈亏率计算
                    const updatedMarketValue = position.shares * realtimePrice;
                    const updatedProfitLoss = updatedMarketValue - (position.shares * position.averagePrice);
                    const updatedProfitLossRate = (updatedProfitLoss / (position.shares * position.averagePrice)) * 100;

                    return (
                      <tr key={position.stockCode} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-cyan-300">{position.stockCode}</td>
                        <td className="py-3 px-4 text-slate-300">{position.stockName}</td>
                        <td className="py-3 px-4 text-right text-slate-300 font-mono tabular-nums">{position.shares} 股</td>
                        <td className="py-3 px-4 text-right text-slate-300 font-mono tabular-nums">{position.shares} 股</td>
                        <td className={`py-3 px-4 text-right font-mono tabular-nums ${realtimePrice > position.averagePrice ? 'text-emerald-300' : realtimePrice < position.averagePrice ? 'text-rose-300' : 'text-slate-300'}`}>
                          ¥ {formatNumberToFixed2(realtimePrice)}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono tabular-nums ${updatedProfitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          ¥ {formatNumberWithUnit(updatedProfitLoss)}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono tabular-nums animate-pulse ${updatedProfitLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {formatNumberToFixed2(updatedProfitLossRate)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Trade;