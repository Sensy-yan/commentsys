<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ size?: number }>();
const emit = defineEmits<{ (e: 'change', rating: number): void }>();
const hover = ref(0);
const selected = ref(0);

function pick(n: number) {
  selected.value = n;
  emit('change', n);
}
</script>

<template>
  <div class="flex justify-center gap-2 select-none">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      @click="pick(n)"
      @mouseenter="hover = n"
      @mouseleave="hover = 0"
      class="text-5xl transition-transform active:scale-95"
      :class="(hover || selected) >= n ? 'text-yellow-400' : 'text-gray-300'"
      :aria-label="`${n} 星`"
    >
      ★
    </button>
  </div>
</template>
