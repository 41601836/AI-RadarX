import mysql from 'mysql2/promise';
import { config, DB_URL } from '@/lib/config';

class DBClient {
  private pool: mysql.Pool;
  private static instance: DBClient;

  private constructor() {
    this.pool = mysql.createPool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USERNAME,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      // 高并发配置
      connectionLimit: 100, // 连接池最大连接数
      queueLimit: 0, // 无队列限制
      waitForConnections: true, // 等待可用连接
      
      // 性能优化配置
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000, // 10秒后开始发送心跳
      
      // 字符集和时区配置
      charset: 'utf8mb4',
      timezone: 'local',
      
      // 查询配置
      supportBigNumbers: true,
      bigNumberStrings: false,
      
      // 错误处理配置
      multipleStatements: true, // 允许执行多条语句
    });

    // 测试连接
    this.testConnection();
  }

  // 单例模式
  public static getInstance(): DBClient {
    if (!DBClient.instance) {
      DBClient.instance = new DBClient();
    }
    return DBClient.instance;
  }

  // 测试连接
  private async testConnection(): Promise<void> {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('Database connection pool initialized successfully');
    } catch (error) {
      console.error('Database connection error:', error);
    }
  }

  // 获取连接
  async getConnection(): Promise<mysql.PoolConnection> {
    return this.pool.getConnection();
  }

  // 执行查询
  async query<T = any>(sql: string, params?: any[]): Promise<mysql.RowDataPacket[]> {
    try {
      const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(sql, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // 执行插入
  async insert<T = any>(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    try {
      const [result] = await this.pool.execute<mysql.ResultSetHeader>(sql, params);
      return result;
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }

  // 执行更新
  async update<T = any>(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    try {
      const [result] = await this.pool.execute<mysql.ResultSetHeader>(sql, params);
      return result;
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  // 执行删除
  async delete<T = any>(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    try {
      const [result] = await this.pool.execute<mysql.ResultSetHeader>(sql, params);
      return result;
    } catch (error) {
      console.error('Database delete error:', error);
      throw error;
    }
  }

  // 执行事务
  async transaction<T = any>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      connection.release();
      
      return result;
    } catch (error) {
      await connection.rollback();
      connection.release();
      
      console.error('Database transaction error:', error);
      throw error;
    }
  }

  // 批量插入
  async batchInsert<T = any>(
    table: string,
    columns: string[],
    values: any[][],
    batchSize: number = 1000
  ): Promise<number> {
    let totalInserted = 0;
    
    // 分批处理
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      const placeholders = batch.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
      
      const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`;
      const flatValues = batch.flat();
      
      const result = await this.insert(sql, flatValues);
      totalInserted += result.affectedRows;
    }
    
    return totalInserted;
  }

  // 批量更新
  async batchUpdate<T = any>(
    table: string,
    updateColumns: string[],
    whereColumn: string,
    values: any[][],
    batchSize: number = 1000
  ): Promise<number> {
    let totalUpdated = 0;
    
    // 分批处理
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      
      // 生成CASE语句
      let sql = `UPDATE ${table} SET `;
      const params: any[] = [];
      
      // 为每个更新列生成CASE语句
      updateColumns.forEach(col => {
        sql += `${col} = CASE ${whereColumn} `;
        batch.forEach(row => {
          sql += `WHEN ? THEN ? `;
          params.push(row[0], row[updateColumns.indexOf(col) + 1]);
        });
        sql += `END, `;
      });
      
      // 移除最后一个逗号
      sql = sql.slice(0, -2);
      
      // 添加WHERE条件
      const whereValues = batch.map(row => row[0]);
      sql += ` WHERE ${whereColumn} IN (${whereValues.map(() => '?').join(',')})`;
      params.push(...whereValues);
      
      const result = await this.update(sql, params);
      totalUpdated += result.affectedRows;
    }
    
    return totalUpdated;
  }

  // 查询一条记录
  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] as T : null;
  }

  // 获取连接池状态
  getPoolStatus(): { size: number; free: number; pending: number } {
    return {
      size: this.pool.size,
      free: this.pool.freeConnections,
      pending: this.pool.pendingRequests,
    };
  }

  // 关闭连接池
  async close(): Promise<void> {
    await this.pool.end();
    console.log('Database connection pool closed');
  }
}

export const dbClient = DBClient.getInstance();
