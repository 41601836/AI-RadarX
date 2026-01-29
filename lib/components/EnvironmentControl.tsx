export const resetZustandStores = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('Environment storage cleared');
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
  }
};
