import Redis from 'ioredis';
import { config } from '@/lib/config';

class RedisClient {
  private redis: Redis;
  private static instance: RedisClient;

  private constructor() {
    this.redis = new Redis({
      host: config.REDIS_HOST || 'localhost',
      port: config.REDIS_PORT || 6379,
      password: config.REDIS_PASSWORD || undefined,
      db: 0,
      // 高并发配置
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // 连接池配置
      connectionName: 'stock-trading-app',
      retryStrategy: (times: number) => {
        // 指数退避策略
        return Math.min(times * 50, 2000);
      },
    });

    // 连接事件监听
    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.redis.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  // 单例模式
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  // 设置缓存，支持过期时间
  async set(key: string, value: any, expiration?: number): Promise<boolean> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (expiration) {
        await this.redis.set(key, stringValue, 'EX', expiration);
      } else {
        await this.redis.set(key, stringValue);
      }
      return true;
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  // 获取缓存
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  // 删除缓存
  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Redis del error for key ${key}:`, error);
      return false;
    }
  }

  // 检查缓存是否存在
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis exists error for key ${key}:`, error);
      return false;
    }
  }

  // 批量获取缓存
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(keys);
      return values.map(value => value ? JSON.parse(value) as T : null);
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }

  // 设置哈希表字段
  async hset(key: string, field: string, value: any): Promise<boolean> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.redis.hset(key, field, stringValue);
      return true;
    } catch (error) {
      console.error(`Redis hset error for key ${key} field ${field}:`, error);
      return false;
    }
  }

  // 获取哈希表字段
  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.redis.hget(key, field);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis hget error for key ${key} field ${field}:`, error);
      return null;
    }
  }

  // 增加计数器
  async incr(key: string): Promise<number | null> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      console.error(`Redis incr error for key ${key}:`, error);
      return null;
    }
  }

  // 设置过期时间
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await this.redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error(`Redis expire error for key ${key}:`, error);
      return false;
    }
  }

  // 发布消息
  async publish(channel: string, message: any): Promise<number> {
    try {
      const stringMessage = typeof message === 'string' ? message : JSON.stringify(message);
      return await this.redis.publish(channel, stringMessage);
    } catch (error) {
      console.error(`Redis publish error for channel ${channel}:`, error);
      return 0;
    }
  }

  // 订阅消息
  subscribe(channel: string, callback: (message: any) => void): void {
    this.redis.subscribe(channel, (err: Error | null) => {
      if (err) {
        console.error(`Redis subscribe error for channel ${channel}:`, err);
        return;
      }
      console.log(`Subscribed to channel ${channel}`);
    });

    this.redis.on('message', (subscribedChannel: string, message: string) => {
      if (subscribedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          console.error(`Redis message parse error for channel ${channel}:`, error);
          callback(message);
        }
      }
    });
  }

  // 关闭连接
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export const redisClient = RedisClient.getInstance();
