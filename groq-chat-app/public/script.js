const chatArea = document.getElementById('chat-area');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// 返信中かどうかの状態を管理する変数
let isReplying = false;

// メッセージ送信のメイン関数
function handleSend() {
    // 返信中は処理を中断
    if (isReplying) return;

    const text = userInput.value.trim();
    if (!text) return;

    // ★ 1. ロックを開始
    setReplyingState(true);

    addMessage(text, 'user');
    userInput.value = '';

    // ボットの応答をシミュレート
    setTimeout(() => {
        addMessage('これはBotのダミー応答です。', 'bot');
        // ★ 2. ロックを解除
        setReplyingState(false);
    }, 1500);
}

// UIのロック状態を切り替える関数
function setReplyingState(locked) {
    isReplying = locked;
    userInput.disabled = locked;
    sendButton.disabled = locked;
    if(locked) {
        userInput.placeholder = "返信を待っています...";
    } else {
        userInput.placeholder = "メッセージを入力...";
    }
}

// 画面にメッセージ要素を追加する関数
function addMessage(text, sender) {
    const messageRow = document.createElement('div');
    const messageBubble = document.createElement('div');

    messageRow.classList.add('message-row', sender);
    messageBubble.classList.add('message-bubble', sender);
    messageBubble.textContent = text;
    
    // 返信待ちの「...」を削除する処理（おまけ）
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    
    messageRow.appendChild(messageBubble);
    chatArea.appendChild(messageRow);

    // 返信待ちの「...」を表示する処理（おまけ）
    if(sender === 'user') {
        const indicatorRow = document.createElement('div');
        indicatorRow.id = 'typing-indicator';
        indicatorRow.innerHTML = `<div class="message-row bot"><div class="message-bubble bot">...</div></div>`;
        chatArea.appendChild(indicatorRow);
    }

    chatArea.scrollTop = chatArea.scrollHeight;
}

sendButton.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSend();
    }
});