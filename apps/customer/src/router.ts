import { createRouter, createWebHashHistory } from 'vue-router';
import Welcome from './pages/Welcome.vue';
import PositiveReview from './pages/PositiveReview.vue';
import Complaint from './pages/Complaint.vue';
import ThankYou from './pages/ThankYou.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Welcome },
    { path: '/positive', component: PositiveReview },
    { path: '/complaint', component: Complaint },
    { path: '/thanks', component: ThankYou },
  ],
});
