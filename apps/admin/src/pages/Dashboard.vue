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

onMounted(load);
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">数据看板</h1>
      <div class="flex gap-2 text-sm">
        <button @click="router.push('/photos')" class="text-blue-500">照片库</button>
        <button @click="router.push('/complaints')" class="text-blue-500">差评</button>
        <button @click="router.push('/qrcode')" class="text-blue-500">二维码</button>
        <button @click="router.push('/settings')" class="text-blue-500">设置</button>
      </div>
    </div>

    <div class="flex gap-2 mb-4">
      <button v-for="r in ['today','week','month'] as const" :key="r"
        @click="range = r; load()"
        class="px-3 py-1 rounded text-sm"
        :class="range === r ? 'bg-blue-500 text-white' : 'bg-gray-200'">
        {{ ({today:'今日',week:'本周',month:'本月'})[r] }}
      </button>
    </div>

    <div v-if="loading" class="text-gray-400">加载中...</div>
    <div v-else-if="data" class="space-y-3">

      <div class="bg-white rounded p-4 shadow-sm">
        <div class="text-sm text-gray-500 mb-1">扫码次数</div>
        <div class="text-3xl font-bold">{{ data.totalSessions }}</div>
      </div>

      <div class="bg-white rounded p-4 shadow-sm">
        <div class="text-sm text-gray-500 mb-2">评分分布</div>
        <div v-for="n in [5,4,3,2,1]" :key="n" class="flex items-center gap-2 mb-1">
          <span class="text-yellow-400 w-12">{{ '★'.repeat(n) }}</span>
          <div class="flex-1 bg-gray-100 rounded h-2 overflow-hidden">
            <div class="bg-yellow-400 h-full"
              :style="{ width: data.totalSessions ? `${data.ratingBreakdown[n]/data.totalSessions*100}%` : '0%' }"/>
          </div>
          <span class="w-8 text-right text-sm">{{ data.ratingBreakdown[n] }}</span>
        </div>
      </div>

      <div class="bg-white rounded p-4 shadow-sm">
        <div class="text-sm text-gray-500 mb-2">公域跳转 {{ data.totalJumps }}</div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>点评 <b>{{ data.platformJumps.dianping }}</b></div>
          <div>美团 <b>{{ data.platformJumps.meituan }}</b></div>
          <div>抖音 <b>{{ data.platformJumps.douyin }}</b></div>
          <div>小红书 <b>{{ data.platformJumps.xiaohongshu }}</b></div>
        </div>
      </div>

      <div v-if="data.pendingComplaints > 0"
        class="bg-red-50 border border-red-200 rounded p-4 flex items-center justify-between"
        @click="router.push('/complaints')">
        <span class="text-red-700">🔴 差评待处理 {{ data.pendingComplaints }} 条</span>
        <span class="text-red-500">→</span>
      </div>
    </div>
  </div>
</template>
