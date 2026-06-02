<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { useAuthStore } from '../store/auth.js';

const router = useRouter();
const auth = useAuthStore();
const phone = ref('');
const code = ref('');
const cooldown = ref(0);
const loading = ref(false);
const error = ref('');

let timer: number | undefined;
async function getCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) { error.value = '请输入正确的手机号'; return; }
  error.value = '';
  try {
    await api.requestCode(phone.value);
    cooldown.value = 60;
    timer = window.setInterval(() => {
      cooldown.value -= 1;
      if (cooldown.value <= 0) clearInterval(timer);
    }, 1000);
  } catch (e: any) {
    error.value = e.message.includes('403') ? '该手机号无权限' : '获取验证码失败';
  }
}

async function login() {
  if (!code.value) { error.value = '请输入验证码'; return; }
  loading.value = true;
  error.value = '';
  try {
    const { token, operator } = await api.verifyCode(phone.value, code.value);
    auth.setSession(token, operator);
    router.push('/dashboard');
  } catch (e: any) {
    error.value = '验证码错误或已失效';
  } finally { loading.value = false; }
}
</script>

<template>
  <div class="max-w-sm mx-auto pt-20 px-6">
    <h1 class="text-2xl font-bold mb-8 text-center">店主后台</h1>

    <label class="block mb-4">
      <span class="text-sm text-gray-600">手机号</span>
      <input v-model="phone" type="tel" maxlength="11"
        class="mt-1 w-full border rounded p-3"/>
    </label>

    <label class="block mb-4">
      <span class="text-sm text-gray-600">验证码</span>
      <div class="flex gap-2 mt-1">
        <input v-model="code" maxlength="6"
          class="flex-1 border rounded p-3" placeholder="6 位数字"/>
        <button @click="getCode" :disabled="cooldown > 0"
          class="px-4 bg-blue-500 disabled:bg-gray-300 text-white rounded text-sm">
          {{ cooldown > 0 ? `${cooldown}s` : '获取验证码' }}
        </button>
      </div>
    </label>

    <button @click="login" :disabled="loading"
      class="w-full bg-blue-600 disabled:bg-gray-300 text-white py-3 rounded mt-4">
      {{ loading ? '登录中...' : '登录' }}
    </button>
    <p v-if="error" class="text-red-500 text-sm mt-3">{{ error }}</p>
  </div>
</template>
