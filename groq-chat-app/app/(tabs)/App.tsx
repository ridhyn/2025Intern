import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // CSSファイルをインポート

// コンポーネント名は先頭を大文字にします
const App = () => {
    const [messages, setMessages] = useState<{ text: string, sender: 'user' | 'bot' }[]>([]);
    const [userInput, setUserInput] = useState('');
    const chatBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        const text = userInput.trim();
        if (!text) return;

        console.log(`/${text}/`);
        const newMessages = [...messages, { text: text, sender: 'user' as const }];
        setMessages(newMessages);
        setUserInput('');

        setTimeout(() => {
            setMessages(prev => [...prev, { text: 'これはBotのダミー応答です。', sender: 'bot' as const }]);
        }, 800);
    };

    return (
        <div className="chat-container">
            <div ref={chatBoxRef} className="chat-box">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        {msg.text}
                    </div>
                ))}
            </div>

            <div className="input-area">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="メッセージを入力..."
                />
                <button onClick={handleSend}>送信</button>
            </div>
        </div>
    );
};

export default App;