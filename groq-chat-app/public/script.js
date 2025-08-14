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

    function handleSend() {
        if (isReplying) return;

        const text = userInput.value.trim();
        if (!text) return;

        setReplyingState(true);

        // ユーザーメッセージを保存・表示
        saveMessage(text, 'user');
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

    function saveMessage(text, sender) {
        if (!activeRoomId) return;
        const room = rooms[activeRoomId];
        room.messages.push({ text, sender });
        if (room.messages.length === 1 && sender === 'user') {
            room.title = text.substring(0, 20);
        }
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
        saveAndRenderAll();
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