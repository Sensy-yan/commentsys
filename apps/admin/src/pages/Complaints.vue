<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api.js';

const status = ref<'pending' | 'handled'>('pending');
const items = ref<any[]>([]);
const loading = ref(false);
const handlingId = ref('');
const noteInput = ref('');

async function load() {
  loading.value = true;
  try {
    const { items: list } = await api.listComplaints(status.value);
    items.value = list;
  } finally { loading.value = false; }
}

async function handle(id: string) {
  await api.handleComplaint(id, noteInput.value);
  handlingId.value = '';
  noteInput.value = '';
  load();
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

onMounted(load);
</script>

<template>
  <div class="px-4 pt-5 pb-12 max-w-md mx-auto">
    <!-- Header -->
    <header class="mb-5">
      <div class="label mb-1.5">COMPLAINT CENTER</div>
      <h1 class="heading-1">差评中心</h1>
    </header>

    <!-- Segmented control -->
    <div class="card p-1 flex mb-4">
      <button
        @click="status = 'pending'; load()"
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        :class="status === 'pending'
          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-brand'
          : 'text-slate-500 hover:text-slate-700'"
      >
        待处理
      </button>
      <button
        @click="status = 'handled'; load()"
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        :class="status === 'handled'
          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-brand'
          : 'text-slate-500 hover:text-slate-700'"
      >
        已处理
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center gap-2 py-12">
      <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
      <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse [animation-delay:200ms]" />
      <span class="w-2 h-2 rounded-full bg-teal-400 animate-pulse [animation-delay:400ms]" />
    </div>

    <!-- Empty -->
    <div v-else-if="items.length === 0" class="card py-16 flex flex-col items-center text-center">
      <div class="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <path d="M22 4L12 14.01l-3-3"/>
        </svg>
      </div>
      <p class="text-slate-400 text-sm">
        {{ status === 'pending' ? '暂无待处理差评' : '暂无已处理记录' }}
      </p>
    </div>

    <!-- List -->
    <div v-else class="space-y-3">
      <div
        v-for="item in items"
        :key="item.id"
        class="card overflow-hidden relative"
      >
        <!-- 左侧状态色条 -->
        <div
          class="absolute left-0 top-0 bottom-0 w-1"
          :class="status === 'pending'
            ? 'bg-gradient-to-b from-red-400 to-red-500'
            : 'bg-gradient-to-b from-emerald-400 to-emerald-500'"
        />

        <div class="pl-4 pr-4 py-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-amber-500 text-sm tracking-wider">
              {{ '★'.repeat(item.rating) }}<span class="text-slate-200">{{ '★'.repeat(5 - item.rating) }}</span>
            </span>
            <span class="text-xs text-slate-400">{{ fmtTime(item.created_at) }}</span>
          </div>

          <p class="text-sm text-slate-700 leading-relaxed mb-2">{{ item.message }}</p>

          <p v-if="item.contact" class="text-sm text-slate-600 flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <a :href="`tel:${item.contact}`" class="text-brand-600 font-medium hover:text-brand-700">{{ item.contact }}</a>
          </p>

          <div
            v-if="item.handler_note"
            class="mt-3 px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-600 border-l-2 border-emerald-400"
          >
            处理备注:{{ item.handler_note }}
          </div>

          <div v-if="status === 'pending'" class="mt-3">
            <div v-if="handlingId === item.id" class="space-y-2">
              <textarea
                v-model="noteInput"
                rows="2"
                placeholder="处理备注(可选)"
                class="input w-full text-sm resize-none"
              />
              <div class="flex gap-2">
                <button
                  @click="handle(item.id)"
                  class="btn-primary flex-1 py-2.5 text-sm"
                >
                  确认已处理
                </button>
                <button
                  @click="handlingId = ''"
                  class="btn-secondary py-2.5 text-sm"
                >
                  取消
                </button>
              </div>
            </div>
            <button
              v-else
              @click="handlingId = item.id; noteInput = ''"
              class="btn-primary w-full py-2.5 text-sm"
            >
              标记已处理
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
