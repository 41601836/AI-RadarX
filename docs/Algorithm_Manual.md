# A-RadarX 3.2.0 算法手册

## 1. 技术指标算法

### 1.1 威廉积累/派发指标 (WAD)

#### 1.1.1 指标介绍
威廉积累/派发指标（William's Accumulation/Distribution，简称WAD）是一种衡量资金流向的技术指标，通过比较当日最高价、最低价和收盘价的关系，来判断资金是流入还是流出。

#### 1.1.2 计算公式

##### 1.1.2.1 每日积累/派发量 (Daily Accumulation/Distribution)
```
如果 收盘价 > 前一日收盘价:
    CloseLocationValue = (收盘价 - 最低价) - (最高价 - 收盘价)
如果 收盘价 < 前一日收盘价:
    CloseLocationValue = (收盘价 - 最高价) - (最低价 - 收盘价)
如果 收盘价 == 前一日收盘价:
    CloseLocationValue = 0
```

##### 1.1.2.2 WAD 指标值
```
WAD = 前一日WAD + CloseLocationValue
```

##### 1.1.2.3 标准化 WAD
```
标准化 WAD = (WAD - 最小WAD值) / (最大WAD值 - 最小WAD值) * 100
```

#### 1.1.3 算法实现
```javascript
function calculateWAD(prices, period = 20) {
  if (prices.length < period) {
    throw new Error('Insufficient data for WAD calculation');
  }

  const wadValues = [];
  let currentWAD = 0;

  for (let i = 1; i < prices.length; i++) {
    const current = prices[i];
    const previous = prices[i - 1];
    let closeLocationValue = 0;

    if (current.close > previous.close) {
      closeLocationValue = (current.close - current.low) - (current.high - current.close);
    } else if (current.close < previous.close) {
      closeLocationValue = (current.close - current.high) - (current.low - current.close);
    }

    currentWAD += closeLocationValue;
    wadValues.push(currentWAD);
  }

  // 标准化WAD值到0-100范围
  const minWAD = Math.min(...wadValues);
  const maxWAD = Math.max(...wadValues);
  const normalizedWAD = wadValues.map(wad => {
    return ((wad - minWAD) / (maxWAD - minWAD)) * 100;
  });

  return normalizedWAD;
}
```

#### 1.1.4 应用规则
- 当 WAD 持续上升时，表明资金流入，市场处于强势
- 当 WAD 持续下降时，表明资金流出，市场处于弱势
- 当 WAD 与价格出现背离时，可能是趋势反转的信号
- WAD 可以与其他指标结合使用，如 RSI、MACD 等，提高分析的准确性

### 1.2 相对强弱指标 (RSI)

#### 1.2.1 指标介绍
相对强弱指标（Relative Strength Index，简称RSI）是一种动量指标，用于衡量市场的超买超卖状态。RSI 的取值范围是 0-100，通常以 70 和 30 作为超买和超卖的分界线。

#### 1.2.2 计算公式

##### 1.2.2.1 平均增益和平均损失
```
首先计算每日价格变化:
Change = 当日收盘价 - 前一日收盘价

然后计算平均增益和平均损失:
平均增益 = (前一日平均增益 × (n-1) + 当日增益) / n
平均损失 = (前一日平均损失 × (n-1) + 当日损失) / n

其中:
- 当日增益 = max(Change, 0)
- 当日损失 = max(-Change, 0)
- n 是计算周期（通常为 14）
```

##### 1.2.2.2 相对强弱 (RS)
```
RS = 平均增益 / 平均损失
```

##### 1.2.2.3 RSI 指标值
```
RSI = 100 - (100 / (1 + RS))
```

#### 1.2.3 算法实现
```javascript
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) {
    throw new Error('Insufficient data for RSI calculation');
  }

  const rsiValues = [];
  let gains = [];
  let losses = [];

  // 计算初始的平均增益和平均损失
  for (let i = 1; i <= period; i++) {
    const change = prices[i].close - prices[i - 1].close;
    gains.push(Math.max(change, 0));
    losses.push(Math.max(-change, 0));
  }

  let avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;

  // 计算第一个RSI值
  let rs = avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  rsiValues.push(rsi);

  // 计算剩余的RSI值
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i].close - prices[i - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    // 更新平均增益和平均损失
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    // 计算RS和RSI
    rs = avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
    rsiValues.push(rsi);
  }

  return rsiValues;
}
```

#### 1.2.4 应用规则
- RSI > 70: 市场处于超买状态，可能会回调
- RSI < 30: 市场处于超卖状态，可能会反弹
- RSI 与价格出现背离时，可能是趋势反转的信号
- RSI 可以用于确认价格趋势的强度

## 2. 权重自适应算法

### 2.1 算法介绍
权重自适应算法是 A-RadarX 3.2.0 版本的核心算法之一，它能够根据市场情况自动调整各个技术指标的权重，提高分析的准确性。该算法基于机器学习和统计分析，能够不断学习市场规律，优化权重配置。

### 2.2 算法原理

#### 2.2.1 初始权重设置
为每个技术指标设置初始权重，这些权重可以基于历史数据分析或专家经验确定。

#### 2.2.2 预测能力评估
定期计算每个技术指标的预测能力，评估指标的有效性。预测能力可以通过以下指标衡量：
- **准确率**：指标预测正确的次数占总次数的比例
- **收益率**：基于指标信号的投资组合收益率
- **信息比率**：风险调整后的收益率

#### 2.2.3 权重调整
根据预测能力评估结果，动态调整各个指标的权重。预测能力强的指标会获得更高的权重，预测能力弱的指标会获得较低的权重。

#### 2.2.4 权重归一化
确保所有指标的权重之和为 1，便于后续的综合评分计算。

### 2.3 计算公式

#### 2.3.1 预测能力得分
```
预测能力得分 = α × 准确率 + β × 收益率 + γ × 信息比率
```

其中：
- α、β、γ 是权重系数，满足 α + β + γ = 1
- 准确率、收益率、信息比率都经过标准化处理（0-100范围）

#### 2.3.2 指标权重
```
指标权重 = 预测能力得分 / Σ(所有指标的预测能力得分)
```

#### 2.3.3 动态权重调整
```
新权重 = 当前权重 × (1 - 学习率) + 基于预测能力的权重 × 学习率
```

其中：
- 学习率（0-1）：控制权重调整的速度

### 2.4 算法实现
```javascript
class AdaptiveWeightCalculator {
  constructor(indicators, initialWeights, learningRate = 0.1) {
    this.indicators = indicators;
    this.weights = initialWeights;
    this.learningRate = learningRate;
    this.alpha = 0.3;
    this.beta = 0.5;
    this.gamma = 0.2;
  }

  // 计算单个指标的预测能力得分
  calculatePredictiveScore(indicatorName, performanceData) {
    const { accuracy, returnRate, informationRatio } = performanceData;

    // 计算预测能力得分
    const score = this.alpha * accuracy + this.beta * returnRate + this.gamma * informationRatio;
    return score;
  }

  // 更新指标权重
  updateWeights(performanceDataMap) {
    // 计算每个指标的预测能力得分
    const scores = this.indicators.map(indicator => {
      const performanceData = performanceDataMap[indicator];
      return this.calculatePredictiveScore(indicator, performanceData);
    });

    // 计算基于预测能力的权重
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const predictiveWeights = scores.map(score => score / totalScore);

    // 动态调整权重
    this.weights = this.weights.map((currentWeight, index) => {
      return currentWeight * (1 - this.learningRate) + predictiveWeights[index] * this.learningRate;
    });

    // 归一化权重，确保总和为1
    const totalWeight = this.weights.reduce((sum, weight) => sum + weight, 0);
    this.weights = this.weights.map(weight => weight / totalWeight);

    return this.weights;
  }

  // 获取当前权重
  getCurrentWeights() {
    return this.weights;
  }
}
```

### 2.5 应用场景
- **市场环境变化**：当市场从牛市转为熊市时，自动调整指标权重
- **不同股票类型**：为不同类型的股票（成长股、价值股等）设置不同的权重
- **不同时间周期**：为不同的时间周期（日线、周线、月线）设置不同的权重
- **个性化需求**：根据用户的风险偏好和投资目标调整权重

## 3. 综合评分算法

### 3.1 算法介绍
综合评分算法是将多个技术指标的分析结果进行整合，生成一个综合评分，用于评估股票的投资价值。该算法考虑了多个维度的因素，包括技术指标、基本面数据、市场情绪等。

### 3.2 计算公式

#### 3.2.1 单个指标评分
```
指标评分 = 指标值 × 指标权重
```

#### 3.2.2 综合评分
```
综合评分 = Σ(所有指标的指标评分)
```

#### 3.2.3 投资评级
```
如果 综合评分 > 80: 买入
如果 综合评分 > 60: 持有
如果 综合评分 ≤ 60: 卖出
```

### 3.3 算法实现
```javascript
function calculateCompositeScore(indicatorValues, weights) {
  if (indicatorValues.length !== weights.length) {
    throw new Error('Indicator values and weights must have the same length');
  }

  // 计算每个指标的评分
  const indicatorScores = indicatorValues.map((value, index) => value * weights[index]);

  // 计算综合评分
  const compositeScore = indicatorScores.reduce((sum, score) => sum + score, 0);

  // 生成投资评级
  let rating;
  if (compositeScore > 80) {
    rating = 'buy';
  } else if (compositeScore > 60) {
    rating = 'hold';
  } else {
    rating = 'sell';
  }

  return {
    compositeScore,
    rating,
    indicatorScores
  };
}
```

### 3.4 应用场景
- **股票筛选**：根据综合评分筛选出具有投资价值的股票
- **投资决策**：基于综合评分制定投资决策
- **风险控制**：通过综合评分控制投资组合的风险
- **绩效评估**：评估投资组合的表现

## 4. AI 模型融合算法

### 4.1 算法介绍
AI 模型融合算法是将多个 AI 模型的分析结果进行整合，生成更准确、更可靠的分析结果。该算法支持多种融合策略，包括投票机制、加权平均、堆叠集成等。

### 4.2 融合策略

#### 4.2.1 投票机制
- **简单多数投票**：选择获得最多模型支持的结果
- **加权多数投票**：根据模型的历史表现为每个模型分配权重，然后进行投票

#### 4.2.2 加权平均
- **等权重平均**：将所有模型的结果进行等权重平均
- **动态权重平均**：根据模型的实时表现动态调整权重

#### 4.2.3 堆叠集成
- 使用元模型（Meta-model）对基础模型的结果进行二次学习和预测

### 4.3 计算公式

#### 4.3.1 加权平均融合
```
融合结果 = Σ(模型结果 × 模型权重) / Σ(模型权重)
```

#### 4.3.2 模型权重计算
```
模型权重 = 模型准确率 / Σ(所有模型的准确率)
```

### 4.4 算法实现
```javascript
class AIModelEnsemble {
  constructor(models, initialWeights = null) {
    this.models = models;
    this.weights = initialWeights || models.map(() => 1 / models.length);
    this.modelPerformances = models.map(() => 1); // 初始表现都为1
  }

  // 更新模型权重
  updateModelWeights() {
    const totalPerformance = this.modelPerformances.reduce((sum, perf) => sum + perf, 0);
    this.weights = this.modelPerformances.map(perf => perf / totalPerformance);
  }

  // 融合多个模型的结果
  ensembleResults(modelResults) {
    if (modelResults.length !== this.models.length) {
      throw new Error('Number of model results must match number of models');
    }

    // 使用加权平均融合结果
    const weightedResults = modelResults.map((result, index) => result * this.weights[index]);
    const ensembleResult = weightedResults.reduce((sum, result) => sum + result, 0);

    return ensembleResult;
  }

  // 评估模型表现并更新权重
  evaluateAndUpdate(modelResults, actualResults) {
    // 计算每个模型的准确率
    this.modelPerformances = modelResults.map((result, index) => {
      // 这里使用简单的准确率计算，实际应用中可以使用更复杂的评估指标
      return Math.abs(result - actualResults[index]) < 0.1 ? 1 : 0;
    });

    // 更新模型权重
    this.updateModelWeights();
  }
}
```

### 4.5 应用场景
- **AI 智能分析**：融合多个大语言模型的分析结果
- **预测模型**：提高预测的准确性和可靠性
- **风险评估**：综合多个风险模型的评估结果
- **决策支持**：为投资决策提供更全面的支持

## 5. 算法性能评估

### 5.1 评估指标
- **准确率**：预测正确的次数占总次数的比例
- **收益率**：基于算法信号的投资组合收益率
- **夏普比率**：风险调整后的收益率
- **最大回撤**：投资组合的最大亏损幅度
- **胜率**：盈利交易次数占总交易次数的比例
- **盈亏比**：平均盈利与平均亏损的比例

### 5.2 评估方法
- **历史回测**：使用历史数据测试算法的表现
- **模拟交易**：在模拟环境中测试算法的表现
- **实盘测试**：在实际市场中测试算法的表现
- **敏感性分析**：分析算法对参数变化的敏感性
- **压力测试**：测试算法在极端市场条件下的表现

### 5.3 性能优化
- **参数调优**：优化算法的参数设置
- **特征选择**：选择最有预测能力的特征
- **模型选择**：选择最适合当前市场环境的模型
- **风险控制**：加强算法的风险控制能力
- **计算优化**：提高算法的计算效率

## 6. 算法应用指南

### 6.1 WAD 指标应用
- **趋势判断**：WAD 持续上升表明资金流入，市场处于强势；WAD 持续下降表明资金流出，市场处于弱势
- **背离信号**：WAD 与价格出现背离时，可能是趋势反转的信号
- **结合其他指标**：WAD 可以与 RSI、MACD 等指标结合使用，提高分析的准确性

### 6.2 RSI 指标应用
- **超买超卖**：RSI > 70 表明市场超买，可能回调；RSI < 30 表明市场超卖，可能反弹
- **趋势确认**：RSI 可以用于确认价格趋势的强度
- **背离信号**：RSI 与价格出现背离时，可能是趋势反转的信号

### 6.3 权重自适应算法应用
- **市场环境适应**：自动适应不同的市场环境（牛市、熊市、震荡市）
- **个性化配置**：根据用户的风险偏好和投资目标调整权重
- **持续优化**：通过不断学习市场规律，持续优化权重配置

### 6.4 AI 模型融合应用
- **提高准确性**：融合多个模型的结果，提高分析的准确性
- **降低风险**：减少单一模型的局限性，降低投资风险
- **增强可靠性**：提高分析结果的可靠性和稳定性
