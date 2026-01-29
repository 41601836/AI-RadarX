import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

// 读取API规范文件
const apiSpecPath = path.join(process.cwd(), 'API_SPEC.json');
const apiSpec = JSON.parse(fs.readFileSync(apiSpecPath, 'utf8'));

// 创建AJV实例
const ajv = new Ajv({
  allErrors: true,
  strict: true,
});
addFormats(ajv);

// 编译所有模式
const schemas = Object.values(apiSpec.definitions || {});
schemas.forEach(schema => {
  ajv.addSchema(schema, schema.title || schema.$id);
});

// 获取API路径
const apiPaths = Object.keys(apiSpec.paths || {});

describe('API Contract Tests', () => {
  describe('Schema Validation', () => {
    test('should have valid API spec', () => {
      // 验证API规范本身是否有效
      expect(apiSpec).toHaveProperty('swagger', '2.0');
      expect(apiSpec).toHaveProperty('info');
      expect(apiSpec).toHaveProperty('paths');
      expect(apiSpec).toHaveProperty('definitions');
    });

    test('should have valid definitions', () => {
      // 验证所有定义是否可以被编译
      const definitions = apiSpec.definitions || {};
      Object.keys(definitions).forEach(defName => {
        const schema = definitions[defName];
        expect(() => ajv.compile(schema)).not.toThrow();
      });
    });

    test('should have valid paths', () => {
      // 验证所有路径是否有效
      const paths = apiSpec.paths || {};
      Object.keys(paths).forEach(path => {
        const pathItem = paths[path];
        expect(typeof pathItem).toBe('object');
        
        // 验证HTTP方法
        const methods = ['get', 'post', 'put', 'delete', 'patch'];
        methods.forEach(method => {
          if (pathItem[method]) {
            const operation = pathItem[method];
            expect(operation).toHaveProperty('tags');
            expect(operation).toHaveProperty('summary');
            expect(operation).toHaveProperty('responses');
          }
        });
      });
    });
  });

  describe('Response Validation', () => {
    // 示例：验证筹码分布响应
    test('should validate ChipDistributionResponse schema', () => {
      const chipDistributionSchema = apiSpec.definitions.ChipDistributionResponse;
      const validate = ajv.compile(chipDistributionSchema);
      
      // 模拟有效响应
      const validResponse = {
        code: 200,
        msg: 'success',
        requestId: 'req-1234567890abcdef',
        timestamp: Date.now(),
        data: {
          stockCode: 'SH600000',
          stockName: '浦发银行',
          date: '2026-01-04',
          chipDistribution: [
            { price: 850, chipRatio: 0.05, holderCount: 12000 },
            { price: 860, chipRatio: 0.08, holderCount: 15000 }
          ],
          chipConcentration: 0.89,
          mainCostPrice: 820,
          supportPrice: 790,
          resistancePrice: 900,
          chipPeakInfo: {
            peakPrice: 830,
            peakRatio: 0.65,
            isSinglePeak: true
          }
        }
      };
      
      // 验证有效响应
      const validResult = validate(validResponse);
      expect(validResult).toBe(true);
      
      // 模拟无效响应（缺少必填字段）
      const invalidResponse = {
        code: 200,
        msg: 'success',
        requestId: 'req-1234567890abcdef',
        timestamp: Date.now(),
        data: {
          stockCode: 'SH600000',
          // 缺少stockName
          date: '2026-01-04',
          chipDistribution: []
        }
      };
      
      // 验证无效响应
      const invalidResult = validate(invalidResponse);
      expect(invalidResult).toBe(false);
      expect(validate.errors).toBeDefined();
    });

    // 示例：验证舆情汇总响应
    test('should validate OpinionSummaryResponse schema', () => {
      const opinionSummarySchema = apiSpec.definitions.OpinionSummaryResponse;
      const validate = ajv.compile(opinionSummarySchema);
      
      // 模拟有效响应
      const validResponse = {
        code: 200,
        msg: 'success',
        requestId: 'req-1234567890abcdef',
        timestamp: Date.now(),
        data: {
          stockCode: 'SH600000',
          stockName: '浦发银行',
          opinionScore: 75,
          positiveRatio: 0.6,
          negativeRatio: 0.15,
          neutralRatio: 0.25,
          hotEvents: [],
          opinionTrend: []
        }
      };
      
      // 验证有效响应
      const validResult = validate(validResponse);
      expect(validResult).toBe(true);
    });
  });
});
