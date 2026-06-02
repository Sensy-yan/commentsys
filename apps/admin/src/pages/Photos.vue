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

onMounted(load);
</script>

<template>
  <div class="p-4 max-w-md mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold">照片库 ({{ items.length }})</h1>
      <button @click="showUpload = !showUpload"
        class="px-3 py-1 bg-blue-500 text-white rounded text-sm">
        {{ showUpload ? '取消' : '+ 上传' }}
      </button>
    </div>

    <div v-if="showUpload" class="bg-white border rounded p-3 mb-4 space-y-3">
      <div>
        <div class="text-sm mb-1">类型</div>
        <select v-model="meta.type" class="w-full border rounded p-2 text-sm">
          <option value="环境">环境</option>
          <option value="过程">过程</option>
          <option value="效果">效果</option>
        </select>
      </div>
      <div>
        <div class="text-sm mb-1">适用平台</div>
        <div class="flex flex-wrap gap-1">
          <button v-for="p in ['dianping','meituan','douyin','xiaohongshu']" :key="p"
            @click="togglePlatform(p)"
            class="px-2 py-1 rounded text-xs border"
            :class="meta.platforms.includes(p) ? 'bg-blue-100 border-blue-500' : 'border-gray-300'">
            {{ ({dianping:'点评',meituan:'美团',douyin:'抖音',xiaohongshu:'小红书'} as Record<string,string>)[p] }}
          </button>
        </div>
      </div>
      <div>
        <div class="text-sm mb-1">适合星级</div>
        <div class="flex gap-1">
          <button v-for="n in [3,4,5]" :key="n" @click="toggleRating(n)"
            class="px-3 py-1 rounded text-xs border"
            :class="meta.rating_match.includes(n) ? 'bg-yellow-100 border-yellow-500' : 'border-gray-300'">
            {{ n }}★
          </button>
        </div>
      </div>
      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp"
        @change="onPick" class="w-full text-sm"/>
      <p v-if="uploading" class="text-sm text-gray-500">上传中...</p>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div v-for="p in items" :key="p.id" class="relative aspect-square">
        <img :src="p.url" class="w-full h-full object-cover rounded"/>
        <button @click="del(p.id)"
          class="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 rounded">×</button>
        <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 truncate">
          {{ p.type }}
        </div>
      </div>
    </div>
  </div>
</template>
