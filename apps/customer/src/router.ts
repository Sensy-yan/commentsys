import { createRouter, createWebHashHistory } from 'vue-router';
import Welcome from './pages/Welcome.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Welcome },
  ],
});
