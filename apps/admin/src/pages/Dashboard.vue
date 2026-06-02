<script setup lang="ts">
import { useAuthStore } from '../store/auth.js';
const auth = useAuthStore();
</script>

<template>
  <div class="p-6">
    <h1 class="text-xl font-bold mb-2">数据看板</h1>
    <p class="text-gray-600">欢迎,{{ auth.operator?.name }}</p>
    <p class="text-gray-400 text-sm mt-4">(下个任务填充数据)</p>
  </div>
</template>
