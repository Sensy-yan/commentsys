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
  <div class="p-4 max-w-md mx-auto">
    <h1 class="text-xl font-bold mb-4">差评中心</h1>

    <div class="flex gap-2 mb-4">
      <button @click="status = 'pending'; load()"
        class="px-3 py-1 rounded text-sm"
        :class="status === 'pending' ? 'bg-red-500 text-white' : 'bg-gray-200'">
        待处理
      </button>
      <button @click="status = 'handled'; load()"
        class="px-3 py-1 rounded text-sm"
        :class="status === 'handled' ? 'bg-gray-500 text-white' : 'bg-gray-200'">
        已处理
      </button>
    </div>

    <div v-if="loading" class="text-gray-400">加载中...</div>
    <p v-else-if="items.length === 0" class="text-gray-400 text-center mt-12">暂无</p>

    <div v-for="item in items" :key="item.id"
      class="bg-white border rounded p-4 mb-3"
      :class="status === 'pending' ? 'border-red-200' : 'border-gray-200'">
      <div class="flex justify-between mb-2">
        <span class="text-yellow-500">{{ '★'.repeat(item.rating) }}{{ '☆'.repeat(5-item.rating) }}</span>
        <span class="text-xs text-gray-400">{{ fmtTime(item.created_at) }}</span>
      </div>
      <p class="text-sm mb-2">{{ item.message }}</p>
      <p v-if="item.contact" class="text-sm text-gray-600">
        联系: <a :href="`tel:${item.contact}`" class="text-blue-500">{{ item.contact }}</a>
      </p>
      <p v-if="item.handler_note" class="text-xs text-gray-500 mt-2">处理备注:{{ item.handler_note }}</p>

      <div v-if="status === 'pending'" class="mt-3">
        <div v-if="handlingId === item.id" class="space-y-2">
          <textarea v-model="noteInput" rows="2" placeholder="处理备注"
            class="w-full border rounded p-2 text-sm"/>
          <div class="flex gap-2">
            <button @click="handle(item.id)"
              class="flex-1 bg-blue-500 text-white py-2 rounded text-sm">确认已处理</button>
            <button @click="handlingId = ''" class="px-3 bg-gray-200 rounded text-sm">取消</button>
          </div>
        </div>
        <button v-else @click="handlingId = item.id; noteInput = ''"
          class="w-full bg-blue-500 text-white py-2 rounded text-sm">
          标记已处理
        </button>
      </div>
    </div>
  </div>
</template>
