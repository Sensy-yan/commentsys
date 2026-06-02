<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import StarRating from '../components/StarRating.vue';
import { api } from '../api.js';
import { useSessionStore } from '../store/session.js';

const router = useRouter();
const route = useRoute();
const session = useSessionStore();
const loading = ref(false);
const error = ref('');

onMounted(async () => {
  const storeId = (route.query.s as string) || 'default-store';
  session.storeId = storeId;
  try {
    const cfg = await api.getStoreConfig(storeId);
    session.storeName = cfg.name;
    session.platformUrls = cfg.platformUrls;
  } catch { /* ignore */ }
  try {
    const { sessionId } = await api.startSession(storeId);
    session.sessionId = sessionId;
  } catch {
    error.value = '网络异常,请刷新重试';
  }
});

async function onRate(rating: number) {
  if (!session.sessionId || loading.value) return;
  loading.value = true;
  try {
    session.rating = rating;
    const { route: next } = await api.submitRating(session.sessionId, rating);
    router.push(next === 'positive' ? '/positive' : '/complaint');
  } catch {
    error.value = '提交失败,请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="relative flex flex-col items-center px-6 pt-20 pb-16 overflow-hidden">
    <!-- 渐变圆形装饰锚点 -->
    <div
      aria-hidden="true"
      class="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-400/20 blur-2xl pointer-events-none"
    />
    <div
      aria-hidden="true"
      class="absolute top-10 right-6 w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/15 to-teal-400/10 blur-2xl pointer-events-none"
    />

    <!-- 小标签 -->
    <div class="relative label mb-3">SCALP CARE · 头皮养发</div>

    <h1 class="relative heading-1 text-center mb-3">
      感谢您今天的光临
    </h1>
    <p class="relative text-slate-500 text-sm mb-12 tracking-wide">
      扫码体验 · 头皮焕新管理
    </p>

    <!-- 星级打分卡 -->
    <div class="relative card w-full max-w-sm px-6 py-8 flex flex-col items-center">
      <div class="label mb-5">为本次服务打分</div>
      <StarRating @change="onRate" />
      <div class="flex items-center gap-2 mt-6 h-5 text-sm">
        <template v-if="loading">
          <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span class="text-slate-500">正在记录评分...</span>
        </template>
        <span v-else-if="error" class="text-red-500">{{ error }}</span>
        <span v-else class="text-slate-400 text-xs tracking-wide">轻触星星即可提交</span>
      </div>
    </div>

    <!-- 底部品牌信息 -->
    <p
      v-if="session.storeName"
      class="relative mt-10 text-xs text-slate-400 tracking-wider"
    >
      {{ session.storeName }}
    </p>
  </div>
</template>
