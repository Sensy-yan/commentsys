<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useSessionStore } from '../store/session.js';

const router = useRouter();
const session = useSessionStore();
const message = ref('');
const contact = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  if (!message.value.trim()) { error.value = '请填写问题描述'; return; }
  if (!session.sessionId) { error.value = '会话失效,请重新扫码'; return; }
  loading.value = true;
  try {
    await api.submitComplaint(session.sessionId, message.value.trim(), contact.value || undefined);
    router.push('/thanks?type=complaint');
  } catch (e: any) {
    error.value = '提交失败,请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-2">非常抱歉今天没让您满意</h2>
    <p class="text-gray-600 mb-6 text-sm">请告诉我们哪里出了问题,店长 5 分钟内联系您处理。</p>

    <label class="block mb-3">
      <span class="text-sm text-gray-700">问题描述</span>
      <textarea v-model="message" rows="5"
        class="mt-1 w-full border border-gray-300 rounded p-2"
        placeholder="例如:技师按摩力度太轻..."/>
    </label>

    <label class="block mb-6">
      <span class="text-sm text-gray-700">联系方式(可选)</span>
      <input v-model="contact" type="tel" maxlength="11"
        class="mt-1 w-full border border-gray-300 rounded p-2"
        placeholder="手机号"/>
    </label>

    <button @click="submit" :disabled="loading"
      class="w-full bg-blue-500 disabled:bg-gray-300 text-white py-3 rounded">
      {{ loading ? '提交中...' : '提交反馈' }}
    </button>
    <p v-if="error" class="text-red-500 mt-3">{{ error }}</p>
  </div>
</template>
