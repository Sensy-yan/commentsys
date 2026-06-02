import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    sessionId: '' as string,
    storeId: '' as string,
    rating: 0,
    storeName: '' as string,
    platformUrls: {} as Record<string, string>,
    technicians: [] as string[],
    projects: [] as string[],
  }),
});
