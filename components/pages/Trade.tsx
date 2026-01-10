'use client';

import React, { useState } from 'react';
import { useUserStore, PortfolioPosition } from '../../lib/store/user-portfolio';

// 下单表单类型定义
interface OrderFormData {
  stockCode: string;
  stockName: string;
  price: number;
  shares: number;
  orderType: 'buy' | 'sell';
}

const Trade: React.FC = () => {
  // 从用户存储中获取持仓和操作方法
  const { positions, availableCash, addPosition, updatePosition, removePosition } = useUserStore();
  
  // 下单表单状态
  const [formData, setFormData] = useState<OrderFormData>({
    stockCode: '',
    stockName: '',
    price: 0,
    shares: 0,
    orderType: 'buy'
  });
  
  // 错误提示
  const [error, setError] = useState('');
  
  // 成功提示
  const [success, setSuccess] = useState('');
  
  // 模拟股票代码验证
  const validateStockCode = (code: string): { valid: boolean; name?: string; price?: number } => {
    const mockStocks: { [key: string]: { name: string; price: number } } = {
      'SH600000': { name: '浦发银行', price: 8.50 },
      'SZ000001': { name: '平安银行', price: 10.25 },
      'SH600036': { name: '招商银行', price: 32.80 },
      'SZ000858': { name: '五粮液', price: 150.50 },
      'SH600519': { name: '贵州茅台', price: 1800.00 },
      'SZ002415': { name: '海康威视', price: 35.20 },
    };
    
    const stock = mockStocks[code];
    if (stock) {
      return { valid: true, name: stock.name, price: stock.price };
    }
    return { valid: false };
  };
  
  // 处理股票代码输入变化
  const handleStockCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setFormData({ ...formData, stockCode: code });
    
    // 验证股票代码并自动填充名称和价格
    const validationResult = validateStockCode(code);
    if (validationResult.valid && validationResult.name && validationResult.price) {
      setFormData(prev => ({
        ...prev,
        stockName: validationResult.name,
        price: validationResult.price
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        stockName: '',
        price: 0
      }));
    }
  };
  
  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'shares' ? parseFloat(value) : value
    }));
  };
  
  // 处理下单操作
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // 表单验证
    if (!formData.stockCode) {
      setError('请输入股票代码');
      return;
    }
    
    if (!formData.stockName) {
      setError('无效的股票代码');
      return;
    }
    
    if (formData.price <= 0) {
      setError('请输入有效的价格');
      return;
    }
    
    if (formData.shares <= 0 || !Number.isInteger(formData.shares)) {
      setError('请输入有效的股数（整数）');
      return;
    }
    
    const totalAmount = formData.price * formData.shares;
    
    if (formData.orderType === 'buy') {
      // 检查可用资金
      if (totalAmount > availableCash) {
        setError('可用资金不足');
        return;
      }
      
      // 检查是否已持仓
      const existingPosition = positions.find(pos => pos.stockCode === formData.stockCode);
      
      if (existingPosition) {
        // 更新已有持仓
        const newShares = existingPosition.shares + formData.shares;
        const newAveragePrice = ((existingPosition.averagePrice * existingPosition.shares) + totalAmount) / newShares;
        const newMarketValue = newShares * formData.price;
        const newProfitLoss = newMarketValue - (newShares * newAveragePrice);
        const newProfitLossRate = (newProfitLoss / (newShares * newAveragePrice)) * 100;
        
        updatePosition(formData.stockCode, {
          shares: newShares,
          averagePrice: newAveragePrice,
          currentPrice: formData.price,
          marketValue: newMarketValue,
          profitLoss: newProfitLoss,
          profitLossRate: newProfitLossRate
        });
      } else {
        // 添加新持仓
        const newPosition: PortfolioPosition = {
          stockCode: formData.stockCode,
          stockName: formData.stockName,
          shares: formData.shares,
          averagePrice: formData.price,
          currentPrice: formData.price,
          marketValue: totalAmount,
          profitLoss: 0,
          profitLossRate: 0
        };
        
        addPosition(newPosition);
      }
      
      setSuccess(`成功买入 ${formData.shares} 股 ${formData.stockName}`);
    } else {
      // 卖出操作
      const existingPosition = positions.find(pos => pos.stockCode === formData.stockCode);
      
      if (!existingPosition) {
        setError('您没有该股票的持仓');
        return;
      }
      
      if (formData.shares > existingPosition.shares) {
        setError('卖出股数不能超过持仓股数');
        return;
      }
      
      if (formData.shares === existingPosition.shares) {
        // 全部卖出
        removePosition(formData.stockCode);
      } else {
        // 部分卖出
        const newShares = existingPosition.shares - formData.shares;
        const newMarketValue = newShares * formData.price;
        const newProfitLoss = newMarketValue - (newShares * existingPosition.averagePrice);
        const newProfitLossRate = (newProfitLoss / (newShares * existingPosition.averagePrice)) * 100;
        
        updatePosition(formData.stockCode, {
          shares: newShares,
          currentPrice: formData.price,
          marketValue: newMarketValue,
          profitLoss: newProfitLoss,
          profitLossRate: newProfitLossRate
        });
      }
      
      setSuccess(`成功卖出 ${formData.shares} 股 ${formData.stockName}`);
    }
    
    // 重置表单
    setFormData({
      stockCode: '',
      stockName: '',
      price: 0,
      shares: 0,
      orderType: 'buy'
    });
  };

  return (
    <div className="trade-page">
      <div className="trade-container">
        {/* 左侧：下单表单 */}
        <div className="order-form-panel">
          <h2>交易终端</h2>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleSubmit} className="order-form">
            <div className="form-group">
              <label htmlFor="stockCode">股票代码</label>
              <input
                type="text"
                id="stockCode"
                name="stockCode"
                value={formData.stockCode}
                onChange={handleStockCodeChange}
                placeholder="请输入股票代码"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="stockName">股票名称</label>
              <input
                type="text"
                id="stockName"
                name="stockName"
                value={formData.stockName}
                onChange={handleChange}
                placeholder="自动填充"
                className="form-input"
                readOnly
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price">价格（元）</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="请输入价格"
                  className="form-input"
                  step="0.01"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="shares">数量（股）</label>
                <input
                  type="number"
                  id="shares"
                  name="shares"
                  value={formData.shares}
                  onChange={handleChange}
                  placeholder="请输入数量"
                  className="form-input"
                  step="1"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="orderType">交易类型</label>
              <select
                id="orderType"
                name="orderType"
                value={formData.orderType}
                onChange={handleChange}
                className="form-input"
              >
                <option value="buy">买入</option>
                <option value="sell">卖出</option>
              </select>
            </div>
            
            <div className="form-summary">
              <div className="summary-item">
                <span className="summary-label">总金额：</span>
                <span className="summary-value">
                  {formData.price > 0 && formData.shares > 0 ? (formData.price * formData.shares).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">可用资金：</span>
                <span className="summary-value">{availableCash.toFixed(2)}</span>
              </div>
            </div>
            
            <button type="submit" className="submit-btn">
              {formData.orderType === 'buy' ? '买入' : '卖出'}
            </button>
          </form>
        </div>
        
        {/* 右侧：持仓列表 */}
        <div className="portfolio-panel">
          <h2>我的持仓</h2>
          {positions.length === 0 ? (
            <div className="no-positions">暂无持仓</div>
          ) : (
            <div className="positions-list">
              {positions.map(position => (
                <div key={position.stockCode} className="position-item">
                  <div className="position-header">
                    <div className="stock-info">
                      <span className="stock-code">{position.stockCode}</span>
                      <span className="stock-name">{position.stockName}</span>
                    </div>
                    <div className="profit-loss">
                      <span className={`profit-loss-value ${position.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                        {position.profitLoss >= 0 ? '+' : ''}{position.profitLoss.toFixed(2)}
                      </span>
                      <span className={`profit-loss-rate ${position.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                        {position.profitLoss >= 0 ? '+' : ''}{position.profitLossRate.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="position-details">
                    <div className="detail-item">
                      <span className="detail-label">成本价：</span>
                      <span className="detail-value">{position.averagePrice.toFixed(2)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">当前价：</span>
                      <span className="detail-value">{position.currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">持仓数量：</span>
                      <span className="detail-value">{position.shares.toFixed(0)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">市值：</span>
                      <span className="detail-value">{position.marketValue.toFixed(2)}</span>
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
          padding: 24px;
          height: 100%;
          overflow-y: auto;
        }

        .trade-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          height: 100%;
        }

        .order-form-panel, .portfolio-panel {
          background: #1e1e2e;
          border-radius: 8px;
          padding: 24px;
          overflow-y: auto;
        }

        .order-form-panel h2, .portfolio-panel h2 {
          margin: 0 0 24px 0;
          font-size: 24px;
          color: #c4a7e7;
          font-weight: 500;
        }

        .error-message {
          background-color: rgba(243, 139, 168, 0.1);
          border: 1px solid #f38ba8;
          color: #f38ba8;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .success-message {
          background-color: rgba(166, 227, 161, 0.1);
          border: 1px solid #a6e3a1;
          color: #a6e3a1;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .order-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group label {
          font-size: 14px;
          color: #cdd6f4;
          font-weight: 500;
        }

        .form-input {
          padding: 10px 12px;
          border: 1px solid #313244;
          border-radius: 4px;
          background-color: #2a2a3a;
          color: #cdd6f4;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #89dceb;
        }

        .form-summary {
          background-color: #2a2a3a;
          padding: 16px;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .summary-label {
          color: #94a3b8;
        }

        .summary-value {
          color: #cdd6f4;
          font-weight: 500;
        }

        .submit-btn {
          padding: 12px;
          border: none;
          border-radius: 4px;
          background-color: #89dceb;
          color: #1e1e2e;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .submit-btn:hover {
          background-color: #a6e3a1;
        }

        .no-positions {
          text-align: center;
          color: #94a3b8;
          padding: 40px;
        }

        .positions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .position-item {
          background-color: #2a2a3a;
          border-radius: 6px;
          padding: 16px;
          transition: box-shadow 0.2s;
        }

        .position-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .position-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .stock-info {
          display: flex;
          gap: 12px;
        }

        .stock-code {
          color: #cdd6f4;
          font-weight: 500;
        }

        .stock-name {
          color: #cdd6f4;
        }

        .profit-loss {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .profit-loss-value {
          font-size: 16px;
          font-weight: 500;
        }

        .profit-loss-rate {
          font-size: 14px;
        }

        .positive {
          color: #a6e3a1;
        }

        .negative {
          color: #f38ba8;
        }

        .position-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
        }

        .detail-label {
          color: #94a3b8;
          font-size: 14px;
        }

        .detail-value {
          color: #cdd6f4;
          font-size: 14px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default Trade;