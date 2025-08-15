document.addEventListener('DOMContentLoaded', () => {
    const chatArea = document.getElementById('chat-area');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatButton = document.getElementById('new-chat-button');
    const roomList = document.getElementById('room-list');
    const headerTitle = document.getElementById('header-title');
    const micButton = document.getElementById('mic-button');

    const API_BASE_URL = 'http://localhost:3001';

    let rooms = {};
    let activeRoomId = null;
    let isReplying = false;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function typeOutText(text, bubble) {
        const processedText = text.replace(/\n/g, '<br>');
        for (let i = 0; i < processedText.length; i++) {
            const char = processedText[i];
            if (char === '<' && processedText.substring(i, i + 4) === '<br>') {
                bubble.innerHTML += '<br>';
                i += 3;
                continue;
            }
            if (char === ' ') {
                bubble.innerHTML += ' ';
            } else {
                bubble.innerHTML += `<span class="emerge-char">${char}</span>`;
            }
            scrollToBottom();
            await sleep(50);
        }
    }

    async function streamBotResponse(messages, botMessageBubble) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: messages })
            });

                    if (!res.ok) {
            let errorMessage = 'サーバーとの接続に失敗しました。';
            if (res.status === 404) {
                errorMessage = 'APIエンドポイントが見つかりません。サーバーの設定を確認してください。';
            } else if (res.status === 500) {
                errorMessage = 'サーバー内部でエラーが発生しました。しばらく時間をおいてから再試行してください。';
            } else if (res.status >= 400) {
                errorMessage = `リクエストエラーが発生しました (HTTP ${res.status})`;
            }
            botMessageBubble.innerHTML = `エラー: ${errorMessage}`;
            return;
        }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop();
                
                for (const part of parts) {
                    if (part.startsWith('data: ')) {
                        const dataString = part.substring(6);
                        if (dataString === '[DONE]') {
                            // 応答完了時の処理
                            if (fullResponse.trim() === '') {
                                botMessageBubble.innerHTML = '申し訳ございません。応答を生成できませんでした。もう一度お試しください。';
                            }
                            return;
                        }
                        
                        try {
                            const data = JSON.parse(dataString);
                            if (data.text) {
                                fullResponse += data.text;
                                await typeOutText(data.text, botMessageBubble);
                            } else if (data.error) {
                                botMessageBubble.innerHTML = `エラー: ${data.error}`;
                            }
                        } catch (e) {
                            console.error('JSON parse error', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Streaming error:', error);
            botMessageBubble.innerHTML = 'ネットワークエラーが発生しました。接続を確認してください。';
        }
    }

    async function handleSend() {
        if (isReplying) return;

        const text = userInput.value.trim();
        if (!text) return;

        console.log('メッセージ送信:', text);
        console.log('現在のアクティブルーム:', activeRoomId);
        console.log('現在のルーム:', rooms[activeRoomId]);

        setReplyingState(true);

        // ユーザーメッセージを保存・表示
        await saveMessage(text, 'user');
        addMessageToDOM(text, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';

        // API用のメッセージ形式に変換
        const apiMessages = rooms[activeRoomId].messages.map(msg => ({
            role: msg.sender === 'bot' ? 'assistant' : 'user',
            content: msg.text
        }));

        // ボットの応答用のバブルを作成
        const botMessageBubble = addMessageToDOM('', 'bot');
        scrollToBottom();

        // 日本語応答のストリーミング開始
        streamBotResponse(apiMessages, botMessageBubble)
            .then(() => {
                const finalBotText = botMessageBubble.innerText;
                if (finalBotText && finalBotText.trim() !== '') {
                    saveMessage(finalBotText, 'bot');
                    saveAndRenderAll();
                }
            })
            .catch((err) => {
                console.error("Streaming failed", err);
                botMessageBubble.innerText = "申し訳ございません。エラーが発生しました。もう一度お試しください。";
                saveMessage("エラーが発生しました。", 'bot');
            })
            .finally(() => {
                setReplyingState(false);
            });
    }

    async function saveMessage(text, sender) {
        if (!activeRoomId) return;
        const room = rooms[activeRoomId];
        room.messages.push({ text, sender });
        
        // 最初のユーザーメッセージの場合、タイトルを自動設定
        // ボットメッセージが1つ、ユーザーメッセージが1つになった時点でタイトルを設定
        if (room.messages.length === 2 && sender === 'user') {
            console.log('最初のユーザーメッセージを検出:', text);
            try {
                const newTitle = await generateTitleFromMessage(text);
                console.log('生成されたタイトル:', newTitle);
                room.title = newTitle;
                
                // タイトルが更新されたら、UIも更新
                if (rooms[activeRoomId] === room) {
                    console.log('ヘッダータイトルを更新:', newTitle);
                    headerTitle.textContent = room.title;
                }
                // サイドバーのルームリストも更新
                renderRoomList();
                console.log('ルームリストを更新完了');
            } catch (error) {
                console.error('タイトル生成エラー:', error);
                // エラーの場合は正規表現ベースの処理を使用
                const fallbackTitle = generateTitleFromMessageRegex(text);
                room.title = fallbackTitle;
                console.log('フォールバックタイトルを使用:', fallbackTitle);
                
                // UI更新
                if (rooms[activeRoomId] === room) {
                    headerTitle.textContent = room.title;
                }
                renderRoomList();
            }
        }
    }

    // LLMを使ったタイトル要約
    async function generateTitleWithLLM(message) {
        try {
            console.log('LLM要約を試行中...');
            
            const response = await fetch(`${API_BASE_URL}/api/summarize-title`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: message,
                    maxLength: 25 
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('LLM要約成功:', result.title);
            return result.title;
            
        } catch (error) {
            console.log('LLM要約失敗、フォールバック処理を使用:', error.message);
            // フォールバック: 正規表現ベースの処理
            return generateTitleFromMessageRegex(message);
        }
    }

    async function generateTitleFromMessage(message) {
        console.log('generateTitleFromMessage 呼び出し:', message);
        
        if (!message || typeof message !== 'string') {
            console.log('無効なメッセージ、デフォルトタイトルを返す');
            return '新しいチャット';
        }
        
        // まずLLM要約を試行
        try {
            const llmTitle = await generateTitleWithLLM(message);
            return llmTitle;
        } catch (error) {
            console.log('LLM要約でエラー、正規表現ベースの処理を使用');
            return generateTitleFromMessageRegex(message);
        }
    }

    // 正規表現ベースのタイトル生成（フォールバック用）
    function generateTitleFromMessageRegex(message) {
        console.log('正規表現ベースのタイトル生成開始');
        
        // メッセージをクリーンアップ
        let cleanMessage = message.trim();
        console.log('トリム後のメッセージ:', cleanMessage);
        
        // 改行や複数のスペースを単一のスペースに置換
        cleanMessage = cleanMessage.replace(/\s+/g, ' ');
        console.log('スペース正規化後:', cleanMessage);
        
        // 特殊文字や絵文字を除去（必要に応じて）
        cleanMessage = cleanMessage.replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\uF900-\uFAFF\u3300-\u33FF\uFE30-\uFE4F\uFF00-\uFFEF\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u1F1E0-\u1F1FF\u2600-\u26FF\u2700-\u27BF]/g, '');
        console.log('特殊文字除去後:', cleanMessage);
        
        // 挨拶や一般的な表現を除去して、核心部分を抽出
        let title = cleanMessage;
        
        // 一般的な挨拶を除去（より包括的に）
        const greetings = [
            /^こんにちは\s*/,
            /^こんばんは\s*/,
            /^おはよう\s*/,
            /^お疲れ様\s*/,
            /^お疲れ様です\s*/,
            /^ありがとう\s*/,
            /^ありがとうございます\s*/,
            /^すみません\s*/,
            /^失礼\s*/,
            /^よろしく\s*/,
            /^よろしくお願いします\s*/,
            /^申し訳ございません\s*/,
            /^申し訳ありません\s*/
        ];
        
        greetings.forEach(greeting => {
            title = title.replace(greeting, '');
        });
        
        // 文末の敬語や表現を除去
        title = title.replace(/です\s*$/g, '');
        title = title.replace(/ます\s*$/g, '');
        title = title.replace(/ください\s*$/g, '');
        title = title.replace(/お願いします\s*$/g, '');
        
        // 質問の表現を簡潔にする
        title = title.replace(/について教えてください?/g, 'について');
        title = title.replace(/について教えて?/g, 'について');
        title = title.replace(/について説明してください?/g, 'について');
        title = title.replace(/について説明して?/g, 'について');
        title = title.replace(/について詳しく教えてください?/g, 'について');
        title = title.replace(/について詳しく教えて?/g, 'について');
        title = title.replace(/について知りたいです?/g, 'について');
        title = title.replace(/について知りたい?/g, 'について');
        
        // 長すぎる場合は適切に省略
        const maxLength = 25;
        if (title.length > maxLength) {
            console.log('メッセージが長すぎる、省略処理を実行');
            // 文の区切りで切る（句読点、疑問符、感嘆符など）
            const sentenceEnd = title.search(/[。！？\?!]/);
            if (sentenceEnd > 0 && sentenceEnd <= maxLength) {
                title = title.substring(0, sentenceEnd + 1);
                console.log('文の区切りで省略:', title);
            } else {
                // 単語の区切りで切る
                const words = title.split(' ');
                let truncated = '';
                for (const word of words) {
                    if ((truncated + word).length <= maxLength) {
                        truncated += (truncated ? ' ' : '') + word;
                    } else {
                        break;
                    }
                }
                title = truncated || title.substring(0, maxLength);
                console.log('単語の区切りで省略:', title);
            }
        }
        
        // 空文字列の場合はフォールバック
        if (!title.trim()) {
            console.log('空文字列、デフォルトタイトルを返す');
            return '新しいチャット';
        }
        
        const finalTitle = title.trim();
        console.log('最終タイトル:', finalTitle);
        return finalTitle;
    }

    function addMessageToDOM(text, sender) {
        const messageRow = document.createElement('div');
        messageRow.className = `message-row ${sender}`;
        const messageBubble = document.createElement('div');
        messageBubble.className = `message-bubble ${sender}`;
        messageBubble.innerHTML = text.replace(/\n/g, '<br>');
        messageRow.appendChild(messageBubble);
        chatArea.appendChild(messageRow);
        return messageBubble;
    }

    function renderActiveRoom() {
        if (!activeRoomId || !rooms[activeRoomId]) {
            headerTitle.textContent = "チャットを選択してください";
            chatArea.innerHTML = "";
            return;
        }
        headerTitle.textContent = rooms[activeRoomId].title;
        chatArea.innerHTML = "";
        rooms[activeRoomId].messages.forEach(msg => {
            addMessageToDOM(msg.text, msg.sender);
        });
        scrollToBottom();
    }
    
    function renderRoomList() {
        roomList.innerHTML = "";
        Object.keys(rooms).forEach(roomId => {
            const li = document.createElement('li');
            li.textContent = rooms[roomId].title;
            li.dataset.roomId = roomId;
            if (roomId === activeRoomId) li.classList.add('active');
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-room-button';
            deleteButton.innerHTML = '&times;';
            deleteButton.title = 'チャットを削除';
            deleteButton.dataset.roomId = roomId;
            li.appendChild(deleteButton);
            roomList.appendChild(li);
        });
    }

    function setReplyingState(locked) {
        isReplying = locked;
        sendButton.disabled = locked;
    }

    function scrollToBottom() {
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function createNewRoom() {
        console.log('新しいチャットルームを作成');
        const newRoomId = `room_${Date.now()}`;
        rooms[newRoomId] = { 
            title: '新しいチャット', 
            messages: [
                {
                    text: 'こんにちは！何かお手伝いできることはありますか？',
                    sender: 'bot'
                }
            ] 
        };
        activeRoomId = newRoomId;
        console.log('作成されたルーム:', newRoomId, rooms[newRoomId]);
        saveAndRenderAll();
        
        // 新しいチャットの作成後、入力フィールドにフォーカス
        setTimeout(() => {
            userInput.focus();
        }, 100);
    }

    function deleteRoom(roomIdToDelete) {
        if (!confirm(`「${rooms[roomIdToDelete].title}」を削除しますか？`)) return;
        delete rooms[roomIdToDelete];
        if (activeRoomId === roomIdToDelete) {
            const remainingRoomIds = Object.keys(rooms);
            activeRoomId = remainingRoomIds.length > 0 ? remainingRoomIds[0] : null;
            if (!activeRoomId) {
                createNewRoom();
                return;
            }
        }
        saveAndRenderAll();
    }

    function saveAndRenderAll() {
        localStorage.setItem('chatRooms', JSON.stringify(rooms));
        localStorage.setItem('activeRoomId', activeRoomId);
        renderRoomList();
        renderActiveRoom();
    }

    function loadRooms() {
        try {
            const savedRooms = localStorage.getItem('chatRooms');
            if (savedRooms) rooms = JSON.parse(savedRooms);
        } catch (e) {
            console.error("Failed to load chat history.", e);
            rooms = {};
        }

        if (Object.keys(rooms).length === 0) {
            createNewRoom();
        }

        const savedActiveRoom = localStorage.getItem('activeRoomId');
        activeRoomId = savedActiveRoom && rooms[savedActiveRoom] ? savedActiveRoom : Object.keys(rooms)[0];
    }
    
    newChatButton.addEventListener('click', createNewRoom);
    sendButton.addEventListener('click', handleSend);

    roomList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('delete-room-button')) {
            e.stopPropagation();
            const roomId = target.dataset.roomId;
            if (roomId) deleteRoom(roomId);
        } else if (target.tagName === 'LI') {
            const roomId = target.dataset.roomId;
            if (roomId && roomId !== activeRoomId) {
                activeRoomId = roomId;
                saveAndRenderAll();
            }
        }
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${userInput.scrollHeight}px`;
    });
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            // 音声入力後に自動で送信（オプション）
            // handleSend();
        };
        
        recognition.onend = () => micButton.classList.remove('recording');
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            micButton.classList.remove('recording');
        };
        
        micButton.addEventListener('click', () => {
            if (micButton.classList.contains('recording')) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                    micButton.classList.add('recording');
                } catch (error) {
                    console.error('Failed to start speech recognition:', error);
                }
            }
        });
    } else {
        micButton.style.display = 'none';
    }

    loadRooms();
    saveAndRenderAll();
});