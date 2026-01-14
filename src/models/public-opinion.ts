export interface HotEvent {
  eventId: string;
  eventTitle: string;
  eventTime: string; // yyyy-MM-dd HH:mm:ss
  eventInfluence: number; // 事件影响力评分（0-100）
  eventSentiment: 'positive' | 'negative' | 'neutral'; // 事件情绪
}

export interface OpinionTrendItem {
  time: string; // yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss
  score: number; // 舆情评分（0-100）
}

export interface PublicOpinionSummary {
  stockCode: string;
  stockName: string;
  opinionScore: number; // 舆情综合评分（0-100，越高越正面）
  positiveRatio: number; // 正面舆情占比
  negativeRatio: number; // 负面舆情占比
  neutralRatio: number; // 中性舆情占比
  hotEvents: HotEvent[];
  opinionTrend: OpinionTrendItem[];
}

export interface PublicOpinionDetail {
  opinionId: string;
  stockCode: string;
  title: string;
  content: string;
  source: string;
  publishTime: string; // yyyy-MM-dd HH:mm:ss
  sentiment: 'positive' | 'negative' | 'neutral'; // 舆情类型
  sentimentScore: number; // 情绪评分（0-100）
  influence: number; // 影响力（0-100）
}

export interface PublicOpinionList {
  total: number;
  pageNum: number;
  pageSize: number;
  list: PublicOpinionDetail[];
}
