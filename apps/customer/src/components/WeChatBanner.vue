<script setup lang="ts">
import { ref } from 'vue';
import { isInAppBrowser } from '../utils/wechatGuard.js';

const show = ref(isInAppBrowser());
</script>

<template>
  <div v-if="show" class="bg-yellow-100 border-b border-yellow-300 p-3 text-sm">
    <div class="flex items-center justify-between">
      <span>📱 为顺利发布评价,请点右上角 <b>···</b> → <b>在浏览器中打开</b></span>
      <button @click="show = false" class="text-yellow-600 ml-2">知道了</button>
    </div>
  </div>
</template>
