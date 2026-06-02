import { createRouter, createWebHistory } from 'vue-router';
import Login from './pages/Login.vue';
import Dashboard from './pages/Dashboard.vue';
import Complaints from './pages/Complaints.vue';
import Photos from './pages/Photos.vue';
import Settings from './pages/Settings.vue';
import QRCodeExport from './pages/QRCodeExport.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: Login },
    { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/complaints', component: Complaints, meta: { requiresAuth: true } },
    { path: '/photos', component: Photos, meta: { requiresAuth: true } },
    { path: '/settings', component: Settings, meta: { requiresAuth: true } },
    { path: '/qrcode', component: QRCodeExport, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    return { path: '/login' };
  }
  if (to.path === '/login' && localStorage.getItem('token')) {
    return { path: '/dashboard' };
  }
});
