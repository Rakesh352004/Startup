import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, FileText, MapPin, Users, ChevronRight, ChevronDown,
  Sparkles, ArrowLeft, HelpCircle, CheckCircle2, Mail, User, Contact
} from 'lucide-react';

const API_BASE_URL = "http://localhost:8000";

interface Feature {
  id: string;
  name: string;
  icon: any;
  color: string;
  gradient: string;
  description: string;
  faqs: FAQ[];
}

interface FAQ {
  question: string;
  answer: string;
}

interface Admin {
  name: string;
  email: string;
  role: string;
}

const ADMINS: Admin[] = [
  { name: "Rakesh V", email: "rakeshyadav352004@gmail.com", role: "Lead Developer" },
  { name: "Padmashree M M", email: "padmashree1384@gmail.com", role: "Backend Engineer" },
  { name: "Peddinti Mohammad", email: "mohammadaslam62819@gmail.com", role: "Frontend Developer" },
  { name: "Rakshitha N", email: "rakshitha2735@gmail.com", role: "UI/UX Designer" }
];

const features: Feature[] = [
  {
    id: 'validation',
    name: 'Idea Validation',
    icon: Lightbulb,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500 to-orange-500',
    description: 'AI-powered analysis to validate your startup ideas with comprehensive scoring and insights.',
    faqs: [
      {
        question: 'How does idea validation work?',
        answer: 'Our AI analyzes your startup idea across 5 key dimensions: Feasibility, Market Demand, Uniqueness, Strength, and Risk Factors. You provide a detailed description (minimum 30 characters), and within seconds, you receive a comprehensive report with an overall score (0-100), individual dimension scores, competitor analysis, and actionable suggestions categorized as Critical, Recommended, and Optional improvements.'
      },
      {
        question: 'What makes a good validation score?',
        answer: 'Scores of 80+ indicate excellent potential with strong market fit and feasibility. Scores between 60-80 show solid concepts that need refinement in specific areas. Scores below 60 suggest significant challenges that require addressing before proceeding. Focus on improving the lowest-scoring dimensions first - typically Market Demand and Feasibility are most critical for success.'
      },
      {
        question: 'Can I validate multiple ideas?',
        answer: 'Yes! You can validate unlimited ideas. Each validation is saved to your account history, allowing you to compare different concepts side-by-side. This helps you identify your strongest ideas and track improvements as you refine your concepts based on our AI recommendations. We recommend validating variations of your idea to find the optimal approach.'
      },
      {
        question: 'How accurate is the competitor analysis?',
        answer: 'Our AI identifies existing competitors by analyzing your idea description and matching it against a comprehensive database of companies. We provide direct links to competitor websites and analyze their positioning. While highly accurate for established markets, emerging niches may have fewer identified competitors. Use this as a starting point for your own competitive research and market analysis.'
      }
    ]
  },
  {
    id: 'research',
    name: 'Research Papers',
    icon: FileText,
    color: 'text-green-400',
    gradient: 'from-green-500 to-emerald-500',
    description: 'Access 40+ academic papers from Semantic Scholar, arXiv, and CrossRef to support your research.',
    faqs: [
      {
        question: 'Where do research papers come from?',
        answer: 'We fetch papers from three authoritative academic sources: Semantic Scholar (comprehensive academic database), arXiv (preprint server for scientific papers), and CrossRef (DOI registration agency). Our system queries all three simultaneously and intelligently deduplicates results to provide you with 40 high-quality, unique papers balanced across all sources for comprehensive research coverage.'
      },
      {
        question: 'How are papers ranked and selected?',
        answer: 'Papers are scored based on multiple quality metrics: presence of abstract (+20 points), availability of URL (+15 points), DOI availability (+15 points), publication recency (up to +15 bonus for recent papers), and multiple authors (+5 points). We ensure balanced representation from all three sources, typically 12-15 papers from each, to provide diverse perspectives on your research topic.'
      },
      {
        question: 'Can I search for specific topics?',
        answer: 'Absolutely! Enter any startup idea, technology, or research topic. Our AI extracts optimal search terms from your description using advanced NLP. For best results, be specific about your domain (e.g., "machine learning for healthcare diagnostics" vs. just "AI"). You can search for technical implementations, market research, user behavior studies, or academic foundations relevant to your startup.'
      },
      {
        question: 'Are papers saved to my account?',
        answer: 'Yes, all research sessions are automatically saved when you\'re logged in. This creates a research library you can reference anytime. Each saved session includes the original search query, extracted search terms, and all 40 papers with full metadata (titles, authors, abstracts, publication dates, sources, and direct links). Access your research history from your dashboard at any time.'
      }
    ]
  },
  {
    id: 'roadmap',
    name: 'Roadmap Generator',
    icon: MapPin,
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-500',
    description: 'Generate detailed, phased execution roadmaps tailored to your startup timeline and goals.',
    faqs: [
      {
        question: 'What timeframes are available?',
        answer: 'Choose from 3 months (3 phases, MVP-focused), 6 months (4 phases, includes scaling preparation), 1 year (5 phases, comprehensive growth strategy), or 2 years (6 phases, long-term vision). Each timeframe is optimized for different startup stages: 3-month for rapid prototyping, 6-month for market entry, 1-year for establishing product-market fit, and 2-year for scaling to profitability.'
      },
      {
        question: 'What details are included in each phase?',
        answer: 'Every roadmap phase contains 7 detailed sections: Phase Title with timeframe (e.g., "Phase 1: 2-4 weeks - MVP Development"), comprehensive Description (2-3 sentences), 4-6 specific Tasks to accomplish, 3-5 Implementation steps with technical details, 3-5 required Resources (tools, budget, infrastructure), 2-4 Team roles needed, and 2-4 potential Challenges with mitigation strategies. This comprehensive breakdown ensures you have everything needed for execution.'
      },
      {
        question: 'Can I modify generated roadmaps?',
        answer: 'Currently, roadmaps are generated based on your idea description and selected timeframe. While direct editing isn\'t available yet, you can generate multiple roadmaps with different descriptions or timeframes to find the optimal plan. Each roadmap is saved to your account, allowing you to export, reference, or use as templates for your project management tools. Feature for custom editing is coming in our next update.'
      },
      {
        question: 'How technical are the roadmaps?',
        answer: 'Roadmaps balance technical and business aspects. Technical details include architecture decisions, technology stack recommendations, development workflows, and infrastructure requirements. Business aspects cover market validation, user acquisition, revenue models, team building, and funding strategies. The technical depth adapts to your idea\'s complexity - a simple mobile app gets different recommendations than an AI-powered SaaS platform.'
      }
    ]
  },
  {
    id: 'team',
    name: 'Team Builder',
    icon: Users,
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-pink-500',
    description: 'Find and connect with co-founders and team members based on skills, experience, and interests.',
    faqs: [
      {
        question: 'How does team matching work?',
        answer: 'Our AI matching algorithm scores potential matches across 6 dimensions: Required Skills (60% weight - most important), Current Role alignment (15%), Experience Level match (10%), Availability compatibility (5%), Location/Remote preference (5%), and Shared Interests (5%). Profiles scoring 30% or higher appear in your search results, ranked from highest to lowest match score. This ensures you find teammates whose expertise truly complements your needs.'
      },
      {
        question: 'What profile information is required?',
        answer: 'To search for team members, you must complete your profile with: Full Name, Email, Current Role, Skills (at least one), Interests (at least one), Experience Level (Junior/Mid/Senior), Availability (Full-time/Part-time/Weekends), and Location or Remote preference. This ensures quality matches and helps others find you. Incomplete profiles cannot search or appear in search results - this maintains platform quality and serious commitment.'
      },
      {
        question: 'How do connections and messaging work?',
        answer: 'Send connection requests with optional personalized messages (recommended to increase acceptance). Receivers see your profile and request notification. Once accepted, both users are "connected" and can message directly through our secure chat system. Track all sent/received requests and manage connections from your profile. Connection requests expire after 30 days if not responded to, keeping your inbox clean.'
      },
      {
        question: 'Can I search for specific expertise?',
        answer: 'Yes! Define required skills (e.g., "React", "Python", "Marketing"), preferred role, experience level, availability, location, and interests. Our search scans all profiles and calculates match scores. You\'ll see matched skills and interests highlighted for each result. Filter results by minimum match score, location, or availability. Export search results to track potential team members and manage your outreach effectively.'
      }
    ]
  }
];

const StaticHelpPage = () => {
  const [userName, setUserName] = useState('Guest');
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    // Get user name from token
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      try {
        fetch(`${API_BASE_URL}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data.name) {
              setUserName(data.name);
            }
          })
          .catch(() => {
            // If profile fetch fails, try to get from user info
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const user = JSON.parse(storedUser);
              setUserName(user.name || 'User');
            }
          });
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
  }, []);

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  // Admin Contact Panel Component
  const AdminContactPanel = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Contact className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Contact Our Team</h2>
            </div>
            <button
              onClick={() => setShowAdminPanel(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-400 mt-2">Get in touch with our dedicated team members</p>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            {ADMINS.map((admin, index) => (
              <div
                key={index}
                className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 hover:border-blue-500/50 transition-all group"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{admin.name}</h3>
                    <p className="text-blue-400 text-sm font-medium">{admin.role}</p>
                    <a
                      href={`mailto:${admin.email}`}
                      className="text-gray-400 hover:text-blue-400 text-sm truncate block mt-1 transition-colors"
                    >
                      {admin.email}
                    </a>
                  </div>
                </div>
                <div className="mt-3 flex space-x-2">
                  <a
                    href={`mailto:${admin.email}`}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-3 rounded-lg text-sm font-medium text-center transition-colors flex items-center justify-center space-x-1"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600">
            <h4 className="font-semibold text-white mb-2">📧 Quick Contact Tips</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Include your name and the specific feature you need help with</li>
              <li>• Describe your issue or question in detail</li>
              <li>• Our team typically responds within 24 hours</li>
              <li>• For urgent matters, mention "URGENT" in your subject line</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  if (selectedFeature) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Header */}
        <div className="bg-slate-900/50 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <button
              onClick={() => {
                setSelectedFeature(null);
                setExpandedFAQ(null);
              }}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Features</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${selectedFeature.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                <selectedFeature.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{selectedFeature.name}</h1>
                <p className="text-gray-400 mt-1">{selectedFeature.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="space-y-4">
            {selectedFeature.faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <HelpCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${selectedFeature.color}`} />
                    <span className="text-lg font-medium text-white pr-4">{faq.question}</span>
                  </div>
                  {expandedFAQ === index ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                
                {expandedFAQ === index && (
                  <div className="px-6 pb-6">
                    <div className="pl-10 pr-4">
                      <div className={`h-1 w-12 bg-gradient-to-r ${selectedFeature.gradient} rounded-full mb-4`} />
                      <p className="text-gray-300 leading-relaxed text-base">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact Support */}
          <div className="mt-12 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 text-center">
            <Mail className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
            <p className="text-gray-400 mb-6">Our team is here to help you succeed</p>
            <button
              onClick={() => setShowAdminPanel(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white rounded-xl transition-all shadow-lg"
            >
              <Contact className="w-5 h-5" />
              <span>Contact Our Team</span>
            </button>
          </div>
        </div>

        {/* Admin Panel */}
        {showAdminPanel && <AdminContactPanel />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10">
        {/* Welcome Section */}
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl mb-6 shadow-2xl animate-bounce-slow">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <User className="w-8 h-8 text-blue-600" />
            <h1 className="text-5xl font-bold text-white">
              Hi, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-500">{userName}</span>!
            </h1>
          </div>
          
          <p className="text-2xl text-gray-300 mb-3">How can I help you today?</p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Explore our features below to learn how StartupGPS can accelerate your entrepreneurial journey
          </p>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-6 pb-16">
          {/* Contact Our Team Button - Positioned above Research Papers */}
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setShowAdminPanel(true)}
              className="flex items-center space-x-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-4 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/25 border border-cyan-500/20 hover:scale-105"
            >
              <Contact className="w-5 h-5" />
              <span className="font-semibold text-lg">Contact Our Team</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(feature)}
                className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-slate-600 rounded-2xl p-8 text-left transition-all hover:scale-105 hover:shadow-2xl"
              >
                {/* Gradient Overlay on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`} />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-blue-500 transition-all">
                    {feature.name}
                  </h3>
                  
                  <p className="text-gray-400 leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <CheckCircle2 className={`w-4 h-4 ${feature.color}`} />
                    <span>{feature.faqs.length} FAQs available</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Additional Help Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Quick Start</h3>
              <p className="text-sm text-gray-400">Get started with our platform in under 5 minutes</p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Documentation</h3>
              <p className="text-sm text-gray-400">Comprehensive guides and tutorials</p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Contact className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Team Support</h3>
              <p className="text-sm text-gray-400">Contact our dedicated team members</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Panel */}
      {showAdminPanel && <AdminContactPanel />}

      {/* Custom Animations */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
};

export default StaticHelpPage;