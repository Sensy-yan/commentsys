<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api.js';
import { useSessionStore } from '../store/session.js';
import { copyText } from '../utils/clipboard.js';
import { jumpToApp } from '../utils/appJump.js';

const session = useSessionStore();
const platform = ref<'dianping' | 'meituan' | 'douyin' | 'xiaohongshu'>('meituan');
const tags = ref<string[]>([]);
const technician = ref('');
const text = ref('');
const source = ref<'ai' | 'template' | 'stub' | ''>('');
const loading = ref(false);
const photos = ref<Array<{ id: string; url: string }>>([]);
const selectedPhotos = ref<string[]>([]);

async function loadPhotos() {
  if (!session.sessionId) return;
  try {
    const { items } = await api.recommendPhotos(session.sessionId, platform.value);
    photos.value = items;
  } catch { /* 静默失败:照片是可选项 */ }
}

function togglePhoto(id: string) {
  const i = selectedPhotos.value.indexOf(id);
  if (i >= 0) selectedPhotos.value.splice(i, 1);
  else if (selectedPhotos.value.length < 3) selectedPhotos.value.push(id);
}

const PLATFORM_LABEL: Record<string, string> = {
  dianping: '点评', meituan: '美团',
  douyin: '抖音', xiaohongshu: '小红书',
};
const AVAILABLE_TAGS = ['头皮检测', '头皮排毒', '防脱护理', '中药养发', '头皮 SPA', '育发疗程'];
const TECHNICIANS = ['小王', '小李', '小张'];

async function regenerate() {
  if (!session.sessionId) return;
  loading.value = true;
  try {
    const out = await api.generateReview(
      session.sessionId, platform.value, tags.value, technician.value,
    );
    text.value = out.text;
    source.value = out.source;
  } finally { loading.value = false; }
}

function toggleTag(tag: string) {
  const i = tags.value.indexOf(tag);
  if (i >= 0) tags.value.splice(i, 1); else tags.value.push(tag);
}

async function copyAndJump() {
  const ok = await copyText(text.value);
  if (!ok) {
    alert('请手动长按选中文案复制');
    return;
  }
  fetch('/api/customer/reviews/log-jump', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.sessionId,
      platform: platform.value,
      tags: tags.value,
      technician: technician.value,
      photoIds: selectedPhotos.value,
      text: text.value,
    }),
  }).catch(() => {});

  jumpToApp(platform.value, session.platformUrls[platform.value]);
}

onMounted(async () => { await regenerate(); await loadPhotos(); });
</script>

<template>
  <div class="h-[100dvh] flex flex-col px-3 pt-3 pb-3 max-w-md mx-auto overflow-hidden">
    <!-- 顶部品牌 + 感谢话术 -->
    <header class="px-1 pb-2 shrink-0">
      <div class="flex items-end justify-between">
        <div>
          <div class="label">青丝瑶 · 头皮养发</div>
          <h2 class="heading-1 mt-1 text-xl leading-tight">谢谢您的光临</h2>
        </div>
        <span class="text-xs text-slate-400 tracking-wide pb-1">分享您的体验</span>
      </div>
    </header>

    <!-- 平台 -->
    <section class="card px-3 py-2.5 mb-2 shrink-0">
      <div class="grid grid-cols-4 gap-1.5">
        <button
          v-for="(label, key) in PLATFORM_LABEL"
          :key="key"
          @click="platform = (key as any); regenerate(); loadPhotos();"
          class="py-2 rounded-lg border text-sm font-medium transition-all duration-200 active:scale-[0.97]"
          :class="platform === key
            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-transparent shadow-brand'
            : 'border-slate-200 text-slate-600'"
        >
          {{ label }}
        </button>
      </div>
    </section>

    <!-- 项目 + 技师 合并卡 -->
    <section class="card px-3 py-2.5 mb-2 shrink-0 space-y-2">
      <div>
        <div class="label mb-1.5">体验项目</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="t in AVAILABLE_TAGS"
            :key="t"
            @click="toggleTag(t)"
            class="px-2.5 py-1 rounded-full border text-xs transition-all duration-200 active:scale-[0.97]"
            :class="tags.includes(t)
              ? 'bg-brand-50 border-brand-500 text-brand-700 font-medium'
              : 'border-slate-200 text-slate-600'"
          >
            {{ t }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="label shrink-0">技师</div>
        <div class="flex gap-1.5 flex-1">
          <button
            v-for="t in TECHNICIANS"
            :key="t"
            @click="technician = t"
            class="px-3 py-1 rounded-full border text-xs transition-all duration-200 active:scale-[0.97]"
            :class="technician === t
              ? 'bg-brand-50 border-brand-500 text-brand-700 font-medium'
              : 'border-slate-200 text-slate-600'"
          >
            {{ t }}
          </button>
        </div>
      </div>
    </section>

    <!-- AI 文案 (flex-grow 占据剩余空间) -->
    <section class="card px-3 py-2.5 mb-2 flex-1 min-h-0 flex flex-col">
      <div class="flex items-center justify-between mb-2 shrink-0">
        <div class="flex items-center gap-1.5">
          <svg
            class="w-3.5 h-3.5 text-brand-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" />
          </svg>
          <span class="label">AI 智能文案</span>
          <span v-if="!loading && source === 'ai'" class="text-[10px] text-slate-400 tracking-wide">AI</span>
          <span v-else-if="!loading && source === 'template'" class="text-[10px] text-slate-400 tracking-wide">模板</span>
        </div>
        <button
          @click="regenerate"
          :disabled="loading"
          class="text-xs text-brand-600 font-medium disabled:text-slate-300 hover:text-brand-700 transition-colors"
        >
          换一条 ↻
        </button>
      </div>
      <div
        v-if="loading"
        class="flex-1 flex items-center justify-center gap-2 text-slate-500 text-sm"
      >
        <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
        <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse [animation-delay:200ms]" />
        <span class="w-2 h-2 rounded-full bg-teal-400 animate-pulse [animation-delay:400ms]" />
        <span class="ml-2 tracking-wide">AI 正在为您撰写</span>
      </div>
      <textarea
        v-else
        v-model="text"
        class="flex-1 min-h-0 w-full text-sm text-slate-700 leading-relaxed focus:outline-none resize-none bg-slate-50/60 rounded-lg p-2.5 placeholder:text-slate-400"
        placeholder="文案生成中..."
      />
    </section>

    <!-- 照片 - 紧凑单行 -->
    <section v-if="photos.length" class="shrink-0 mb-2 px-1">
      <div class="flex items-center justify-between mb-1.5">
        <span class="label">搭配照片</span>
        <span class="text-[10px] text-slate-400">{{ selectedPhotos.length }}/3</span>
      </div>
      <div class="flex gap-1.5 overflow-x-auto">
        <div
          v-for="p in photos"
          :key="p.id"
          class="relative w-14 h-14 shrink-0 cursor-pointer transition-transform active:scale-95"
          @click="togglePhoto(p.id)"
        >
          <img :src="p.url" class="w-full h-full object-cover rounded-md" />
          <div
            v-if="selectedPhotos.includes(p.id)"
            class="absolute inset-0 bg-brand-500/30 border-2 border-brand-500 rounded-md flex items-start justify-end p-0.5"
          >
            <span class="bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
              {{ selectedPhotos.indexOf(p.id) + 1 }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 底部 CTA -->
    <button
      @click="copyAndJump"
      :disabled="!text"
      class="btn-primary w-full shrink-0"
    >
      复制评价 · 打开 {{ PLATFORM_LABEL[platform] }}
    </button>
  </div>
</template>
