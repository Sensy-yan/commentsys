<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useAuthStore } from '../store/auth.js';

const router = useRouter();
const auth = useAuthStore();
const phone = ref('');
const loading = ref(false);
const error = ref('');

async function login() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) { error.value = '请输入正确的手机号'; return; }
  loading.value = true;
  error.value = '';
  try {
    const { token, operator } = await api.devLogin(phone.value);
    auth.setSession(token, operator);
    router.push('/dashboard');
  } catch (e: any) {
    error.value = e.message.includes('403') ? '该手机号无权限'
      : e.message.includes('404') ? '生产环境已禁用此入口'
      : '登录失败';
  } finally { loading.value = false; }
}
</script>

<template>
  <div class="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
    <!-- 渐变装饰 -->
    <div
      aria-hidden="true"
      class="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-teal-400/15 to-cyan-400/10 blur-3xl pointer-events-none"
    />
    <div
      aria-hidden="true"
      class="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-cyan-400/15 to-teal-400/10 blur-3xl pointer-events-none"
    />

    <div class="relative w-full max-w-sm">
      <!-- Logo -->
      <div class="flex justify-center mb-6">
        <div class="relative">
          <div
            class="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-3xl shadow-brand"
          >
            🌿
          </div>
          <div
            aria-hidden="true"
            class="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/40 to-cyan-400/40 blur-xl -z-10"
          />
        </div>
      </div>

      <h1 class="heading-1 text-center mb-1">头皮养发 · 管理后台</h1>
      <p class="text-sm text-slate-500 text-center mb-8 tracking-wide">
        SCALP CARE · ADMIN
      </p>

      <!-- 登录卡片 -->
      <div class="card p-6 space-y-5">
        <label class="block">
          <span class="label">手机号</span>
          <input
            v-model="phone"
            type="tel"
            maxlength="11"
            class="input mt-2 w-full text-base tracking-wider"
            placeholder="请输入手机号"
            @keyup.enter="login"
          />
        </label>

        <button
          @click="login"
          :disabled="loading"
          class="btn-primary w-full"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <span class="w-2 h-2 rounded-full bg-white animate-pulse" />
            登录中
          </span>
          <span v-else>登 录</span>
        </button>

        <p v-if="error" class="text-red-500 text-sm text-center -mt-1">{{ error }}</p>
      </div>

      <p class="text-xs text-slate-400 text-center mt-6 tracking-wide">
        仅授权门店运营人员可登录
      </p>
    </div>
  </div>
</template>
