# A-RadarX 项目架构分析

## 1. 核心文件夹说明

| 文件夹 | 主要职责 | 核心文件/模块 |
|--------|----------|---------------|
| **app/api/** | 后端API路由控制器 | 各类route.ts文件，处理HTTP请求 |
| **app/api/v1/** | 版本化API接口 | 按功能模块组织的API端点 |
| **components/** | UI组件库 | 页面组件、通用组件、功能组件 |
| **lib/algorithms/** | 核心算法实现 | 筹码分布、WAD指标、技术分析等算法 |
| **lib/api/** | API服务层 | 各类API服务、数据转换、错误处理 |
| **lib/api/common/** | 通用API工具 | Tushare适配器、响应格式化、错误定义 |
| **lib/hooks/** | 自定义React Hooks | 轮询、可见性观察等功能Hook |
| **lib/store/** | 状态管理 | 用户投资组合、应用状态管理 |
| **lib/utils/** | 工具函数 | 数据格式化、计算工具等 |

## 2. 已实现的Controller接口路径

### 市场数据接口
- `/api/market/kline` - K线数据
- `/api/market/stock_basic` - 股票基本信息
- `/api/market/quote` - 行情报价
- `/api/market/news` - 市场新闻

### V1版本接口

#### 筹码分析
- `/api/v1/chip/distribution` - 筹码分布
- `/api/v1/chip/trend` - 筹码趋势

#### 资金流向
- `/api/v1/heat/flow/alert/list` - 资金流警报列表
- `/api/v1/heat/flow/stock/seat` - 个股席位资金流

#### 市场排名
- `/api/v1/market/rank/top-gainers` - 涨幅榜
- `/api/v1/market/rank/top-losers` - 跌幅榜
- `/api/v1/market/rank/turnover` - 换手率榜
- `/api/v1/market/sentiment` - 市场情绪

#### 大单监控
- `/api/v1/order/large/real-time` - 实时大单
- `/api/v1/order/large/trend` - 大单趋势

#### 舆情分析
- `/api/v1/public/opinion/list` - 舆情列表
- `/api/v1/public/opinion/summary` - 舆情摘要

#### 风险控制
- `/api/v1/risk/account/assessment` - 账户风险评估
- `/api/v1/risk/stop/rule/config` - 止损规则配置

#### 技术指标
- `/api/v1/tech/indicator/data` - 技术指标数据
- `/api/v1/tech/kline/pattern/recognize` - K线形态识别

### AI服务接口
- `/api/ai-inference/intelligence-brief` - AI智能简报

### 数据代理接口
- `/api/tushare` - Tushare API代理

## 3. 核心服务逻辑伪代码

### 3.1 ChipAnalysisService (筹码分析服务)

```javascript
// 核心逻辑：基于WAD指标的筹码分布计算与分析
function simulateChipDistributionWithWAD(dailyData, stockCode, stockName, realtimeData) {
    // 1. 获取基准价格和历史数据
    const basePrice = realtimeData?.currentPrice || dailyData[dailyData.length-1].close;
    const totalVolume = dailyData.reduce((sum, item) => sum + item.volume, 0);
    
    // 2. 计算WAD指标
    const wadItems = convertToWADItems(dailyData, realtimeData);
    const cumulativeWAD = calculateCumulativeWAD(wadItems, {
        decayRate: 0.1,
        useExponentialDecay: true
    });
    
    // 3. 生成基础筹码分布
    const chipData = [];
    for (let i = -30; i <= 30; i++) {
        const price = basePrice + i * 10; // 价格单位：分
        let volume = generateBaseVolume(price, basePrice, i);
        
        // 4. 使用WAD指标调整筹码分布
        if (cumulativeWAD.length > 0) {
            const latestWAD = cumulativeWAD[cumulativeWAD.length - 1];
            const wadFactor = 1 + (latestWAD.weightedWad / 1000000);
            volume *= wadFactor;
        }
        
        // 5. 实时数据调整
        if (realtimeData) {
            const proximityFactor = 1 - (Math.abs(i) / (priceRange * 2));
            volume *= (1 + (proximityFactor * 0.3) * priceChangeFactor);
        }
        
        chipData.push({ price, volume, percentage: 0 });
    }
    
    // 6. 计算筹码指标
    const chipConcentration = calculateHHI(chipData);
    const mainCostPrice = calculateAverageCost(chipData);
    const peakInfo = identifyChipPeaks(chipData);
    const supportResistance = calculateSupportResistance(chipData, mainCostPrice);
    
    // 7. 格式化返回结果
    return formatChipDistributionResult({
        stockCode, stockName, date: currentDate,
        chipDistribution: normalizedRanges,
        chipConcentration, mainCostPrice,
        supportPrice, resistancePrice,
        chipPeakInfo: peakInfo
    });
}
```

### 3.2 RiskControlService (风险控制服务)

```javascript
// 核心逻辑：账户风险评估与持仓监控
class SimulatedPositionStore {
    constructor() {
        this.positions = new Map(); // 持仓存储
        this.accountData = {        // 账户数据
            accountId: 'sim-acc-001',
            totalMarketValue: 0,
            totalAvailableFunds: 50000000, // 500万(分)
            totalProfitLoss: 0,
            positions: [],
            activeWarnings: []
        };
    }
    
    // 买入股票逻辑
    async buyStock(stockCode, shares, price) {
        // 1. 资金检查
        const marketValue = shares * price;
        if (marketValue > this.accountData.totalAvailableFunds) {
            throw new Error('可用资金不足');
        }
        
        // 2. 获取股票数据
        const [chipData, stockData] = await Promise.all([
            fetchChipDistribution({ stockCode }),
            getTushareDailyData(stockCode)
        ]);
        
        // 3. 更新持仓或创建新持仓
        if (this.positions.has(stockCode)) {
            // 更新现有持仓
            const existingPos = this.positions.get(stockCode);
            const totalShares = existingPos.shares + shares;
            const newAvgCost = Math.round((existingPos.shares * existingPos.avgCostPrice + shares * price) / totalShares);
            
            const updatedPos = {
                ...existingPos,
                shares: totalShares,
                avgCostPrice: newAvgCost,
                currentPrice: currentPrice,
                marketValue: totalShares * currentPrice,
                profitLoss: totalShares * (currentPrice - newAvgCost),
                chipSupportPrice: chipData.data.supportPrice,
                stopLossWarning: this.checkStopLossWarning(currentPrice, chipData.data.supportPrice)
            };
            
            this.positions.set(stockCode, updatedPos);
        } else {
            // 创建新持仓
            const newPos = {
                stockCode, stockName, shares, avgCostPrice: price,
                currentPrice, marketValue: shares * currentPrice,
                profitLoss: shares * (currentPrice - price),
                chipSupportPrice: chipData.data.supportPrice,
                stopLossWarning: this.checkStopLossWarning(currentPrice, chipData.data.supportPrice)
            };
            this.positions.set(stockCode, newPos);
        }
        
        // 4. 更新账户资金
        this.accountData.totalAvailableFunds -= marketValue;
        this.updateAccountStats();
    }
    
    // 风险监控逻辑
    private checkStopLossWarning(currentPrice, chipSupportPrice) {
        // 当股价跌破筹码密集区下沿5%时触发预警
        const threshold = chipSupportPrice * 0.95;
        return currentPrice < threshold;
    }
    
    // 批量更新持仓风险状态
    private async updateAllPositions() {
        const warnings = [];
        
        for (const [stockCode, position] of this.positions.entries()) {
            // 获取最新价格和筹码数据
            const [stockData, chipData] = await Promise.all([
                getTushareDailyData(stockCode),
                fetchChipDistribution({ stockCode })
            ]);
            
            // 更新持仓数据和风险状态
            const currentPrice = stockData[0]?.close || position.currentPrice;
            const chipSupportPrice = chipData.data.supportPrice;
            const stopLossWarning = this.checkStopLossWarning(currentPrice, chipSupportPrice);
            
            // 收集风险预警
            if (stopLossWarning) {
                warnings.push(`${position.stockName}(${stockCode})股价已跌破筹码密集区下沿5%，触发高危止损预警`);
            }
        }
        
        // 更新风险预警列表
        this.accountData.activeWarnings = warnings;
        this.updateAccountStats();
    }
}
```

## 4. 数据流转过程

### 4.1 数据从Tushare到代理层

```
Tushare API → 数据转换 → 缓存处理 → API代理层
```

- **Tushare API调用**：通过`lib/api/common/tushare.ts`中的`tushareRequest`函数发起请求
- **数据转换**：将Tushare返回的原始数据转换为系统内部格式（如价格单位转换为分）
- **缓存处理**：使用内存缓存减少重复请求，缓存有效期1小时
- **API代理层**：通过`/api/tushare`接口提供统一的Tushare访问入口，避免客户端直接暴露Token

### 4.2 算法处理流程

```
原始数据 → 数据清洗 → 算法计算 → 结果增强 → 数据格式化
```

- **数据清洗**：过滤无效数据，统一格式
- **算法计算**：
  - 筹码分布：使用HHI指数计算集中度、识别峰值
  - WAD指标：计算累积WAD值、加权WAD等
  - 技术分析：各类技术指标计算
- **结果增强**：添加可靠性评分、趋势分析等增强信息
- **数据格式化**：转换为前端所需的JSON格式，确保符合API响应规范

### 4.3 UI驱动流程

```
API请求 → 响应处理 → 状态更新 → UI渲染
```

- **API请求**：使用自定义Hook（如`usePolling`）定期获取数据
- **响应处理**：解析API响应，处理错误情况
- **状态更新**：更新组件内部状态或全局状态
- **UI渲染**：根据新状态重新渲染UI组件，展示分析结果

## 5. 复杂的Hook嵌套

### 5.1 WADChipDistribution组件中的Hook嵌套

```javascript
// 组件级Hook嵌套
function WADChipDistribution({ symbol = 'SH600000' }) {
  // 1. 自定义Hook: 封装AI遗传简报逻辑
  const { tacticalState, loading, lastUpdate, fetchData } = useAIGeneticBrief(symbol);
  
  // 2. 防抖处理
  const debouncedFetchData = useCallback(debounce(fetchData, 5000), [fetchData]);
  
  // 3. 初始加载数据
  useEffect(() => {
    debouncedFetchData();
  }, [symbol, debouncedFetchData]);
  
  // 4. 记忆化计算
  const averageCost = useMemo(() => calculateAverageCost(chipData), [chipData]);
  const concentration = useMemo(() => calculateConcentration(chipData), [chipData]);
  
  // 5. 全局轮询Hook
  usePolling(fetchData, {
    interval: 60000, // 60秒更新一次
    tabKey: 'dashboard', // 仅在仪表盘页面运行
    immediate: false
  });
  
  // 组件渲染...
}

// 自定义Hook内部实现
function useAIGeneticBrief(symbol) {
  const [tacticalState, setTacticalState] = useState<TacticalState>(initialState);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  
  // 使用ref避免闭包问题
  const currentSymbolRef = useRef(symbol);
  
  useEffect(() => {
    currentSymbolRef.current = symbol;
  }, [symbol]);
  
  // 回调函数包装
  const calculateStopLoss = useCallback((supportPrice, resistancePrice, wadData) => {
    // 计算逻辑...
  }, []);
  
  // 数据获取逻辑
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // 并行API调用
      const [chipResponse, techResponse, largeOrderResponse] = await Promise.all([
        fetchChipDistribution({ stockCode: currentSymbolRef.current }),
        fetchTechIndicatorData({ stockCode: currentSymbolRef.current, indicatorTypes: ['wad'], days: 30 }),
        fetchLargeOrderRealTime({ stockCode: currentSymbolRef.current })
      ]);
      
      // 数据转换和处理...
      
      // 更新状态
      setTacticalState(prev => ({
        ...prev,
        chipData: transformedChipData,
        wadData: transformedWadData,
        largeOrderSummary: transformedLargeOrderSummary,
        supportPrice: apiSupportPrice,
        resistancePrice: apiResistancePrice,
        suggestedStopLoss: newSuggestedStopLoss
      }));
      
    } catch (error) {
      // 错误处理和降级方案...
    } finally {
      setLoading(false);
    }
  }, [calculateStopLoss]);
  
  return { tacticalState, loading, lastUpdate, fetchData };
}
```

### 5.2 usePolling Hook的实现

```javascript
// 全局轮询Hook实现
export const usePolling = (callback: () => void, options: UsePollingOptions) => {
  const { interval, tabKey, immediate = false } = options;
  const { activeTab } = useUserStore(); // 状态管理Hook
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const isClient = useRef(false);

  // 确保只在客户端执行
  useEffect(() => {
    isClient.current = true;
  }, []);

  // 更新callback引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 核心轮询逻辑
  useEffect(() => {
    if (!isClient.current) return;

    const isActive = activeTab === tabKey;

    // 清理之前的定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 仅在活跃标签页启动轮询
    if (isActive) {
      if (immediate) callbackRef.current();
      intervalRef.current = setInterval(() => callbackRef.current(), interval);
    }

    // 清理函数
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTab, tabKey, interval, immediate]);

  // 手动控制函数
  const start = () => { /* ... */ };
  const stop = () => { /* ... */ };

  return { start, stop };
};
```

## 6. 当前未完成的部分列表

| 模块 | 未完成功能 | 优先级 |
|------|------------|--------|
| **数据层** | Tushare API集成完整实现（目前以Mock数据为主） | 高 |
| **算法层** | 更多技术指标算法实现（如MACD、RSI等） | 中 |
| **UI层** | 图表库集成（当前使用简单占位符） | 高 |
| **风险控制** | VaR、CVaR等高级风险指标计算 | 中 |
| **用户体验** | 更完善的错误处理和用户提示 | 中 |
| **性能优化** | 大数据量下的渲染性能优化 | 低 |
| **测试** | 单元测试和集成测试覆盖 | 低 |
| **文档** | 完整的API文档和使用说明 | 低 |

## 7. 架构特点与优势

1. **模块化设计**：按功能模块清晰划分，便于维护和扩展
2. **分层架构**：数据层、服务层、UI层分离，关注点清晰
3. **响应式设计**：使用React Hooks实现组件状态管理和生命周期管理
4. **高性能**：使用缓存、防抖、节流等技术优化性能
5. **可扩展性**：API版本化设计，便于未来功能扩展
6. **容错性**：多层次错误处理和降级方案，确保系统稳定运行

---

**注**：以上分析基于当前代码库状态，部分功能可能仍在开发中。