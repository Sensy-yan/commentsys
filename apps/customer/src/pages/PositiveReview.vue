<script setup lang="ts">
import { useSessionStore } from '../store/session.js';

const session = useSessionStore();

const stubText = '今天来这家店做了头皮检测,小王手法专业,头皮感觉舒服多了。环境也不错,推荐脱发困扰的朋友试试。';

async function copyAndJump(platform: string) {
  try {
    await navigator.clipboard.writeText(stubText);
    alert(`已复制评价!请打开${platform} App 长按粘贴`);
  } catch {
    alert('请手动复制评价内容');
  }
}
</script>

<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">公域评价页(占位)</h2>
    <p class="text-sm text-gray-600 mb-4">星级:{{ session.rating }}</p>
    <div class="bg-white rounded p-4 mb-4 border border-gray-200">{{ stubText }}</div>
    <div class="grid grid-cols-2 gap-3">
      <button @click="copyAndJump('点评')" class="bg-orange-500 text-white py-3 rounded">复制并打开点评</button>
      <button @click="copyAndJump('美团')" class="bg-yellow-500 text-white py-3 rounded">复制并打开美团</button>
      <button @click="copyAndJump('抖音')" class="bg-black text-white py-3 rounded">复制并打开抖音</button>
      <button @click="copyAndJump('小红书')" class="bg-red-500 text-white py-3 rounded">复制并打开小红书</button>
    </div>
  </div>
</template>
