<script setup lang="ts">
import WeChatBanner from './components/WeChatBanner.vue';
</script>

<template>
  <main class="scan-line min-h-full bg-gradient-to-b from-slate-50 to-white">
    <WeChatBanner />
    <RouterView />
  </main>
</template>
