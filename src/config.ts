// Configuration for defaults
export const config = {
  // Default settings
  defaultModel: import.meta.env.VITE_DEFAULT_MODEL || 'deepseek/deepseek-chat',
  
  // Backend configuration
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
  
  // Check if backend is available
  hasBackend: () => {
    // This will be checked via API call to backend health endpoint
    return true;
  },
};
