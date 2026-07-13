// src/lib/insightCategories.ts
// Shared config for the Insights/News category tabs (EN + ZH).
// Add a new category here, plus a matching route folder under
// src/pages/insights/<slug>/ and src/pages/zh/insights/<slug>/,
// to introduce a new tab.

import type { InsightCategory } from './storyblok'

export interface CategoryTab {
  slug:    InsightCategory | 'all'
  labelEn: string
  labelZh: string
  hrefEn:  string
  hrefZh:  string
}

export const INSIGHT_CATEGORY_TABS: CategoryTab[] = [
  { slug: 'all',        labelEn: 'All',             labelZh: '全部',       hrefEn: '/insights',            hrefZh: '/zh/insights' },
  { slug: 'official',   labelEn: 'Official News',   labelZh: '官方新闻',   hrefEn: '/insights/official',   hrefZh: '/zh/insights/official' },
  { slug: 'media',      labelEn: 'Media Coverage',  labelZh: '媒体报道',   hrefEn: '/insights/media',      hrefZh: '/zh/insights/media' },
  { slug: 'arff-china', labelEn: 'ARFF China',      labelZh: 'ARFF中国区', hrefEn: '/insights/arff-china', hrefZh: '/zh/insights/arff-china' },
]
