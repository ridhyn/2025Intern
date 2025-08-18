import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  View,
  Text,
  ScrollView,
  Dimensions,
} from 'react-native';
import { chat } from '@/backend/client';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

type ChatRoom = {
  id: string;
  name: string;
  messages: Message[];
};

export default function ChatScreen() {
  console.log('🚀 ChatScreen component is rendering! - UPDATE TEST');
  const [rooms, setRooms] = useState<ChatRoom[]>([
    { id: '1', name: 'メインチャット', messages: [] }
  ]);
  const [activeRoomId, setActiveRoomId] = useState('1');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const activeRoom = rooms.find(room => room.id === activeRoomId);
  const messages = activeRoom?.messages || [];

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
    };
    
    setRooms(prevRooms => 
      prevRooms.map(room => 
        room.id === activeRoomId 
          ? { ...room, messages: [...room.messages, newMessage] }
          : room
      )
    );
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    addMessage(userMessage, true);
    setIsLoading(true);

    try {
      const response = await chat({ prompt: userMessage });
      
      if (response.ok && response.text) {
        addMessage(response.text, false);
      } else {
        addMessage(`エラー: ${response.error || '予期しないエラーが発生しました'}`, false);
      }
    } catch (error) {
      console.error('Chat error:', error);
      addMessage('エラー: サーバーとの接続に失敗しました', false);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewRoom = () => {
    const newRoom: ChatRoom = {
      id: Date.now().toString(),
      name: `チャット ${rooms.length + 1}`,
      messages: []
    };
    setRooms(prev => [...prev, newRoom]);
    setActiveRoomId(newRoom.id);
  };

  const deleteRoom = (roomId: string) => {
    if (rooms.length <= 1) return;
    setRooms(prev => prev.filter(room => room.id !== roomId));
    if (activeRoomId === roomId) {
      setActiveRoomId(rooms[0].id);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      // メッセージが追加されたら下端にスクロール
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages]);

  // 長いメッセージでもコンテンツが確実に表示されるよう、レンダリング後にもスクロール
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  return (
    <View style={styles.pageContainer}>
      {/* サイドバー */}
      <View style={styles.sidebar}>
        <TouchableOpacity style={styles.newChatButton} onPress={createNewRoom}>
          <Text style={styles.newChatButtonText}>+ 新しいチャット</Text>
        </TouchableOpacity>
        
        <ScrollView style={styles.roomList}>
          {rooms.map(room => (
            <TouchableOpacity
              key={room.id}
              style={[
                styles.roomItem,
                activeRoomId === room.id && styles.roomItemActive
              ]}
              onPress={() => setActiveRoomId(room.id)}
            >
              <Text style={styles.roomItemText} numberOfLines={1}>
                {room.name}
              </Text>
              {rooms.length > 1 && (
                <TouchableOpacity
                  style={styles.deleteRoomButton}
                  onPress={() => deleteRoom(room.id)}
                >
                  <Text style={styles.deleteRoomButtonText}>×</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* メインチャットエリア */}
      <View style={styles.appContainer}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {activeRoom?.name || 'チャット'}
          </Text>
        </View>

        {/* チャットメッセージエリア */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatAreaContent}
        >
          {messages.map(message => (
            <View 
              key={message.id}
              style={[
                styles.messageRow,
                message.isUser ? styles.messageRowUser : styles.messageRowBot
              ]}
            >
              <View 
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.messageBubbleUser : styles.messageBubbleBot
                ]}
              >
                <Text style={[
                  styles.messageText,
                  message.isUser ? styles.messageTextUser : styles.messageTextBot
                ]}>
                  {message.text}
                </Text>
              </View>
            </View>
          ))}
          {isLoading && (
            <View style={[styles.messageRow, styles.messageRowBot]}>
              <View style={[styles.messageBubble, styles.messageBubbleBot, styles.typingIndicator]}>
                <Text style={[styles.messageText, styles.messageTextBot, styles.typingText]}>
                  AIが入力中...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* フッター入力エリア */}
        <View style={styles.footer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.iconButtonText}>📎</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.iconButtonText}>🎤</Text>
            </TouchableOpacity>
            
            <TextInput
              style={styles.userInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="メッセージを入力..."
              placeholderTextColor="#999"
              multiline
              onSubmitEditing={sendMessage}
              editable={!isLoading}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: '#f0f2f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  
  // サイドバースタイル
  sidebar: {
    width: 280,
    backgroundColor: '#fff',
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  newChatButton: {
    backgroundColor: '#f0f2f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  newChatButtonText: {
    color: 'black',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
  },
  roomList: {
    flex: 1,
  },
  roomItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomItemActive: {
    backgroundColor: '#e9e9e9',
  },
  roomItemText: {
    color: 'black',
    fontSize: 14,
    flex: 1,
  },
  deleteRoomButton: {
    padding: 5,
    borderRadius: 5,
  },
  deleteRoomButtonText: {
    color: '#999',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // メインエリアスタイル
  appContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#f0f2f5',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
  },
  
  // チャットエリアスタイル
  chatArea: {
    flex: 1,
    backgroundColor: '#8cb8c3',
  },
  chatAreaContent: {
    padding: 20,
    paddingBottom: 30,
  },
  messageRow: {
    width: '100%',
    marginVertical: 6,
  },
  messageRowUser: {
    alignItems: 'flex-end',
  },
  messageRowBot: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: 300,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageBubbleUser: {
    backgroundColor: '#ff6b6b',
  },
  messageBubbleBot: {
    backgroundColor: '#4ecdc4',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    lineHeight: 18,
    fontSize: 15,
    textAlign: 'left',
  },
  messageTextUser: {
    color: 'black',
  },
  messageTextBot: {
    color: 'black',
  },
  typingIndicator: {
    opacity: 0.7,
  },
  typingText: {
    fontStyle: 'italic',
    color: '#666',
  },
  
  // フッタースタイル
  footer: {
    backgroundColor: '#f0f2f5',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 20,
    color: '#555',
  },
  userInput: {
    width: 200,
    borderWidth: 3,
    borderColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 14,
    backgroundColor: 'yellow',
    color: 'blue',
    minHeight: 30,
    maxHeight: 60,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#007bff',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#b0c4de',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});