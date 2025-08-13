import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY が設定されていません（backend/.env を確認してください）');
  }
  return new Groq({ apiKey });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/ping', async (_req, res) => {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: 'あなたは日本語で簡潔に答えるアシスタントです。以降の回答は必ず日本語で出力してください。' },
        { role: 'user', content: 'こんにちは。1行で自己紹介してください（日本語で）。' },
      ],
      max_tokens: 64,
      temperature: 0.7,
    });
    const text = completion.choices?.[0]?.message?.content ?? '';
    console.log('[Groq ping]', text);
    res.json({ ok: true, text });
  } catch (error) {
    console.error('[Groq ping error]', error);
    res.status(500).json({ ok: false, error: error?.message || 'Unknown error' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const groq = getGroqClient();
    const { prompt, messages, max_tokens, temperature, model } = req.body || {};
    let chatMessages;
    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = [
        { role: 'system', content: 'あなたは日本語で簡潔に答えるアシスタントです。以降の回答は必ず日本語で出力してください。' },
        ...messages,
      ];
    } else if (typeof prompt === 'string' && prompt.trim().length > 0) {
      chatMessages = [
        { role: 'system', content: 'あなたは日本語で簡潔に答えるアシスタントです。以降の回答は必ず日本語で出力してください。' },
        { role: 'user', content: prompt },
      ];
    } else {
      return res.status(400).json({ ok: false, error: 'prompt か messages のどちらかを指定してください。' });
    }

    const completion = await groq.chat.completions.create({
      model: model || 'llama3-8b-8192',
      messages: chatMessages,
      max_tokens: typeof max_tokens === 'number' ? max_tokens : 256,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
    });
    const text = completion.choices?.[0]?.message?.content ?? '';
    console.log('[Groq chat]', text);
    res.json({ ok: true, text });
  } catch (error) {
    console.error('[Groq chat error]', error);
    res.status(500).json({ ok: false, error: error?.message || 'Unknown error' });
  }
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});


