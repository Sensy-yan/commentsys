<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api.js';
import { useSessionStore } from '../store/session.js';

const session = useSessionStore();
const platform = ref<'dianping' | 'meituan' | 'douyin' | 'xiaohongshu'>('dianping');
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
  dianping: '大众点评', meituan: '美团',
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
  try {
    await navigator.clipboard.writeText(text.value);
    alert(`已复制评价!请打开 ${PLATFORM_LABEL[platform.value]} App 长按粘贴`);
  } catch {
    alert('请手动复制评价内容');
  }
}

onMounted(async () => { await regenerate(); await loadPhotos(); });
</script>

<template>
  <div class="p-4 space-y-4">
    <h2 class="text-lg font-bold">写一条好评</h2>

    <div>
      <div class="text-sm text-gray-600 mb-2">发到哪个平台?</div>
      <div class="grid grid-cols-4 gap-2">
        <button v-for="(label, key) in PLATFORM_LABEL" :key="key"
          @click="platform = (key as any); regenerate(); loadPhotos();"
          class="py-2 rounded border text-sm"
          :class="platform === key ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300'">
          {{ label }}
        </button>
      </div>
    </div>

    <div>
      <div class="text-sm text-gray-600 mb-2">今天体验了什么?</div>
      <div class="flex flex-wrap gap-2">
        <button v-for="t in AVAILABLE_TAGS" :key="t" @click="toggleTag(t)"
          class="px-3 py-1 rounded-full border text-sm"
          :class="tags.includes(t) ? 'bg-green-100 border-green-500' : 'border-gray-300'">
          {{ t }}
        </button>
      </div>
    </div>

    <div>
      <div class="text-sm text-gray-600 mb-2">服务技师</div>
      <div class="flex gap-2">
        <button v-for="t in TECHNICIANS" :key="t" @click="technician = t"
          class="px-3 py-1 rounded-full border text-sm"
          :class="technician === t ? 'bg-green-100 border-green-500' : 'border-gray-300'">
          {{ t }}
        </button>
      </div>
    </div>

    <div class="bg-white border border-gray-200 rounded p-3">
      <div v-if="loading" class="text-gray-500 text-sm">AI 正在为您写评价...</div>
      <textarea v-else v-model="text" rows="6"
        class="w-full text-sm focus:outline-none resize-none"/>
      <div class="flex justify-end mt-2 gap-2">
        <button @click="regenerate" :disabled="loading"
          class="text-sm text-blue-500 disabled:text-gray-300">换一条</button>
      </div>
      <div class="text-xs text-gray-400 text-right mt-1">
        <span v-if="source === 'ai'">✨ AI 生成</span>
        <span v-else-if="source === 'template'">📝 模板生成</span>
      </div>
    </div>

    <div v-if="photos.length" class="space-y-2">
      <div class="text-sm text-gray-600">搭配照片(可选,最多 3 张)</div>
      <div class="grid grid-cols-5 gap-1">
        <div v-for="p in photos" :key="p.id"
          class="relative aspect-square cursor-pointer"
          @click="togglePhoto(p.id)">
          <img :src="p.url" class="w-full h-full object-cover rounded"/>
          <div v-if="selectedPhotos.includes(p.id)"
            class="absolute inset-0 bg-blue-500/30 border-2 border-blue-500 rounded flex items-center justify-center">
            <span class="bg-blue-500 text-white text-xs px-1 rounded">{{ selectedPhotos.indexOf(p.id) + 1 }}</span>
          </div>
        </div>
      </div>
      <p class="text-xs text-gray-500">提示:打开 App 后,文案会自动复制,图片请在 App 内长按下载或截图</p>
    </div>

    <button @click="copyAndJump" :disabled="!text"
      class="w-full bg-orange-500 disabled:bg-gray-300 text-white py-3 rounded">
      复制评价 + 打开 {{ PLATFORM_LABEL[platform] }}
    </button>
  </div>
</template>
