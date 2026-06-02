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
  } catch (e: any) {
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
  } catch (e: any) {
    error.value = '提交失败,请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center px-6 pt-16">
    <h1 class="text-2xl font-bold mb-2">感谢您今天的光临</h1>
    <p class="text-gray-600 mb-12">请为本次服务打个分</p>
    <StarRating @change="onRate" />
    <p v-if="error" class="text-red-500 mt-6">{{ error }}</p>
    <p v-if="loading" class="text-gray-500 mt-6">提交中...</p>
  </div>
</template>
