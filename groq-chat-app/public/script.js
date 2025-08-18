document.addEventListener('DOMContentLoaded', () => {
    const chatArea = document.getElementById('chat-area');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatButton = document.getElementById('new-chat-button');
    const roomList = document.getElementById('room-list');
    const headerTitle = document.getElementById('header-title');
    const micButton = document.getElementById('mic-button');
    const attachButton = document.getElementById('attach-button');
    const fileInput = document.getElementById('file-input');

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
            await sleep(20);
        }
    }

    async function streamBotResponse(prompt, botMessageBubble, isFirstMessage = false) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, isFirstMessage })
            });
            if (!res.ok) throw new Error(`サーバーエラー: ${res.status}`);
            const data = await res.json();
            
            if (data.ok && data.text) {
                await typeOutText(data.text, botMessageBubble);
                return data.title; // タイトルがあれば返す
            } else {
                botMessageBubble.innerText = `エラー: ${data.error || 'Unknown error'}`;
                return null;
            }
        } catch (error) {
            console.error('API接続エラー:', error);
            botMessageBubble.innerText = 'エラー: サーバーとの接続に失敗しました。';
            return null;
        }
    }


    function handleSend() {
        if (isReplying) return;
        const text = userInput.value.trim();
        if (!text) return;
        setReplyingState(true);
        
        const currentRoom = rooms[activeRoomId];
        // 初期メッセージ（こんにちは...）を除いてユーザーメッセージが最初かどうかを判定
        const userMessages = currentRoom ? currentRoom.messages.filter(msg => msg.sender === 'user') : [];
        const isFirstMessage = userMessages.length === 0;
        
        saveMessage(text, 'user');
        addMessageToDOM(text, 'user');
        userInput.value = '';
        userInput.style.height = 'auto'; // 送信後に高さをリセット

        const botMessageBubble = addMessageToDOM('', 'bot');
        scrollToBottom();
        streamBotResponse(text, botMessageBubble, isFirstMessage)
            .then((generatedTitle) => {
                const finalBotText = botMessageBubble.innerText;
                saveMessage(finalBotText, 'bot');
                
                // 最初のメッセージでタイトルが生成された場合、更新
                if (isFirstMessage && generatedTitle) {
                    console.log('タイトル生成2:', generatedTitle);
                    generatedTitle = generatedTitle.replace(/^(要約：|タイトル：|概要：|まとめ：|題名：)/g, '').trim();
                    rooms[activeRoomId].title = generatedTitle;
                } else {
                    console.log('タイトル生成スキップ:', { isFirstMessage, generatedTitle });
                }
                
                saveAndRenderAll();
            })
            .catch((err) => {
                console.error("API call failed", err);
                botMessageBubble.innerText = "エラーが発生しました。";
                saveMessage("エラーが発生しました。", 'bot');
            })
            .finally(() => {
                setReplyingState(false);
            });
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            setReplyingState(true);
            
            const currentRoom = rooms[activeRoomId];
            // 初期メッセージ（こんにちは...）を除いてユーザーメッセージが最初かどうかを判定
            const userMessages = currentRoom ? currentRoom.messages.filter(msg => msg.sender === 'user') : [];
            const isFirstMessage = userMessages.length === 0;
            
            saveMessage(imageDataUrl, 'user');
            addMessageToDOM(imageDataUrl, 'user');
            scrollToBottom();
            
            const botMessageBubble = addMessageToDOM('', 'bot');
            scrollToBottom();
            
            // 画像の場合の固定プロンプト
            const imagePrompt = '画像が送信されました。画像について簡単に応答してください。';
            
            streamBotResponse(imagePrompt, botMessageBubble, isFirstMessage)
                .then((generatedTitle) => {
                    const finalBotText = botMessageBubble.innerText;
                    saveMessage(finalBotText, 'bot');
                    
                    if (isFirstMessage && generatedTitle) {
                        console.log('画像チャットのタイトル生成:', generatedTitle);
                        rooms[activeRoomId].title = generatedTitle;
                    } else {
                        console.log('画像チャットのタイトル生成スキップ:', { isFirstMessage, generatedTitle });
                    }
                    
                    saveAndRenderAll();
                })
                .catch((err) => {
                    console.error("API call failed", err);
                })
                .finally(() => {
                    setReplyingState(false);
                });
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }

    function addMessageToDOM(text, sender) {
        const messageRow = document.createElement('div');
        messageRow.className = `message-row ${sender}`;
        const messageBubble = document.createElement('div');
        messageBubble.className = `message-bubble ${sender}`;
        if (text.startsWith('data:image')) {
            messageBubble.innerHTML = `<img src="${text}" alt="送信された画像">`;
        } else {
            messageBubble.innerHTML = text.replace(/\n/g, '<br>');
        }
        messageRow.appendChild(messageBubble);
        chatArea.appendChild(messageRow);
        return messageBubble;
    }

    function saveMessage(text, sender) {
        if (!activeRoomId) return;
        const room = rooms[activeRoomId];
        room.messages.push({ text, sender });
        if (room.messages.length === 1 && sender === 'user') {
            room.title = text.startsWith('data:image') ? '画像チャット' : text.substring(0, 20);
        }
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

    function setReplyingState(locked) { isReplying = locked; sendButton.disabled = locked; }
    function scrollToBottom() { chatArea.scrollTop = chatArea.scrollHeight; }
    function createNewRoom() {
        const newRoomId = `room_${Date.now()}`;
        rooms[newRoomId] = { 
            title: '新しいチャット', 
            messages: [{
                text: 'こんにちは、お手伝いできることはありますか？',
                sender: 'bot'
            }]
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
    attachButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
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
        userInput.style.height = userInput.scrollHeight + 'px';
        scrollToBottom();
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
        };
        recognition.onend = () => {
            micButton.classList.remove('recording');
        };
        micButton.addEventListener('click', () => {
            if (micButton.classList.contains('recording')) {
                recognition.stop();
            } else {
                micButton.classList.add('recording');
                recognition.start();
            }
        });
    } else {
        micButton.style.display = 'none';
    }

    loadRooms();
    saveAndRenderAll();
});