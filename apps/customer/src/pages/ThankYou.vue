<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
const isComplaint = route.query.type === 'complaint';
</script>

<template>
  <div class="relative flex flex-col items-center text-center px-6 pt-24 pb-20 overflow-hidden">
    <!-- 渐变光晕装饰 -->
    <div
      aria-hidden="true"
      class="absolute top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-400/20 blur-3xl pointer-events-none"
    />

    <!-- 大图标圆形容器 -->
    <div class="relative mb-8">
      <div
        class="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-5xl shadow-brand"
      >
        {{ isComplaint ? '🙏' : '✨' }}
      </div>
      <div
        v-if="!isComplaint"
        aria-hidden="true"
        class="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/30 to-cyan-400/30 blur-xl -z-10 animate-pulse"
      />
    </div>

    <h2 class="relative heading-1 mb-4">
      {{ isComplaint ? '店长已收到反馈' : '感谢您的支持' }}
    </h2>
    <p class="relative text-slate-600 text-sm leading-relaxed max-w-xs">
      {{ isComplaint
        ? '稍后会主动联系您处理,请保持电话畅通'
        : '期待下次为您带来更专业的头皮养护体验' }}
    </p>

    <div class="relative mt-12 label">SCALP CARE</div>
  </div>
</template>
