<script setup lang="ts">
import { onMounted, ref } from 'vue';

const imgUrl = ref('');

onMounted(async () => {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/admin/qrcode/svg', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const blob = await res.blob();
  imgUrl.value = URL.createObjectURL(blob);
});

function downloadImg() {
  if (!imgUrl.value) return;
  const a = document.createElement('a');
  a.href = imgUrl.value;
  a.download = 'qsy-qrcode.svg';
  a.click();
}
</script>

<template>
  <div class="relative px-6 pt-5 pb-12 max-w-md mx-auto overflow-hidden">
    <!-- 渐变光晕 -->
    <div
      aria-hidden="true"
      class="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-gradient-to-br from-teal-400/15 to-cyan-400/10 blur-3xl pointer-events-none"
    />

    <header class="relative mb-6">
      <div class="label mb-1.5">QR CODE</div>
      <h1 class="heading-1">桌贴二维码</h1>
      <p class="text-xs text-slate-500 mt-1.5 tracking-wide">
        扫码后顾客即可进入打分流程
      </p>
    </header>

    <!-- 二维码卡片 -->
    <div class="relative card p-6 mb-5 flex flex-col items-center">
      <div class="absolute inset-x-6 top-6 h-1 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-transparent rounded-full" />

      <div
        class="relative w-64 h-64 bg-white rounded-2xl p-3 flex items-center justify-center"
      >
        <img v-if="imgUrl" :src="imgUrl" class="w-full h-full" />
        <div
          v-else
          class="flex flex-col items-center gap-2 text-slate-400"
        >
          <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span class="text-xs tracking-wide">生成中</span>
        </div>
      </div>

      <!-- 装饰品牌色脚标 -->
      <div class="mt-4 flex items-center gap-2 text-xs text-slate-400 tracking-wider">
        <span class="w-1.5 h-1.5 rounded-full bg-brand-500" />
        SCALP CARE · 扫码评价
      </div>
    </div>

    <!-- 印刷提示 -->
    <div class="card p-4 mb-5 bg-gradient-to-br from-brand-50/40 to-white border-brand-100">
      <div class="flex gap-3">
        <svg class="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        <div class="text-xs text-slate-600 leading-relaxed">
          下载后打印贴在<b class="text-slate-900">桌面 / 收银台 / 镜前</b>。
          建议印刷尺寸不小于 <b class="text-brand-700">5×5 cm</b>,保持四周留白。
        </div>
      </div>
    </div>

    <button
      @click="downloadImg"
      :disabled="!imgUrl"
      class="btn-primary w-full"
    >
      下载 SVG
    </button>
    <p class="text-[10px] text-slate-400 text-center mt-2 tracking-wide">
      SVG 矢量图,放多大都不糊
    </p>
  </div>
</template>
