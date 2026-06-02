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
  <div v-if="cfg" class="px-4 pt-5 pb-28 max-w-md mx-auto space-y-4">
    <!-- Header -->
    <header class="mb-2">
      <div class="label mb-1.5">SETTINGS</div>
      <h1 class="heading-1">门店设置</h1>
    </header>

    <!-- 门店信息 -->
    <section class="card p-5 space-y-3">
      <h2 class="label">门店信息</h2>
      <input v-model="cfg.name" placeholder="门店名称" class="input w-full text-sm" />
      <input v-model="cfg.phone" placeholder="联系电话" class="input w-full text-sm" />
      <input v-model="cfg.address" placeholder="门店地址" class="input w-full text-sm" />
    </section>

    <!-- 技师 -->
    <section class="card p-5">
      <h2 class="label mb-3">技师列表</h2>
      <div class="flex flex-wrap gap-2 mb-3">
        <span
          v-for="(t, i) in cfg.technicians"
          :key="i"
          class="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-brand-50 border border-brand-100 rounded-full text-sm text-brand-700"
        >
          {{ t }}
          <button
            @click="cfg.technicians.splice(i, 1)"
            class="w-5 h-5 rounded-full bg-white/60 text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors flex items-center justify-center text-xs"
            aria-label="删除"
          >×</button>
        </span>
        <span v-if="cfg.technicians.length === 0" class="text-xs text-slate-400 self-center">暂无</span>
      </div>
      <div class="flex gap-2">
        <input
          v-model="techInput"
          placeholder="新技师姓名"
          class="input flex-1 text-sm"
          @keyup.enter="addTech"
        />
        <button @click="addTech" class="btn-primary px-4 py-2.5 text-sm">+ 添加</button>
      </div>
    </section>

    <!-- 项目 -->
    <section class="card p-5">
      <h2 class="label mb-3">项目列表</h2>
      <div class="flex flex-wrap gap-2 mb-3">
        <span
          v-for="(p, i) in cfg.projects"
          :key="i"
          class="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-sm text-emerald-700"
        >
          {{ p }}
          <button
            @click="cfg.projects.splice(i, 1)"
            class="w-5 h-5 rounded-full bg-white/60 text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors flex items-center justify-center text-xs"
            aria-label="删除"
          >×</button>
        </span>
        <span v-if="cfg.projects.length === 0" class="text-xs text-slate-400 self-center">暂无</span>
      </div>
      <div class="flex gap-2">
        <input
          v-model="projInput"
          placeholder="新项目名称"
          class="input flex-1 text-sm"
          @keyup.enter="addProj"
        />
        <button @click="addProj" class="btn-primary px-4 py-2.5 text-sm">+ 添加</button>
      </div>
    </section>

    <!-- 平台链接 -->
    <section class="card p-5 space-y-3">
      <h2 class="label">平台店铺链接</h2>
      <p class="text-xs text-slate-400 -mt-1 leading-relaxed">
        顾客提交评价后,会跳转到对应链接
      </p>
      <input v-model="cfg.platform_urls.dianping" placeholder="大众点评店铺 URL" class="input w-full text-sm" />
      <input v-model="cfg.platform_urls.meituan" placeholder="美团店铺 URL" class="input w-full text-sm" />
      <input v-model="cfg.platform_urls.douyin" placeholder="抖音店铺 URL" class="input w-full text-sm" />
      <input v-model="cfg.platform_urls.xiaohongshu" placeholder="小红书店铺 URL" class="input w-full text-sm" />
    </section>

    <!-- Webhook -->
    <section class="card p-5">
      <h2 class="label mb-3">企业微信群机器人</h2>
      <input
        v-model="cfg.wecom_webhook"
        placeholder="https://qyapi.weixin.qq.com/..."
        class="input w-full text-sm"
      />
      <p class="text-xs text-slate-400 mt-2 leading-relaxed">
        差评提交时自动推送到该群。从企业微信群「设置 → 群机器人」获取。
      </p>
    </section>

    <button
      @click="save"
      :disabled="saving"
      class="btn-primary w-full"
    >
      <span v-if="saving" class="flex items-center justify-center gap-2">
        <span class="w-2 h-2 rounded-full bg-white animate-pulse" />
        保存中
      </span>
      <span v-else>保存设置</span>
    </button>
  </div>
</template>
