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
  } catch {
    error.value = '提交失败,请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="px-6 pt-10 pb-16 max-w-md mx-auto">
    <!-- Header -->
    <header class="mb-8">
      <div class="label mb-2">PRIVATE FEEDBACK</div>
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900 mb-2">
        非常抱歉今天没让您满意
      </h2>
      <p class="text-slate-600 text-sm leading-relaxed">
        请告诉我们哪里出了问题,店长会在 <b class="text-brand-700">5 分钟</b>
        内主动联系您处理。
      </p>
    </header>

    <div class="card p-5 space-y-5">
      <label class="block">
        <span class="label">问题描述</span>
        <textarea
          v-model="message"
          rows="5"
          class="input mt-2 w-full resize-none leading-relaxed"
          placeholder="例如:技师按摩力度太轻、环境嘈杂、等待时间过长..."
        />
      </label>

      <label class="block">
        <span class="label">联系方式 <span class="text-slate-400 normal-case tracking-normal">(可选)</span></span>
        <input
          v-model="contact"
          type="tel"
          maxlength="11"
          class="input mt-2 w-full"
          placeholder="手机号,留下我们会尽快回拨"
        />
      </label>
    </div>

    <div class="pt-6">
      <button
        @click="submit"
        :disabled="loading"
        class="btn-primary w-full"
      >
        <span v-if="loading" class="flex items-center justify-center gap-2">
          <span class="w-2 h-2 rounded-full bg-white animate-pulse" />
          提交中
        </span>
        <span v-else>提交反馈</span>
      </button>
      <p v-if="error" class="text-red-500 text-sm mt-3 text-center">{{ error }}</p>
      <p class="text-xs text-slate-400 text-center mt-4 tracking-wide">
        您的反馈仅店长可见,不会公开
      </p>
    </div>
  </div>
</template>
