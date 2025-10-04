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
      <div className="bg-[#1e293b] rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[#1e293b] border-b border-gray-700 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <Mail className="w-5 h-5 mr-2 text-indigo-400" />
              Contact Admin Team
            </h2>
            <p className="text-gray-400 text-sm mt-1">Reach out for support and assistance</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {adminContacts.map((admin, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-[#0f172a] border border-gray-700 hover:border-indigo-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white">{admin.name}</h3>
                  <p className="text-sm text-indigo-400">{admin.role}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-lg font-bold">
                  {admin.name.charAt(0)}
                </div>
              </div>
              
              <a
                href={`mailto:${admin.email}`}
                className="flex items-center text-gray-300 hover:text-indigo-400 transition-colors text-sm group"
              >
                <Mail className="w-4 h-4 mr-2" />
                <span className="group-hover:underline">{admin.email}</span>
                <ExternalLink className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-gray-700 bg-[#0f172a]">
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
    <div className="mt-3 bg-[#0f172a] rounded-lg p-4 border border-indigo-500/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">Overall Score</span>
        <div className="flex items-center space-x-2">
          <div className="text-3xl font-bold text-indigo-400">{result.overall_score}</div>
          <div className="text-gray-500">/100</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(scores).filter(([key]) => key !== 'overall').map(([key, value]: any) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
              <span className="text-indigo-300">{value}%</span>
            </div>
            <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${value}%` }} />
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
    <div className="mt-3 bg-[#0f172a] rounded-lg p-4 border border-indigo-500/30">
      <div className="flex items-center space-x-2 mb-3">
        <MapPin className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-semibold text-indigo-300">{phases.length} Phase Roadmap</span>
      </div>
      <div className="space-y-2">
        {phases.slice(0, 3).map((phase: any, idx: number) => (
          <div key={idx} className="flex items-start space-x-2 p-2 bg-[#1e293b] rounded">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400 font-bold flex-shrink-0">
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
    <div className="mt-3 bg-[#0f172a] rounded-lg p-4 border border-indigo-500/30">
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
            className="block p-2 bg-[#1e293b] rounded hover:bg-[#334155] transition-colors"
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
        return <div key={i} className="font-semibold text-base mb-2 text-indigo-300">{line.slice(2, -2)}</div>;
      }
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        return (
          <div key={i} className="mb-1">
            {parts.map((part, j) => 
              j % 2 === 0 ? part : <strong key={j} className="font-medium text-indigo-200">{part}</strong>
            )}
          </div>
        );
      }
      
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={i} className="ml-4 flex items-start mb-1">
            <span className="text-indigo-400 mr-2">•</span>
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
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <div className="bg-[#1e293b] border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
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

      {/* Stats */}
      {welcomeData?.user.authenticated && (
        <div className="bg-[#1e293b]/50 border-b border-gray-800 px-6 py-3">
          <div className="grid grid-cols-3 gap-3 max-w-7xl mx-auto">
            <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-yellow-400">{welcomeData.stats.ideas}</div>
                  <div className="text-xs text-gray-400">Ideas</div>
                </div>
                <Lightbulb className="w-5 h-5 text-yellow-400/60" />
              </div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-blue-400">{welcomeData.stats.roadmaps}</div>
                  <div className="text-xs text-gray-400">Roadmaps</div>
                </div>
                <MapPin className="w-5 h-5 text-blue-400/60" />
              </div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-green-400">{welcomeData.stats.research}</div>
                  <div className="text-xs text-gray-400">Research</div>
                </div>
                <FileText className="w-5 h-5 text-green-400/60" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="h-[calc(100vh-200px)] overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Welcome */}
          {showWelcome && welcomeData && messages.length === 0 && (
            <div className="space-y-4">
              <div className="bg-[#1e293b] rounded-lg p-5 border border-gray-700">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-white mb-2">
                      Hey {welcomeData.user.name}! Ready to build something amazing?
                    </div>
                    <p className="text-gray-300 text-sm">
                      I can validate ideas, create roadmaps, find research, and help you build your team.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {['Validate: AI tutoring platform', 'Create 3-month roadmap', 'Find research on edtech', 'Show my activity'].map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="px-3 py-2 bg-[#1e293b] hover:bg-[#334155] border border-gray-700 rounded-lg text-xs transition-all"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div key={message.id}>
              <div className={`flex items-start space-x-3 ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user'
                    ? 'bg-purple-500/10 text-purple-400'
                    : 'bg-indigo-500/10 text-indigo-400'
                }`}>
                  {message.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className={`flex-1 ${message.sender === 'user' ? 'flex justify-end' : ''}`}>
                  <div className={`max-w-2xl ${
                    message.sender === 'user'
                      ? 'bg-purple-600 px-4 py-3 rounded-lg'
                      : 'bg-[#1e293b] border border-gray-700 px-4 py-3 rounded-lg'
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
                      className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs rounded-lg transition-all"
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
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-[#1e293b] border border-gray-700 px-4 py-3 rounded-lg">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-[#1e293b] border-t border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-end space-x-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-3 bg-[#0f172a] border border-gray-700 focus:border-indigo-500 rounded-lg text-white placeholder-gray-500 focus:outline-none resize-none"
            rows={1}
            disabled={isLoading}
            style={{ maxHeight: '120px' }}
          />
          
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center space-x-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <ContactAdminModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  );
};

export default StartupGPSChatbot;