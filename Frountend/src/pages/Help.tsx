import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  Settings,
  Lightbulb,
  TrendingUp,
  Users,
  DollarSign,
  MapPin,
  Brain,
  Target,
  Search,
  FileText,
  Rocket,
  Award,
  Zap,
  Shield,
  Clock,
  Star,
  MessageSquare,
  Mic,
  MicOff,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  ChevronRight,
  Activity,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX
} from 'lucide-react';

// Enhanced Types
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  intent?: string;
  entities?: any;
  followUps?: string[];
  confidence?: number;
  isTyping?: boolean;
}

interface ChatSession {
  session_id: string;
  messages: Message[];
  created_at: string;
  last_activity: string;
}

interface SuggestedAction {
  text: string;
  icon: React.ReactNode;
  category: string;
  description: string;
  gradient: string;
}

const Help = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [chatStats, setChatStats] = useState({ 
    interactions: 0, 
    sessions: 1, 
    avgResponse: '1.2s',
    confidence: 95 
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Enhanced suggestions with gradients and better categorization
  const suggestedActions: SuggestedAction[] = [
    { 
      text: "What is Startup GPS and how does it help founders?", 
      icon: <Lightbulb className="w-4 h-4" />, 
      category: "getting-started",
      description: "Learn about our AI-powered entrepreneurial platform",
      gradient: "from-yellow-400 to-orange-500"
    },
    { 
      text: "Validate my startup idea with AI analysis", 
      icon: <TrendingUp className="w-4 h-4" />, 
      category: "validation",
      description: "Get comprehensive AI-powered idea validation",
      gradient: "from-blue-400 to-cyan-500"
    },
    { 
      text: "Connect me with experienced mentors", 
      icon: <Users className="w-4 h-4" />, 
      category: "mentorship",
      description: "Access our network of 500+ verified mentors",
      gradient: "from-green-400 to-emerald-500"
    },
    { 
      text: "Find funding opportunities and investors", 
      icon: <DollarSign className="w-4 h-4" />, 
      category: "funding",
      description: "Connect with 5000+ active investors",
      gradient: "from-purple-400 to-pink-500"
    },
    { 
      text: "Generate a strategic roadmap for my startup", 
      icon: <MapPin className="w-4 h-4" />, 
      category: "roadmap",
      description: "Create phase-by-phase execution plans",
      gradient: "from-indigo-400 to-blue-500"
    },
    { 
      text: "Access research papers for my industry", 
      icon: <FileText className="w-4 h-4" />, 
      category: "research",
      description: "Search through 10M+ academic papers",
      gradient: "from-teal-400 to-cyan-500"
    }
  ];

  const categories = [
    { id: 'all', name: 'All', icon: <Sparkles className="w-4 h-4" />, color: 'text-white' },
    { id: 'getting-started', name: 'Getting Started', icon: <Lightbulb className="w-4 h-4" />, color: 'text-yellow-400' },
    { id: 'validation', name: 'Validation', icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-400' },
    { id: 'mentorship', name: 'Mentorship', icon: <Users className="w-4 h-4" />, color: 'text-green-400' },
    { id: 'funding', name: 'Funding', icon: <DollarSign className="w-4 h-4" />, color: 'text-purple-400' },
    { id: 'roadmap', name: 'Roadmap', icon: <MapPin className="w-4 h-4" />, color: 'text-indigo-400' },
    { id: 'research', name: 'Research', icon: <FileText className="w-4 h-4" />, color: 'text-teal-400' }
  ];

  // Enhanced welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      text: "Welcome to Startup GPS! I'm your AI-powered entrepreneurial assistant. I can help you with startup validation, mentorship connections, funding opportunities, strategic planning, and much more. What would you like to explore today?",
      sender: 'bot',
      timestamp: new Date().toISOString(),
      confidence: 1.0,
      intent: 'greeting',
      followUps: [
        'What is Startup GPS?',
        'Help me validate my idea',
        'Find me a mentor',
        'Show me funding options'
      ]
    };
    setMessages([welcomeMessage]);
  }, []);

  // Auto scroll
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Enhanced send message function
  const sendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    setShowSuggestions(false);
    setError('');

    const startTime = Date.now();

    try {
      // Using your existing chat endpoint
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const responseTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // Update stats
      setChatStats(prev => ({
        interactions: prev.interactions + 1,
        sessions: prev.sessions,
        avgResponse: `${responseTime}s`,
        confidence: 95
      }));

      // Simulate typing delay
      const typingDelay = Math.min(2000, Math.max(1000, data.reply.length * 10));
      
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.reply,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          intent: data.intent || 'general',
          confidence: 0.95,
          followUps: data.follow_ups || ['Tell me more', 'What else can you help with?', 'How do I get started?']
        };

        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, typingDelay);

    } catch (error: any) {
      console.error('Chat error:', error);
      setError('Connection issue detected. Please check your backend server.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now. Please make sure your backend server is running on localhost:8000. In the meantime, I can tell you that Startup GPS offers AI-powered startup validation, mentorship connections, funding opportunities, and strategic planning tools.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
        confidence: 1.0,
        intent: 'error',
        followUps: ['Try again', 'Learn more about features', 'Check server status']
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Voice input toggle (mock implementation)
  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        setInput("Help me with my startup");
        inputRef.current?.focus();
      }, 3000);
    }
  };

  // Handle keyboard input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear chat function
  const clearChat = () => {
    if (messages.length > 1) {
      const confirmClear = window.confirm('Are you sure you want to clear the conversation?');
      if (!confirmClear) return;
    }

    setMessages([]);
    setSessionId('');
    setShowSuggestions(true);
    setError('');
    setChatStats(prev => ({ 
      ...prev, 
      sessions: prev.sessions + 1,
      interactions: 0 
    }));
    
    setTimeout(() => {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: "Fresh start! How can I help you with your startup journey today?",
        sender: 'bot',
        timestamp: new Date().toISOString(),
        confidence: 1.0,
        followUps: ['What is Startup GPS?', 'Validate my idea', 'Find mentors', 'Get funding help']
      };
      setMessages([welcomeMessage]);
    }, 200);
  };

  // Filter suggestions
  const filteredSuggestions = currentCategory === 'all' 
    ? suggestedActions 
    : suggestedActions.filter(action => action.category === currentCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="text-center pt-8 pb-6 px-4">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <MessageCircle className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl sm:text-6xl font-extrabold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-sm text-blue-400 font-medium mt-1">
                Powered by Startup GPS AI
              </p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex flex-wrap justify-center items-center gap-4 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/30">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">{chatStats.interactions} interactions</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/30">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Avg: {chatStats.avgResponse}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/30">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">Confidence: {chatStats.confidence}%</span>
            </div>
          </div>

          <p className="text-lg text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Your intelligent entrepreneurial companion for startup success.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Chat Container */}
            <div className="lg:col-span-3 bg-gray-800/30 backdrop-blur-xl rounded-3xl border border-gray-700/20 shadow-2xl overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700/30 bg-gradient-to-r from-gray-800/60 to-gray-800/40">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-xl">Startup GPS AI</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Online • Ready to help</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-3 rounded-xl transition-all ${
                      soundEnabled 
                        ? 'text-blue-400 bg-blue-500/10' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={toggleVoiceInput}
                    className={`p-3 rounded-xl transition-all ${
                      isListening 
                        ? 'bg-red-500/20 text-red-400 animate-pulse' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  
                  <button
                    onClick={clearChat}
                    className="p-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              <div className="h-[600px] flex flex-col">
                {/* Error Display */}
                {error && (
                  <div className="mx-6 mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-4 ${
                        message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                          : 'bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500'
                      }`}>
                        {message.sender === 'user' ? (
                          <User className="w-6 h-6 text-white" />
                        ) : (
                          <Bot className="w-6 h-6 text-white" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={`max-w-[85%] ${message.sender === 'user' ? 'text-right' : ''}`}>
                        <div className={`px-6 py-4 rounded-3xl shadow-xl backdrop-blur-sm border ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-lg border-blue-400/20'
                            : 'bg-gray-700/40 text-gray-100 rounded-bl-lg border-gray-600/30'
                        }`}>
                          <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                            {message.text}
                          </p>
                        </div>
                        
                        {/* Follow-up suggestions */}
                        {message.followUps && message.followUps.length > 0 && message.sender === 'bot' && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.followUps.map((followUp, index) => (
                              <button
                                key={index}
                                onClick={() => sendMessage(followUp)}
                                className="px-3 py-1.5 text-xs bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors border border-white/30"
                              >
                                {followUp}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className={`mt-1 text-xs text-white/50 ${
                          message.sender === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div className="bg-gray-700/40 px-6 py-4 rounded-3xl rounded-bl-lg border border-gray-600/30">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Suggestions */}
                {showSuggestions && messages.length <= 1 && (
                  <div className="p-6 border-t border-gray-700/30 bg-gray-800/20">
                    {/* Category filters */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setCurrentCategory(category.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
                            currentCategory === category.id
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                              : 'bg-gray-700/30 text-gray-400 hover:bg-gray-600/40 border border-gray-600/20'
                          }`}
                        >
                          {category.icon}
                          {category.name}
                        </button>
                      ))}
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-4">
                      Choose from our popular startup assistance options:
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => sendMessage(suggestion.text)}
                          className="group flex items-start space-x-4 p-4 bg-gray-700/20 hover:bg-gray-700/40 rounded-2xl transition-all border border-gray-600/20 hover:border-gray-500/40 text-left"
                        >
                          <div className={`w-10 h-10 bg-gradient-to-r ${suggestion.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                            {suggestion.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white text-sm mb-1">
                              {suggestion.text}
                            </h3>
                            <p className="text-xs text-gray-400">
                              {suggestion.description}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 border-t border-gray-700/30 bg-gray-800/30">
                <div className="flex items-end space-x-4">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        isListening 
                          ? "Listening... Speak your question" 
                          : "Ask me anything about your startup journey..."
                      }
                      className={`w-full px-6 py-4 bg-gray-700/40 backdrop-blur-sm border rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent resize-none min-h-[60px] max-h-40 transition-all ${
                        isListening 
                          ? 'border-red-400/60 bg-red-500/5 focus:ring-red-400/50 animate-pulse' 
                          : 'border-gray-600/40 focus:ring-blue-500'
                      }`}
                      rows={1}
                      disabled={isLoading || isListening}
                      maxLength={2000}
                    />

                    {/* Voice input indicator */}
                    {isListening && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500/5 rounded-2xl">
                        <div className="flex items-center gap-3 text-red-400">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm font-medium">Listening...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading || isListening}
                    className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-all shadow-xl"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <Send className="w-6 h-6" />
                    )}
                  </button>
                </div>
                
                <div className="mt-4 text-xs text-gray-500 text-center">
                  Powered by Startup GPS AI • Your entrepreneurial co-pilot
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Actions */}
              <div className="bg-gray-800/30 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/20">
                <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {[
                    { text: "Validate My Idea", action: "Validate my startup idea", icon: TrendingUp },
                    { text: "Find Mentors", action: "Connect me with mentors", icon: Users },
                    { text: "Get Funding Help", action: "Help me find funding", icon: DollarSign },
                    { text: "Create Roadmap", action: "Generate a roadmap", icon: MapPin }
                  ].map((action, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(action.action)}
                      className="w-full text-left p-3 bg-gray-700/20 hover:bg-gray-700/40 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <action.icon className="w-5 h-5 text-blue-400" />
                        <span className="text-sm text-white">{action.text}</span>
                        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 ml-auto" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Help Section */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-3xl p-6 border border-blue-500/20">
                <h3 className="text-xl font-bold text-white mb-4">Need Help?</h3>
                <p className="text-sm text-gray-300 mb-4">
                  I'm available 24/7 to help with your startup journey.
                </p>
                <button
                  onClick={() => sendMessage("Tell me about all your features and how you can help me")}
                  className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-4 py-2 rounded-xl transition-all border border-blue-400/40"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;