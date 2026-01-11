// NotificationCenter 全局通知中心组件
'use client';

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';

// 通知类型
export type NotificationType = 'success' | 'warning' | 'error' | 'info';

// 通知内容接口
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  autoClose?: boolean;
  duration?: number;
}

// 通知上下文接口
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// 创建通知上下文
export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 通知提供者组件
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // 跟踪每个通知类型的最后触发时间（用于节流）
  const lastNotificationTime = useRef<Record<string, number>>({});
  // 冷却时间：5分钟（毫秒）
  const COOLING_TIME = 5 * 60 * 1000;

  // 添加通知
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    // 检查是否在冷却时间内，直接过滤重复通知
    const now = Date.now();
    const { type } = notification;
    if (lastNotificationTime.current[type] && now - lastNotificationTime.current[type] < COOLING_TIME) {
      return;
    }

    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    // 更新最后通知时间
    lastNotificationTime.current[type] = now;
    setNotifications(prev => [newNotification, ...prev]);
  };

  // 移除通知
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // 清空通知
  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearNotifications }}>
      {children}
      <NotificationCenter />
    </NotificationContext.Provider>
  );
}

// 使用通知钩子
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// 通知中心组件
function NotificationCenter() {
  const { notifications, removeNotification, clearNotifications } = useNotifications();

  // 自动关闭通知
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    notifications.forEach(notification => {
      if (notification.autoClose !== false) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration || 5000);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, removeNotification]);

  return (
    <div className="notification-center">
      {/* 一键清除所有通知按钮 */}
      {notifications.length > 0 && (
        <div className="notification-clear-container">
          <button 
            className="notification-clear-btn"
            onClick={clearNotifications}
          >
            一键清除所有通知
          </button>
        </div>
      )}
      
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

      <style jsx>{`
        .notification-center {
          position: fixed;
          top: 100px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 400px;
        }

        .notification-clear-container {
          display: flex;
          justify-content: center;
        }

        .notification-clear-btn {
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .notification-clear-btn:hover {
          background-color: rgba(0, 0, 0, 0.7);
        }
      `}</style>
    </div>
  );
}

// 单个通知项组件
function NotificationItem({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          background: '#16a34a',
          borderColor: '#15803d'
        };
      case 'warning':
        return {
          background: '#f59e0b',
          borderColor: '#d97706'
        };
      case 'error':
        return {
          background: '#dc2626',
          borderColor: '#b91c1c'
        };
      case 'info':
        return {
          background: '#2563eb',
          borderColor: '#1d4ed8'
        };
      default:
        return {
          background: '#64748b',
          borderColor: '#475569'
        };
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div 
      className="notification-item"
      style={{
        backgroundColor: getTypeStyles().background,
        borderLeftColor: getTypeStyles().borderColor
      }}
    >
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-type-icon">{getIcon()}</span>
          <h4 className="notification-title">{notification.title}</h4>
          <span className="notification-time">{formatTime(notification.timestamp)}</span>
        </div>
        <p className="notification-message">{notification.message}</p>
      </div>
      <button 
        className="notification-close"
        onClick={onClose}
      >
        ×
      </button>

      <style jsx>{`
        .notification-item {
          display: flex;
          align-items: flex-start;
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 4px solid;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: slideInRight 0.3s ease-out;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .notification-content {
          flex: 1;
          margin-right: 12px;
        }

        .notification-header {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
        }

        .notification-type-icon {
          font-size: 16px;
          margin-right: 8px;
          width: 20px;
          text-align: center;
        }

        .notification-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .notification-time {
          font-size: 12px;
          opacity: 0.8;
          margin-left: auto;
        }

        .notification-message {
          margin: 0;
          font-size: 13px;
          opacity: 0.9;
        }

        .notification-close {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s ease;
        }

        .notification-close:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        /* 不同类型通知的额外样式 */
        :global(.notification-item.success) {
          background-color: #16a34a;
          border-left-color: #15803d;
        }

        :global(.notification-item.warning) {
          background-color: #f59e0b;
          border-left-color: #d97706;
        }

        :global(.notification-item.error) {
          background-color: #dc2626;
          border-left-color: #b91c1c;
        }

        :global(.notification-item.info) {
          background-color: #2563eb;
          border-left-color: #1d4ed8;
        }
      `}</style>
    </div>
  );
}

// 导出通知类型常量
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success' as NotificationType,
  WARNING: 'warning' as NotificationType,
  ERROR: 'error' as NotificationType,
  INFO: 'info' as NotificationType
};

// 导出便捷通知函数
export const notifications = {
  // 回测完成通知
  backtestCompleted: (message: string) => ({
    type: NOTIFICATION_TYPES.SUCCESS,
    title: '回测完成',
    message,
    autoClose: true,
    duration: 5000
  }),
  
  // 风控报警通知
  riskWarning: (message: string) => ({
    type: NOTIFICATION_TYPES.WARNING,
    title: '风控报警',
    message,
    autoClose: true,
    duration: 10000
  }),
  
  // AI异动提醒通知
  aiAlert: (message: string) => ({
    type: NOTIFICATION_TYPES.INFO,
    title: 'AI异动提醒',
    message,
    autoClose: true,
    duration: 7000
  }),
  
  // 错误通知
  error: (title: string, message: string) => ({
    type: NOTIFICATION_TYPES.ERROR,
    title,
    message,
    autoClose: true,
    duration: 8000
  }),
  
  // 成功通知
  success: (title: string, message: string) => ({
    type: NOTIFICATION_TYPES.SUCCESS,
    title,
    message,
    autoClose: true,
    duration: 4000
  }),
  
  // 信息通知
  info: (title: string, message: string) => ({
    type: NOTIFICATION_TYPES.INFO,
    title,
    message,
    autoClose: true,
    duration: 5000
  })
};
