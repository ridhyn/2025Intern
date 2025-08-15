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
                    if (chunk.choices[0]?.delta?.content) {
                        const text = chunk.choices[0].delta.content;
                        res.write(`data: ${JSON.stringify({ text })}\n\n`);
                    }
                }
                res.write(`data: [DONE]\n\n`);
            } catch (error) {
                console.error('Chat API error:', error);
                res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
                res.write(`data: [DONE]\n\n`);
            }
        });

        // タイトル要約用のAPIエンドポイント
        app.post('/api/summarize-title', async (req, res) => {
            try {
                const { message, maxLength = 25 } = req.body;

                if (!message || typeof message !== 'string') {
                    return res.status(400).json({ 
                        ok: false, 
                        error: 'Message is missing or invalid' 
                    });
                }

                const apiKey = process.env.GROQ_API_KEY;
                if (!apiKey) {
                    return res.status(500).json({ 
                        ok: false, 
                        error: 'Server misconfigured: GROQ_API_KEY is missing.' 
                    });
                }

                const groq = new Groq({ apiKey });

                // タイトル要約用のプロンプト
                const systemPrompt = {
                    role: 'system',
                    content: `あなたはチャットのタイトルを生成する専門家です。
以下のルールに従って、メッセージを簡潔で分かりやすいタイトルに要約してください：

1. 最大${maxLength}文字以内
2. 挨拶や敬語は除去
3. 核心的な内容のみを抽出
4. 自然で読みやすい日本語
5. 質問の場合は「について」で終わる
6. 絵文字や特殊文字は除去

例：
- 「こんにちは、今日の天気について教えてください」→「今日の天気について」
- 「お疲れ様です。明日の会議の議題について詳しく説明してください」→「明日の会議の議題について」
- 「すみません、JavaScriptのasync/awaitについて教えてください」→「JavaScriptのasync/awaitについて」

タイトルのみを返答してください。説明や余計な文字は含めないでください。`
                };

                const userPrompt = {
                    role: 'user',
                    content: message
                };

                const completion = await groq.chat.completions.create({
                    messages: [systemPrompt, userPrompt],
                    model: 'llama3-8b-8192',
                    temperature: 0.3, // 一貫性を保つため低めに設定
                    max_tokens: 100,
                });

                const title = completion.choices[0]?.message?.content?.trim();
                
                if (!title) {
                    throw new Error('No title generated');
                }

                res.json({ 
                    ok: true, 
                    title: title,
                    originalMessage: message,
                    maxLength: maxLength
                });

            } catch (error) {
                console.error('Title summarization error:', error);
                res.status(500).json({ 
                    ok: false, 
                    error: 'Failed to generate title',
                    details: error.message
                });
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