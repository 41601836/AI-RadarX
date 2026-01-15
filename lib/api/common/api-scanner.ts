// API全接口扫描器 - 用于验证后端服务可用性
import { ApiResponse } from './response';
import { ApiError } from './errors';
import { apiClient } from '../client';
import { fetchChipDistribution } from '../chip/distribution';
import { fetchMarketData } from '../market/data';

// 定义要测试的API端点
interface ApiEndpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: any;
  body?: any;
}

// API端点列表
const apiEndpoints: ApiEndpoint[] = [
  // 筹码分析相关
  {
    name: '筹码分布',
    path: '/chip/distribution',
    method: 'GET',
    params: { stockCode: 'SH600000' }
  },
  // 市场数据相关
  {
    name: '市场数据',
    path: '/market/data',
    method: 'GET',
    params: { stockCode: 'SH600000' }
  },
  // 可以根据需要添加更多端点
];

// API测试结果接口
interface ApiTestResult {
  name: string;
  path: string;
  status: 'pass' | 'fail';
  responseTime: number;
  errorMessage?: string;
  statusCode?: number;
}

// API扫描器类
export class ApiScanner {
  private baseURL: string;
  private results: ApiTestResult[] = [];
  private isBackendOnline: boolean = true;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // 执行单个API测试
  private async testApiEndpoint(endpoint: ApiEndpoint): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      let response: ApiResponse<any>;
      
      // 根据请求方法使用不同的apiClient方法
      switch (endpoint.method) {
        case 'GET':
          response = await apiClient.get<any>(endpoint.path, { params: endpoint.params });
          break;
        case 'POST':
          response = await apiClient.post<any>(endpoint.path, endpoint.body, { params: endpoint.params });
          break;
        case 'PUT':
          response = await apiClient.put<any>(endpoint.path, endpoint.body, { params: endpoint.params });
          break;
        case 'DELETE':
          response = await apiClient.delete<any>(endpoint.path, { params: endpoint.params });
          break;
        default:
          throw new Error(`不支持的请求方法: ${endpoint.method}`);
      }

      const endTime = Date.now();
      
      return {
        name: endpoint.name,
        path: endpoint.path,
        status: 'pass',
        responseTime: endTime - startTime,
        statusCode: response.code
      };
    } catch (error) {
      const endTime = Date.now();
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      
      console.error(`API测试失败 [${endpoint.name}]: ${errorMsg}`);
      
      return {
        name: endpoint.name,
        path: endpoint.path,
        status: 'fail',
        responseTime: endTime - startTime,
        errorMessage: errorMsg
      };
    }
  }

  // 执行全接口扫描
  public async scanAll(): Promise<ApiTestResult[]> {
    console.log('=== 开始API全接口扫描 ===');
    console.log(`扫描目标: ${this.baseURL}`);
    console.log(`待测试接口数: ${apiEndpoints.length}`);
    console.log('=========================');

    // 重置结果
    this.results = [];
    this.isBackendOnline = true;

    // 依次测试所有API端点
    for (const endpoint of apiEndpoints) {
      console.log(`\n测试接口: ${endpoint.name} (${endpoint.path})`);
      
      const result = await this.testApiEndpoint(endpoint);
      this.results.push(result);
      
      if (result.status === 'pass') {
        console.log(`✅ 成功 - 响应时间: ${result.responseTime}ms`);
      } else {
        console.log(`❌ 失败 - ${result.errorMessage}`);
        this.isBackendOnline = false;
      }
    }

    console.log('\n=== API全接口扫描完成 ===');
    
    // 统计结果
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;
    
    console.log(`总接口数: ${total}`);
    console.log(`成功: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`成功率: ${((passed / total) * 100).toFixed(2)}%`);

    if (this.isBackendOnline) {
      console.log('✅ 后端服务正常运行');
    } else {
      console.warn('⚠️ 后端服务部分或完全不可用，请检查服务器状态');
    }

    return this.results;
  }

  // 检查后端是否在线
  public getBackendStatus(): boolean {
    return this.isBackendOnline;
  }

  // 获取详细测试报告
  public getReport(): string {
    let report = '=== API全接口扫描报告 ===\n\n';
    
    report += `扫描目标: ${this.baseURL}\n`;
    report += `扫描时间: ${new Date().toLocaleString()}\n\n`;
    
    this.results.forEach(result => {
      report += `${result.status === 'pass' ? '✅' : '❌'} ${result.name} (${result.path})\n`;
      report += `   状态: ${result.status}\n`;
      report += `   响应时间: ${result.responseTime}ms\n`;
      
      if (result.statusCode) {
        report += `   状态码: ${result.statusCode}\n`;
      }
      
      if (result.errorMessage) {
        report += `   错误信息: ${result.errorMessage}\n`;
      }
      
      report += '\n';
    });
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;
    
    report += `=== 扫描统计 ===\n`;
    report += `总接口数: ${total}\n`;
    report += `成功: ${passed}\n`;
    report += `失败: ${failed}\n`;
    report += `成功率: ${((passed / total) * 100).toFixed(2)}%\n`;
    report += `后端状态: ${this.isBackendOnline ? '✅ 在线' : '❌ 离线'}\n`;
    
    return report;
  }
}

// 创建扫描器实例
export const apiScanner = new ApiScanner('http://localhost:8080/api/v1');

// 执行扫描（如果直接运行此文件）
if (require.main === module) {
  (async () => {
    await apiScanner.scanAll();
    console.log(apiScanner.getReport());
  })();
}
