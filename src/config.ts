// Configuration for API keys and defaults
export const config = {
  // Backend API key from environment variables
  backendApiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
  
  // Default settings
  defaultProvider: (import.meta.env.VITE_DEFAULT_PROVIDER as 'openai'|'anthropic'|'openrouter'|'openrouter_free') || 'openrouter_free',
  defaultModel: import.meta.env.VITE_DEFAULT_MODEL || 'deepseek/deepseek-chat',
  
  // OpenRouter configuration
  openRouterUrl: 'https://openrouter.ai/api/v1/chat/completions',
  
  // Check if backend API key is available
  hasBackendApiKey: () => !!import.meta.env.VITE_OPENROUTER_API_KEY,
};
