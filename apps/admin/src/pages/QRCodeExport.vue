<script setup lang="ts">
import { onMounted, ref } from 'vue';

const imgUrl = ref('');

onMounted(async () => {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/admin/qrcode/png', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  imgUrl.value = URL.createObjectURL(blob);
});

function downloadImg() {
  if (!imgUrl.value) return;
  const a = document.createElement('a');
  a.href = imgUrl.value;
  a.download = 'commentsys-qr.png';
  a.click();
}
</script>

<template>
  <div class="p-6 max-w-md mx-auto text-center">
    <h1 class="text-xl font-bold mb-4">桌贴二维码</h1>
    <div class="bg-white p-6 rounded mb-4 inline-block">
      <img v-if="imgUrl" :src="imgUrl" class="w-64 h-64"/>
      <div v-else class="w-64 h-64 flex items-center justify-center text-gray-400">生成中...</div>
    </div>
    <p class="text-sm text-gray-600 mb-4">
      下载后打印贴在桌面 / 收银台 / 镜前。建议尺寸不小于 5×5 cm。
    </p>
    <button @click="downloadImg" :disabled="!imgUrl"
      class="bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded">
      下载 PNG
    </button>
  </div>
</template>
