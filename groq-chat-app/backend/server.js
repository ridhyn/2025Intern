
require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Node.js 18+ の組み込みfetchを使用

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/api/chat', async (req, res) => {
  const { prompt, isFirstMessage = false } = req.body;
  
  try {
    // 日本語で応答するように促すシステムプロンプト
    const systemPrompt = "You must respond only in Japanese. 日本語で回答してください。絶対に英語を使わないでください。";
    const enhancedPrompt = `${systemPrompt}\n\nユーザー: ${prompt}`;
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: enhancedPrompt }],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Unknown error');
    }

    const aiResponse = data.choices[0].message.content;
    let title = null;

    // 最初のメッセージの場合、タイトルを生成
    if (isFirstMessage) {
      try {
        const titleResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [{ 
              role: 'user', 
              content: `ユーザーメッセージ: "${prompt}"\n\n上記のメッセージから5-10文字の短いタイトルを作ってください。例：「挨拶」「質問」「相談」など。説明文や接頭辞は一切不要で、タイトルのみ回答してください。` 
            }],
            temperature: 0.3,
            max_tokens: 50
          })
        });

        const titleData = await titleResponse.json();
        if (titleResponse.ok) {
          title = titleData.choices[0].message.content.trim();
          // あらゆる接頭辞と不要な文字を削除
          title = title.replace(/^(要約：|タイトル：|概要：|まとめ：|題名：|フレーズ：|回答：|答え：)/g, '');
          title = title.replace(/\n.*$/g, ''); // 改行以降を削除
          title = title.replace(/[「」『』"'"]/g, ''); // 引用符を削除
          title = title.trim();
          // 最大15文字に制限
          if (title.length > 15) {
            title = title.substring(0, 15);
          }
        }
      } catch (titleErr) {
        console.error('Title generation error:', titleErr);
      }
    }

    res.json({
      ok: true,
      text: aiResponse,
      title: title
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
