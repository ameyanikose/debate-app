const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// OpenRouter API endpoint
app.post('/api/chat/completions', async (req, res) => {
  try {
    const { model, messages, temperature, top_p, frequency_penalty, presence_penalty, max_tokens, referer, appTitle } = req.body;
    
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': referer || 'http://localhost:3000',
        'X-Title': appTitle || 'Debate Simulator'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        top_p,
        frequency_penalty,
        presence_penalty,
        max_tokens
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: `OpenRouter API error: ${errorData}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Backend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    hasApiKey: !!process.env.OPENROUTER_API_KEY,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`OpenRouter API key configured: ${!!process.env.OPENROUTER_API_KEY}`);
});
