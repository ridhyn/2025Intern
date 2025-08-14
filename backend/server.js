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
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            try {
                const { messages } = req.body;

                if (!messages || messages.length === 0) {
                    return res.status(400).json({ ok: false, error: 'Messages are missing' });
                }

                const stream = await groq.chat.completions.create({
                    messages: messages,
                    model: 'llama3-8b-8192',
                    stream: true,
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