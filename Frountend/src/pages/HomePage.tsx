import React, { useState } from "react";
import { Check, Lightbulb, Users, Map, MessageCircle, Phone, Mail, Compass, Star, Search, FileText, TrendingUp, Zap, Clock, Shield, Brain, Calendar, Send, Rocket, Navigation, Target, Award, BookOpen, BarChart, ArrowRight } from "lucide-react";

interface FormData {
  name: string;
  email: string;
  category: string;
  message: string;
}

export default function HomePage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    category: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
    alert('Message sent successfully!');
    setFormData({ name: '', email: '', category: '', message: '' });
  };

  // Navigation handlers (placeholder functions for demo)
  const navigateToIdeaValidator = () => console.log('NavigatetoIdeaValidator');
  const navigateToTeamBuilder = () => console.log('Navigate to Team Builder');
  const navigateToRoadmapGenerator = () => console.log('Navigate to Roadmap Generator');
  const navigateToResearchAdvisor = () => console.log('Navigate to Research Advisor');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:20px_20px] pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="text-center px-6 max-w-6xl mx-auto py-24">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-8 shadow-lg">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent leading-tight">
            Navigate Your Startup
          </h1>
          <h1 className="text-6xl md:text-8xl font-bold mb-8 bg-gradient-to-r from-cyan-100 via-blue-100 to-white bg-clip-text text-transparent leading-tight">
            Journey with AI
          </h1>
          
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Validate ideas, find your team, and generate roadmaps – all in one place. 
            Let AI guide your path from concept to success.
          </p>
          
          <button 
            onClick={navigateToIdeaValidator}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 inline-flex items-center"
          >
            <Target className="w-5 h-5 mr-2" />
            Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </section>

        {/* Why Choose Section */}
        <section className="px-6 max-w-7xl mx-auto py-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl mb-6">
              <Award className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why Choose Startup GPS?
            </h2>
            
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Our AI-powered platform combines cutting-edge technology with proven startup methodologies to give you the competitive edge you need to succeed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "AI-Powered Intelligence",
                description: "Leverage advanced AI algorithms to analyze market trends, validate ideas, and predict success patterns.",
                gradient: "from-purple-500 to-indigo-500"
              },
              {
                icon: Search,
                title: "Precision Validation",
                description: "Get detailed market analysis, competitor insights, and viability scoring to make informed decisions.",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: Zap,
                title: "Lightning Fast Results",
                description: "Receive comprehensive startup insights in minutes, not months of manual research.",
                gradient: "from-yellow-500 to-orange-500"
              },
              {
                icon: Clock,
                title: "Time-Optimized Planning",
                description: "Generate realistic timelines and milestone tracking that adapts to your progress and resources.",
                gradient: "from-green-500 to-emerald-500"
              },
              {
                icon: Shield,
                title: "Risk Mitigation",
                description: "Identify potential pitfalls early and get actionable recommendations to avoid common startup failures.",
                gradient: "from-red-500 to-pink-500"
              },
              {
                icon: TrendingUp,
                title: "Proven Methodology",
                description: "Built on academic research and real-world startup data to maximize your chances of success.",
                gradient: "from-indigo-500 to-purple-500"
              }
            ].map((item, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl">
                <div className={`w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{item.title}</h3>
                <p className="text-gray-300 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Core Features Section */}
        <section className="px-6 max-w-7xl mx-auto py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl mb-6">
              <BarChart className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Core Features
            </h2>
            
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Three powerful AI-driven tools to transform your startup journey from idea to execution
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                onClick: navigateToIdeaValidator,
                icon: Lightbulb,
                title: "Idea Validator",
                description: "AI-powered research & scoring system to assess your startup idea.",
                features: ['Market analysis', 'Competitor research', 'Viability scoring', 'Risk assessment'],
                gradient: "from-yellow-500 to-orange-500",
                hoverColor: "yellow-500"
              },
              {
                onClick: navigateToTeamBuilder,
                icon: Users,
                title: "Team Builder",
                description: "Find the right people based on skill & vision alignment.",
                features: ['Skill matching', 'Vision alignment', 'Cultural fit', 'Remote friendly'],
                gradient: "from-blue-500 to-purple-500",
                hoverColor: "blue-500"
              },
              {
                onClick: navigateToRoadmapGenerator,
                icon: Map,
                title: "Roadmap Generator",
                description: "Get an actionable startup roadmap based on your goals.",
                features: ['Milestone planning', 'Resource allocation', 'Timeline optimization', 'Progress tracking'],
                gradient: "from-green-500 to-teal-500",
                hoverColor: "green-500"
              }
            ].map((feature, index) => (
              <div
                key={index}
                onClick={feature.onClick}
                className={`bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 hover:border-${feature.hoverColor}/50 cursor-pointer transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl group`}
              >
                <div className="flex items-center mb-6">
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white">{feature.title}</h3>
                </div>
                
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                
                <ul className="space-y-3">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center">
                      <div className={`w-5 h-5 bg-gradient-to-br ${feature.gradient} rounded-md flex items-center justify-center mr-3 flex-shrink-0`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-gray-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Research Advisor Section */}
        <section className="px-6 max-w-6xl mx-auto py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl mb-6">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Research Advisor
            </h2>
            
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Get expert research insights from academic papers and industry studies to make data-driven decisions for your startup
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Features */}
            <div className="space-y-8">
              <h3 className="text-3xl font-bold text-white mb-8">Academic Research at Your Fingertips</h3>
              
              <div className="space-y-6">
                {[
                  {
                    icon: FileText,
                    title: "Academic Database Access",
                    description: "Access to 50M+ research papers from top universities and journals worldwide",
                    gradient: "from-cyan-500 to-blue-500"
                  },
                  {
                    icon: Search,
                    title: "Expert Analysis",
                    description: "AI-powered analysis of research findings relevant to your specific startup context",
                    gradient: "from-purple-500 to-indigo-500"
                  },
                  {
                    icon: TrendingUp,
                    title: "Trend Identification",
                    description: "Identify emerging trends and opportunities based on latest academic research",
                    gradient: "from-green-500 to-emerald-500"
                  },
                  {
                    icon: Lightbulb,
                    title: "Actionable Insights",
                    description: "Transform complex research into practical, actionable recommendations",
                    gradient: "from-yellow-500 to-orange-500"
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-white mb-3">{item.title}</h4>
                      <p className="text-gray-300 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Research Interface */}
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 shadow-2xl">
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-6">
                  <Search className="w-6 h-6 text-cyan-400" />
                  <h4 className="text-xl font-semibold text-white">Get Expert Research Insights</h4>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g., team building strategies for tech startups"
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 pr-12 transition-all duration-300"
                  />
                  <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-colors">
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-gray-700/30 p-5 rounded-xl border-l-4 border-cyan-500">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="font-semibold text-white">Team Composition and Startup Success Rates</h5>
                    <span className="text-cyan-400 text-sm font-medium px-2 py-1 bg-cyan-500/10 rounded-full">98% match</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Chen, L. & Rodriguez, A. • MIT Entrepreneurship Review • 2023</p>
                  <p className="text-gray-200">Diverse teams with complementary skills show 40% higher success rates</p>
                </div>

                <div className="bg-gray-700/30 p-5 rounded-xl border-l-4 border-purple-500">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="font-semibold text-white">AI-Driven Product Development Methodologies</h5>
                    <span className="text-purple-400 text-sm font-medium px-2 py-1 bg-purple-500/10 rounded-full">92% match</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Patel, S. et al. • Stanford Technology Review • 2024</p>
                  <p className="text-gray-200">AI integration in early development phases reduces time-to-market by 35%</p>
                </div>
              </div>

              <button             
              onClick={navigateToResearchAdvisor}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 inline-flex items-center justify-center">
                View Full Research Report
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>

          {/* Centered Start Research Analysis button */}
          <div className="text-center mt-16">
            <button 
              onClick={navigateToResearchAdvisor}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-10 py-4 rounded-xl font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 inline-flex items-center"
            >
              <Brain className="w-5 h-5 mr-2" />
              Start Research Analysis
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}