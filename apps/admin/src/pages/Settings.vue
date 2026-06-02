<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api.js';

const cfg = ref<any>(null);
const saving = ref(false);
const techInput = ref('');
const projInput = ref('');

async function load() { cfg.value = await api.getConfig(); }

async function save() {
  saving.value = true;
  try {
    await api.saveConfig(cfg.value);
    alert('已保存');
  } finally { saving.value = false; }
}

function addTech() {
  if (techInput.value.trim()) {
    cfg.value.technicians.push(techInput.value.trim());
    techInput.value = '';
  }
}

function addProj() {
  if (projInput.value.trim()) {
    cfg.value.projects.push(projInput.value.trim());
    projInput.value = '';
  }
}

onMounted(load);
</script>

<template>
  <div v-if="cfg" class="p-4 max-w-md mx-auto space-y-4">
    <h1 class="text-xl font-bold">设置</h1>

    <section class="bg-white rounded p-3 space-y-2">
      <h2 class="font-semibold text-sm">门店信息</h2>
      <input v-model="cfg.name" placeholder="门店名称" class="w-full border rounded p-2 text-sm"/>
      <input v-model="cfg.phone" placeholder="电话" class="w-full border rounded p-2 text-sm"/>
      <input v-model="cfg.address" placeholder="地址" class="w-full border rounded p-2 text-sm"/>
    </section>

    <section class="bg-white rounded p-3">
      <h2 class="font-semibold text-sm mb-2">技师列表</h2>
      <div class="flex flex-wrap gap-1 mb-2">
        <span v-for="(t, i) in cfg.technicians" :key="i"
          class="px-2 py-1 bg-blue-50 rounded text-sm">
          {{ t }} <button @click="cfg.technicians.splice(i, 1)" class="text-red-500">×</button>
        </span>
      </div>
      <div class="flex gap-2">
        <input v-model="techInput" placeholder="新技师" class="flex-1 border rounded p-2 text-sm"/>
        <button @click="addTech" class="px-3 bg-blue-500 text-white rounded text-sm">+</button>
      </div>
    </section>

    <section class="bg-white rounded p-3">
      <h2 class="font-semibold text-sm mb-2">项目列表</h2>
      <div class="flex flex-wrap gap-1 mb-2">
        <span v-for="(p, i) in cfg.projects" :key="i"
          class="px-2 py-1 bg-green-50 rounded text-sm">
          {{ p }} <button @click="cfg.projects.splice(i, 1)" class="text-red-500">×</button>
        </span>
      </div>
      <div class="flex gap-2">
        <input v-model="projInput" placeholder="新项目" class="flex-1 border rounded p-2 text-sm"/>
        <button @click="addProj" class="px-3 bg-green-500 text-white rounded text-sm">+</button>
      </div>
    </section>

    <section class="bg-white rounded p-3 space-y-2">
      <h2 class="font-semibold text-sm">平台店铺链接(用于跳转)</h2>
      <input v-model="cfg.platform_urls.dianping" placeholder="大众点评店铺 URL"
        class="w-full border rounded p-2 text-sm"/>
      <input v-model="cfg.platform_urls.meituan" placeholder="美团店铺 URL"
        class="w-full border rounded p-2 text-sm"/>
      <input v-model="cfg.platform_urls.douyin" placeholder="抖音店铺 URL"
        class="w-full border rounded p-2 text-sm"/>
      <input v-model="cfg.platform_urls.xiaohongshu" placeholder="小红书店铺 URL"
        class="w-full border rounded p-2 text-sm"/>
    </section>

    <section class="bg-white rounded p-3">
      <h2 class="font-semibold text-sm mb-2">企业微信群机器人 Webhook</h2>
      <input v-model="cfg.wecom_webhook" placeholder="https://qyapi.weixin.qq.com/..."
        class="w-full border rounded p-2 text-sm"/>
      <p class="text-xs text-gray-500 mt-1">差评提交时自动推送到该群。从企业微信群「设置 → 群机器人」获取。</p>
    </section>

    <button @click="save" :disabled="saving"
      class="w-full bg-blue-600 disabled:bg-gray-300 text-white py-3 rounded">
      {{ saving ? '保存中...' : '保存设置' }}
    </button>
  </div>
</template>
