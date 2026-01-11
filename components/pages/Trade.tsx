'use client';

import React, { useState, useEffect } from 'react';
import { useUserStore, PortfolioPosition } from '../../lib/store/user-portfolio';
import { useNotifications, notifications } from '../NotificationCenter';
import { fetchStockBasicList, StockBasicInfo } from '../../lib/api/market';
import { formatNumberToFixed2, formatNumberWithUnit } from '../../lib/utils/numberFormatter';

const Trade: React.FC = () => {
  // 从用户存储获取资产信息和更新方法
  const { availableCash, positions, addPosition, updatePosition } = useUserStore();
  // 从通知中心获取添加通知方法
  const { addNotification } = useNotifications();
  
  // 表单状态
  const [stockCode, setStockCode] = useState<string>('');
  const [stockName, setStockName] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(100);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  
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
  
  // 选择股票
  const selectStock = (stock: StockBasicInfo) => {
    setStockCode(stock.ts_code);
    setStockName(stock.name);
    // 模拟当前价格（实际项目中应该从行情接口获取）
    setPrice(Math.round((Math.random() * 100 + 10) * 100) / 100);
    setShowStockList(false);
  };
  
  // 买入股票
  const handleBuy = () => {
    if (!stockCode || !stockName || price <= 0 || quantity <= 0) {
      addNotification(notifications.error('交易失败', '请填写完整的交易信息'));
      return;
    }
    
    if (totalAmount > availableCash) {
      addNotification(notifications.error('交易失败', '可用资金不足'));
      return;
    }
    
    // 查找是否已有持仓
    const existingPosition = positions.find(pos => pos.stockCode === stockCode);
    
    if (existingPosition) {
      // 更新现有持仓
      const newShares = existingPosition.shares + quantity;
      const newAveragePrice = (existingPosition.averagePrice * existingPosition.shares + price * quantity) / newShares;
      const newMarketValue = newShares * price;
      const newProfitLoss = newMarketValue - (existingPosition.shares * existingPosition.averagePrice + quantity * price);
      const newProfitLossRate = (newProfitLoss / (existingPosition.shares * existingPosition.averagePrice + quantity * price)) * 100;
      
      updatePosition(stockCode, {
        shares: newShares,
        averagePrice: newAveragePrice,
        currentPrice: price,
        marketValue: newMarketValue,
        profitLoss: newProfitLoss,
        profitLossRate: newProfitLossRate
      });
    } else {
      // 添加新持仓
      const newPosition: PortfolioPosition = {
        stockCode,
        stockName,
        shares: quantity,
        averagePrice: price,
        currentPrice: price,
        marketValue: totalAmount,
        profitLoss: 0,
        profitLossRate: 0
      };
      
      addPosition(newPosition);
    }
    
    // 触发成交广播
    addNotification(notifications.success('交易成功', `已成功买入 ${stockName} ${quantity} 股，成交金额 ${totalAmount.toFixed(2)} 元`));
    
    // 重置表单
    setQuantity(100);
  };
  
  return (
    <div className="trade-page">
      <div className="trade-header">
        <h2>交易终端</h2>
        <div className="account-info">
          <div className="cash-balance">
            <span className="label">可用资金</span>
            <span className="value">¥ {formatNumberToFixed2(availableCash)}</span>
          </div>
        </div>
      </div>
      
      <div className="trade-form-container">
        <div className="trade-form">
          {/* 股票代码输入 */}
          <div className="form-group">
            <label>股票代码/名称</label>
            <div className="stock-search-wrapper">
              <input
                type="text"
                value={stockCode}
                onChange={(e) => setStockCode(e.target.value)}
                placeholder="输入股票代码或名称"
                className="stock-input"
              />
              {showStockList && filteredStocks.length > 0 && (
                <div className="stock-list">
                  {filteredStocks.map((stock) => (
                    <div
                      key={stock.ts_code}
                      className="stock-item"
                      onClick={() => selectStock(stock)}
                    >
                      <span className="stock-code">{stock.ts_code}</span>
                      <span className="stock-name">{stock.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* 买卖方向 */}
          <div className="form-group">
            <label>买卖方向</label>
            <div className="side-selector">
              <button
                className={`side-btn ${side === 'buy' ? 'active' : ''}`}
                onClick={() => setSide('buy')}
              >
                买入
              </button>
              <button
                className={`side-btn ${side === 'sell' ? 'active' : ''}`}
                onClick={() => setSide('sell')}
                disabled
              >
                卖出
              </button>
            </div>
          </div>
          
          {/* 订单类型 */}
          <div className="form-group">
            <label>订单类型</label>
            <div className="order-type-selector">
              <button
                className={`order-type-btn ${orderType === 'market' ? 'active' : ''}`}
                onClick={() => setOrderType('market')}
                disabled
              >
                市价单
              </button>
              <button
                className={`order-type-btn ${orderType === 'limit' ? 'active' : ''}`}
                onClick={() => setOrderType('limit')}
              >
                限价单
              </button>
            </div>
          </div>
          
          {/* 价格和数量 */}
          <div className="form-row">
            <div className="form-group">
              <label>价格 (元)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                className="price-input"
              />
            </div>
            
            <div className="form-group">
              <label>数量 (股)</label>
              <div className="quantity-control">
                <button
                  className="quantity-btn"
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
                  className="quantity-input"
                />
                <button
                  className="quantity-btn"
                  onClick={() => setQuantity(quantity + 100)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          
          {/* 总金额 */}
          <div className="form-group total-amount">
            <label>总金额</label>
            <div className="total-amount-value">
              ¥ {formatNumberToFixed2(totalAmount)}
            </div>
          </div>
          
          {/* 交易按钮 */}
          <div className="form-actions">
            <button
              className="trade-btn buy-btn"
              onClick={handleBuy}
              disabled={side !== 'buy'}
              title="买入 (B)"
            >
              买入
              <span className="shortcut">(B)</span>
            </button>
            <button
              className="trade-btn sell-btn"
              disabled
              title="卖出 (S)"
            >
              卖出
              <span className="shortcut">(S)</span>
            </button>
          </div>
        </div>
        
        {/* 我的持仓 */}
        <div className="positions-panel">
          <h3>我的持仓</h3>
          {positions.length === 0 ? (
            <div className="no-positions">
              暂无持仓
            </div>
          ) : (
            <div className="positions-list">
              {positions.map((position) => (
                <div key={position.stockCode} className="position-item">
                  <div className="position-info">
                    <div className="stock-info">
                      <span className="stock-code">{position.stockCode}</span>
                      <span className="stock-name">{position.stockName}</span>
                    </div>
                    <div className="position-details">
                      <div className="detail-item">
                        <span className="label">持仓数量</span>
                        <span className="value">{position.shares} 股</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">平均成本</span>
                        <span className="value">¥ {formatNumberToFixed2(position.averagePrice)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">当前价格</span>
                        <span className="value">¥ {formatNumberToFixed2(position.currentPrice)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">市值</span>
                        <span className="value">¥ {formatNumberWithUnit(position.marketValue)}</span>
                      </div>
                      <div className={`detail-item ${position.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                        <span className="label">盈亏</span>
                        <span className="value">¥ {formatNumberWithUnit(position.profitLoss)} ({formatNumberToFixed2(position.profitLossRate)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .trade-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #11111b;
          color: #cdd6f4;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .trade-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #313244;
        }
        
        .trade-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #89dceb;
        }
        
        .account-info {
          display: flex;
          gap: 24px;
        }
        
        .cash-balance {
          text-align: right;
        }
        
        .cash-balance .label {
          display: block;
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        
        .cash-balance .value {
          display: block;
          font-size: 18px;
          font-weight: 600;
          color: #a6e3a1;
        }
        
        .trade-form-container {
          display: flex;
          flex: 1;
          gap: 24px;
          padding: 24px;
          overflow: hidden;
        }
        
        .trade-form {
          flex: 1;
          max-width: 600px;
          background: #1e1e2e;
          padding: 24px;
          border: 1px solid #313244;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #bac2de;
          margin-bottom: 8px;
        }
        
        .stock-search-wrapper {
          position: relative;
        }
        
        .stock-input, .price-input, .quantity-input {
          width: 100%;
          padding: 12px 16px;
          font-size: 14px;
          border: 1px solid #313244;
          background-color: #2a2a3a;
          color: #cdd6f4;
          outline: none;
          transition: all 0.2s;
        }
        
        .stock-input:focus, .price-input:focus, .quantity-input:focus {
          border-color: #89dceb;
          box-shadow: 0 0 0 2px rgba(137, 220, 235, 0.2);
        }
        
        .stock-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background-color: #2a2a3a;
          border: 1px solid #313244;
          z-index: 100;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .stock-item {
          padding: 12px 16px;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          justify-content: space-between;
        }
        
        .stock-item:hover {
          background-color: #313244;
        }
        
        .stock-item .stock-code {
          font-weight: 500;
          color: #89dceb;
        }
        
        .stock-item .stock-name {
          color: #cdd6f4;
        }
        
        .side-selector, .order-type-selector {
          display: flex;
          gap: 12px;
        }
        
        .side-btn, .order-type-btn {
          flex: 1;
          padding: 12px;
          font-size: 14px;
          font-weight: 500;
          border: 1px solid #313244;
          background-color: #2a2a3a;
          color: #cdd6f4;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .side-btn:hover, .order-type-btn:hover {
          background-color: #313244;
        }
        
        .side-btn.active, .order-type-btn.active {
          border-color: #89dceb;
          background-color: rgba(137, 220, 235, 0.1);
          color: #89dceb;
        }
        
        .side-btn:disabled, .order-type-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .form-row {
          display: flex;
          gap: 20px;
        }
        
        .form-row .form-group {
          flex: 1;
        }
        
        .quantity-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .quantity-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #313244;
          background-color: #2a2a3a;
          color: #cdd6f4;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .quantity-btn:hover {
          background-color: #313244;
        }
        
        .quantity-input {
          text-align: center;
        }
        
        .total-amount {
          background-color: rgba(137, 220, 235, 0.1);
          padding: 16px;
          border: 1px solid rgba(137, 220, 235, 0.2);
        }
        
        .total-amount-value {
          font-size: 24px;
          font-weight: 600;
          color: #89dceb;
        }
        
        .form-actions {
          display: flex;
          gap: 16px;
        }
        
        .trade-btn {
          flex: 1;
          padding: 16px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .buy-btn {
          background-color: #16a34a;
          color: white;
        }
        
        .buy-btn:hover {
          background-color: #15803d;
        }
        
        .sell-btn {
          background-color: #dc2626;
          color: white;
        }
        
        .sell-btn:hover {
          background-color: #b91c1c;
        }
        
        .trade-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* 快捷键样式 */
        .shortcut {
          font-size: 10px;
          color: #6b7280;
          margin-left: 4px;
          opacity: 0.7;
        }
        
        /* 持仓面板 */
        .positions-panel {
          flex: 1;
          background: #1e1e2e;
          padding: 24px;
          border: 1px solid #313244;
          overflow-y: auto;
        }
        
        .positions-panel h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: #89dceb;
        }
        
        .no-positions {
          text-align: center;
          padding: 40px 0;
          color: #94a3b8;
          font-size: 14px;
        }
        
        .positions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .position-item {
          background-color: #2a2a3a;
          border: 1px solid #313244;
          padding: 16px;
          transition: all 0.2s;
        }
        
        .position-item:hover {
          border-color: #89dceb;
        }
        
        .position-info {
          margin-bottom: 12px;
        }
        
        .position-info .stock-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .position-info .stock-code {
          font-weight: 600;
          color: #89dceb;
          font-size: 16px;
        }
        
        .position-info .stock-name {
          color: #cdd6f4;
          font-size: 14px;
        }
        
        .position-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }
        
        .detail-item .label {
          color: #94a3b8;
        }
        
        .detail-item .value {
          color: #cdd6f4;
          font-weight: 500;
        }
        
        .detail-item.profit .value {
          color: #a6e3a1;
        }
        
        .detail-item.loss .value {
          color: #f38ba8;
        }
      `}</style>
    </div>
  );
};

export default Trade;