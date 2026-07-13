// src/lib/zh-content.ts
// Chinese translations for project cards, categories, statuses and shared UI labels.
// Keeps the Chinese site driven by the same project content collection as English.

export const ZH_CATEGORY: Record<string, string> = {
  'Industrial Park': '产业园区',
  'Logistics':       '物流',
  'Agriculture':     '农业',
  'Healthcare':      '医疗康养',
  'Media':           '文化传媒',
}

export const ZH_STATUS: Record<string, string> = {
  'Active':         '运营中',
  'In Development': '开发中',
  'Planned':        '规划中',
}

export interface ZhProject {
  title: string
  subtitle: string
  location: string
  highlights: string[]
}

// Keyed by project slug — mirrors src/content/projects/*.md
export const ZH_PROJECTS: Record<string, ZhProject> = {
  'kuantan-halal-park': {
    title: '彭亨数字清真食品产业园',
    subtitle: '格宾 730 英亩 + 甘孟 100 英亩，彭亨州一体化清真平台',
    location: '马来西亚彭亨州关丹',
    highlights: [
      '格宾 730 英亩 + 甘孟 100 英亩，合计 830 英亩',
      '距关丹港约 10 公里，直连东海岸铁路（ECRL）',
      'JAKIM 清真认证：30+ 天 → 10–12 天',
      '通关时间：约 72 小时 → 约 48 小时',
      '0–5% 关税优惠（RCEP 及马来西亚-欧盟自贸协定）',
      '聚焦：清真食品、保健品、化妆品、药品',
    ],
  },
  'indonesia-fengjie-logistics': {
    title: '丰捷物流印度尼西亚',
    subtitle: '覆盖爪哇岛的区域仓储与配送网络',
    location: '印度尼西亚 雅加达 · 万隆 · 泗水 · 三宝垄',
    highlights: [
      '自营 4 个仓储配送中心，遍布爪哇岛',
      '覆盖约 80% 爪哇物流需求',
      '触达约 1.45 亿人口',
      '冷链损耗率 <8%（行业均值约 15%）',
      '库存周转效率提升 35%',
      '配送成本降低约 20%',
    ],
  },
  'zengcheng-ecological-space': {
    title: '增城生态空间',
    subtitle: '广州绿色农业、康养与循环科技示范基地',
    location: '中国广州市增城区东芬村',
    highlights: [
      '530 英亩生态农业示范基地',
      '低 GI 构树燕麦系列产品进入 200+ 门店',
      '2024 年单品销售额超 8000 万元人民币',
      'EnzyLoop 酶联生态循环技术',
      '农业、康养与教育体验融合',
    ],
  },
  'broiler-chicken-malaysia': {
    title: '现代肉鸡养殖 — 马来西亚',
    subtitle: '面向马来西亚市场的智能化清真蛋白供应体系',
    location: '马来西亚',
    highlights: [
      '项目总占地约 280 英亩，其中 56 英亩为商业用途',
      '40 英亩规划四栋现代化肉鸡鸡舍及一栋母代鸡舍',
      '预计年出栏量可达 182.4 万羽',
      '种鸡、孵化、养殖到食品加工与冷链配送一体化',
      '零抗生素 · 零重金属 · 零沙门氏菌',
    ],
  },
  'achievers-world': {
    title: '天下人物 — 文化传媒品牌',
    subtitle: '促进中马文化交流与商业融合',
    location: '马来西亚',
    highlights: [
      '成立于 2020 年，2026 年加入丰麒集团',
      '由首席执行官张佳领导',
      '三大业务：营销策划、企业咨询、公关活动',
      '荣获《南洋商报》2024 马中卓越品牌奖',
      '联合出品《下南洋》系列影视作品',
    ],
  },
}

// UI labels shared across Chinese pages
export const ZH_UI = {
  readMore:   '阅读全文',
  viewProject:'查看项目详情',
  allProjects:'全部项目',
  backToList: '返回列表',
  learnMore:  '了解更多',
}
