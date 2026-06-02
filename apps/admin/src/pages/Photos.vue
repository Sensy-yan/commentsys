<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api.js';

const items = ref<any[]>([]);
const uploading = ref(false);
const showUpload = ref(false);
const fileInput = ref<HTMLInputElement>();

const meta = ref({
  type: '环境' as '环境' | '过程' | '效果',
  platforms: ['dianping', 'meituan'] as string[],
  rating_match: [4, 5] as number[],
  tags: [] as string[],
});

async function load() {
  const { items: list } = await api.listPhotos();
  items.value = list;
}

async function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  try {
    await api.uploadPhoto(file, meta.value);
    showUpload.value = false;
    load();
  } catch (e: any) {
    alert('上传失败:' + e.message);
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

async function del(id: string) {
  if (!confirm('删除这张图?')) return;
  await api.deletePhoto(id);
  load();
}

function togglePlatform(p: string) {
  const i = meta.value.platforms.indexOf(p);
  if (i >= 0) meta.value.platforms.splice(i, 1); else meta.value.platforms.push(p);
}

function toggleRating(n: number) {
  const i = meta.value.rating_match.indexOf(n);
  if (i >= 0) meta.value.rating_match.splice(i, 1); else meta.value.rating_match.push(n);
}

const PLATFORM_LABEL: Record<string, string> = {
  dianping: '点评', meituan: '美团', douyin: '抖音', xiaohongshu: '小红书',
};

onMounted(load);
</script>

<template>
  <div class="px-4 pt-5 pb-12 max-w-md mx-auto">
    <!-- Header -->
    <header class="flex items-end justify-between mb-5">
      <div>
        <div class="label mb-1.5">PHOTO LIBRARY</div>
        <h1 class="heading-1">照片库</h1>
        <p class="text-xs text-slate-500 mt-1.5 tracking-wide">共 {{ items.length }} 张</p>
      </div>
      <button
        @click="showUpload = !showUpload"
        class="btn-primary py-2.5 px-4 text-sm"
      >
        {{ showUpload ? '取消' : '+ 上传' }}
      </button>
    </header>

    <!-- 上传表单 -->
    <div v-if="showUpload" class="card p-4 mb-4 space-y-4">
      <div>
        <div class="label mb-2">类型</div>
        <select v-model="meta.type" class="input w-full text-sm">
          <option value="环境">环境</option>
          <option value="过程">过程</option>
          <option value="效果">效果</option>
        </select>
      </div>

      <div>
        <div class="label mb-2">适用平台</div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="p in ['dianping','meituan','douyin','xiaohongshu']"
            :key="p"
            @click="togglePlatform(p)"
            class="px-3 py-1.5 rounded-full text-xs border transition-all duration-200 active:scale-95"
            :class="meta.platforms.includes(p)
              ? 'bg-brand-50 border-brand-500 text-brand-700 font-medium'
              : 'border-slate-200 text-slate-600'"
          >
            {{ PLATFORM_LABEL[p] }}
          </button>
        </div>
      </div>

      <div>
        <div class="label mb-2">适合星级</div>
        <div class="flex gap-2">
          <button
            v-for="n in [3,4,5]"
            :key="n"
            @click="toggleRating(n)"
            class="px-3.5 py-1.5 rounded-full text-xs border transition-all duration-200 active:scale-95"
            :class="meta.rating_match.includes(n)
              ? 'bg-amber-50 border-amber-400 text-amber-700 font-medium'
              : 'border-slate-200 text-slate-600'"
          >
            {{ n }}★
          </button>
        </div>
      </div>

      <div>
        <div class="label mb-2">选择文件</div>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="onPick"
          class="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 file:transition-colors file:cursor-pointer"
        />
      </div>

      <div
        v-if="uploading"
        class="flex items-center gap-2 text-sm text-slate-500"
      >
        <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
        上传中...
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="items.length === 0 && !showUpload" class="card py-16 flex flex-col items-center text-center">
      <div class="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <p class="text-slate-400 text-sm">还没有上传照片</p>
    </div>

    <!-- 网格 -->
    <div v-else class="grid grid-cols-3 gap-2">
      <div
        v-for="p in items"
        :key="p.id"
        class="relative aspect-square group overflow-hidden rounded-xl bg-slate-100"
      >
        <img
          :src="p.url"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <button
          @click="del(p.id)"
          class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center backdrop-blur-sm hover:bg-red-500/80 transition-colors"
          aria-label="删除"
        >
          ×
        </button>
        <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5">
          <span class="text-white text-xs tracking-wide">{{ p.type }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
