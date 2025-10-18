# Backend API Key Setup

This guide explains how to set up a backend API key for the Debate App so it works out-of-the-box without requiring users to provide their own API keys.

## 🚀 Quick Setup

### 1. Get OpenRouter API Key
1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Go to your API keys section
4. Create a new API key
5. Copy the key (starts with `sk-or-...`)

### 2. Set Environment Variable

#### For Local Development:
Create a `.env.local` file in the project root:
```bash
VITE_OPENROUTER_API_KEY=sk-or-your-actual-api-key-here
```

#### For Netlify Deployment:
1. Go to your Netlify dashboard
2. Navigate to Site Settings → Environment Variables
3. Add a new variable:
   - **Key**: `VITE_OPENROUTER_API_KEY`
   - **Value**: `sk-or-your-actual-api-key-here`
4. Redeploy your site

### 3. Optional Configuration
You can also customize these environment variables:

```bash
# Default model (optional)
VITE_DEFAULT_MODEL=deepseek/deepseek-chat

# Default provider (optional)
VITE_DEFAULT_PROVIDER=openrouter_free
```

## 🔧 How It Works

- **Backend API Key**: Used as fallback when users haven't provided their own key
- **User Override**: Users can still add their own API key in Settings
- **Demo Mode**: Shows "Using backend API key (demo mode)" when backend key is active
- **Free Models**: Uses OpenRouter's free models by default (no credits required)

## 🛡️ Security Notes

- The API key is stored in environment variables (not in code)
- Users' personal API keys are stored locally in their browser
- Backend API key is only used as a fallback for demo purposes
- All API calls go directly from the user's browser to OpenRouter

## 🚀 Benefits

- **Out-of-the-box functionality**: App works immediately without setup
- **User-friendly**: Clear indicators when using demo vs personal keys
- **Flexible**: Users can still use their own keys for personal use
- **Free**: Uses OpenRouter's free models for demo purposes

## 🔄 Redeploy After Changes

After adding environment variables to Netlify:
1. Go to Deploys tab
2. Click "Trigger deploy" → "Deploy site"
3. Wait for deployment to complete

The app will now work with your backend API key!
