import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, User, MessageCircle, AlertCircle, Loader } from 'lucide-react';
import apiService from '../services/api';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: string;
  timestamp: string;
  read: boolean;
}

interface ChatInterfaceProps {
  memberId: string | null;
  memberName: string;
  conversationId: string | null;
  onBack: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  memberId, 
  memberName, 
  conversationId: initialConversationId, 
  onBack 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getCurrentUser();
    if (memberId) {
      initializeChat();
    }
  }, [memberId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newMessage]);

  const getCurrentUser = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      setLoading(true);
      setError(null);

      let chatConversationId = conversationId;

      if (!chatConversationId && memberId) {
        const response = await apiService.createConversation(memberId);
        if (response.data) {
          chatConversationId = response.data.id;
          setConversationId(chatConversationId);
        }
      }

      if (chatConversationId) {
        await loadMessages(chatConversationId);
      }

    } catch (error: any) {
      console.error('Error initializing chat:', error);
      if (error.response?.status === 403) {
        setError('You can only chat with connected team members. Please send a connection request first.');
      } else {
        setError('Failed to initialize chat. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const response = await apiService.getMessages(convId);
      if (response.data) {
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages.');
    }
  };

  const sendMessage = async () => {
    const messageText = newMessage.trim();
    if (!messageText || !conversationId || sending) return;

    setSending(true);

    try {
      const response = await apiService.sendMessage(conversationId, messageText);
      if (response.data) {
        // Type assertion to ensure response.data is treated as Message type
        const newMessageObj = response.data as Message;
        setMessages(prev => [...prev, newMessageObj]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  const isMyMessage = (senderId: string) => senderId === currentUserId;

  if (loading) {
    return (
      <div className="bg-[#0f172a] text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-300">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] text-white min-h-screen flex flex-col font-['Inter']">
      {/* Header */}
      <div className="bg-[#1e293b] border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 rounded-lg hover:bg-[#334155] transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-3">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white">{memberName}</h2>
              <p className="text-sm text-green-400">Connected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border-b border-red-500/50 p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-300 text-sm">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">Start a conversation</h3>
            <p className="text-gray-500">Send a message to {memberName} to begin chatting</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isMine = isMyMessage(message.sender_id);
              const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div className={`flex ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[70%]`}>
                    {showAvatar && !isMine && (
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-2 mb-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    
                    <div className={`${!showAvatar && !isMine ? 'ml-10' : ''}`}>
                      {/* Message Bubble */}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-[#374151] text-white rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      
                      {/* Timestamp */}
                      <p className={`text-xs text-gray-500 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                        {formatMessageTime(message.timestamp)}
                        {isMine && (
                          <span className="ml-1">
                            {message.read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-[#1e293b] border-t border-gray-700 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 bg-[#0f172a] rounded-lg border border-gray-700 focus-within:border-indigo-500">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${memberName}...`}
              rows={1}
              className="w-full px-4 py-3 bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none max-h-32"
              disabled={sending}
            />
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-3 rounded-lg transition flex items-center justify-center"
          >
            {sending ? (
              <Loader className="animate-spin h-5 w-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;