<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api.js';

const range = ref<'today' | 'week' | 'month' | 'all'>('week');
const items = ref<any[]>([]);
const loading = ref(false);
const expanded = ref<Record<string, boolean>>({});
const platformFilter = ref<string>('');
const techFilter = ref<string>('');

const PLATFORM_LABEL: Record<string, string> = {
  dianping: '点评', meituan: '美团', douyin: '抖音', xiaohongshu: '小红书',
};

async function load() {
  loading.value = true;
  try {
    const { items: list } = await api.listReviews(range.value);
    items.value = list;
  } finally { loading.value = false; }
}

const filtered = computed(() =>
  items.value.filter((r) =>
    (!platformFilter.value || r.platform === platformFilter.value) &&
    (!techFilter.value || r.technician === techFilter.value)
  )
);

const techniciansSeen = computed(() => {
  const set = new Set<string>();
  items.value.forEach((r) => r.technician && set.add(r.technician));
  return Array.from(set);
});

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  } catch {
    alert('复制失败,请手动选中文字');
  }
}

onMounted(load);
</script>

<template>
  <div class="px-4 pt-5 pb-10 max-w-md mx-auto">
    <header class="mb-4">
      <div class="label mb-1.5">REVIEWS</div>
      <h1 class="heading-1">评价列表</h1>
      <p class="text-xs text-slate-500 mt-1.5 tracking-wide">
        4-5 星顾客点击「复制评价 · 打开 App」后留下的记录
      </p>
    </header>

    <!-- 时段切换 -->
    <div class="flex gap-1.5 mb-3">
      <button v-for="r in ['today','week','month','all'] as const" :key="r"
        @click="range = r; load()"
        class="px-3 py-1 rounded-full text-xs transition-all"
        :class="range === r ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-brand' : 'bg-white border border-slate-200 text-slate-600'">
        {{ ({today:'今日',week:'本周',month:'本月',all:'全部'})[r] }}
      </button>
    </div>

    <!-- 平台 + 技师 筛选 -->
    <div class="flex gap-2 mb-4">
      <select v-model="platformFilter" class="input flex-1 py-2 text-xs">
        <option value="">全部平台</option>
        <option v-for="(label, key) in PLATFORM_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
      <select v-model="techFilter" class="input flex-1 py-2 text-xs">
        <option value="">全部技师</option>
        <option v-for="t in techniciansSeen" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>

    <div v-if="loading" class="text-slate-400 text-center mt-12 text-sm">加载中...</div>
    <p v-else-if="filtered.length === 0" class="text-slate-400 text-center mt-12 text-sm">
      暂无评价记录
    </p>

    <div v-else class="space-y-2.5">
      <div v-for="r in filtered" :key="r.id" class="card p-3.5">
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-yellow-500 text-sm">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5-r.rating) }}</span>
            <span class="text-[10px] tracking-wider uppercase font-medium px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
              {{ PLATFORM_LABEL[r.platform] || r.platform }}
            </span>
            <span v-if="r.photo_count" class="text-[10px] text-slate-400">
              📷 {{ r.photo_count }}
            </span>
          </div>
          <span class="text-[10px] text-slate-400 tracking-wide">{{ fmtTime(r.created_at) }}</span>
        </div>

        <div v-if="r.tags.length || r.technician" class="flex flex-wrap gap-1 mb-2">
          <span v-for="t in r.tags" :key="t"
            class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            {{ t }}
          </span>
          <span v-if="r.technician"
            class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            技师 {{ r.technician }}
          </span>
        </div>

        <p class="text-xs text-slate-700 leading-relaxed"
          :class="!expanded[r.id] && 'line-clamp-2'">
          {{ r.text }}
        </p>

        <div class="flex items-center justify-end gap-3 mt-2 text-[11px]">
          <button
            v-if="r.text.length > 80"
            @click="expanded[r.id] = !expanded[r.id]"
            class="text-slate-500 hover:text-slate-700"
          >
            {{ expanded[r.id] ? '收起' : '展开' }}
          </button>
          <button @click="copyText(r.text)" class="text-brand-600 hover:text-brand-700 font-medium">
            复制文案
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
