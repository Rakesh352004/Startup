
import React, { useState, useEffect, useRef } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

// Types
interface ValidationSuggestion {
  critical: string[];
  recommended: string[];
  optional: string[];
}

interface Competitor {
  name: string;
  url: string;
  description?: string;
}

interface ValidationDetails {
  verdict: string;
  feasibility: string;
  marketDemand: string;
  uniqueness: string;
  strength: string;
  riskFactors: string;
  riskMitigation: string;
  existingCompetitors: string;
  competitors?: Competitor[];
}

interface ValidationScores {
  overall: number;
  feasibility: number;
  marketDemand: number;
  uniqueness: number;
  strength: number;
  riskFactors: number;
}

interface ValidationResponse {
  prompt: string;
  validation: ValidationDetails;
  scores: ValidationScores;
  suggestions: ValidationSuggestion;
  created_at: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface ExpandedSectionsState {
  feasibility: boolean;
  marketDemand: boolean;
  uniqueness: boolean;
  strength: boolean;
  riskFactors: boolean;
  riskMitigation: boolean;
  existingCompetitors: boolean;
}

// Type definitions for Speech Recognition API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}

// Extend the Window interface
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

// SVG Icons
const IconLightbulb = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);

const IconSend = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/>
    <path d="M22 2 11 13"/>
  </svg>
);

const IconMessageCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
  </svg>
);

const IconDownload = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconTarget = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconShield = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconTrendingUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const IconAlertTriangle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const IconBot = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8"/>
    <rect width="16" height="12" x="4" y="8" rx="2"/>
    <path d="M2 14h2"/>
    <path d="M20 14h2"/>
    <path d="M15 13v2"/>
    <path d="M9 13v2"/>
  </svg>
);

const IconUser = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconX = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  </svg>
);

const IconChevronDown = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const IconShieldCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconUsers = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconExternalLink = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

const IconSparkles = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
  </svg>
);

const IconMic = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <path d="M12 19v4"/>
    <path d="M8 23h8"/>
  </svg>
);

const IconVolume2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

const IconEdit = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconRotateCcw = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

// API Service - Updated with real API calls
const apiService = {
  // Helper to get auth token
  getAuthToken: () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  },

  // Helper to get auth headers
  getAuthHeaders: () => {
    const token = apiService.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  validateIdea: async (prompt: string): Promise<{data?: ValidationResponse, error?: string}> => {
    try {
      const response = await fetch('https://startup-gps-backend-6rcx.onrender.com/validate-idea-enhanced', {
        method: 'POST',
        headers: apiService.getAuthHeaders(),
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Validation failed');
      }
      
      const data = await response.json();
      return { data };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  chatWithIdea: async (message: string, ideaContext: string, sessionId: string): Promise<{response?: string, error?: string}> => {
    try {
      // ✅ FIXED: Changed from .co to .com
      const response = await fetch('https://startup-gps-backend-6rcx.onrender.com/chat-with-idea', {
        method: 'POST',
        headers: apiService.getAuthHeaders(),
        body: JSON.stringify({ 
          message, 
          idea_context: ideaContext,
          session_id: sessionId 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Chat failed');
      }
      
      const data = await response.json();
      return { response: data.response };
    } catch (error: any) {
      return { error: error.message };
    }
  }
};

const EnhancedIdeaValidation: React.FC = () => {
  const [ideaPrompt, setIdeaPrompt] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<ExpandedSectionsState>({
    feasibility: true,
    marketDemand: true,
    uniqueness: true,
    strength: true,
    riskFactors: true,
    riskMitigation: true,
    existingCompetitors: true,
  });
  
  // Chat functionality states
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [sessionId] = useState<string>(() => 'session_' + Date.now());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice functionality states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [synthesis] = useState<SpeechSynthesis>(window.speechSynthesis);
  
  const isValidIdea = charCount >= 30;

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setIdeaPrompt(prev => prev + ' ' + transcript);
        setCharCount(prev => prev + transcript.length + 1);
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError('Voice recognition failed. Please try again.');
      };
      
      setRecognition(rec);
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Helper functions
  const getScoreColor = (score: number, opacity = 1): string => {
    if (score >= 80) return `rgba(34, 197, 94, ${opacity})`;
    if (score >= 60) return `rgba(245, 158, 11, ${opacity})`;
    return `rgba(239, 68, 68, ${opacity})`;
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Moderate";
    return "Needs Improvement";
  };

  const getScoreDescription = (score: number): string => {
    if (score >= 80) return "This startup idea shows strong potential across key evaluation criteria.";
    if (score >= 60) return "This startup idea has moderate potential but requires some improvements in key areas.";
    return "This startup idea needs significant improvements to be viable in the current market.";
  };

  const getSectionIcon = (section: string, score: number) => {
    const baseProps: React.SVGProps<SVGSVGElement> = {
      className: `w-5 h-5 ${score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`
    };

    switch (section) {
      case 'feasibility':
        return <IconShield {...baseProps} />;
      case 'marketDemand':
        return <IconTrendingUp {...baseProps} />;
      case 'uniqueness':
        return <IconLightbulb {...baseProps} />;
      case 'strength':
        return <IconTarget {...baseProps} />;
      case 'riskFactors':
        return <IconAlertTriangle {...baseProps} />;
      case 'riskMitigation':
        return <IconShieldCheck className="w-5 h-5 text-blue-400" />;
      case 'existingCompetitors':
        return <IconUsers {...baseProps} />;
      default:
        return <IconLightbulb {...baseProps} />;
    }
  };

  const toggleSection = (section: keyof ExpandedSectionsState) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const parseCompetitors = (competitorsText: string): Competitor[] => {
    if (!competitorsText) return [];
    
    const competitors: Competitor[] = [];
    const patterns = [
      /([A-Za-z0-9\s&.-]+?)\s*\(([www\.]*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/g,
      /([A-Za-z0-9\s&.-]+?)\s*-\s*([www\.]*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      /([A-Za-z0-9\s&.-]+?):\s*([www\.]*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(competitorsText)) !== null) {
        const name = match[1].trim();
        let url = match[2].trim();
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        const cleanName = name.replace(/^(and|or|\d+\.)\s*/i, '').trim();
        
        if (cleanName.length > 2 && cleanName.length < 50) {
          competitors.push({ name: cleanName, url });
        }
      }
    });
    
    return competitors.slice(0, 8);
  };

  // Voice functionality
  const startListening = () => {
    if (recognition) {
      setIsListening(true);
      setError(null);
      recognition.start();
    } else {
      setError('Speech recognition is not supported in your browser.');
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
  };

  const readAloud = (text: string) => {
    if (isReading) {
      synthesis.cancel();
      setIsReading(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsReading(true);
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);

    synthesis.speak(utterance);
  };

  // Main validation function
  const handleValidate = async () => {
    if (!isValidIdea) {
      setError("Please enter at least 30 characters to validate your idea properly");
      return;
    }

    setLoading(true);
    setError(null);
    setValidationResult(null);
    setChatMessages([]);
    setShowChat(false);

    try {
      const response = await apiService.validateIdea(ideaPrompt);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        throw new Error("No data received from server");
      }
      
      const competitors = parseCompetitors(response.data.validation.existingCompetitors);
      
      const validationWithCompetitors = {
        ...response.data,
        validation: {
          ...response.data.validation,
          competitors: competitors
        }
      };
      
      setValidationResult(validationWithCompetitors);
      
      // Initialize chat with welcome message
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Hello! I've just analyzed your startup idea: "${ideaPrompt.substring(0, 100)}${ideaPrompt.length > 100 ? '...' : ''}"\n\nI'm here to answer any specific questions you have about your validation results, market opportunities, competitors, implementation strategies, or anything else related to your startup idea. What would you like to know more about?`,
        timestamp: new Date()
      };
      
      setChatMessages([welcomeMessage]);
      
    } catch (err: any) {
      console.error("Validation error:", err);
      
      if (err.response?.status === 500) {
        setError("Server error occurred. Please check if your GROQ API key is set correctly.");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.code === 'ECONNABORTED') {
        setError("Request timeout. The analysis is taking longer than expected. Please try again.");
      } else if (err.code === 'ERR_NETWORK') {
        setError("Cannot connect to server. Please make sure the backend is running on http://127.0.0.1:8000");
      } else {
        setError(err.message || "Failed to validate idea. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Chat functionality
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !validationResult || chatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    const typingMessage: ChatMessage = {
      id: 'typing',
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setChatMessages(prev => [...prev, typingMessage]);

    try {
      const response = await apiService.chatWithIdea(
        userMessage.content, 
        validationResult.prompt,
        sessionId
      );
      
      if (response.error) {
        throw new Error(response.error);
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response || 'Sorry, I could not process your request.',
        timestamp: new Date()
      };

      setChatMessages(prev => prev.filter(msg => msg.id !== 'typing').concat([aiMessage]));
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date()
      };
      
      setChatMessages(prev => prev.filter(msg => msg.id !== 'typing').concat([errorMessage]));
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setIdeaPrompt(value);
    setCharCount(value.length);
    if (error) setError(null);
  };

  const resetForm = () => {
    setIdeaPrompt("");
    setValidationResult(null);
    setError(null);
    setCharCount(0);
    setShowChat(false);
    setChatMessages([]);
  };

  const editIdea = () => {
    setValidationResult(null);
    setShowChat(false);
    setChatMessages([]);
    // Keep the existing prompt for editing
  };

  const exportToHTML = () => {
    if (!validationResult) return;

    setIsExporting(true);
    
    try {
      const currentDate = new Date().toLocaleDateString();
      const scoreColor = (score: number) => score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Startup Validation Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .section {
            background: white;
            margin-bottom: 20px;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .score-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .score-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Startup Validation Report</h1>
        <p>Generated on ${currentDate}</p>
    </div>

    <div class="section">
        <h2>Startup Idea</h2>
        <p>${validationResult.prompt}</p>
    </div>

    <div class="score-grid">
        <div class="score-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h3>Overall Score</h3>
            <div style="font-size: 2.5em; font-weight: bold;">${validationResult.scores.overall}%</div>
            <div>${getScoreLabel(validationResult.scores.overall)} Potential</div>
        </div>
        ${Object.entries(validationResult.scores).filter(([key]) => key !== 'overall').map(([key, score]) => `
        <div class="score-card">
            <h3>${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</h3>
            <div style="font-size: 2.5em; font-weight: bold; color: ${scoreColor(score as number)}">${score}</div>
        </div>
        `).join('')}
    </div>

    <div class="section">
        <h3>Verdict</h3>
        <p>${validationResult.validation.verdict}</p>
    </div>

    <div class="section">
        <h3>Feasibility Analysis</h3>
        <p>${validationResult.validation.feasibility}</p>
    </div>

    <div class="section">
        <h3>Market Demand</h3>
        <p>${validationResult.validation.marketDemand}</p>
    </div>

    <div class="section">
        <h3>Competitive Analysis</h3>
        <p>${validationResult.validation.existingCompetitors}</p>
    </div>

    <div class="section">
        <h3>Recommendations</h3>
        <h4>Critical Improvements:</h4>
        <ul>
            ${validationResult.suggestions.critical.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <h4>Recommended Enhancements:</h4>
        <ul>
            ${validationResult.suggestions.recommended.map(item => `<li>${item}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `startup-validation-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <IconLightbulb className="w-12 h-12 text-blue-400" />
              <h1 className="text-4xl sm:text-5xl font-bold text-white">
                AI Startup Validator
              </h1>
              <IconSparkles className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Powered by Advanced AI Analysis
            </p>
            <p className="text-sm text-gray-400 max-w-4xl mx-auto mt-2">
              Discover comprehensive AI-powered validation for your startup ideas. Get detailed analysis, competitive insights, and real-time support across multiple research sources.
            </p>
          </div>

          {!validationResult ? (
            // Input Section
            <div className="max-w-4xl mx-auto">
              <div className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700">
                <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                  <IconLightbulb className="w-7 h-7 text-blue-400" />
                  Describe Your Startup Idea
                </h2>
                
                <div className="space-y-6">
                  <div className="relative">
                    <textarea
                      value={ideaPrompt}
                      onChange={handlePromptChange}
                      placeholder="Example: 'I want to build a platform to connect farmers and citizens for fresh produce. The concept shows strong potential given the growing interest in local food systems and sustainable consumption...'"
                      rows={8}
                      className="w-full p-6 bg-slate-700 text-white border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-300 placeholder-gray-400 text-base"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-3">
                      <button
                        onClick={isListening ? stopListening : startListening}
                        className={`p-2 rounded-lg transition-colors ${
                          isListening 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-slate-600 hover:bg-slate-500 text-gray-300'
                        }`}
                        title={isListening ? 'Stop Recording' : 'Start Voice Input'}
                      >
                        <IconMic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
                      </button>
                      {ideaPrompt && (
                        <button
                          onClick={() => readAloud(ideaPrompt)}
                          className={`p-2 rounded-lg transition-colors ${
                            isReading
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : 'bg-slate-600 hover:bg-slate-500 text-gray-300'
                          }`}
                          title={isReading ? 'Stop Reading' : 'Read Aloud'}
                        >
                          <IconVolume2 className={`w-5 h-5 ${isReading ? 'animate-pulse' : ''}`} />
                        </button>
                      )}
                      <span className={`text-sm px-3 py-1 rounded-full transition-colors ${
                        charCount < 30 
                          ? 'text-red-400 bg-red-900/30' 
                          : charCount < 100
                          ? 'text-yellow-400 bg-yellow-900/30'
                          : 'text-green-400 bg-green-900/30'
                      }`}>
                        {charCount}/30 min
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleValidate}
                      disabled={!isValidIdea || loading}
                      className={`flex-1 py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 transform ${
                        isValidIdea && !loading
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg hover:shadow-cyan-500/25 hover:scale-105 text-white"
                          : "bg-slate-600 cursor-not-allowed text-gray-400"
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-3">
                          <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          Analyzing Your Idea...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-3">
                          <IconSparkles className="w-6 h-6" />
                          Validate My Idea
                        </span>
                      )}
                    </button>
                    
                    {ideaPrompt && (
                      <button
                        onClick={resetForm}
                        className="px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-white transition-all duration-300 border border-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
                      <p className="text-red-400 flex items-center gap-2">
                        <IconAlertTriangle className="w-5 h-5 flex-shrink-0" />
                        {error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Results Section
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Overall Score */}
              <div className="lg:col-span-1">
                <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 mb-6">
                  <h3 className="text-xl font-bold text-white mb-6 text-center">Overall Score</h3>
                  <div className="flex flex-col items-center">
                    <div style={{ width: 160, height: 160 }} className="mb-6">
                      <CircularProgressbar
                        value={validationResult.scores.overall}
                        text={`${validationResult.scores.overall}%`}
                        styles={buildStyles({
                          textColor: "#fff",
                          pathColor: getScoreColor(validationResult.scores.overall),
                          trailColor: "rgba(255,255,255,0.1)",
                          textSize: "18px",
                          pathTransitionDuration: 1.5,
                        })}
                      />
                    </div>
                    <div className="text-center">
                      <p 
                        className="text-lg font-bold mb-2"
                        style={{ color: getScoreColor(validationResult.scores.overall) }}
                      >
                        {getScoreLabel(validationResult.scores.overall)} Potential
                      </p>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {getScoreDescription(validationResult.scores.overall)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 space-y-4 mb-6">
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                  >
                    <IconMessageCircle className="w-5 h-5" />
                    Chat About Your Idea
                  </button>
                  
                  <button
                    onClick={exportToHTML}
                    disabled={isExporting}
                    className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <IconDownload className="w-5 h-5" />
                        Export Report
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={editIdea}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-semibold text-white transition-all duration-300 border border-blue-500/50 flex items-center justify-center gap-2"
                  >
                    <IconEdit className="w-5 h-5" />
                    Edit Startup Idea
                  </button>

                  <button
                    onClick={resetForm}
                    className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold text-white transition-all duration-300 border border-slate-600 flex items-center justify-center gap-2"
                  >
                    <IconRotateCcw className="w-5 h-5" />
                    Start Over
                  </button>
                </div>

                {/* Quick Metrics */}
                <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
                  <h4 className="text-lg font-semibold text-white mb-4">Quick Metrics</h4>
                  <div className="space-y-3">
                    {Object.entries(validationResult.scores)
                      .filter(([key]) => key !== 'overall')
                      .map(([key, score]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getSectionIcon(key, score as number)}
                            <span className="text-gray-300 text-sm capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </div>
                          <span 
                            className="font-bold text-sm px-2 py-1 rounded-lg"
                            style={{ 
                              color: getScoreColor(score as number),
                              backgroundColor: getScoreColor(score as number, 0.2)
                            }}
                          >
                            {score}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Middle Column - Detailed Analysis */}
              <div className="lg:col-span-1">
                <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                      <IconTarget className="w-6 h-6 text-cyan-400" />
                      Detailed Analysis
                    </h2>
                    <button
                      onClick={() => readAloud(validationResult.validation.verdict + ' ' + validationResult.validation.feasibility + ' ' + validationResult.validation.marketDemand)}
                      className={`p-2 rounded-lg transition-colors ${
                        isReading
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                      }`}
                      title={isReading ? 'Stop Reading' : 'Read Analysis'}
                    >
                      <IconVolume2 className={`w-4 h-4 ${isReading ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Idea Summary */}
                    <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                      <h3 className="text-lg font-semibold text-cyan-300 mb-2">Your Startup Idea</h3>
                      <p className="text-gray-300 leading-relaxed text-sm">{validationResult.prompt}</p>
                    </div>

                    {/* Analysis Sections */}
                    {[
                      { key: 'feasibility', title: 'Feasibility Analysis', icon: IconShield },
                      { key: 'marketDemand', title: 'Market Demand', icon: IconTrendingUp },
                      { key: 'uniqueness', title: 'Uniqueness & Differentiation', icon: IconLightbulb },
                      { key: 'strength', title: 'Core Strengths', icon: IconTarget },
                      { key: 'riskFactors', title: 'Risk Assessment', icon: IconAlertTriangle },
                      { key: 'riskMitigation', title: 'Risk Mitigation', icon: IconShieldCheck },
                      { key: 'existingCompetitors', title: 'Competitive Landscape', icon: IconUsers }
                    ].map(({ key, title, icon: Icon }) => (
                      <div key={key} className="bg-slate-700/50 rounded-xl border border-slate-600 overflow-hidden">
                        <button
                          onClick={() => toggleSection(key as keyof ExpandedSectionsState)}
                          className="w-full flex justify-between items-center p-4 hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-cyan-400" />
                            <h3 className="text-sm font-semibold text-white">{title}</h3>
                          </div>
                          <div className="flex items-center gap-3">
                            {key !== 'riskMitigation' && key !== 'existingCompetitors' && (
                              <span
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: getScoreColor(validationResult.scores[key as keyof ValidationScores], 0.2),
                                  color: getScoreColor(validationResult.scores[key as keyof ValidationScores])
                                }}
                              >
                                {validationResult.scores[key as keyof ValidationScores]}%
                              </span>
                            )}
                            <IconChevronDown 
                              className={`w-4 h-4 text-gray-400 transition-transform ${
                                expandedSections[key as keyof ExpandedSectionsState] ? 'rotate-180' : ''
                              }`} 
                            />
                          </div>
                        </button>
                        {expandedSections[key as keyof ExpandedSectionsState] && (
                          <div className="px-4 pb-4">
                            <div className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">
                              {typeof validationResult.validation[key as keyof ValidationDetails] === 'string' 
                                ? validationResult.validation[key as keyof ValidationDetails] as string
                                : 'Content not available'
                              }
                            </div>
                            {key === 'existingCompetitors' && validationResult.validation.competitors && validationResult.validation.competitors.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-400 mb-2">Direct Competitors:</p>
                                <div className="flex flex-wrap gap-2">
                                  {validationResult.validation.competitors.map((competitor, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => window.open(competitor.url, '_blank', 'noopener,noreferrer')}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-600/30 transition-all duration-200 text-xs group"
                                    >
                                      <span className="font-medium">{competitor.name}</span>
                                      <IconExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Action Items */}
              <div className="lg:col-span-1">
                <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <IconLightbulb className="w-6 h-6 text-yellow-400" />
                    Action Items
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Critical */}
                    {validationResult.suggestions.critical.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                          <IconAlertTriangle className="w-4 h-4" />
                          Critical ({validationResult.suggestions.critical.length})
                        </h4>
                        <div className="space-y-2">
                          {validationResult.suggestions.critical.map((suggestion, idx) => (
                            <div key={idx} className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                              <p className="text-gray-300 text-sm leading-relaxed">{suggestion}</p>
                              <button
                                onClick={() => readAloud(suggestion)}
                                className="mt-2 p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                title="Read aloud"
                              >
                                <IconVolume2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended */}
                    {validationResult.suggestions.recommended.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                          <IconTarget className="w-4 h-4" />
                          Recommended ({validationResult.suggestions.recommended.length})
                        </h4>
                        <div className="space-y-2">
                          {validationResult.suggestions.recommended.map((suggestion, idx) => (
                            <div key={idx} className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                              <p className="text-gray-300 text-sm leading-relaxed">{suggestion}</p>
                              <button
                                onClick={() => readAloud(suggestion)}
                                className="mt-2 p-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                                title="Read aloud"
                              >
                                <IconVolume2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Optional */}
                    {validationResult.suggestions.optional.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                          <IconShield className="w-4 h-4" />
                          Optional ({validationResult.suggestions.optional.length})
                        </h4>
                        <div className="space-y-2">
                          {validationResult.suggestions.optional.map((suggestion, idx) => (
                            <div key={idx} className="p-3 bg-gray-800/50 border border-gray-600/50 rounded-lg">
                              <p className="text-gray-300 text-sm leading-relaxed">{suggestion}</p>
                              <button
                                onClick={() => readAloud(suggestion)}
                                className="mt-2 p-1 rounded bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 transition-colors"
                                title="Read aloud"
                              >
                                <IconVolume2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat Modal */}
          {showChat && validationResult && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-4xl h-[80vh] flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <IconBot className="w-8 h-8 text-cyan-400" />
                    <div>
                      <h3 className="text-xl font-bold text-white">AI Startup Assistant</h3>
                      <p className="text-gray-400 text-sm">Ask me anything about your startup idea</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowChat(false)}
                    className="p-2 hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <IconX className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-3xl flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.type === 'user' 
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600' 
                            : 'bg-gradient-to-r from-purple-500 to-pink-600'
                        }`}>
                          {message.type === 'user' ? (
                            <IconUser className="w-5 h-5 text-white" />
                          ) : (
                            <IconBot className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className={`p-4 rounded-2xl ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/30'
                            : 'bg-slate-700 border border-slate-600'
                        }`}>
{message.isTyping ? (
  <div className="flex items-center gap-2">
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
    <span className="text-gray-400 text-sm">AI is thinking...</span>
  </div>
) : (
  <div className="flex items-start justify-between gap-2">
    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap flex-1">{message.content}</p>
    <button
      onClick={() => readAloud(message.content)}
      className="p-1 rounded hover:bg-white/20 text-gray-400 hover:text-gray-300 transition-colors flex-shrink-0"
      title="Read aloud"
    >
      <IconVolume2 className="w-4 h-4" />
    </button>
  </div>
)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-6 border-t border-slate-700">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me about market opportunities, implementation strategies, competitors, or anything about your startup..."
                        rows={3}
                        className="w-full p-4 pr-20 bg-slate-700 text-white border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none placeholder-gray-400"
                      />
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <button
                          onClick={isListening ? stopListening : startListening}
                          className={`p-2 rounded-lg transition-colors ${
                            isListening 
                              ? 'bg-red-500 hover:bg-red-600 text-white' 
                              : 'bg-slate-600 hover:bg-slate-500 text-gray-300'
                          }`}
                          title={isListening ? 'Stop Recording' : 'Voice Input'}
                        >
                          <IconMic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
                        </button>
                        <div className="text-xs text-gray-500">Enter to send</div>
                      </div>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || chatLoading}
                      className="px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2"
                    >
                      {chatLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <IconSend className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedIdeaValidation;
