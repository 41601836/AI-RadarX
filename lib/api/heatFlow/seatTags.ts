// 游资席位标签库

// 席位标签定义
export enum SeatTag {
  TOP_TIER_ALPHA = 'TOP_TIER_ALPHA', // 顶级游资
  LASA_TEAM = 'LASA_TEAM', // 拉萨天团
  INSTITUTION = 'INSTITUTION', // 机构专用
  SHORT_TERM = 'SHORT_TERM', // 短线游资
  LONG_TERM = 'LONG_TERM', // 长线游资
  HIGH_SUCCESS_RATE = 'HIGH_SUCCESS_RATE', // 高成功率
  FREQUENT_TRADER = 'FREQUENT_TRADER', // 频繁交易者
  LARGE_CAP = 'LARGE_CAP', // 擅长大盘股
  SMALL_CAP = 'SMALL_CAP' // 擅长小盘股
}

// 席位标签映射
export interface SeatTagInfo {
  seatName: string;
  tags: SeatTag[];
  description?: string;
}

// 席位标签库
export const SEAT_TAGS_LIBRARY: SeatTagInfo[] = [
  {
    seatName: '国泰君安证券上海江苏路营业部',
    tags: [SeatTag.TOP_TIER_ALPHA, SeatTag.SHORT_TERM, SeatTag.HIGH_SUCCESS_RATE],
    description: '著名游资章盟主席位'
  },
  {
    seatName: '中信证券上海溧阳路营业部',
    tags: [SeatTag.TOP_TIER_ALPHA, SeatTag.SHORT_TERM, SeatTag.FREQUENT_TRADER],
    description: '著名游资孙哥席位'
  },
  {
    seatName: '华泰证券深圳益田路荣超商务中心营业部',
    tags: [SeatTag.TOP_TIER_ALPHA, SeatTag.SHORT_TERM, SeatTag.HIGH_SUCCESS_RATE],
    description: '著名游资赵老哥席位'
  },
  {
    seatName: '光大证券宁波解放南路营业部',
    tags: [SeatTag.TOP_TIER_ALPHA, SeatTag.SHORT_TERM, SeatTag.FREQUENT_TRADER],
    description: '著名游资徐翔旧部席位'
  },
  {
    seatName: '银河证券绍兴营业部',
    tags: [SeatTag.TOP_TIER_ALPHA, SeatTag.SHORT_TERM, SeatTag.HIGH_SUCCESS_RATE],
    description: '著名游资赵老哥席位'
  },
  {
    seatName: '中信证券北京呼家楼营业部',
    tags: [SeatTag.TOP_TIER_ALPHA, SeatTag.INSTITUTION, SeatTag.LARGE_CAP],
    description: '著名机构席位'
  },
  {
    seatName: '中国国际金融股份有限公司上海分公司',
    tags: [SeatTag.INSTITUTION, SeatTag.LARGE_CAP, SeatTag.LONG_TERM],
    description: 'QFII专用席位'
  },
  {
    seatName: '西藏东方财富证券拉萨团结路第一营业部',
    tags: [SeatTag.LASA_TEAM, SeatTag.SHORT_TERM, SeatTag.FREQUENT_TRADER],
    description: '拉萨天团席位'
  },
  {
    seatName: '西藏东方财富证券拉萨团结路第二营业部',
    tags: [SeatTag.LASA_TEAM, SeatTag.SHORT_TERM, SeatTag.FREQUENT_TRADER],
    description: '拉萨天团席位'
  },
  {
    seatName: '西藏东方财富证券拉萨东环路第一营业部',
    tags: [SeatTag.LASA_TEAM, SeatTag.SHORT_TERM, SeatTag.FREQUENT_TRADER],
    description: '拉萨天团席位'
  },
  {
    seatName: '西藏东方财富证券拉萨东环路第二营业部',
    tags: [SeatTag.LASA_TEAM, SeatTag.SHORT_TERM, SeatTag.FREQUENT_TRADER],
    description: '拉萨天团席位'
  },
  {
    seatName: '西藏东方财富证券拉萨金珠西路第一营业部',
    tags: [SeatTag.LASA_TEAM, SeatTag.SHORT_TERM, SeatTag.FREQUENT_TRADER],
    description: '拉萨天团席位'
  },
  {
    seatName: '西藏东方财富证券拉萨江苏路营业部',
    tags: [SeatTag.LASA_TEAM, SeatTag.SHORT_TERM, SeatTag.FREQUENT_TRADER],
    description: '拉萨天团席位'
  }
];

// 根据席位名称获取标签
export function getSeatTags(seatName: string): SeatTag[] {
  const seatInfo = SEAT_TAGS_LIBRARY.find(seat => seat.seatName.includes(seatName) || seatName.includes(seat.seatName));
  return seatInfo ? seatInfo.tags : [];
}

// 根据标签获取席位列表
export function getSeatsByTag(tag: SeatTag): string[] {
  return SEAT_TAGS_LIBRARY
    .filter(seat => seat.tags.includes(tag))
    .map(seat => seat.seatName);
}