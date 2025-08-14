// server.js のストリーミング対応版

const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function startServer() {
    try {
        app.use(cors());
        app.use(express.json());

        app.post('/api/chat', async (req, res) => {
            // ★ 変更点1: ストリーミング用のヘッダーを設定
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            try {
                const { prompt } = req.body;
                if (!prompt) {
                    // ストリームではなく通常のエラーを返す
                    return res.status(400).json({ ok: false, error: 'Prompt is missing' });
                }

                // ★ 変更点2: GroqのAPI呼び出しに `stream: true` を追加
                const stream = await groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'llama3-8b-8192',
                    stream: true, // ← これがストリーミングを有効にするキー
                });

                // ★ 変更点3: ストリームの各チャンク（データの断片）をクライアントに送信
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        // SSE (Server-Sent Events) 形式でデータを書き込む
                        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
                    }
                }

                // ストリームの終了をクライアントに通知
                res.write(`data: [DONE]\n\n`);

            } catch (error) {
                console.error('Groq API Error:', error);
                // エラーが発生した場合もクライアントに通知
                res.write(`data: ${JSON.stringify({ error: 'AIからの応答取得に失敗しました。' })}\n\n`);
                res.write(`data: [DONE]\n\n`);
            }
        });

        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            console.log(`✅ Groq-powered streaming server is running on port ${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();