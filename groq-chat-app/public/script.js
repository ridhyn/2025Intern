document.addEventListener('DOMContentLoaded', () => {

    const chatArea = document.getElementById('chat-area');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatButton = document.getElementById('new-chat-button');
    const roomList = document.getElementById('room-list');
    const headerTitle = document.getElementById('header-title');
    const micButton = document.getElementById('mic-button');

   
    let rooms = {};         // すべてのチャットルームのデータを保持するオブジェクト
    let activeRoomId = null; // 現在表示しているチャットルームのID
    let isReplying = false;   // ボットが返信中で、ユーザーの入力をロックしているか

   
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    // ブラウザがAPIをサポートしている場合のみ初期化
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = true; // 認識の途中結果を取得
        recognition.continuous = false;    // 発話が途切れたら認識を終了
    } else {
        console.warn("このブラウザはWeb Speech APIをサポートしていません。");
        micButton.style.display = 'none'; // サポート外ならマイクボタンを非表示
    }

   

    /**
     * @brief 送信ボタンが押されたときのメイン処理
     */
    function handleSend() {
        if (isReplying) return; // 返信中は処理を中断

        // ★ .trim() を削除して、スペースのみの入力を許可
        const text = userInput.value; 

        if (!text) return; // 入力が完全に空の場合（スペースも何もない場合）は処理を中断

        setReplyingState(true); // UIをロック状態にする

        // ユーザーのメッセージを保存・表示
        saveMessage(text, 'user');
        addMessageToDOM(text, 'user');
        scrollToBottom();

        // 送信後に入力欄をリセット
        userInput.value = '';
        userInput.style.height = 'auto';

        // バックエンドへ問い合わせ
        fetchChatResponse(text)
            .then((botResponse) => {
                saveMessage(botResponse, 'bot');
                addMessageToDOM(botResponse, 'bot');
                scrollToBottom();
                saveAndRenderAll(); // タイトル更新などを反映させるため再描画
            })
            .catch((err) => {
                const errMsg = `エラー: ${err && err.message ? err.message : String(err)}`;
                saveMessage(errMsg, 'bot');
                addMessageToDOM(errMsg, 'bot');
                scrollToBottom();
                saveAndRenderAll();
            })
            .finally(() => {
                setReplyingState(false); // UIのロックを解除
            });
    }

    /**
     * @brief 新しいチャットルームを作成する
     */
    function createNewRoom() {
        const newRoomId = `room_${Date.now()}`;
        rooms[newRoomId] = {
            title: '新しいチャット',
            messages: []
        };
        activeRoomId = newRoomId;
        saveAndRenderAll();
    }
    
    /**
     * @brief 指定されたチャットルームを削除する
     * @param {string} roomIdToDelete - 削除するルームのID
     */
    function deleteRoom(roomIdToDelete) {
        if (!confirm(`「${rooms[roomIdToDelete].title}」を削除しますか？この操作は取り消せません。`)) {
            return;
        }

        delete rooms[roomIdToDelete]; // データから削除

        // もしアクティブなルームを削除した場合の処理
        if (activeRoomId === roomIdToDelete) {
            const remainingRoomIds = Object.keys(rooms);
            if (remainingRoomIds.length > 0) {
                // 残っているルームの先頭を新しいアクティブなルームにする
                activeRoomId = remainingRoomIds[0];
            } else {
                // ルームが一つもなくなったら、新しいルームを作成する
                createNewRoom();
                return; // createNewRoomの中で再描画まで行われる
            }
        }
        
        saveAndRenderAll(); // 変更を保存して画面全体を更新
    }

    // ----------------------------------------------------------------
    // 5. データの保存と読み込みに関する関数 (LocalStorage)
    // ----------------------------------------------------------------

    /**
     * @brief ブラウザのLocalStorageからチャットデータを読み込む
     */
    function loadRooms() {
        try {
            const savedRooms = localStorage.getItem('chatRooms');
            if (savedRooms) {
                rooms = JSON.parse(savedRooms);
            }
        } catch (e) {
            console.error("チャット履歴の読み込みに失敗しました。", e);
            rooms = {}; // エラー時は空にする
        }

        // 最後のルームがない場合は新しいルームを作成
        if (Object.keys(rooms).length === 0) {
            createNewRoom();
        }

        const savedActiveRoom = localStorage.getItem('activeRoomId');
        // 最後に開いていたルーム、または最初のルームをアクティブにする
        activeRoomId = savedActiveRoom && rooms[savedActiveRoom] ? savedActiveRoom : Object.keys(rooms)[0];
    }

    /**
     * @brief 現在のチャットデータをLocalStorageに保存し、画面全体を再描画する
     */
    function saveAndRenderAll() {
        localStorage.setItem('chatRooms', JSON.stringify(rooms));
        localStorage.setItem('activeRoomId', activeRoomId);
        renderRoomList();
        renderActiveRoom();
    }
    
    /**
     * @brief メッセージを現在のルームのデータとして保存する
     * @param {string} text - メッセージ内容
     * @param {'user' | 'bot'} sender - 送信者
     */
    function saveMessage(text, sender) {
        if (!activeRoomId) return;
        
        const room = rooms[activeRoomId];
        room.messages.push({ text, sender });

        // 最初のユーザーメッセージの場合、それをルームのタイトルにする
        if (room.messages.length === 1 && sender === 'user') {
            room.title = text.substring(0, 20); // 最初の20文字
        }
    }
    
    // ----------------------------------------------------------------
    // 6. 画面の表示を更新する関数 (UI)
    // ----------------------------------------------------------------

    /**
     * @brief サイドバーのルーム一覧を最新のデータで描画する
     */
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

    /**
     * @brief 現在アクティブなルームの会話履歴をチャットエリアに描画する
     */
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

    /**
     * @brief 1つのメッセージをDOM要素としてチャットエリアの末尾に追加する
     * @param {string} text - メッセージ内容
     * @param {'user' | 'bot'} sender - 送信者
     */
    function addMessageToDOM(text, sender) {
        const messageRow = document.createElement('div');
        messageRow.className = `message-row ${sender}`;

        const messageBubble = document.createElement('div');
        messageBubble.className = `message-bubble ${sender}`;
        messageBubble.innerHTML = text.replace(/\n/g, '<br>');

        messageRow.appendChild(messageBubble);
        chatArea.appendChild(messageRow);
    }
    
    /**
     * @brief ユーザーの入力状態（ロック/解除）をUIに反映させる
     * @param {boolean} locked - trueならロック、falseなら解除
     */
    function setReplyingState(locked) {
        isReplying = locked;
        userInput.disabled = locked;
        sendButton.disabled = locked;
    }

    /**
     * @brief チャットエリアを一番下までスクロールする
     */
    function scrollToBottom() {
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    // ----------------------------------------------------------------
    // 7. イベントリスナーの設定
    // ----------------------------------------------------------------

    // 「新しいチャット」ボタン
    newChatButton.addEventListener('click', createNewRoom);

    // ルームリストのクリック（ルーム切り替え、または削除）
    roomList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('delete-room-button')) {
            e.stopPropagation(); // liへのイベント伝播を防ぐ
            const roomId = target.dataset.roomId;
            if (roomId) deleteRoom(roomId);
            return;
        }
        if (target.tagName === 'LI') {
            const roomId = target.dataset.roomId;
            if (roomId && roomId !== activeRoomId) {
                activeRoomId = roomId;
                saveAndRenderAll();
            }
        }
    });

    // 送信ボタン
    sendButton.addEventListener('click', handleSend);

    // テキストエリアのキーボード操作
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.shiftKey) { // Shift + Enterで送信
            e.preventDefault();
            handleSend();
        }
    });
    
    // テキストエリアの自動伸縮
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${userInput.scrollHeight}px`;
    });
    
    // 音声認識のイベント
    if (recognition) {
        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            userInput.dispatchEvent(new Event('input')); // 高さを更新
        };
        recognition.onend = () => {
            micButton.classList.remove('recording');
        };
        micButton.addEventListener('click', () => {
            if (micButton.classList.contains('recording')) {
                recognition.stop();
            } else {
                recognition.start();
                micButton.classList.add('recording');
            }
        });
    }
    
    // ----------------------------------------------------------------
    // 8. 初期化処理
    // ----------------------------------------------------------------
    loadRooms();
    saveAndRenderAll();
});