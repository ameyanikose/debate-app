# Backend Server for Debate App

This backend server provides a secure proxy for OpenRouter API calls, keeping API keys safe on the server side.

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure API key:**
   - Copy `.env` file and add your OpenRouter API key:
   ```bash
   cp .env .env.local
   # Edit .env.local and add your API key:
   # OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

## Environment Variables

- `OPENROUTER_API_KEY` - Your OpenRouter API key (required)
- `PORT` - Server port (default: 3001)

## API Endpoints

- `GET /api/health` - Health check and API key status
- `POST /api/chat/completions` - Proxy for OpenRouter chat completions

## Security

- API keys are stored securely on the server
- No sensitive data is exposed to the frontend
- CORS enabled for frontend communication
