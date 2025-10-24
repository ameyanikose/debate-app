// Configuration for API keys and defaults
export const config = {
  // OpenRouter API key from environment variables
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
  
  // Default settings
  defaultModel: import.meta.env.VITE_DEFAULT_MODEL || 'deepseek/deepseek-chat',
  
  // OpenRouter configuration
  openRouterUrl: 'https://openrouter.ai/api/v1',
  
  // Check if API key is available
  hasApiKey: () => !!import.meta.env.VITE_OPENROUTER_API_KEY,
};
