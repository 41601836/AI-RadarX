// 验证API规范实现的脚本
const fs = require('fs');
const path = require('path');

// 验证项目目录结构
function verifyDirectoryStructure() {
  console.log('=== 验证项目目录结构 ===');
  
  const expectedModules = ['chip', 'publicOpinion', 'risk', 'heatFlow', 'largeOrder', 'techIndicator'];
  const apiDir = path.join(__dirname, 'lib', 'api');
  
  try {
    const dirs = fs.readdirSync(apiDir).filter(file => fs.statSync(path.join(apiDir, file)).isDirectory());
    
    const missingModules = expectedModules.filter(module => !dirs.includes(module));
    if (missingModules.length === 0) {
      console.log('✅ 所有核心模块目录都已创建');
    } else {
      console.log(`❌ 缺少以下模块目录: ${missingModules.join(', ')}`);
    }
    
    // 验证common目录
    const commonDir = path.join(apiDir, 'common');
    const expectedCommonFiles = ['errors.ts', 'fetch.ts', 'response.ts', 'index.ts'];
    const commonFiles = fs.readdirSync(commonDir);
    
    const missingCommonFiles = expectedCommonFiles.filter(file => !commonFiles.includes(file));
    if (missingCommonFiles.length === 0) {
      console.log('✅ common目录包含所有必需文件');
    } else {
      console.log(`❌ common目录缺少以下文件: ${missingCommonFiles.join(', ')}`);
    }
    
  } catch (error) {
    console.log(`❌ 目录结构验证失败: ${error.message}`);
  }
}

// 验证响应格式实现
function verifyResponseFormat() {
  console.log('\n=== 验证响应格式实现 ===');
  
  const responseFile = path.join(__dirname, 'lib', 'api', 'common', 'response.ts');
  
  try {
    const content = fs.readFileSync(responseFile, 'utf8');
    
    // 检查ApiResponse接口
    if (content.includes('export interface ApiResponse')) {
      console.log('✅ ApiResponse接口已定义');
      
      // 检查ApiResponse字段
      const hasCode = content.includes('code: number');
      const hasMsg = content.includes('msg: string');
      const hasData = content.includes('data: T');
      const hasRequestId = content.includes('requestId: string');
      const hasTimestamp = content.includes('timestamp: number');
      
      if (hasCode && hasMsg && hasData && hasRequestId && hasTimestamp) {
        console.log('✅ ApiResponse包含所有必需字段');
      } else {
        console.log('❌ ApiResponse缺少必需字段');
      }
    } else {
      console.log('❌ 未找到ApiResponse接口定义');
    }
    
  } catch (error) {
    console.log(`❌ 响应格式验证失败: ${error.message}`);
  }
}

// 验证错误处理实现
function verifyErrorHandling() {
  console.log('\n=== 验证错误处理实现 ===');
  
  const errorsFile = path.join(__dirname, 'lib', 'api', 'common', 'errors.ts');
  
  try {
    const content = fs.readFileSync(errorsFile, 'utf8');
    
    // 检查ErrorCode枚举
    if (content.includes('export enum ErrorCode')) {
      console.log('✅ ErrorCode枚举已定义');
      
      // 检查核心错误码
      const requiredCodes = [200, 400, 401, 403, 404, 429, 500, 503, 60001, 60002, 60003, 60004];
      let allCodesFound = true;
      
      requiredCodes.forEach(code => {
        if (!content.includes(code.toString())) {
          console.log(`❌ 缺少错误码: ${code}`);
          allCodesFound = false;
        }
      });
      
      if (allCodesFound) {
        console.log('✅ 所有核心错误码都已定义');
      }
    } else {
      console.log('❌ 未找到ErrorCode枚举定义');
    }
    
    // 检查ApiError类
    if (content.includes('export class ApiError extends Error')) {
      console.log('✅ ApiError类已定义');
    } else {
      console.log('❌ 未找到ApiError类定义');
    }
    
    // 检查错误响应生成函数
    if (content.includes('export function errorResponse')) {
      console.log('✅ errorResponse函数已定义');
    } else {
      console.log('❌ 未找到errorResponse函数定义');
    }
    
  } catch (error) {
    console.log(`❌ 错误处理验证失败: ${error.message}`);
  }
}

// 验证API请求封装
function verifyApiRequest() {
  console.log('\n=== 验证API请求封装 ===');
  
  const fetchFile = path.join(__dirname, 'lib', 'api', 'common', 'fetch.ts');
  
  try {
    const content = fs.readFileSync(fetchFile, 'utf8');
    
    // 检查apiRequest函数
    if (content.includes('export async function apiRequest')) {
      console.log('✅ apiRequest函数已定义');
    } else {
      console.log('❌ 未找到apiRequest函数定义');
    }
    
    // 检查便捷方法
    const hasGet = content.includes('export function apiGet');
    const hasPost = content.includes('export function apiPost');
    const hasPut = content.includes('export function apiPut');
    const hasDelete = content.includes('export function apiDelete');
    
    if (hasGet && hasPost && hasPut && hasDelete) {
      console.log('✅ 所有API请求便捷方法都已定义');
    } else {
      console.log('❌ 缺少API请求便捷方法');
    }
    
  } catch (error) {
    console.log(`❌ API请求封装验证失败: ${error.message}`);
  }
}

// 验证数据规范
function verifyDataSpecifications() {
  console.log('\n=== 验证数据规范 ===');
  
  // 检查响应格式示例文件
  const specFile = path.join(__dirname, 'lib', 'api', 'api-standards.md');
  
  try {
    const content = fs.readFileSync(specFile, 'utf8');
    
    // 检查价格规范
    if (content.includes('价格必须使用') && content.includes('单位为「分」')) {
      console.log('✅ 价格规范已定义');
    } else {
      console.log('❌ 未找到价格规范定义');
    }
    
    // 检查时间格式规范
    if (content.includes('时间字符串必须使用') && content.includes('yyyy-MM-dd HH:mm:ss')) {
      console.log('✅ 时间格式规范已定义');
    } else {
      console.log('❌ 未找到时间格式规范定义');
    }
    
  } catch (error) {
    console.log(`❌ 数据规范验证失败: ${error.message}`);
  }
}

// 执行所有验证
function runAllVerifications() {
  console.log('开始验证AI炒股软件API规范实现...\n');
  
  verifyDirectoryStructure();
  verifyResponseFormat();
  verifyErrorHandling();
  verifyApiRequest();
  verifyDataSpecifications();
  
  console.log('\n=== 验证完成 ===');
}

// 运行验证
runAllVerifications();
