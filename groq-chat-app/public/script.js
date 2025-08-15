// script.js の「じわじわ」強化版

document.addEventListener('DOMContentLoaded', () => {
    const chatArea = document.getElementById('chat-area');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatButton = document.getElementById('new-chat-button');
    const roomList = document.getElementById('room-list');
    const headerTitle = document.getElementById('header-title');
    const micButton = document.getElementById('mic-button');

    const API_BASE_URL = 'http://localhost:3004';

    // ★ 変更点1: タイピング速度を制御するための待機(sleep)関数
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ★ 変更点2: 受け取ったテキストを一文字ずつ表示する関数
    async function typeOutText(text, bubble) {
        // 改行を<br>に変換してから一文字ずつ処理
        const processedText = text.replace(/\n/g, '<br>');
        for (const char of processedText) {
            // <br>タグの場合はまとめて追加
            if (char === '<') {
                const tag = processedText.substring(processedText.indexOf('<'), processedText.indexOf('>') + 1);
                bubble.innerHTML += tag;
                // 'b', 'r', '>' の分、ループをスキップ
                for (let i = 0; i < tag.length -1; i++) continue;
            } else {
                bubble.innerHTML += char;
            }
            scrollToBottom();
            await sleep(50); // ← ここで表示速度を調整！
        }
    }

    async function streamBotResponse(prompt, botMessageBubble) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!res.ok) {
                botMessageBubble.innerHTML = `エラー: サーバーとの接続に失敗しました (HTTP ${res.status})`;
                return;
            }
            
            const data = await res.json();
            
            if (data.ok && data.text) {
                // タイプライター効果で表示
                await typeOutText(data.text, botMessageBubble);
            } else if (data.error) {
                botMessageBubble.innerHTML = `エラー: ${data.error}`;
            } else {
                botMessageBubble.innerHTML = 'エラー: 予期しない応答形式です';
            }
        } catch (error) {
            console.error('Fetch error:', error);
            botMessageBubble.innerHTML = `エラー: 接続に失敗しました`;
        }
    }

    // handleSend関数は変更なし
    function handleSend() {
        if (isReplying) return;
        const text = userInput.value;
        if (!text) return;
        setReplyingState(true);
        saveMessage(text, 'user');
        addMessageToDOM(text, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';
        const botMessageBubble = addMessageToDOM('', 'bot');
        scrollToBottom();
        streamBotResponse(text, botMessageBubble)
            .then(() => {
                const finalBotText = botMessageBubble.innerText;
                saveMessage(finalBotText, 'bot');
                saveAndRenderAll();
            })
            .catch((err) => {
                console.error("Streaming failed", err);
                botMessageBubble.innerText = "エラーが発生しました。";
                saveMessage("エラーが発生しました。", 'bot');
            })
            .finally(() => {
                setReplyingState(false);
            });
    }

    // これ以降の他の関数 (createNewRoom, deleteRoom, etc.) は変更ありません
    // ... (前回の回答と同じコードなので省略) ...
    let rooms = {};
    let activeRoomId = null;
    let isReplying = false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            userInput.dispatchEvent(new Event('input'));
        };
        recognition.onend = () => micButton.classList.remove('recording');

        micButton.addEventListener('click', () => {
            if (micButton.classList.contains('recording')) {
                recognition.stop();
            } else {
                recognition.start();
                micButton.classList.add('recording');
            }
        });
    } else {
        console.warn("Web Speech API not supported.");
        micButton.style.display = 'none';
    }
    
    function saveAndRenderAll() {
        localStorage.setItem('chatRooms', JSON.stringify(rooms));
        localStorage.setItem('activeRoomId', activeRoomId);
        renderRoomList();
        renderActiveRoom();
    }

    function saveMessage(text, sender) {
        if (!activeRoomId) return;
        const room = rooms[activeRoomId];
        room.messages.push({ text, sender });
        if (room.messages.length === 1 && sender === 'user') {
            room.title = text.substring(0, 20);
        }
    }

    function renderRoomList() {
        roomList.innerHTML = "";
        Object.keys(rooms).forEach(roomId => {
            const li = document.createElement('li');
            li.textContent = rooms[roomId].title;
            li.dataset.roomId = roomId;
            if (roomId === activeRoomId) {
                li.classList.add('active');
            }

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-room-button';
            deleteButton.innerHTML = '&times;';
            deleteButton.title = 'チャットを削除';
            deleteButton.dataset.roomId = roomId;

            li.appendChild(deleteButton);
            roomList.appendChild(li);
        });
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
    
    function setReplyingState(locked) {
        isReplying = locked;
        //userInput.disabled = locked;
        sendButton.disabled = locked;
    }

    function scrollToBottom() {
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    function createNewRoom() {
        const newRoomId = `room_${Date.now()}`;
        rooms[newRoomId] = { title: '新しいチャット', messages: [] };
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

    loadRooms();
    saveAndRenderAll();
});