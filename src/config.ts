// Configuration for defaults
export const config = {
  // Default settings
  defaultModel: import.meta.env.VITE_DEFAULT_MODEL || 'deepseek/deepseek-chat',
  
  // OpenRouter API configuration
  openRouterApiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  
  // Check if API key is configured
  hasApiKey: () => {
    return !!import.meta.env.VITE_OPENROUTER_API_KEY;
  },
};
