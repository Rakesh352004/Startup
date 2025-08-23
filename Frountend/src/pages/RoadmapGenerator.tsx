import React, { useState } from "react";

interface RoadmapResponse {
  prompt: string;
  timeframe: string;
  roadmap: string;
  created_at: string;
}

interface Phase {
  title: string;
  description: string;
  tasks: string[];
  implementation: string[];
}

interface RoadmapData {
  overview: string;
  phases: Phase[];
}

const RoadmapGenerator: React.FC = () => {
  const [ideaPrompt, setIdeaPrompt] = useState("");
  const [timeframe, setTimeframe] = useState("6 months");
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  const isValidIdea = charCount >= 20;

  const parseRoadmapResponse = (result: string): RoadmapData => {
    const sections = result.split('\n\n').filter(section => section.trim() !== '');
    const roadmap: RoadmapData = { overview: "", phases: [] };
    let currentPhase: Partial<Phase> | null = null;

    sections.forEach(section => {
      const lines = section.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      const firstLine = lines[0];
      
      if (firstLine.includes("Overview")) {
        roadmap.overview = lines.slice(1).join('\n');
      } 
      else if (firstLine.startsWith("Phase")) {
        if (currentPhase) {
          roadmap.phases.push(currentPhase as Phase);
        }
        
        const phaseMatch = firstLine.match(/Phase \d+: (.+?) - (.+)/);
        currentPhase = {
          title: phaseMatch ? phaseMatch[1] : firstLine,
          description: phaseMatch ? phaseMatch[2] : "",
          tasks: [],
          implementation: []
        };
      }
      else if (firstLine.includes("Tasks")) {
        if (currentPhase) {
          currentPhase.tasks = lines.slice(1)
            .filter(line => line.startsWith('-'))
            .map(line => line.substring(1).trim());
        }
      }
      else if (firstLine.includes("Implementation")) {
        if (currentPhase) {
          currentPhase.implementation = lines.slice(1)
            .filter(line => line.startsWith('-'))
            .map(line => line.substring(1).trim());
        }
      }
    });

    if (currentPhase) {
      roadmap.phases.push(currentPhase as Phase);
    }

    return roadmap;
  };

  const handleGenerate = async () => {
    if (!isValidIdea) return;
    
    setError("");
    setRoadmapData(null);
    setLoading(true);
    setExpandedPhase(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8000/roadmaps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          prompt: ideaPrompt,
          timeframe: timeframe
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRoadmapData(parseRoadmapResponse(data.roadmap));
    } catch (err: any) {
      console.error("Roadmap generation error:", err);
      setError(
        err.message || 
        "Failed to generate roadmap. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIdeaPrompt(e.target.value);
    setCharCount(e.target.value.length);
  };

  const togglePhase = (index: number) => {
    setExpandedPhase(expandedPhase === index ? null : index);
  };

return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-blue-800/5 to-transparent"></div>
      
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Main Header Section */}
          <div className="text-center mb-12">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full opacity-30 blur animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                  Roadmap Generator
                </h1>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-2xl">✨</span>
                  <span className="text-lg text-gray-400 font-medium">AI-Powered Strategic Planning</span>
                  <span className="text-2xl">✨</span>
                </div>
              </div>
            </div>
            
            <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto leading-relaxed">
              Transform your startup idea into a comprehensive strategic roadmap. 
              <span className="text-blue-400 font-semibold"> Plan your journey</span>, 
              <span className="text-purple-400 font-semibold"> track milestones</span>, and 
              <span className="text-pink-400 font-semibold"> accelerate growth</span> with intelligent AI guidance.
            </p>
            
            {/* Feature indicators */}
            <div className="flex items-center justify-center gap-8 mt-10 text-sm">
              <div className="flex items-center gap-3 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-300 font-medium">Strategic Planning</span>
              </div>
              <div className="flex items-center gap-3 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-purple-300 font-medium">Milestone Tracking</span>
              </div>
              <div className="flex items-center gap-3 bg-pink-500/10 px-4 py-2 rounded-full border border-pink-500/20">
                <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse"></div>
                <span className="text-pink-300 font-medium">Growth Acceleration</span>
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-8 mb-8 shadow-2xl">
            <div className="space-y-6">
              <div>
                <label className="block text-gray-200 text-base font-semibold mb-4 flex items-center gap-2">
                  <span>💡</span>
                  Enter your startup idea and we'll find relevant research from leading databases
                </label>
                <div className="relative">
                  <textarea
                    value={ideaPrompt}
                    onChange={handlePromptChange}
                    placeholder="Describe your startup idea in detail... (e.g., A mobile app that connects local farmers with restaurants for fresh produce delivery)"
                    rows={4}
                    className="w-full p-5 bg-black/40 text-white placeholder-gray-400 border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-300 resize-none shadow-inner"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5 rounded-xl pointer-events-none"></div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className={`text-sm font-medium ${isValidIdea ? "text-green-400" : "text-red-400"}`}>
                    {charCount}/20 characters minimum
                  </span>
                  {!isValidIdea && charCount > 0 && (
                    <span className="text-red-400 text-sm bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                      Please enter at least 20 characters for meaningful roadmap generation.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-end">
                <div className="flex-1">
                  <label htmlFor="timeframe" className="block text-gray-200 text-base font-semibold mb-3 flex items-center gap-2">
                    <span>⏰</span>
                    Timeframe
                  </label>
                  <select
                    id="timeframe"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full p-4 bg-black/40 text-white border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-300 shadow-inner"
                  >
                    <option value="3 months">3 months</option>
                    <option value="6 months">6 months</option>
                    <option value="9 months">9 months</option>
                    <option value="12 months">12 months</option>
                    <option value="18 months">18 months</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !isValidIdea}
                  className={`px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center min-w-[200px] shadow-xl ${
                    isValidIdea 
                      ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-blue-500/25 hover:shadow-purple-500/40 transform hover:scale-105 hover:-translate-y-1" 
                      : "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/30"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>🔍 Generating Roadmap</span>
                    </>
                  ) : (
                    <span>🔍 Discover Roadmap</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {roadmapData && (
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-8 shadow-2xl">
              {/* Overview Section */}
              {roadmapData.overview && (
                <div className="mb-12 p-8 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
                  <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-xl">📋</span>
                    </div>
                    Strategic Overview
                  </h2>
                  <p className="text-gray-200 leading-relaxed text-lg whitespace-pre-line">{roadmapData.overview}</p>
                </div>
              )}

              {/* Roadmap Timeline */}
              <div className="relative">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                    Your Startup Journey
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">🗺️</span>
                    <p className="text-gray-400 text-lg">Navigate your path to success</p>
                    <span className="text-2xl">🎯</span>
                  </div>
                </div>
                
                {/* Timeline connector */}
                <div className="absolute left-10 top-0 h-full w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 opacity-60 rounded-full"></div>
                
                <div className="space-y-10 pl-16">
                  {roadmapData.phases.map((phase, index) => (
                    <div key={index} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-16 top-10 h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 border-4 border-gray-900 shadow-2xl flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      </div>
                      
                      {/* Phase card */}
                      <div className="bg-gray-800/40 border border-gray-600/30 rounded-2xl overflow-hidden hover:bg-gray-800/60 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] transform">
                        <button
                          onClick={() => togglePhase(index)}
                          className={`w-full text-left p-8 flex justify-between items-start ${
                            expandedPhase === index ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20' : 'hover:bg-gray-700/20'
                          } transition-all duration-300`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-600 rounded-xl flex items-center justify-center text-2xl border border-gray-600/50">
                                {index === 0 ? '🚀' : index === 1 ? '🔧' : '📈'}
                              </div>
                              <div>
                                <h3 className="text-2xl font-bold text-white">{phase.title}</h3>
                                <div className="text-sm text-gray-400 font-medium mt-1">Phase {index + 1}</div>
                              </div>
                            </div>
                            <p className="text-gray-300 leading-relaxed text-lg">{phase.description}</p>
                          </div>
                          <div className="ml-6 flex flex-col items-center">
                            <svg
                              className={`w-7 h-7 text-gray-400 transform transition-transform duration-300 ${
                                expandedPhase === index ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            <span className="text-xs text-gray-500 mt-2">
                              {expandedPhase === index ? 'Collapse' : 'Expand'}
                            </span>
                          </div>
                        </button>
                        
                        {/* Expanded content */}
                        {expandedPhase === index && (
                          <div className="p-8 bg-gray-900/40 border-t border-gray-600/20 space-y-8">
                            <div>
                              <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                                  <span className="text-lg">✅</span>
                                </div>
                                Key Tasks
                              </h4>
                              <div className="grid gap-4">
                                {phase.tasks.map((task, i) => (
                                  <div key={i} className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-600/20 hover:border-blue-500/30 transition-colors duration-200">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="text-gray-200 leading-relaxed">{task}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
                                  <span className="text-lg">🔨</span>
                                </div>
                                Implementation Steps
                              </h4>
                              <div className="grid gap-4">
                                {phase.implementation.map((step, i) => (
                                  <div key={i} className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-600/20 hover:border-purple-500/30 transition-colors duration-200">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="text-gray-200 leading-relaxed">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-red-400 mb-3 flex items-center gap-2">
                <span>⚠️</span> Error
              </h2>
              <p className="text-red-300">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoadmapGenerator;
