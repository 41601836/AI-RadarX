'use client';

import React, { useState } from 'react';
import { useUserStore, RiskPreference } from '../../lib/store/user-portfolio';

const Settings: React.FC = () => {
  // 从用户存储中获取风险偏好和更新方法
  const { riskPreference, updateRiskPreference } = useUserStore();
  
  // 表单状态
  const [formData, setFormData] = useState<RiskPreference>({
    level: riskPreference.level,
    maxSingleStockPosition: riskPreference.maxSingleStockPosition,
    maxDrawdown: riskPreference.maxDrawdown,
    stopLossRatio: riskPreference.stopLossRatio,
    stopProfitRatio: riskPreference.stopProfitRatio
  });
  
  // 成功提示
  const [success, setSuccess] = useState('');

  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'level' ? value : parseFloat(value)
    }));
  };
  
  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 更新风险偏好
    updateRiskPreference(formData);
    
    // 显示成功提示
    setSuccess('设置已保存');
    
    // 2秒后隐藏提示
    setTimeout(() => {
      setSuccess('');
    }, 2000);
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>设置</h2>
      </div>

      <div className="settings-container">
        {/* 风险偏好设置 */}
        <div className="settings-panel">
          <div className="panel-header">
            <h3>风险偏好设置</h3>
          </div>
          
          {success && (
            <div className="success-message">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label htmlFor="level">风险等级</label>
              <select
                id="level"
                name="level"
                value={formData.level}
                onChange={handleChange}
                className="form-input"
              >
                <option value="low">保守型</option>
                <option value="medium">稳健型</option>
                <option value="high">进取型</option>
              </select>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="maxSingleStockPosition">最大单票持仓比例 (%)</label>
                <input
                  type="number"
                  id="maxSingleStockPosition"
                  name="maxSingleStockPosition"
                  value={formData.maxSingleStockPosition * 100}
                  onChange={(e) => handleChange({...e, target: {...e.target, value: (parseFloat(e.target.value) / 100).toString()}})}
                  className="form-input"
                  min="5"
                  max="100"
                  step="5"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="maxDrawdown">最大回撤容忍度 (%)</label>
                <input
                  type="number"
                  id="maxDrawdown"
                  name="maxDrawdown"
                  value={formData.maxDrawdown * 100}
                  onChange={(e) => handleChange({...e, target: {...e.target, value: (parseFloat(e.target.value) / 100).toString()}})}
                  className="form-input"
                  min="1"
                  max="50"
                  step="1"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="stopLossRatio">默认止损比例 (%)</label>
                <input
                  type="number"
                  id="stopLossRatio"
                  name="stopLossRatio"
                  value={formData.stopLossRatio * 100}
                  onChange={(e) => handleChange({...e, target: {...e.target, value: (parseFloat(e.target.value) / 100).toString()}})}
                  className="form-input"
                  min="1"
                  max="50"
                  step="1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="stopProfitRatio">默认止盈比例 (%)</label>
                <input
                  type="number"
                  id="stopProfitRatio"
                  name="stopProfitRatio"
                  value={formData.stopProfitRatio * 100}
                  onChange={(e) => handleChange({...e, target: {...e.target, value: (parseFloat(e.target.value) / 100).toString()}})}
                  className="form-input"
                  min="1"
                  max="100"
                  step="1"
                />
              </div>
            </div>
            
            <button type="submit" className="submit-btn">
              保存设置
            </button>
          </form>
        </div>
        
        {/* 账户设置 */}
        <div className="settings-panel">
          <div className="panel-header">
            <h3>账户设置</h3>
          </div>
          
          <div className="account-info">
            <div className="info-item">
              <div className="info-label">用户名</div>
              <div className="info-value">demo_user</div>
            </div>
            <div className="info-item">
              <div className="info-label">账户类型</div>
              <div className="info-value">模拟账户</div>
            </div>
            <div className="info-item">
              <div className="info-label">账户余额</div>
              <div className="info-value">1,000,000.00</div>
            </div>
            <div className="info-item">
              <div className="info-label">创建时间</div>
              <div className="info-value">2024-01-01</div>
            </div>
          </div>
        </div>
        
        {/* 系统设置 */}
        <div className="settings-panel">
          <div className="panel-header">
            <h3>系统设置</h3>
          </div>
          
          <div className="system-settings">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">行情刷新频率</div>
                <div className="setting-description">设置行情数据的自动刷新间隔</div>
              </div>
              <div className="setting-control">
                <select className="form-input">
                  <option value="5">5秒</option>
                  <option value="10">10秒</option>
                  <option value="15" selected>15秒</option>
                  <option value="30">30秒</option>
                  <option value="60">1分钟</option>
                </select>
              </div>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">预警通知</div>
                <div className="setting-description">开启或关闭系统预警通知</div>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input type="checkbox" checked />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">深色模式</div>
                <div className="setting-description">切换深色/浅色主题</div>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input type="checkbox" checked />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          padding: 24px;
          height: 100%;
          overflow-y: auto;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-header h2 {
          margin: 0;
          font-size: 24px;
          color: #c4a7e7;
          font-weight: 500;
        }

        .settings-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-panel {
          background-color: #1e1e2e;
          border-radius: 8px;
          padding: 24px;
          border: 1px solid #2a2a3a;
        }

        .panel-header {
          margin-bottom: 20px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 18px;
          color: #cdd6f4;
          font-weight: 500;
        }

        .success-message {
          background-color: rgba(166, 227, 161, 0.2);
          border: 1px solid #a6e3a1;
          color: #a6e3a1;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .settings-form {
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
          max-width: 200px;
        }

        .submit-btn:hover {
          background-color: #a6e3a1;
        }

        .account-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-label {
          font-size: 14px;
          color: #94a3b8;
        }

        .info-value {
          font-size: 16px;
          color: #cdd6f4;
          font-weight: 500;
        }

        .system-settings {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #2a2a3a;
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .setting-label {
          font-size: 16px;
          color: #cdd6f4;
          font-weight: 500;
        }

        .setting-description {
          font-size: 14px;
          color: #94a3b8;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #313244;
          transition: .4s;
          border-radius: 24px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #89dceb;
        }

        input:checked + .slider:before {
          transform: translateX(26px);
        }
      `}</style>
    </div>
  );
};

export default Settings;