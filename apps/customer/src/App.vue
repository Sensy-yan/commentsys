<script setup lang="ts">
import WeChatBanner from './components/WeChatBanner.vue';
</script>

<template>
  <main class="min-h-full bg-gray-50">
    <WeChatBanner />
    <RouterView />
  </main>
</template>
