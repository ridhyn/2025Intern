require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();

async function startServer() {
    try {
        app.use(cors());
        app.use(express.json());

        app.post('/api/chat', async (req, res) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

			try {
                const { messages } = req.body;

                if (!messages || messages.length === 0) {
                    return res.status(400).json({ ok: false, error: 'Messages are missing' });
                }

				const apiKey = process.env.GROQ_API_KEY;
				if (!apiKey) {
					res.write(`data: ${JSON.stringify({ error: 'Server misconfigured: GROQ_API_KEY is missing.' })}\n\n`);
					res.write(`data: [DONE]\n\n`);
					return;
				}

				const groq = new Groq({ apiKey });

				// 日本語応答を確実にするためのシステムプロンプト
				const systemPrompt = {
					role: 'system',
					content: 'あなたは親切で丁寧な日本語のアシスタントです。常に日本語で返答してください。ユーザーの質問や要望に対して、分かりやすく詳しく説明し、必要に応じて具体例も含めて回答してください。'
				};

				// システムプロンプトを最初に追加
				const messagesWithSystem = [systemPrompt, ...messages];

				const stream = await groq.chat.completions.create({
                    messages: messagesWithSystem,
                    model: 'llama3-8b-8192',
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 2000,
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
                    }
                }
                res.write(`data: [DONE]\n\n`);

            } catch (error) {
                console.error('Groq API Error:', error);
                res.write(`data: ${JSON.stringify({ error: 'AIからの応答取得に失敗しました。' })}\n\n`);
                res.write(`data: [DONE]\n\n`);
            }
        });

        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            console.log(`✅ Conversational server is running on port ${PORT}`);
            console.log(`APIキーが設定されているか確認してください。`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();