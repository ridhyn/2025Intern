
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama2-70b-4096',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Unknown error');
    }

    res.json({
      ok: true,
      text: data.choices[0].message.content
    });
  } catch (err) {
    console.error('Error:', err);
    res.json({
      ok: false,
      error: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`APIサーバーが http://localhost:${PORT} で起動しました`);
});
