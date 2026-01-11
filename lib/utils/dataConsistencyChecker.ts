export interface DataSourceData {
  source: string;
  price: number;
  volume: number;
  timestamp: number;
}

export interface ConsistencyCheckResult {
  isConsistent: boolean;
  deviationPercentage: number;
  selectedDataSource: DataSourceData;
  reason?: string;
}

export class DataConsistencyChecker {
  private readonly DEVIATION_THRESHOLD = 1.0; // 1%

  /**
   * 检查两个数据源的价格一致性
   * @param source1 第一个数据源的数据
   * @param source2 第二个数据源的数据
   * @returns 一致性检查结果
   */
  checkConsistency(source1: DataSourceData, source2: DataSourceData): ConsistencyCheckResult {
    // 计算价格偏差百分比
    const deviationPercentage = this.calculateDeviationPercentage(source1.price, source2.price);
    const isConsistent = deviationPercentage <= this.DEVIATION_THRESHOLD;

    // 如果一致，默认选择第一个数据源
    if (isConsistent) {
      return {
        isConsistent: true,
        deviationPercentage,
        selectedDataSource: source1,
        reason: `价格偏差在允许范围内 (${deviationPercentage.toFixed(2)}%)`
      };
    }

    // 如果不一致，选择成交量更活跃的数据源
    const selectedDataSource = this.selectDataSourceByVolume(source1, source2);
    const reason = `价格偏差超过阈值 (${deviationPercentage.toFixed(2)}%)，选择成交量更活跃的数据源`;

    // 记录日志
    this.logInconsistency(source1, source2, deviationPercentage, selectedDataSource);

    return {
      isConsistent: false,
      deviationPercentage,
      selectedDataSource,
      reason
    };
  }

  /**
   * 计算两个价格之间的偏差百分比
   * @param price1 第一个价格
   * @param price2 第二个价格
   * @returns 偏差百分比
   */
  private calculateDeviationPercentage(price1: number, price2: number): number {
    if (price1 === 0 || price2 === 0) {
      return 0;
    }
    return Math.abs((price1 - price2) / ((price1 + price2) / 2)) * 100;
  }

  /**
   * 根据成交量选择数据源
   * @param source1 第一个数据源的数据
   * @param source2 第二个数据源的数据
   * @returns 选择的数据源
   */
  private selectDataSourceByVolume(source1: DataSourceData, source2: DataSourceData): DataSourceData {
    if (source1.volume > source2.volume) {
      return source1;
    } else if (source2.volume > source1.volume) {
      return source2;
    } else {
      // 如果成交量相同，选择价格较高的数据源
      return source1.price >= source2.price ? source1 : source2;
    }
  }

  /**
   * 记录不一致情况的日志
   * @param source1 第一个数据源的数据
   * @param source2 第二个数据源的数据
   * @param deviationPercentage 偏差百分比
   * @param selectedDataSource 选择的数据源
   */
  private logInconsistency(
    source1: DataSourceData,
    source2: DataSourceData,
    deviationPercentage: number,
    selectedDataSource: DataSourceData
  ): void {
    const timestamp = new Date().toISOString();
    console.warn(
      `[${timestamp}] 数据一致性检查告警:`,
      `\n  ${source1.source} 价格: ${source1.price}, 成交量: ${source1.volume}`,
      `\n  ${source2.source} 价格: ${source2.price}, 成交量: ${source2.volume}`,
      `\n  偏差百分比: ${deviationPercentage.toFixed(2)}%`,
      `\n  选择的数据源: ${selectedDataSource.source} (成交量: ${selectedDataSource.volume})`
    );
  }
}