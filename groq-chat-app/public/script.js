// public/script.js

// ... (chatArea, userInput, sendButton の取得は変更なし) ...
const chatArea = document.getElementById('chat-area');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// ★ マイクボタンの要素を取得
const micButton = document.getElementById('mic-button');

let isReplying = false;

// --- ここから音声認識のコード ---

// ブラウザがWeb Speech APIをサポートしているかチェック
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    // 音声認識のインスタンスを作成
    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';         // 言語を日本語に設定
    recognition.interimResults = true;  // 認識の途中結果も取得する
    recognition.continuous = false;     // 発話が終了したら認識を自動で終了する

    // ★ 音声認識の結果が得られたときのイベント
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        // 最終結果をテキストエリアに設定
        userInput.value = finalTranscript || interimTranscript;
        // テキストエリアの高さを自動調整
        userInput.dispatchEvent(new Event('input'));
    };

    // ★ 音声認識が終了したときのイベント
    recognition.onend = () => {
        micButton.classList.remove('recording'); // 録音中のスタイルを削除
    };

    // ★ マイクボタンがクリックされたときの処理
    micButton.addEventListener('click', () => {
        if (micButton.classList.contains('recording')) {
            recognition.stop(); // 録音中なら停止
        } else {
            recognition.start(); // 録音中でなければ開始
            micButton.classList.add('recording'); // 録音中のスタイルを追加
        }
    });

} else {
    // APIがサポートされていない場合はマイクボタンを非表示にする
    console.warn("Web Speech API is not supported in this browser.");
    micButton.style.display = 'none';
}


// --- ここから下のコードは変更なし ---

function handleSend() {
    // ... (変更なし)
}
// ... (setReplyingState, addMessage, 各種イベントリスナーも変更なし)
function handleSend() {
    if (isReplying) return;
    const text = userInput.value;
    if (!text) return;
    setReplyingState(true);
    addMessage(text, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    setTimeout(() => {
        setReplyingState(false);
        addMessage('これはBotのダミー応答です。', 'bot');
    }, 1500);
}
function setReplyingState(locked) {
    isReplying = locked;
    userInput.disabled = locked;
    sendButton.disabled = locked;
    const typingIndicator = document.getElementById('typing-indicator');
    if (locked) {
        userInput.placeholder = "返信を待っています...";
        if (!typingIndicator) {
            const indicatorRow = document.createElement('div');
            indicatorRow.id = 'typing-indicator';
            indicatorRow.innerHTML = `<div class="message-row bot"><div class="message-bubble bot">...</div></div>`;
            chatArea.appendChild(indicatorRow);
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    } else {
        userInput.placeholder = "メッセージを入力...";
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}
function addMessage(text, sender) {
    const messageRow = document.createElement('div');
    const messageBubble = document.createElement('div');
    messageRow.classList.add('message-row', sender);
    messageBubble.classList.add('message-bubble', sender);
    messageBubble.innerHTML = text.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    messageRow.appendChild(messageBubble);
    chatArea.appendChild(messageRow);
    if(sender === 'user') {
        const indicatorRow = document.createElement('div');
        indicatorRow.id = 'typing-indicator';
        indicatorRow.innerHTML = `<div class="message-row bot"><div class="message-bubble bot">...</div></div>`;
        chatArea.appendChild(indicatorRow);
    }
    chatArea.scrollTop = chatArea.scrollHeight;
}
sendButton.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        handleSend();
    }
});
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight) + 'px';
});