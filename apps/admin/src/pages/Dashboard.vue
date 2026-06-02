<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useAuthStore } from '../store/auth.js';

const router = useRouter();
const auth = useAuthStore();
const range = ref<'today' | 'week' | 'month'>('today');
const data = ref<any>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    data.value = await api.getStats(range.value);
  } catch (e) {
    if (String(e).includes('401')) {
      auth.logout();
      router.push('/login');
    }
  } finally { loading.value = false; }
}

const RANGES = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
] as const;

const PLATFORMS = [
  { key: 'dianping', label: '大众点评', color: 'from-orange-400 to-amber-500' },
  { key: 'meituan', label: '美团', color: 'from-yellow-400 to-amber-400' },
  { key: 'douyin', label: '抖音', color: 'from-slate-700 to-slate-900' },
  { key: 'xiaohongshu', label: '小红书', color: 'from-rose-400 to-red-500' },
] as const;

onMounted(load);
</script>

<template>
  <div class="px-4 pt-5 pb-12 max-w-md mx-auto">
    <!-- 顶部 header -->
    <header class="flex items-start justify-between mb-5">
      <div>
        <div class="label mb-1.5">SCALP CARE · DASHBOARD</div>
        <h1 class="heading-1">数据看板</h1>
        <p v-if="auth.operator" class="text-xs text-slate-500 mt-1.5 tracking-wide">
          {{ auth.operator.name }} · {{ auth.operator.role === 'owner' ? '店主' : '运营' }}
        </p>
      </div>
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-lg shadow-brand flex-shrink-0">
        🌿
      </div>
    </header>

    <!-- 时段切换 segmented control -->
    <div class="card p-1 flex mb-4">
      <button
        v-for="r in RANGES"
        :key="r.key"
        @click="range = r.key; load()"
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        :class="range === r.key
          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-brand'
          : 'text-slate-500 hover:text-slate-700'"
      >
        {{ r.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center gap-2 py-12">
      <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
      <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse [animation-delay:200ms]" />
      <span class="w-2 h-2 rounded-full bg-teal-400 animate-pulse [animation-delay:400ms]" />
    </div>

    <div v-else-if="data" class="space-y-4">
      <!-- 主数据卡片:扫码次数 -->
      <div class="card p-5 relative overflow-hidden">
        <div
          aria-hidden="true"
          class="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-teal-400/15 to-cyan-400/10 blur-2xl pointer-events-none"
        />
        <div class="relative">
          <div class="label mb-2">扫码次数</div>
          <div class="flex items-baseline gap-2">
            <div class="text-5xl font-semibold tracking-tight bg-gradient-to-r from-teal-700 to-cyan-700 bg-clip-text text-transparent">
              {{ data.totalSessions }}
            </div>
            <div class="text-sm text-slate-400 tracking-wide">次</div>
          </div>
          <div class="mt-3 h-0.5 w-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" />
        </div>
      </div>

      <!-- 评分分布 -->
      <div class="card p-5">
        <div class="label mb-4">评分分布</div>
        <div v-for="n in [5,4,3,2,1]" :key="n" class="flex items-center gap-3 mb-2.5 last:mb-0">
          <span class="text-amber-500 text-xs font-semibold w-10 tracking-wider">{{ n }}星</span>
          <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="n >= 4
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                : n === 3
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-red-400 to-red-500'"
              :style="{ width: data.totalSessions ? `${data.ratingBreakdown[n]/data.totalSessions*100}%` : '0%' }"
            />
          </div>
          <span class="w-8 text-right text-sm text-slate-600 font-medium">{{ data.ratingBreakdown[n] }}</span>
        </div>
      </div>

      <!-- 公域跳转 -->
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="label">公域跳转</div>
          <div class="text-sm text-slate-500">
            共 <b class="text-brand-700">{{ data.totalJumps }}</b> 次
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          <div
            v-for="p in PLATFORMS"
            :key="p.key"
            class="rounded-xl border border-slate-100 px-3 py-3 flex items-center justify-between bg-slate-50/40"
          >
            <div class="flex items-center gap-2">
              <span class="w-1 h-6 rounded-full bg-gradient-to-b" :class="p.color" />
              <span class="text-sm text-slate-700">{{ p.label }}</span>
            </div>
            <b class="text-base text-slate-900 tracking-tight">{{ data.platformJumps[p.key] }}</b>
          </div>
        </div>
      </div>

      <!-- 差评告警 -->
      <button
        v-if="data.pendingComplaints > 0"
        @click="router.push('/complaints')"
        class="w-full card p-4 flex items-center justify-between border-red-100 bg-gradient-to-r from-red-50/60 to-white hover:shadow-card-hover transition-all duration-200 active:scale-[0.99]"
      >
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div class="text-left">
            <div class="text-sm font-medium text-slate-900">差评待处理</div>
            <div class="text-xs text-slate-500 mt-0.5">建议 5 分钟内联系</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <b class="text-red-600 text-lg">{{ data.pendingComplaints }}</b>
          <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </button>

      <!-- 快捷入口 -->
      <div class="grid grid-cols-4 gap-2 pt-1">
        <button
          @click="router.push('/complaints')"
          class="card py-3.5 flex flex-col items-center gap-1.5 hover:shadow-card-hover transition-all duration-200 active:scale-[0.97]"
        >
          <span class="text-lg">💬</span>
          <span class="text-xs text-slate-600 font-medium">差评</span>
        </button>
        <button
          @click="router.push('/photos')"
          class="card py-3.5 flex flex-col items-center gap-1.5 hover:shadow-card-hover transition-all duration-200 active:scale-[0.97]"
        >
          <span class="text-lg">📸</span>
          <span class="text-xs text-slate-600 font-medium">照片</span>
        </button>
        <button
          @click="router.push('/qrcode')"
          class="card py-3.5 flex flex-col items-center gap-1.5 hover:shadow-card-hover transition-all duration-200 active:scale-[0.97]"
        >
          <span class="text-lg">🔳</span>
          <span class="text-xs text-slate-600 font-medium">二维码</span>
        </button>
        <button
          @click="router.push('/settings')"
          class="card py-3.5 flex flex-col items-center gap-1.5 hover:shadow-card-hover transition-all duration-200 active:scale-[0.97]"
        >
          <span class="text-lg">⚙️</span>
          <span class="text-xs text-slate-600 font-medium">设置</span>
        </button>
      </div>
    </div>
  </div>
</template>
