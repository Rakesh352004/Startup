import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Send, Bot, User, Lightbulb, FileText, MapPin, Users,
  Clock, Trash2, X, Sparkles, Mail, Loader2, CheckCircle2, AlertCircle, ExternalLink
} from 'lucide-react';

const API_BASE_URL = "http://localhost:8000";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  data?: any;
  followUps?: string[];
  isAction?: boolean;
  actionStatus?: 'processing' | 'complete' | 'error';
}

interface WelcomeData {
  user: {
    name: string;
    email?: string;
    authenticated: boolean;
  };
  stats: {
    ideas: number;
    roadmaps: number;
    research: number;
  };
  features: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
}

const adminContacts = [
  { name: "Rakesh V", email: "rakeshyadav352004@gmail.com", role: "Lead Developer" },
  { name: "Padmashree MM", email: "padmashree1384@gmail.com", role: "Backend Engineer" },
  { name: "Peddinti Mohammad", email: "mohammadaslam62819@gmail.com", role: "Frontend Developer" },
  { name: "Rakshitha S", email: "rakshitha2735@gmail.com", role: "UI/UX Designer" }
];

const ContactAdminModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mail className="w-6 h-6 text-cyan-400" />
              Contact Admin Team
            </h2>
            <p className="text-gray-400 text-sm mt-1">Reach out for support and assistance</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-400 hover:text-white transition-all flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {adminContacts.map((admin, index) => (
            <div
              key={index}
              className="p-5 rounded-xl bg-slate-700/50 border border-slate-600 hover:border-cyan-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{admin.name}</h3>
                  <p className="text-sm text-cyan-400">{admin.role}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-xl font-bold">
                  {admin.name.charAt(0)}
                </div>
              </div>
              
              <a
                href={`mailto:${admin.email}`}
                className="flex items-center text-gray-300 hover:text-cyan-400 transition-colors text-sm group"
              >
                <Mail className="w-4 h-4 mr-2" />
                <span className="group-hover:underline">{admin.email}</span>
                <ExternalLink className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-700/30">
          <p className="text-sm text-gray-400 text-center">
            Our team typically responds within 24 hours
          </p>
        </div>
      </div>
    </div>
  );
};

const ValidationDisplay = ({ data }: any) => {
  const result = data.result;
  const scores = result.scores;
  
  return (
    <div className="mt-3 bg-slate-700/50 rounded-lg p-4 border border-cyan-500/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">Overall Score</span>
        <div className="flex items-center space-x-2">
          <div className="text-3xl font-bold text-cyan-400">{result.overall_score}</div>
          <div className="text-gray-500">/100</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(scores).filter(([key]) => key !== 'overall').map(([key, value]: any) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
              <span className="text-cyan-300">{value}%</span>
            </div>
            <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RoadmapDisplay = ({ data }: any) => {
  const phases = data.result.phases || [];
  
  return (
    <div className="mt-3 bg-slate-700/50 rounded-lg p-4 border border-cyan-500/30">
      <div className="flex items-center space-x-2 mb-3">
        <MapPin className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-cyan-300">{phases.length} Phase Roadmap</span>
      </div>
      <div className="space-y-2">
        {phases.slice(0, 3).map((phase: any, idx: number) => (
          <div key={idx} className="flex items-start space-x-2 p-2 bg-slate-600/50 rounded">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs text-cyan-400 font-bold flex-shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{phase.title}</div>
              <div className="text-xs text-gray-400">{phase.timeframe}</div>
            </div>
          </div>
        ))}
      </div>
      {phases.length > 3 && (
        <div className="mt-2 text-xs text-center text-gray-500">
          +{phases.length - 3} more phases
        </div>
      )}
    </div>
  );
};

const ResearchDisplay = ({ data }: any) => {
  const papers = data.result.papers || [];
  
  return (
    <div className="mt-3 bg-slate-700/50 rounded-lg p-4 border border-green-500/30">
      <div className="flex items-center space-x-2 mb-3">
        <FileText className="w-4 h-4 text-green-400" />
        <span className="text-sm font-semibold text-green-300">{papers.length} Research Papers</span>
      </div>
      <div className="space-y-2">
        {papers.slice(0, 3).map((paper: any, idx: number) => (
          <a
            key={idx}
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
          >
            <div className="text-sm font-medium text-white line-clamp-1">{paper.title}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {paper.authors.slice(0, 2).join(", ")} • {paper.source}
            </div>
          </a>
        ))}
      </div>
      {papers.length > 3 && (
        <div className="mt-2 text-xs text-center text-gray-500">
          +{papers.length - 3} more papers
        </div>
      )}
    </div>
  );
};

const StartupGPSChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [welcomeData, setWelcomeData] = useState<WelcomeData | null>(null);
  const [sessionId] = useState(Date.now().toString());
  const [showWelcome, setShowWelcome] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadWelcomeData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const loadWelcomeData = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const response = await fetch(`${API_BASE_URL}/chat/welcome`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWelcomeData(data);
      }
    } catch (error) {
      console.error('Failed to load welcome data:', error);
      setWelcomeData({
        user: { name: 'Guest', authenticated: false },
        stats: { ideas: 0, roadmaps: 0, research: 0 },
        features: [
          { id: 'idea', name: 'Idea Validation', icon: 'lightbulb' },
          { id: 'research', name: 'Research Finder', icon: 'book' },
          { id: 'roadmap', name: 'Roadmap Generator', icon: 'map' },
          { id: 'team', name: 'Team Builder', icon: 'users' }
        ]
      });
    }
  };

  const sendMessage = async (messageText: string = input) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    setShowWelcome(false);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId,
          include_realtime_data: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        setTimeout(() => {
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: data.reply,
            sender: 'bot',
            timestamp: new Date(),
            data: data.data,
            followUps: data.follow_ups,
            isAction: data.data?.action,
            actionStatus: data.data?.action ? 'complete' : undefined
          };

          setMessages(prev => [...prev, botMessage]);
          setIsTyping(false);
        }, 600);
      } else {
        throw new Error('Failed to get response');
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again or contact admin support.',
        sender: 'bot',
        timestamp: new Date(),
        actionStatus: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowWelcome(true);
    loadWelcomeData();
  };

  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-semibold text-base mb-2 text-cyan-300">{line.slice(2, -2)}</div>;
      }
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        return (
          <div key={i} className="mb-1">
            {parts.map((part, j) => 
              j % 2 === 0 ? part : <strong key={j} className="font-medium text-cyan-200">{part}</strong>
            )}
          </div>
        );
      }
      
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={i} className="ml-4 flex items-start mb-1">
            <span className="text-cyan-400 mr-2">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
      }
      
      if (line.trim() === '') return <div key={i} className="h-2" />;
      
      return <div key={i} className="mb-1">{line}</div>;
    });
  };

  const renderActionData = (message: Message) => {
    if (!message.data || !message.data.action) return null;
    
    switch (message.data.action) {
      case 'show_validation':
        return <ValidationDisplay data={message.data} />;
      case 'show_roadmap':
        return <RoadmapDisplay data={message.data} />;
      case 'show_research':
        return <ResearchDisplay data={message.data} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Welcome Screen */}
      {showWelcome && messages.length === 0 ? (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-4xl w-full text-center space-y-8">
            {/* Title */}
            <div className="flex flex-col items-center space-y-6">
              <div>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                  <MessageCircle className="w-12 h-12 text-cyan-400" />
                  AI Assistant
                  <Sparkles className="w-10 h-10 text-cyan-400" />
                </h1>
                <p className="text-xl text-gray-300">
                  Powered by Advanced AI Analysis
                </p>
                <p className="text-gray-400 mt-3 max-w-3xl mx-auto">
                  Get instant help with idea validation, roadmap planning, research discovery, and team building. Ask me anything about your startup journey!
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            {welcomeData?.user.authenticated && (
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                  <Lightbulb className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-400">{welcomeData.stats.ideas}</div>
                  <div className="text-sm text-gray-400">Ideas</div>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                  <MapPin className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-400">{welcomeData.stats.roadmaps}</div>
                  <div className="text-sm text-gray-400">Roadmaps</div>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <FileText className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-400">{welcomeData.stats.research}</div>
                  <div className="text-sm text-gray-400">Research</div>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-slate-800 rounded-2xl p-2 border border-slate-700 shadow-xl">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your startup idea..."
                  className="w-full px-6 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none text-lg"
                  rows={3}
                  style={{ maxHeight: '150px' }}
                />
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all flex items-center gap-2 text-sm border border-green-500/30"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Contact Admin</span>
                    </button>
                  </div>
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2 shadow-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span className="font-medium">Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {['Validate my startup idea', 'Create a roadmap', 'Find research papers', 'Show my activity'].map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-sm transition-all text-gray-300"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">AI Assistant</h1>
                  <p className="text-sm text-gray-400">
                    {welcomeData?.user.authenticated 
                      ? `${welcomeData.user.name} • Enhanced AI` 
                      : 'Guest Mode'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all flex items-center space-x-2 text-sm"
                >
                  <Mail className="w-4 h-4" />
                  <span>Contact Admin</span>
                </button>
                
                <button
                  onClick={clearChat}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all flex items-center space-x-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Chat</span>
                </button>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="h-[calc(100vh-200px)] overflow-y-auto px-6 py-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Messages */}
              {messages.map((message) => (
                <div key={message.id}>
                  <div className={`flex items-start space-x-3 ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      message.sender === 'user'
                        ? 'bg-purple-500/10 text-purple-400'
                        : 'bg-cyan-500/10 text-cyan-400'
                    }`}>
                      {message.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>

                    <div className={`flex-1 ${message.sender === 'user' ? 'flex justify-end' : ''}`}>
                      <div className={`max-w-2xl ${
                        message.sender === 'user'
                          ? 'bg-purple-600/20 border-purple-500/30 px-4 py-3 rounded-xl border'
                          : 'bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl'
                      }`}>
                        {message.actionStatus === 'processing' && (
                          <div className="flex items-center space-x-2 mb-2 text-blue-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs">Processing...</span>
                          </div>
                        )}
                        
                        {message.actionStatus === 'complete' && (
                          <div className="flex items-center space-x-2 mb-2 text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs">Completed</span>
                          </div>
                        )}
                        
                        {message.actionStatus === 'error' && (
                          <div className="flex items-center space-x-2 mb-2 text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">Error</span>
                          </div>
                        )}
                        
                        <div className="text-sm leading-relaxed">
                          {formatMessage(message.text)}
                        </div>
                        
                        {renderActionData(message)}

                        <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-white/10 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{message.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {message.followUps && message.followUps.length > 0 && (
                    <div className="ml-13 mt-2 flex flex-wrap gap-2">
                      {message.followUps.map((followUp, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(followUp)}
                          className="px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs rounded-lg transition-all border border-cyan-500/30"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
            <div className="max-w-4xl mx-auto flex items-end space-x-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 rounded-xl text-white placeholder-gray-500 focus:outline-none resize-none"
                rows={1}
                disabled={isLoading}
                style={{ maxHeight: '120px' }}
              />
              
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="px-5 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center space-x-2 shadow-lg"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </>
      )}

      <ContactAdminModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  );
};

export default StartupGPSChatbot;