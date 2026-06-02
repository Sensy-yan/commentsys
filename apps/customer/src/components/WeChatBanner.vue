<script setup lang="ts">
import { ref } from 'vue';
import { isInAppBrowser } from '../utils/wechatGuard.js';

const show = ref(isInAppBrowser());
</script>

<template>
  <div
    v-if="show"
    class="bg-brand-50 border-b border-brand-100 px-4 py-2.5 text-sm text-brand-700"
  >
    <div class="flex items-center gap-3">
      <svg
        class="w-4 h-4 flex-shrink-0 text-brand-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <span class="flex-1 leading-snug">
        为顺利发布评价,请点右上角 <b>···</b> →
        <b>在浏览器中打开</b>
      </span>
      <button
        @click="show = false"
        class="text-brand-600 text-xs px-2 py-1 rounded-md hover:bg-brand-100 transition-colors"
      >
        知道了
      </button>
    </div>
  </div>
</template>
