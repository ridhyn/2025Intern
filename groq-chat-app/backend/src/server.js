const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

// Insert polyfill for fetch if not available
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

const app = express();
app.use(express.json());

async function callGroqAPI(message) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status}\n${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Received message:', message);
    
    const completion = await callGroqAPI(message);
    console.log('Groq Response:', completion.choices[0]?.message);
    res.json({ response: completion.choices[0]?.message });
  } catch (error) {
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', await error.response.text());
    }
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1';

app.listen(PORT, HOST, (error) => {
  if (error) {
    console.error('Error starting server:', error);
    return;
  }
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
