<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ size?: number }>();
const emit = defineEmits<{ (e: 'change', rating: number): void }>();
const hover = ref(0);
const selected = ref(0);

function pick(n: number) {
  selected.value = n;
  emit('change', n);
}
</script>

<template>
  <div class="flex justify-center gap-3 select-none">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      @click="pick(n)"
      @mouseenter="hover = n"
      @mouseleave="hover = 0"
      class="relative text-5xl transition-all duration-200 active:scale-90"
      :class="[
        (hover || selected) >= n
          ? 'star-active scale-110'
          : 'text-slate-200 hover:scale-105',
      ]"
      :aria-label="`${n} 星`"
    >
      <span
        v-if="selected === n"
        class="absolute inset-0 -m-2 rounded-full bg-amber-300/20 blur-xl"
        aria-hidden="true"
      />
      <span class="relative">★</span>
    </button>
  </div>
</template>

<style scoped>
.star-active {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3));
}
</style>
