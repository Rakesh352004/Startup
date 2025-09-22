import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Lightbulb,
  Users,
  Map,
  FileText,
  TrendingUp,
  Zap,
  Clock,
  Shield,
  Brain,
  Rocket,
  Target,
  Award,
  BookOpen,
  BarChart,
  ArrowRight,
  Search,
  Sparkles,
  Compass,
  LucideIcon
} from "lucide-react";

interface FormData {
  name: string;
  email: string;
  category: string;
  message: string;
}

// Props interfaces
interface FloatingCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

interface Rotating3DIconProps {
  Icon: LucideIcon;
  gradient: string;
  size?: string;
}

interface StartupGPSLogoProps {
  size?: string;
}

// 3D Floating Card Component (without rotation)
const FloatingCard: React.FC<FloatingCardProps> = ({ children, delay = 0, className = "" }) => (
  <div
    className={`transform-gpu ${className}`}
    style={{
      animation: `float 6s ease-in-out infinite ${delay}s`,
    }}
  >
    {children}
  </div>
);

// Animated Background Orbs
const BackgroundOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className={`absolute w-32 h-32 md:w-64 md:h-64 rounded-full opacity-10 blur-3xl animate-pulse`}
        style={{
          background: `radial-gradient(circle, ${
            ['#06b6d4', '#3b82f6', '#8b5cf6', '#6366f1', '#14b8a6', '#10b981', '#eab308', '#ec4899'][i]
          }, transparent)`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `float 8s ease-in-out infinite ${i * 1.5}s, pulse 3s ease-in-out infinite ${i * 0.5}s`,
        }}
      />
    ))}
  </div>
);

// Parallax Stars
const ParallaxStars = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(50)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-white rounded-full opacity-30"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `twinkle 3s ease-in-out infinite ${Math.random() * 3}s`,
        }}
      />
    ))}
  </div>
);

// 3D Rotating Icon Component (only icons rotate)
const Rotating3DIcon: React.FC<Rotating3DIconProps> = ({ Icon, gradient, size = "w-10 h-10" }) => (
  <div className={`${size} relative transform-gpu perspective-1000`}>
    <div
      className={`w-full h-full bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-2xl transform-gpu transition-all duration-300 hover:scale-110`}
      style={{
        animation: 'rotateY 4s linear infinite',
        transformStyle: 'preserve-3d',
      }}
    >
      <Icon className="w-1/2 h-1/2 text-white drop-shadow-lg" />
    </div>
  </div>
);

// Startup GPS Logo Component
const StartupGPSLogo: React.FC<StartupGPSLogoProps> = ({ size = "w-16 h-16" }) => (
  <div className={`${size} relative`}>
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl transform rotate-45 flex items-center justify-center shadow-2xl">
      <Compass className="w-2/3 h-2/3 text-white transform -rotate-45" />
    </div>
    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping"></div>
  </div>
);

export default function HomePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    category: "",
    message: "",
  });
  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Navigation handlers using react-router-dom
  const navigateToIdeaValidator = () => navigate("/idea-validation");
  const navigateToResearchAdvisor = () => navigate("/research-papers");
  const navigateToRoadmapGenerator = () => navigate("/roadmap");
  const navigateToTeamBuilder = () => navigate("/team");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white overflow-hidden">
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-15px) translateX(-5px); }
          75% { transform: translateY(-25px) translateX(5px); }
        }
        
        @keyframes rotateY {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        
        @keyframes slideInUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes morphing {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .morphing-blob {
          animation: morphing 8s ease-in-out infinite, float 6s ease-in-out infinite;
        }
        
        .parallax-bg {
          transform: translate3d(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px, 0);
        }
        
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* Animated Background Elements */}
      <BackgroundOrbs />
      <ParallaxStars />
      
      {/* Moving gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:20px_20px] pointer-events-none parallax-bg"></div>

      <div className="relative z-10">
        {/* Hero Section with 3D Elements */}
        {/* Hero Section with 3D Elements */}
{/* Hero Section with 3D Elements */}
<section className="text-center px-6 max-w-6xl mx-auto py-24 relative overflow-visible">
  {/* 3D Morphing Blobs */}
  <div className="absolute -top-32 -left-32 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 morphing-blob"></div>
  <div
    className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 morphing-blob"
    style={{ animationDelay: '4s' }}
  ></div>

  <FloatingCard delay={0}>
    <StartupGPSLogo size="w-24 h-24" />
  </FloatingCard>

  <div style={{animation: 'slideInUp 1s ease-out 0.2s both'}}>
  <h1
    className="inline-block text-6xl md:text-8xl font-bold mb-6 
               bg-gradient-to-r from-white via-blue-100 to-cyan-100 
               bg-clip-text text-transparent leading-[2.4] 
               overflow-visible pb-6"
  >
    Navigate Your Startup
  </h1>
</div>

<div style={{animation: 'slideInUp 1s ease-out 0.4s both'}}>
  <h1
    className="inline-block text-6xl md:text-8xl font-bold mb-8 
               bg-gradient-to-r from-cyan-100 via-blue-100 to-white 
               bg-clip-text text-transparent leading-[2.4] 
               overflow-visible pb-6"
  >
    Journey with AI
  </h1>
</div>


  <div style={{ animation: 'slideInUp 1s ease-out 0.8s both' }}>
    <button
      onClick={navigateToIdeaValidator}
      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 
                 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all duration-300 
                 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 hover:scale-105 
                 inline-flex items-center group relative overflow-hidden"
    >
      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <Target className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300 relative z-10" />
      <span className="relative z-10">Get Started</span>
      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300 relative z-10" />
    </button>
  </div>
</section>

        {/* Core Features Section */}
        <section className="px-6 max-w-7xl mx-auto py-20">
          <div className="text-center mb-16">

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 mt-8">
              Core Features
            </h2>

            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Four powerful AI-driven tools to transform your startup journey
              from idea to execution
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                onClick: navigateToIdeaValidator,
                icon: Lightbulb,
                title: "Idea Validation",
                description:
                  "AI-powered research & scoring system to assess your startup idea's potential.",
                features: [
                  "Market analysis",
                  "Competitor research",
                  "Viability scoring",
                  "Risk assessment",
                ],
                gradient: "from-yellow-500 to-orange-500",
                borderClass: "hover:border-yellow-500/50",
              },
              {
                onClick: navigateToResearchAdvisor,
                icon: BookOpen,
                title: "Research Finder",
                description:
                  "Access 50M+ research papers and get AI-powered insights for data-driven decisions.",
                features: [
                  "Academic database access",
                  "Expert analysis",
                  "Trend identification",
                  "Actionable insights",
                ],
                gradient: "from-indigo-500 to-purple-500",
                borderClass: "hover:border-indigo-500/50",
              },
              {
                onClick: navigateToRoadmapGenerator,
                icon: Map,
                title: "Roadmap Generator",
                description: "Get an actionable startup roadmap tailored to your specific goals and timeline.",
                features: [
                  "Milestone planning",
                  "Resource allocation",
                  "Timeline optimization",
                  "Progress tracking",
                ],
                gradient: "from-green-500 to-teal-500",
                borderClass: "hover:border-green-500/50",
              },
              {
                onClick: navigateToTeamBuilder,
                icon: Users,
                title: "Team Building",
                description:
                  "Find the perfect team members based on skills, vision alignment, and cultural fit.",
                features: [
                  "Skill matching",
                  "Vision alignment",
                  "Cultural fit analysis",
                  "Remote team support",
                ],
                gradient: "from-blue-500 to-purple-500",
                borderClass: "hover:border-blue-500/50",
              },
            ].map((feature, index) => (
              <FloatingCard key={index} delay={index * 0.3}>
                <div
                  onClick={feature.onClick}
                  className={`bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 ${feature.borderClass} cursor-pointer transition-all duration-500 hover:transform hover:-translate-y-4 hover:scale-105 hover:shadow-2xl group transform-gpu perspective-1000 relative overflow-hidden h-full`}
                >
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="flex flex-col items-center mb-6 relative z-10">
                    <div className="mb-4">
                      <Rotating3DIcon 
                        Icon={feature.icon} 
                        gradient={feature.gradient} 
                        size="w-14 h-14"
                      />
                    </div>
                    <h3 className="text-2xl font-semibold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-cyan-200 group-hover:bg-clip-text transition-all duration-300 text-center">
                      {feature.title}
                    </h3>
                  </div>

                  <p className="text-gray-300 mb-6 leading-relaxed group-hover:text-gray-200 transition-colors duration-300 relative z-10 text-center">
                    {feature.description}
                  </p>

                  <ul className="space-y-3 relative z-10">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-center group-hover:transform group-hover:translate-x-2 transition-transform duration-300" style={{transitionDelay: `${idx * 50}ms`}}>
                        <div className={`w-5 h-5 bg-gradient-to-br ${feature.gradient} rounded-md flex items-center justify-center mr-3 flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-200 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FloatingCard>
            ))}
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="px-6 max-w-7xl mx-auto py-20">
          <div className="text-center mb-16">

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 mt-8">
              Why Choose Startup GPS?
            </h2>

            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Our AI-powered platform combines cutting-edge technology with
              proven startup methodologies to give you the competitive edge you
              need to succeed in today's dynamic market.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "AI-Powered Intelligence",
                description:
                  "Leverage advanced machine learning algorithms to analyze market trends, validate ideas, and predict success patterns with 95% accuracy.",
                gradient: "from-purple-500 to-indigo-500",
              },
              {
                icon: Search,
                title: "Precision Validation",
                description:
                  "Get detailed market analysis, competitor insights, and viability scoring to make informed decisions backed by real data.",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                icon: Zap,
                title: "Lightning Fast Results",
                description:
                  "Receive comprehensive startup insights in minutes, not months of manual research and analysis.",
                gradient: "from-yellow-500 to-orange-500",
              },
              {
                icon: Clock,
                title: "Time-Optimized Planning",
                description:
                  "Generate realistic timelines and milestone tracking that adapts to your progress and available resources.",
                gradient: "from-green-500 to-emerald-500",
              },
              {
                icon: Shield,
                title: "Risk Mitigation",
                description:
                  "Identify potential pitfalls early and get actionable recommendations to avoid common startup failures.",
                gradient: "from-red-500 to-pink-500",
              },
              {
                icon: TrendingUp,
                title: "Proven Methodology",
                description:
                  "Built on academic research and real-world startup data from 10,000+ successful ventures to maximize your chances of success.",
                gradient: "from-indigo-500 to-purple-500",
              },
            ].map((item, index) => (
              <FloatingCard key={index} delay={index * 0.2}>
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-500 hover:transform hover:-translate-y-4 hover:shadow-2xl group transform-gpu relative overflow-hidden h-full">
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="mb-6 relative z-10 flex justify-center">
                    <Rotating3DIcon 
                      Icon={item.icon} 
                      gradient={item.gradient} 
                      size="w-14 h-14"
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-cyan-200 group-hover:bg-clip-text transition-all duration-300 relative z-10 text-center">
                    {item.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300 relative z-10 text-center">
                    {item.description}
                  </p>
                </div>
              </FloatingCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}