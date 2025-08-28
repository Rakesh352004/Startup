import React, { useState } from "react";

interface PhaseDetail {
  name: string;
  duration: string;
  description: string;
  key_tasks: string[];
  implementation_steps: string[];
  success_metrics: string[];
  risks: string[];
  resources_needed: string[];
  deliverables: string[];
}

interface RoadmapAnalysis {
  overview: string;
  phases: PhaseDetail[];
  total_duration: string;
  key_risks: string[];
  success_factors: string[];
  resource_requirements: {
    team_size: string;
    estimated_budget: string;
    key_hires: string[];
  };
  competitive_considerations: string[];
  regulatory_considerations: string[];
}

interface RoadmapResponse {
  id: string;
  prompt: string;
  timeframe: string;
  industry?: string;
  target_market?: string;
  roadmap: string;
  roadmap_analysis?: RoadmapAnalysis;
  research_insights?: string[];
  created_at: string;
  updated_at: string;
}

const RoadmapGenerator: React.FC = () => {
  const [ideaPrompt, setIdeaPrompt] = useState("");
  const [timeframe, setTimeframe] = useState("6 months");
  const [industry, setIndustry] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [roadmapData, setRoadmapData] = useState<RoadmapResponse | null>(null);
  const [researchInsights, setResearchInsights] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  const isValidIdea = charCount >= 20;

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const handleGenerate = async () => {
    if (!isValidIdea) return;
    
    setError("");
    setRoadmapData(null);
    setResearchInsights([]);
    setLoading(true);
    setExpandedPhase(null);

    try {
      const response = await fetch(`${API_BASE_URL}/roadmaps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: ideaPrompt,
          timeframe: timeframe,
          industry: industry || undefined,
          target_market: targetMarket || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data: RoadmapResponse = await response.json();
      setRoadmapData(data);
      setResearchInsights(data.research_insights || []);

    } catch (err: any) {
      console.error("Roadmap generation error:", err);
      setError(`Failed to generate roadmap: ${err.message}`);
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

  const clearForm = () => {
    setIdeaPrompt("");
    setTimeframe("6 months");
    setIndustry("");
    setTargetMarket("");
    setCharCount(0);
    setRoadmapData(null);
    setResearchInsights([]);
    setError("");
    setExpandedPhase(null);
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
                  <span className="text-lg text-gray-400 font-medium">AI-Powered Strategic Planning</span>
                </div>
              </div>
            </div>
            
            <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto leading-relaxed">
              Transform your startup idea into a comprehensive strategic roadmap with intelligent AI guidance.
            </p>
          </div>

          {/* Input Section */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-8 mb-8 shadow-2xl">
            <div className="space-y-6">
              <div>
                <label className="block text-gray-200 text-base font-semibold mb-4">
                  Enter your startup idea and we'll create a strategic roadmap
                </label>
                <div className="relative">
                  <textarea
                    value={ideaPrompt}
                    onChange={handlePromptChange}
                    placeholder="Describe your startup idea in detail... (e.g., A mobile app that connects local farmers with restaurants for fresh produce delivery)"
                    rows={4}
                    className="w-full p-5 bg-black/40 text-white placeholder-gray-400 border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-300 resize-none shadow-inner"
                  />
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="timeframe" className="block text-gray-200 text-base font-semibold mb-3">
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

                <div>
                  <label htmlFor="industry" className="block text-gray-200 text-base font-semibold mb-3">
                    Industry (Optional)
                  </label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-4 bg-black/40 text-white border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-300 shadow-inner"
                  >
                    <option value="">Select Industry</option>
                    <option value="fintech">FinTech</option>
                    <option value="edtech">EdTech</option>
                    <option value="healthtech">HealthTech</option>
                    <option value="saas">SaaS</option>
                    <option value="marketplace">Marketplace</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="targetMarket" className="block text-gray-200 text-base font-semibold mb-3">
                    Target Market (Optional)
                  </label>
                  <input
                    id="targetMarket"
                    type="text"
                    value={targetMarket}
                    onChange={(e) => setTargetMarket(e.target.value)}
                    placeholder="e.g., Small businesses"
                    className="w-full p-4 bg-black/40 text-white placeholder-gray-400 border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-300 shadow-inner"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !isValidIdea}
                  className={`flex-1 px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center shadow-xl ${
                    isValidIdea 
                      ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-blue-500/25 hover:shadow-purple-500/40 transform hover:scale-105" 
                      : "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/30"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating Roadmap...</span>
                    </>
                  ) : (
                    <span>Generate Roadmap</span>
                  )}
                </button>

                {(roadmapData || error) && (
                  <button
                    onClick={clearForm}
                    className="px-6 py-4 rounded-xl font-bold text-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300"
                  >
                    New Roadmap
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Research Insights Section */}
          {researchInsights.length > 0 && (
            <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 mb-8 shadow-2xl">
              <h3 className="text-xl font-bold text-green-400 mb-4">Strategic Insights</h3>
              <div className="space-y-2">
                {researchInsights.map((insight, index) => (
                  <p key={index} className="text-gray-300 text-sm bg-gray-800/30 p-3 rounded-lg border border-gray-600/20">
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Results Section */}
          {roadmapData && roadmapData.roadmap_analysis && (
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-8 shadow-2xl">
              {/* Overview Section */}
              <div className="mb-12 p-8 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-xl">📋</span>
                  </div>
                  Strategic Overview
                </h2>
                <p className="text-gray-200 leading-relaxed text-lg">{roadmapData.roadmap_analysis.overview}</p>
              </div>

              {/* Analytics Section */}
              <div className="mb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/20">
                  <h4 className="text-lg font-bold text-blue-300 mb-3">Budget Estimate</h4>
                  <p className="text-white text-xl font-semibold">{roadmapData.roadmap_analysis.resource_requirements?.estimated_budget || "N/A"}</p>
                </div>
                <div className="bg-gradient-to-br from-green-900/30 to-blue-900/30 rounded-xl p-6 border border-green-500/20">
                  <h4 className="text-lg font-bold text-green-300 mb-3">Team Size</h4>
                  <p className="text-white text-xl font-semibold">{roadmapData.roadmap_analysis.resource_requirements?.team_size || "N/A"}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/20">
                  <h4 className="text-lg font-bold text-purple-300 mb-3">Key Risks</h4>
                  <p className="text-white text-xl font-semibold">{roadmapData.roadmap_analysis.key_risks?.length || 0} identified</p>
                </div>
              </div>

              {/* Roadmap Timeline */}
              <div className="relative">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                    Your Startup Journey
                  </h2>
                  <p className="text-gray-400 text-lg">Navigate your path to success</p>
                </div>
                
                {/* Timeline connector */}
                <div className="absolute left-10 top-0 h-full w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 opacity-60 rounded-full"></div>
                
                <div className="space-y-10 pl-16">
                  {roadmapData.roadmap_analysis.phases.map((phase, index) => (
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
                                {index === 0 ? '🚀' : index === 1 ? '🔧' : index === 2 ? '📈' : index === 3 ? '⚡' : '🌟'}
                              </div>
                              <div>
                                <h3 className="text-2xl font-bold text-white">{phase.name}</h3>
                                <div className="text-sm text-gray-400 font-medium mt-1">Phase {index + 1} • {phase.duration}</div>
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
                                {phase.key_tasks.map((task, i) => (
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
                                {phase.implementation_steps.map((step, i) => (
                                  <div key={i} className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-600/20 hover:border-purple-500/30 transition-colors duration-200">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="text-gray-200 leading-relaxed">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {phase.success_metrics && phase.success_metrics.length > 0 && (
                              <div>
                                <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                  <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/30">
                                    <span className="text-lg">📊</span>
                                  </div>
                                  Success Metrics
                                </h4>
                                <div className="grid gap-3">
                                  {phase.success_metrics.map((metric, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                      <span className="text-gray-200">{metric}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {phase.risks && phase.risks.length > 0 && (
                              <div>
                                <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                  <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                                    <span className="text-lg">⚠️</span>
                                  </div>
                                  Key Risks
                                </h4>
                                <div className="grid gap-3">
                                  {phase.risks.map((risk, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                      <span className="text-gray-200">{risk}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {phase.resources_needed && phase.resources_needed.length > 0 && (
                              <div>
                                <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-500/30">
                                    <span className="text-lg">🔧</span>
                                  </div>
                                  Resources Needed
                                </h4>
                                <div className="grid gap-3">
                                  {phase.resources_needed.map((resource, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                      <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                                      <span className="text-gray-200">{resource}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {phase.deliverables && phase.deliverables.length > 0 && (
                              <div>
                                <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                  <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                                    <span className="text-lg">📦</span>
                                  </div>
                                  Key Deliverables
                                </h4>
                                <div className="grid gap-3">
                                  {phase.deliverables.map((deliverable, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                      <span className="text-gray-200">{deliverable}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Success Factors Section */}
                {roadmapData.roadmap_analysis.success_factors && roadmapData.roadmap_analysis.success_factors.length > 0 && (
                  <div className="mt-12 bg-gradient-to-r from-green-900/20 to-emerald-900/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-2xl">
                    <h3 className="text-xl font-bold text-green-400 mb-4">Critical Success Factors</h3>
                    <div className="grid gap-3">
                      {roadmapData.roadmap_analysis.success_factors.map((factor, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-200">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall Risks Section */}
                {roadmapData.roadmap_analysis.key_risks && roadmapData.roadmap_analysis.key_risks.length > 0 && (
                  <div className="mt-6 bg-gradient-to-r from-red-900/20 to-orange-900/20 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 shadow-2xl">
                    <h3 className="text-xl font-bold text-red-400 mb-4">Strategic Risks</h3>
                    <div className="grid gap-3">
                      {roadmapData.roadmap_analysis.key_risks.map((risk, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-gray-200">{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

          {/* Footer CTA */}
          <div className="mt-12 text-center">
            <div className="bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Launch Your Startup?</h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Transform your idea into a successful business with our comprehensive roadmap. Each phase is designed to minimize risks and maximize your chances of success.
              </p>
              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2 text-blue-400">
                  <span>✓</span>
                  <span>Market Validated</span>
                </div>
                <div className="flex items-center gap-2 text-purple-400">
                  <span>✓</span>
                  <span>Risk Assessed</span>
                </div>
                <div className="flex items-center gap-2 text-pink-400">
                  <span>✓</span>
                  <span>Growth Focused</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapGenerator;