import express from 'express';
import dotenv from 'dotenv';
import Groq from 'groq';

dotenv.config();

const app = express();
app.use(express.json());

// @ts-ignore
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY as string,
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      model: 'mixtral-8x7b-32768',
    });

    console.log('Groq Response:', completion.choices[0]?.message);
    res.json({ response: completion.choices[0]?.message });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
