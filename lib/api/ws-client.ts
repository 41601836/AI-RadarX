import { logger } from '../utils/logger';
import { usePolling } from '../hooks/usePolling';
import { useState, useEffect } from 'react';

// WebSocket连接状态
export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// 订阅类型
export type SubscriptionType = 'quote' | 'largeOrder';

// WebSocket消息类型
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

// 订阅请求
export interface SubscriptionRequest {
  type: SubscriptionType;
  symbols?: string[];
  params?: Record<string, any>;
}

// WebSocket配置接口
export interface WebSocketClientConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableFallback?: boolean;
  pollingOptions?: {
    interval: number;
    tabKey: string;
  };
}

// WebSocket客户端类
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketClientConfig;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscriptions = new Map<string, SubscriptionRequest>();
  private messageHandlers = new Map<string, Array<(data: any) => void>>();
  private fallbackEnabled = false;
  private pollingCallbacks: Array<() => void> = [];

  constructor(config: WebSocketClientConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      enableFallback: true,
      ...config,
    };
  }

  // 获取连接状态
  getStatus(): WebSocketStatus {
    return this.status;
  }

  // 连接WebSocket服务器
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.status === 'connected' || this.status === 'connecting') {
        resolve();
        return;
      }

      this.status = 'connecting';
      logger.info('[WebSocket] 正在连接到服务器...', { url: this.config.url });

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.status = 'connected';
          this.reconnectAttempts = 0;
          logger.info('[WebSocket] 连接成功');
          
          // 重新订阅所有主题
          this.resubscribeAll();
          
          // 如果之前启用了回退，现在关闭它
          if (this.fallbackEnabled) {
            this.fallbackEnabled = false;
            logger.info('[WebSocket] 已从回退模式切换回WebSocket模式');
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            logger.error('[WebSocket] 解析消息失败', error instanceof Error ? error : { message: String(error) });
          }
        };

        this.ws.onerror = (error) => {
          this.status = 'error';
          logger.error('[WebSocket] 连接错误', error instanceof Error ? error : { message: String(error) });
          reject(error instanceof Error ? error : new Error(String(error)));
        };

        this.ws.onclose = (event) => {
          this.status = 'disconnected';
          logger.warn('[WebSocket] 连接关闭', { code: event.code, reason: event.reason });
          
          // 如果启用了回退且不是正常关闭，切换到回退模式
          if (this.config.enableFallback && event.code !== 1000) {
            this.switchToFallback();
          }
          
          // 尝试重连
          this.attemptReconnect();
        };
      } catch (error) {
        this.status = 'error';
        logger.error('[WebSocket] 初始化失败', error instanceof Error ? error : { message: String(error) });
        
        // 如果启用了回退，切换到回退模式
        if (this.config.enableFallback) {
          this.switchToFallback();
        }
        
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  // 断开WebSocket连接
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }

    this.status = 'disconnected';
    this.subscriptions.clear();
    logger.info('[WebSocket] 连接已断开');
  }

  // 发送消息
  send(message: WebSocketMessage): boolean {
    if (this.status !== 'connected' || !this.ws) {
      logger.warn('[WebSocket] 无法发送消息：连接未建立');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error('[WebSocket] 发送消息失败', error instanceof Error ? error : { message: String(error) });
      return false;
    }
  }

  // 订阅主题
  subscribe(subscription: SubscriptionRequest): string {
    const subscriptionId = `${subscription.type}_${Date.now()}`;
    this.subscriptions.set(subscriptionId, subscription);
    
    // 如果已经连接，立即发送订阅请求
    if (this.status === 'connected') {
      this.sendSubscription(subscription);
    }
    
    return subscriptionId;
  }

  // 取消订阅
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    // 如果已经连接，发送取消订阅请求
    if (this.status === 'connected') {
      this.sendUnsubscription(subscription);
    }

    this.subscriptions.delete(subscriptionId);
    return true;
  }

  // 注册消息处理函数
  onMessage(type: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)?.push(handler);
  }

  // 取消注册消息处理函数
  offMessage(type: string, handler: (data: any) => void): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 注册轮询回调函数（用于回退机制）
  registerPollingCallback(callback: () => void): void {
    this.pollingCallbacks.push(callback);
  }

  // 取消注册轮询回调函数
  unregisterPollingCallback(callback: () => void): void {
    const index = this.pollingCallbacks.indexOf(callback);
    if (index !== -1) {
      this.pollingCallbacks.splice(index, 1);
    }
  }

  // 处理接收到的消息
  private handleMessage(message: WebSocketMessage): void {
    const { type, data } = message;
    logger.debug('[WebSocket] 收到消息', { type, data: JSON.stringify(data) });
    
    // 调用对应类型的消息处理函数
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error('[WebSocket] 消息处理函数执行失败', error instanceof Error ? error : { message: String(error) });
        }
      });
    }
  }

  // 发送订阅请求
  private sendSubscription(subscription: SubscriptionRequest): void {
    this.send({
      type: 'subscribe',
      data: subscription,
    });
  }

  // 发送取消订阅请求
  private sendUnsubscription(subscription: SubscriptionRequest): void {
    this.send({
      type: 'unsubscribe',
      data: subscription,
    });
  }

  // 重新订阅所有主题
  private resubscribeAll(): void {
    this.subscriptions.forEach(subscription => {
      this.sendSubscription(subscription);
    });
  }

  // 尝试重连
  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      logger.error('[WebSocket] 达到最大重连尝试次数，停止重连');
      return;
    }

    this.reconnectAttempts++;
    logger.info(`[WebSocket] 正在尝试重连 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts!})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        logger.error('[WebSocket] 重连失败', error instanceof Error ? error : { message: String(error) });
        this.attemptReconnect();
      });
    }, this.config.reconnectInterval);
  }

  // 切换到回退模式（使用轮询）
  private switchToFallback(): void {
    if (!this.config.enableFallback || this.fallbackEnabled) {
      return;
    }

    this.fallbackEnabled = true;
    logger.warn('[WebSocket] 切换到轮询回退模式');

    // 如果配置了轮询选项，使用usePolling钩子
    if (this.config.pollingOptions) {
      this.startPollingFallback();
    }
  }

  // 启动轮询回退
  private startPollingFallback(): void {
    if (!this.config.pollingOptions) {
      return;
    }

    const { interval, tabKey } = this.config.pollingOptions;

    // 创建轮询回调函数
    const pollingCallback = () => {
      if (!this.fallbackEnabled) {
        return;
      }

      // 执行所有注册的轮询回调
      this.pollingCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          logger.error('[WebSocket] 轮询回调执行失败', error instanceof Error ? error : { message: String(error) });
        }
      });
    };

    // 使用usePolling钩子
    // 注意：这里需要在React组件中使用，所以我们只返回回调函数，由使用者在组件中调用usePolling
    this.pollingCallbacks.push(pollingCallback);
  }
}

// 创建默认WebSocket客户端实例
export const wsClient = new WebSocketClient({
  url: 'ws://localhost:8080/ws',
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  enableFallback: true,
  pollingOptions: {
    interval: 30000,
    tabKey: 'dashboard',
  },
});

// React Hook: 使用WebSocket客户端
export const useWebSocket = (
  client: WebSocketClient,
  subscriptions?: SubscriptionRequest[]
) => {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');

  useEffect(() => {
    // 更新状态
    const updateStatus = () => {
      setStatus(client.getStatus());
    };

    // 连接WebSocket
    client.connect().catch(error => {
      logger.error('[useWebSocket] 连接失败', error);
      updateStatus();
    });

    // 订阅主题
    const subscriptionIds: string[] = [];
    if (subscriptions) {
      subscriptions.forEach(subscription => {
        const id = client.subscribe(subscription);
        subscriptionIds.push(id);
      });
    }

    // 定期更新状态
    const statusTimer = setInterval(updateStatus, 1000);

    // 清理函数
    return () => {
      clearInterval(statusTimer);
      subscriptionIds.forEach(id => client.unsubscribe(id));
      // 不在这里断开连接，由上层组件决定
    };
  }, [client, subscriptions]);

  return { status };
};

// React Hook: WebSocket with Fallback
export const useWebSocketWithFallback = (
  client: WebSocketClient,
  subscriptions?: SubscriptionRequest[],
  fallbackCallback?: () => void,
  pollingOptions?: {
    interval: number;
    tabKey: string;
  }
) => {
  const { status } = useWebSocket(client, subscriptions);

  // 注册回退回调
  useEffect(() => {
    if (fallbackCallback) {
      client.registerPollingCallback(fallbackCallback);
      return () => client.unregisterPollingCallback(fallbackCallback);
    }
  }, [client, fallbackCallback]);

  // 如果配置了轮询选项，使用usePolling作为备份
  useEffect(() => {
    if (!fallbackCallback || !pollingOptions) {
      return;
    }

    usePolling(fallbackCallback, {
      interval: pollingOptions.interval,
      tabKey: pollingOptions.tabKey,
      immediate: false,
    });
  }, [fallbackCallback, pollingOptions]);

  return { status };
};
