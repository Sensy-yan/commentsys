<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
const isComplaint = route.query.type === 'complaint';
</script>

<template>
  <div class="flex flex-col items-center text-center px-6 pt-24">
    <div class="text-5xl mb-6">{{ isComplaint ? '🙏' : '✨' }}</div>
    <h2 class="text-xl font-bold mb-2">
      {{ isComplaint ? '店长已收到您的反馈' : '感谢您的支持!' }}
    </h2>
    <p class="text-gray-600">
      {{ isComplaint ? '稍后会主动联系您处理,请保持电话通畅' : '期待下次为您服务' }}
    </p>
  </div>
</template>
