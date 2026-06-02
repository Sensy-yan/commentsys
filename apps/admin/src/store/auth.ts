import { defineStore } from 'pinia';

interface Operator { id: string; name: string; role: string; storeId: string; }

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') ?? '',
    operator: JSON.parse(localStorage.getItem('operator') ?? 'null') as Operator | null,
  }),
  actions: {
    setSession(token: string, operator: Operator) {
      this.token = token;
      this.operator = operator;
      localStorage.setItem('token', token);
      localStorage.setItem('operator', JSON.stringify(operator));
    },
    logout() {
      this.token = '';
      this.operator = null;
      localStorage.removeItem('token');
      localStorage.removeItem('operator');
    },
  },
});
